import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { getAuthInstance, getFirestoreInstance } from '../firebaseConfig';
import { firebaseConfig } from '../config'; // Import raw config for secondary app
import { initializeApp, deleteApp } from 'firebase/app'; // Import app management
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updatePassword as firebaseUpdatePassword,
    User as FirebaseUser,
    getAuth // Import getAuth for secondary app
} from 'firebase/auth';
import { 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    arrayUnion,
    arrayRemove,
    deleteField,
    writeBatch,
    documentId,
    onSnapshot,
    Timestamp,
    serverTimestamp,
    addDoc,
    increment,
    orderBy,
    limit,
    deleteDoc,
    DocumentSnapshot,
    runTransaction,
    getFirestore // Import getFirestore for secondary app
} from 'firebase/firestore';
import { createNotification } from '../lib/notifications';
import { processDailyTrackerDoc, processTransactionDoc, processNotificationDoc, processCommissionProfileDoc, processUserDoc, processTeamDoc, processPerformanceLogDoc, processPlaybookDoc, processClientLeadDoc, processClientLeadActivityDoc, processTodoItemDoc } from '../lib/firestoreUtils';
import type { Team, TeamMember, NewAgentResources, NewAgentGoalTemplate, NewAgentHomework, NewAgentResourceLink, CommissionProfile, Transaction, PerformanceLog, DailyTrackerData, BudgetModelInputs, ProspectingSession, MarketCenter, Goal, Lesson, Candidate, CandidateActivity, ClientLead, ClientLeadActivity, OrgBlueprint, Playbook, TodoItem, Priority } from '../types';

// --- PERMISSION HELPERS ---
export const P = {
  isSuperAdmin: (user: TeamMember | null): boolean => !!user?.isSuperAdmin,
  isMcAdmin: (user: TeamMember | null): boolean => P.isSuperAdmin(user) || user?.role === 'market_center_admin',
  isCoach: (user: TeamMember | null): boolean => P.isMcAdmin(user) || user?.role === 'productivity_coach',
  isTeamLeader: (user: TeamMember | null): boolean => P.isCoach(user) || user?.role === 'team_leader',
  isRecruiter: (user: TeamMember | null): boolean => user?.role === 'recruiter',
  
  canManageResources: (user: TeamMember | null): boolean => P.isTeamLeader(user) || P.isCoach(user) || P.isMcAdmin(user),
  canAccessCoachingTools: (user: TeamMember | null): boolean => user?.role === 'team_leader' || user?.role === 'productivity_coach',
  canSeeMyPerformance: (user: TeamMember | null): boolean => user?.role === 'agent' || user?.role === 'team_leader',
  canSeeGrowthArchitect: (user: TeamMember | null): boolean => P.isMcAdmin(user) || user?.role === 'agent' || P.isTeamLeader(user),
  canSeeRecruitmentPlaybook: (user: TeamMember | null): boolean => user?.role === 'team_leader' || user?.role === 'recruiter',
  canManageClientPipeline: (user: TeamMember | null): boolean => user?.role === 'agent' || P.isTeamLeader(user),
};


// --- TYPES ---
export type UserProfile = TeamMember;

interface AssignedResources {
  homework: NewAgentHomework[];
  resourceLinks: NewAgentResourceLink[];
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserProfile | null;
  loading: boolean;
  managedAgents: TeamMember[];
  loadingAgents: boolean;
  agentsError: string | null;
  signUpWithEmail: (email: string, password: string, name: string, options?: { role?: TeamMember['role']; teamId?: string; marketCenterId?: string; }) => Promise<void>;
  createAccountForAgent: (email: string, password: string, name: string, role: TeamMember['role'], teamId: string | null, marketCenterId: string | null) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profileData: Partial<Pick<TeamMember, 'name' | 'bio'>>) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  joinTeam: (teamCode: string) => Promise<{ success: boolean; message: string }>;
  createTeam: (teamName: string) => Promise<void>;
  updateTheme: (theme: string) => Promise<void>;
  getTeamById: (teamId: string) => Promise<Team | null>;
  getUsersByIds: (userIds: string[]) => Promise<TeamMember[]>;
  getAllUsers: () => Promise<TeamMember[]>;
  getUsersForMarketCenter: (marketCenterId: string) => Promise<TeamMember[]>;
  leaveTeam: () => Promise<{ success: boolean; message: string; }>;
  removeAgentFromTeam: (agentId: string) => Promise<{ success: boolean; message: string; }>;
  getUserById: (userId: string) => Promise<TeamMember | null>;
  updateUserNewAgentStatus: (userId: string, isNew: boolean) => Promise<void>;
  getNewAgentResourcesForUser: (userId: string) => Promise<NewAgentResources | null>;
  saveNewAgentResources: (resources: NewAgentResources) => Promise<void>;
  updateUserMetrics: (userId: string, metrics: { gci?: number; listings?: number; calls?: number; appointments?: number; }) => Promise<void>;
  assignHomeworkToUser: (userId: string, homework: Omit<NewAgentHomework, 'id' | 'userId' | 'teamId' | 'marketCenterId'>) => Promise<void>;
  getAssignedResourcesForUser: (userId: string) => Promise<AssignedResources>;
  getHomeworkForManagedUsers: () => Promise<Record<string, NewAgentHomework[]>>;
  getHabitLogsForManagedUsers: () => Promise<Record<string, DailyTrackerData[]>>;
  getHabitLogsForUser: (userId: string) => Promise<DailyTrackerData[]>;
  deleteHomeworkForUser: (homeworkId: string) => Promise<void>;
  getCommissionProfileForUser: (userId: string) => Promise<CommissionProfile | null>;
  saveCommissionProfile: (profileData: Omit<CommissionProfile, 'id'>) => Promise<void>;
  getAllTransactions: () => Promise<Transaction[]>;
  getTransactionsForUser: (userId: string) => Promise<Transaction[]>;
  getAllCommissionProfiles: () => Promise<CommissionProfile[]>;
  addPerformanceLog: (logData: Omit<PerformanceLog, 'id' | 'coachId' | 'date'>) => Promise<void>;
  getPerformanceLogsForAgent: (agentId: string) => Promise<PerformanceLog[]>;
  getPerformanceLogsForCurrentUser: () => Promise<PerformanceLog[]>;
  getPerformanceLogsForManagedUsers: () => Promise<Record<string, PerformanceLog[]>>;
  updatePerformanceLog: (logId: string, updates: Partial<PerformanceLog>) => Promise<void>;
  updateContributingAgents: (agentIds: string[]) => Promise<void>;
  updateCoachRoster: (coachId: string, agentIds: string[]) => Promise<void>;
  updateUserCoachAssignment: (agentId: string, newCoachId: string | null) => Promise<void>;
  updateUserTeamAffiliation: (agentId: string, newTeamId: string | null) => Promise<void>;
  getBudgetModelForUser: (userId: string) => Promise<BudgetModelInputs | null>;
  saveBudgetModel: (data: BudgetModelInputs) => Promise<void>;
  getMarketCenters: () => Promise<MarketCenter[]>;
  createMarketCenter: (mcData: Omit<MarketCenter, 'id' | 'adminIds'>) => Promise<void>;
  deleteMarketCenter: (id: string) => Promise<void>;
  assignMcAdmin: (email: string, marketCenterId: string) => Promise<void>;
  removeMcAdmin: (userId: string, marketCenterId: string) => Promise<void>;
  updateUserMarketCenter: (marketCenterId: string | null) => Promise<void>;
  updateUserRole: (userId: string, role: TeamMember['role']) => Promise<void>; // Basic role update
  updateUserMarketCenterForAdmin: (userId: string, marketCenterId: string | null) => Promise<void>; // Basic MC update on user doc
  updateUserRoleAndMarketCenterAffiliation: (userId: string, newRole: TeamMember['role'], newMarketCenterId: string | null) => Promise<void>; // Comprehensive update including marketCenter adminIds

  getAllTeams: () => Promise<Team[]>;
  getAllTransactionsForAdmin: () => Promise<Transaction[]>;
  updatePlaybookProgress: (playbookId: string, completedLessonIds: string[]) => Promise<void>;
  updateOnboardingChecklistProgress: (completedItemIds: string[]) => Promise<void>;
  getPlaybooksForUser: (userId: string) => Promise<Playbook[]>;
  getTransactionsForMarketCenter: (marketCenterId: string) => Promise<Transaction[]>;
  getCommissionProfilesForMarketCenter: (agentIds: string[]) => Promise<CommissionProfile[]>;
  getBudgetModelsForMarketCenter: (marketCenterId: string) => Promise<BudgetModelInputs[]>;
  getCandidatesForMarketCenter: (marketCenterId: string) => Promise<Candidate[]>;
  getCandidatesForRecruiter: (recruiterId: string) => Promise<Candidate[]>;
  addCandidate: (data: Omit<Candidate, 'id' | 'createdAt' | 'lastContacted'>) => Promise<string>;
  updateCandidate: (id: string, data: Partial<Candidate>) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  getCandidateActivities: (candidateId: string) => Promise<CandidateActivity[]>;
  addCandidateActivity: (candidateId: string, note: string) => Promise<void>;
  getOrgBlueprintForUser: (userId: string) => Promise<OrgBlueprint | null>;
  
  addClientLead: (data: Omit<ClientLead, 'id' | 'createdAt' | 'lastContacted'>) => Promise<string>;
  updateClientLead: (id: string, data: Partial<ClientLead>) => Promise<void>;
  deleteClientLead: (id: string) => Promise<void>;
  getClientLeadsForUser: (userId: string) => Promise<ClientLead[]>;
  getClientLeadsForTeam: (teamId: string) => Promise<ClientLead[]>;
  getClientLeadActivities: (clientLeadId: string) => Promise<ClientLeadActivity[]>;
  addClientLeadActivity: (clientLeadId: string, note: string) => Promise<void>;

  regenerateZapierApiKey: () => Promise<string>;
  getWebhooks: () => Promise<Record<string, string>>;
  saveWebhook: (event: string, url: string) => Promise<void>;
  deleteWebhook: (event: string) => Promise<void>;

  addTodo: (data: Partial<Omit<TodoItem, 'id' | 'userId' | 'createdAt' | 'isCompleted'>>) => Promise<void>;
  updateTodo: (todoId: string, updates: Partial<Omit<TodoItem, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  getTodosForUserDateRange: (startDate: string, endDate: string) => Promise<TodoItem[]>;
  getUndatedTodosForUser: () => Promise<TodoItem[]>;
  getLinkableContacts: () => Promise<{ leads: ClientLead[], candidates: Candidate[] }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [managedAgents, setManagedAgents] = useState<TeamMember[]>([]);
    const [loadingAgents, setLoadingAgents] = useState(true);
    const [agentsError, setAgentsError] = useState<string | null>(null);

    useEffect(() => {
        const auth = getAuthInstance();
        if (!auth) {
            console.warn("Firebase not configured: Auth features disabled.");
            setUser(null);
            setUserData(null);
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            if (!firebaseUser) {
                setUserData(null);
                setLoading(false);
            }
        });
        return unsubscribe;
    }, []);

    const getUsersByIds = useCallback(async (userIds: string[]): Promise<TeamMember[]> => {
        const db = getFirestoreInstance();
        if (userIds.length === 0 || !db) return [];
        const users: TeamMember[] = [];
        const chunkSize = 30; 
        for (let i = 0; i < userIds.length; i += chunkSize) {
            const chunk = userIds.slice(i, i + chunkSize);
            const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                users.push(processUserDoc(doc));
            });
        }
        return users;
    }, []);

    useEffect(() => {
        const db = getFirestoreInstance();
        if (!db) return;

        let unsubscribe: (() => void) | undefined;
        if (user) {
            setLoading(true);
            const userDocRef = doc(db, 'users', user.uid);
            unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setUserData(processUserDoc(docSnap));
                } else {
                    setUserData(null);
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching user data:", error);
                setUserData(null);
                setLoading(false);
            });
        } else {
            setUserData(null);
            setManagedAgents([]);
            setLoading(false);
            setLoadingAgents(false);
        }
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [user]);

    useEffect(() => {
        const db = getFirestoreInstance();
        if (!userData || !db) {
            setManagedAgents([]);
            setLoadingAgents(false);
            setAgentsError(null);
            return;
        }

        setLoadingAgents(true);
        setAgentsError(null);
        const usersCollection = collection(db, 'users');
        let q;

        if (P.isSuperAdmin(userData)) {
            q = query(usersCollection);
        } else if (P.isMcAdmin(userData) && userData.marketCenterId) {
            q = query(usersCollection, where('marketCenterId', '==', userData.marketCenterId));
        } else if (P.isCoach(userData)) {
            q = query(usersCollection, where('coachId', '==', userData.id));
        } else if (P.isTeamLeader(userData) && userData.teamId) {
            q = query(usersCollection, where('teamId', '==', userData.teamId));
        }

        if (!q) {
            setManagedAgents([]);
            setLoadingAgents(false);
            return;
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allAssociatedUsers = snapshot.docs.map(processUserDoc);
            setManagedAgents(allAssociatedUsers.filter(agent => agent.id !== userData.id));
            setLoadingAgents(false);
        }, (error) => {
            console.error("Error fetching managed agents:", error);
            setAgentsError(error instanceof Error ? error.message : "An unknown error occurred while fetching agents.");
            setManagedAgents([]);
            setLoadingAgents(false);
        });

        return () => unsubscribe();

    }, [userData]);
    
    const signUpWithEmail = useCallback(async (email: string, password: string, name: string, options: { role?: TeamMember['role']; teamId?: string; marketCenterId?: string; } = {}) => {
        const auth = getAuthInstance();
        const db = getFirestoreInstance();
        if (!auth || !db) throw new Error("Firebase is not configured.");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        const batch = writeBatch(db);
        const userDocRef = doc(db, 'users', newUser.uid);
        const userProfile: Omit<UserProfile, 'id'> = {
            name, email, role: options.role || 'agent', gci: 0, listings: 0, calls: 0, appointments: 0,
            isNewAgent: true, playbookProgress: {}, teamId: options.teamId || null, marketCenterId: options.marketCenterId || null,
        };
        if (options.teamId) batch.update(doc(db, 'teams', options.teamId), { memberIds: arrayUnion(newUser.uid) });
        batch.set(userDocRef, userProfile);
        if (options.role === 'market_center_admin' && options.marketCenterId) batch.update(doc(db, 'marketCenters', options.marketCenterId), { adminIds: arrayUnion(newUser.uid) });
        await batch.commit();
    }, []);

    // --- Create Account For Agent (Admin Action) ---
    const createAccountForAgent = useCallback(async (email: string, password: string, name: string, role: TeamMember['role'], teamId: string | null, marketCenterId: string | null) => {
        if (!firebaseConfig) throw new Error("Firebase config not found.");

        // 1. Initialize a secondary app instance to create user without logging out the admin
        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
        const secondaryAuth = getAuth(secondaryApp);
        const secondaryDb = getFirestore(secondaryApp);

        try {
            // 2. Create User on secondary auth (logs them in temporarily on that instance)
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const newUser = userCredential.user;

            // 3. Write User Document using secondary instance (User writing to own doc = allowed by rules)
            const userProfile: Omit<UserProfile, 'id'> = {
                name,
                email,
                role,
                gci: 0,
                listings: 0,
                calls: 0,
                appointments: 0,
                isNewAgent: true,
                playbookProgress: {},
                teamId: teamId || null,
                marketCenterId: marketCenterId || null,
            };
            // Note: We use secondaryDb here to ensure the write is attributed to the new user
            await setDoc(doc(secondaryDb, 'users', newUser.uid), userProfile);

            // 4. Handle administrative side effects (Teams, MCs) using the PRIMARY DB (Admin credentials)
            // This avoids permission errors since the new user can't write to Team/MC docs.
            const primaryDb = getFirestoreInstance();
            if (primaryDb) {
                const batch = writeBatch(primaryDb);
                if (teamId) {
                    batch.update(doc(primaryDb, 'teams', teamId), { memberIds: arrayUnion(newUser.uid) });
                }
                if (role === 'market_center_admin' && marketCenterId) {
                    batch.update(doc(primaryDb, 'marketCenters', marketCenterId), { adminIds: arrayUnion(newUser.uid) });
                }
                await batch.commit();
            }
        } catch (error) {
            console.error("Error creating agent account:", error);
            throw error;
        } finally {
            // 5. Cleanup secondary app
            await signOut(secondaryAuth);
            await deleteApp(secondaryApp);
        }
    }, []);


    const signInWithEmail = useCallback(async (email: string, password: string) => {
        const auth = getAuthInstance();
        if (!auth) throw new Error("Firebase is not configured.");
        await signInWithEmailAndPassword(auth, email, password);
    }, []);

    const logout = useCallback(async () => {
        const auth = getAuthInstance();
        if (auth) await signOut(auth);
    }, []);

    const updateUserProfile = useCallback(async (profileData: Partial<Pick<TeamMember, 'name' | 'bio'>>) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("User not authenticated.");
        await updateDoc(doc(db, 'users', user.uid), profileData);
    }, [user]);

    const updatePassword = useCallback(async (password: string) => {
        const auth = getAuthInstance();
        if (!auth?.currentUser) throw new Error("User not authenticated.");
        await firebaseUpdatePassword(auth.currentUser, password);
    }, []);
    
    const joinTeam = useCallback(async (teamCode: string) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) return { success: false, message: "Not logged in." };
        const q = query(collection(db, 'teams'), where('teamCode', '==', teamCode.trim()));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return { success: false, message: "Invalid team code." };
        const teamDoc = snapshot.docs[0];
        const teamId = teamDoc.id;
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', user.uid), { teamId });
        batch.update(doc(db, 'teams', teamId), { memberIds: arrayUnion(user.uid) });
        await batch.commit();
        return { success: true, message: `Joined ${teamDoc.data().name}!` };
    }, [user, userData]);

    const createTeam = useCallback(async (teamName: string) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) throw new Error("Auth error.");
        const teamCode = `TEAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const newTeamRef = doc(collection(db, 'teams'));
        const batch = writeBatch(db);
        batch.set(newTeamRef, { id: newTeamRef.id, name: teamName, creatorId: user.uid, memberIds: [user.uid], teamCode });
        batch.update(doc(db, 'users', user.uid), { role: 'team_leader', teamId: newTeamRef.id });
        await batch.commit();
    }, [user, userData]);
    
    const updateTheme = useCallback(async (theme: string) => {
        const db = getFirestoreInstance();
        if (!user || !db) return;
        await updateDoc(doc(db, 'users', user.uid), { theme });
    }, [user]);

    const getTeamById = useCallback(async (teamId: string) => {
        const db = getFirestoreInstance();
        if (!db) return null;
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        return teamDoc.exists() ? processTeamDoc(teamDoc) : null;
    }, []);
    
    const getAllUsers = useCallback(async (): Promise<TeamMember[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const snapshot = await getDocs(collection(db, 'users'));
        return snapshot.docs.map(processUserDoc);
    }, []);

    const getUsersForMarketCenter = useCallback(async (marketCenterId: string): Promise<TeamMember[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const q = query(collection(db, 'users'), where('marketCenterId', '==', marketCenterId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processUserDoc);
    }, []);

    const leaveTeam = useCallback(async () => {
        const db = getFirestoreInstance();
        if (!user || !userData?.teamId || !db) return { success: false, message: "Not on a team." };
        if (userData.role === 'team_leader') return { success: false, message: "Team leaders cannot leave." };
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', user.uid), { teamId: deleteField() });
        batch.update(doc(db, 'teams', userData.teamId), { memberIds: arrayRemove(user.uid) });
        await batch.commit();
        return { success: true, message: "Left team." };
    }, [user, userData]);

    const removeAgentFromTeam = useCallback(async (agentId: string) => {
        const db = getFirestoreInstance();
        if (!user || userData?.role !== 'team_leader' || !userData.teamId || !db) return { success: false, message: "Permission denied." };
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', agentId), { teamId: deleteField() });
        batch.update(doc(db, 'teams', userData.teamId), { memberIds: arrayRemove(agentId) });
        await batch.commit();
        return { success: true, message: "Agent removed." };
    }, [user, userData]);

    const getUserById = useCallback(async (userId: string) => {
        const db = getFirestoreInstance();
        if (!db) return null;
        const userDoc = await getDoc(doc(db, 'users', userId));
        return userDoc.exists() ? processUserDoc(userDoc) : null;
    }, []);

    const updateUserNewAgentStatus = useCallback(async (userId: string, isNew: boolean) => {
        const db = getFirestoreInstance();
        if (!db) return;
        await updateDoc(doc(db, 'users', userId), { isNewAgent: isNew });
    }, []);

    const getNewAgentResourcesForUser = useCallback(async (userId: string): Promise<NewAgentResources | null> => {
        const db = getFirestoreInstance();
        if (!db) return null;
        const docRef = doc(db, 'newAgentResources', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as NewAgentResources : null;
    }, []);

    const saveNewAgentResources = useCallback(async (resources: NewAgentResources) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) throw new Error("Auth error.");
        // Add scoping fields to the document for security rules
        await setDoc(doc(db, 'newAgentResources', user.uid), {
            ...resources,
            userId: user.uid,
            teamId: userData.teamId || null,
            marketCenterId: userData.marketCenterId || null,
            coachId: userData.coachId || null
        });
    }, [user, userData]);
    
    const updateUserMetrics = useCallback(async (userId: string, metrics: { gci?: number; listings?: number; calls?: number; appointments?: number; }) => {
        const db = getFirestoreInstance();
        if (!db) return;
        const updates: { [key: string]: any } = {};
        if (metrics.gci) updates.gci = increment(metrics.gci);
        if (metrics.listings) updates.listings = increment(metrics.listings);
        if (metrics.calls) updates.calls = increment(metrics.calls);
        if (metrics.appointments) updates.appointments = increment(metrics.appointments);
        if (Object.keys(updates).length > 0) await updateDoc(doc(db, 'users', userId), updates);
    }, []);
    
    const assignHomeworkToUser = useCallback(async (userId: string, homework: Omit<NewAgentHomework, 'id' | 'userId' | 'teamId' | 'marketCenterId'>) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        const targetUser = await getUserById(userId);
        await addDoc(collection(db, 'homework'), {
            ...homework, userId, teamId: targetUser?.teamId || null, marketCenterId: targetUser?.marketCenterId || null, coachId: targetUser?.coachId || null,
        });
        await createNotification({ userId, message: `${userData?.name} assigned homework: "${homework.title}"`, link: '/my-launchpad', triggeredByUserId: user.uid, triggeredByUserName: userData?.name });
    }, [user, userData, getUserById]);

    const getAssignedResourcesForUser = useCallback(async (targetUserId: string): Promise<AssignedResources> => {
        const db = getFirestoreInstance();
        if (!db || !user || !userData) return { homework: [], resourceLinks: [] };

        const homeworkRef = collection(db, 'homework');
        const linksRef = collection(db, 'resourceLinks');
        
        let hwQuery;
        let linksQuery;

        if (targetUserId === user.uid) {
             hwQuery = query(homeworkRef, where('userId', '==', targetUserId));
             linksQuery = query(linksRef, where('userId', '==', targetUserId));
        } else {
             // Manager viewing agent - must include scoping field to satisfy security rules
             if (P.isSuperAdmin(userData)) {
                 hwQuery = query(homeworkRef, where('userId', '==', targetUserId));
                 linksQuery = query(linksRef, where('userId', '==', targetUserId));
             } else if (P.isMcAdmin(userData) && userData.marketCenterId) {
                 hwQuery = query(homeworkRef, where('userId', '==', targetUserId), where('marketCenterId', '==', userData.marketCenterId));
                 linksQuery = query(linksRef, where('userId', '==', targetUserId), where('marketCenterId', '==', userData.marketCenterId));
             } else if (P.isCoach(userData)) {
                 hwQuery = query(homeworkRef, where('userId', '==', targetUserId), where('coachId', '==', user.uid));
                 linksQuery = query(linksRef, where('userId', '==', targetUserId), where('coachId', '==', user.uid)); 
             } else if (P.isTeamLeader(userData) && userData.teamId) {
                 hwQuery = query(homeworkRef, where('userId', '==', targetUserId), where('teamId', '==', userData.teamId));
                 linksQuery = query(linksRef, where('userId', '==', targetUserId), where('teamId', '==', userData.teamId));
             } else {
                 // Fallback / No permission
                 return { homework: [], resourceLinks: [] };
             }
        }

        try {
            const [hwSnap, linksSnap] = await Promise.all([
                getDocs(hwQuery),
                getDocs(linksQuery)
            ]);
            return {
                homework: hwSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as NewAgentHomework),
                resourceLinks: linksSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as NewAgentResourceLink),
            };
        } catch (error) {
            console.error("Error fetching assigned resources:", error);
            return { homework: [], resourceLinks: [] };
        }
    }, [user, userData]);

    const getHomeworkForManagedUsers = useCallback(async () => {
        const db = getFirestoreInstance();
        if (managedAgents.length === 0 || !userData || !user || !db) return {};
        const agentIds = managedAgents.map(a => a.id);
        const results: NewAgentHomework[] = [];
        const collectionRef = collection(db, 'homework');
    
        for (let i = 0; i < agentIds.length; i += 30) {
            const chunk = agentIds.slice(i, i + 30);
            if (chunk.length === 0) continue;
            let q;
            if (P.isSuperAdmin(userData)) q = query(collectionRef, where('userId', 'in', chunk));
            else if (P.isMcAdmin(userData) && userData.marketCenterId) q = query(collectionRef, where('marketCenterId', '==', userData.marketCenterId), where('userId', 'in', chunk));
            else if (P.isCoach(userData)) q = query(collectionRef, where('coachId', '==', user.uid), where('userId', 'in', chunk));
            else if (P.isTeamLeader(userData) && userData.teamId) q = query(collectionRef, where('teamId', '==', userData.teamId), where('userId', 'in', chunk));
            
            if (q) { const snapshot = await getDocs(q); snapshot.forEach(doc => results.push({ id: doc.id, ...(doc.data() as any) })); }
        }
        return results.reduce((acc, hw) => { if (!acc[hw.userId]) acc[hw.userId] = []; acc[hw.userId].push(hw); return acc; }, {} as Record<string, NewAgentHomework[]>);
    }, [managedAgents, userData, user]);

    const getHabitLogsForManagedUsers = useCallback(async () => {
        const db = getFirestoreInstance();
        if (managedAgents.length === 0 || !userData || !user || !db) return {};
        const agentIds = managedAgents.map(a => a.id);
        const results: Record<string, DailyTrackerData[]> = {};
        const allLogs: DailyTrackerData[] = [];
        const baseRef = collection(db, 'dailyTrackers');
    
        for (let i = 0; i < agentIds.length; i += 30) {
            const chunk = agentIds.slice(i, i + 30);
            if (chunk.length > 0) {
                let q;
                if (P.isSuperAdmin(userData)) q = query(baseRef, where('userId', 'in', chunk));
                else if (P.isMcAdmin(userData) && userData.marketCenterId) q = query(baseRef, where('marketCenterId', '==', userData.marketCenterId), where('userId', 'in', chunk));
                else if (P.isCoach(userData)) q = query(baseRef, where('coachId', '==', user.uid), where('userId', 'in', chunk));
                else if (P.isTeamLeader(userData) && userData.teamId) q = query(baseRef, where('teamId', '==', userData.teamId), where('userId', 'in', chunk));
                
                if (q) { const snapshot = await getDocs(q); snapshot.forEach(doc => allLogs.push(processDailyTrackerDoc(doc))); }
            }
        }
        agentIds.forEach(agentId => { results[agentId] = allLogs.filter(log => log.userId === agentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10); });
        return results;
    }, [managedAgents, userData, user]);

    const getHabitLogsForUser = useCallback(async (userId: string): Promise<DailyTrackerData[]> => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) return [];
        const baseRef = collection(db, 'dailyTrackers');
        let q;
        if (userId !== user.uid) {
            const agentProfile = await getUserById(userId);
            if (!agentProfile) return [];
            if (P.isSuperAdmin(userData)) q = query(baseRef, where('userId', '==', userId), orderBy('date', 'desc'));
            else if (P.isMcAdmin(userData) && userData.marketCenterId === agentProfile.marketCenterId) q = query(baseRef, where('userId', '==', userId), where('marketCenterId', '==', userData.marketCenterId), orderBy('date', 'desc'));
            else if (P.isCoach(userData) && agentProfile.coachId === user.uid) q = query(baseRef, where('userId', '==', userId), where('coachId', '==', user.uid), orderBy('date', 'desc'));
            else if (P.isTeamLeader(userData) && userData.teamId === agentProfile.teamId) q = query(baseRef, where('userId', '==', userId), where('teamId', '==', userData.teamId), orderBy('date', 'desc'));
            else return [];
        } else {
            q = query(baseRef, where('userId', '==', userId), orderBy('date', 'desc'));
        }
        if (!q) return [];
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processDailyTrackerDoc);
    }, [user, userData, getUserById]);
    
    const deleteHomeworkForUser = useCallback(async (homeworkId: string) => {
        const db = getFirestoreInstance();
        if (!db) return;
        await deleteDoc(doc(db, 'homework', homeworkId));
    }, []);

    const getCommissionProfileForUser = useCallback(async (userId: string): Promise<CommissionProfile | null> => {
        const db = getFirestoreInstance();
        if (!db) return null;
        const docRef = doc(db, 'commissionProfiles', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? processCommissionProfileDoc(docSnap) : null;
    }, []);

    const saveCommissionProfile = useCallback(async (profileData: Omit<CommissionProfile, 'id'>) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) throw new Error("Auth error.");
        // Add scoping fields for rules
        await setDoc(doc(db, 'commissionProfiles', user.uid), { 
            ...profileData, 
            userId: user.uid,
            marketCenterId: userData.marketCenterId || null,
            teamId: userData.teamId || null,
            coachId: userData.coachId || null
        });
    }, [user, userData]);
    
    const getAllTransactions = useCallback(async (): Promise<Transaction[]> => {
        const db = getFirestoreInstance();
        if (!user || !db) return [];
        const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processTransactionDoc);
    }, [user]);

    const getTransactionsForUser = useCallback(async (userId: string): Promise<Transaction[]> => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) return [];
        const baseRef = collection(db, 'transactions');
        let q;
        if (userId === user.uid) {
            q = query(baseRef, where('userId', '==', userId));
        } else {
            if (P.isSuperAdmin(userData)) q = query(baseRef, where('userId', '==', userId));
            else if (P.isMcAdmin(userData) && userData.marketCenterId) q = query(baseRef, where('marketCenterId', '==', userData.marketCenterId), where('userId', '==', userId));
            else if (P.isCoach(userData) && !P.isMcAdmin(userData)) q = query(baseRef, where('coachId', '==', user.uid), where('userId', '==', userId));
            else if (P.isTeamLeader(userData) && userData.teamId) q = query(baseRef, where('teamId', '==', userData.teamId), where('userId', '==', userId));
            else return [];
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processTransactionDoc);
    }, [user, userData]);

    const getAllCommissionProfiles = useCallback(async (): Promise<CommissionProfile[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const snapshot = await getDocs(collection(db, 'commissionProfiles'));
        return snapshot.docs.map(processCommissionProfileDoc);
    }, []);

    const addPerformanceLog = useCallback(async (logData: Omit<PerformanceLog, 'id' | 'coachId' | 'date'>) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) throw new Error("Auth error.");
        const agent = await getUserById(logData.agentId);
        await addDoc(collection(db, 'performanceLogs'), {
            ...logData, 
            coachId: user.uid, 
            date: serverTimestamp(), 
            teamId: agent?.teamId || null, 
            marketCenterId: agent?.marketCenterId || null,
            assignedCoachId: agent?.coachId || null // Save the assigned coach for permission checks
        });
        await createNotification({ userId: logData.agentId, message: `${userData.name} added a performance log.`, link: '/my-performance', triggeredByUserId: user.uid, triggeredByUserName: userData.name });
    }, [user, userData, getUserById]);

    const getPerformanceLogsForAgent = useCallback(async (agentId: string): Promise<PerformanceLog[]> => {
        const db = getFirestoreInstance();
        if (!userData || !user || !db) return [];
        const isManagerViewing = agentId !== user.uid;
        const baseRef = collection(db, 'performanceLogs');
        let q;
        const agentProfile = await getUserById(agentId);
        if (!agentProfile) return [];
        
        if (isManagerViewing) {
            if (P.isSuperAdmin(userData)) {
                q = query(baseRef, where('agentId', '==', agentId), orderBy('date', 'desc'));
            } else if (P.isMcAdmin(userData) && userData.marketCenterId === agentProfile.marketCenterId) {
                q = query(baseRef, where('agentId', '==', agentId), where('marketCenterId', '==', userData.marketCenterId), orderBy('date', 'desc'));
            } else if (P.isCoach(userData) && agentProfile.coachId === user.uid) {
                 // Removed author filter to allow assigned coach to see all logs for their agent (e.g. from MC Admin)
                 if (!userData.marketCenterId) return []; // Safety check
                 // Filter by agentId and MC to use index
                q = query(baseRef, where('agentId', '==', agentId), where('marketCenterId', '==', userData.marketCenterId), orderBy('date', 'desc'));
            } else if (P.isTeamLeader(userData) && userData.teamId === agentProfile.teamId) {
                q = query(baseRef, where('agentId', '==', agentId), where('teamId', '==', userData.teamId), orderBy('date', 'desc'));
            } else {
                return [];
            }
        } else {
            q = query(baseRef, where('agentId', '==', agentId), orderBy('date', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processPerformanceLogDoc);
    }, [user, userData, getUserById]);
    
    const getPerformanceLogsForManagedUsers = useCallback(async (): Promise<Record<string, PerformanceLog[]>> => {
        const db = getFirestoreInstance();
        if (managedAgents.length === 0 || !userData || !user || !db) return {};
        const agentIds = managedAgents.map(a => a.id);
        const results: Record<string, PerformanceLog[]> = {};
        const allLogs: PerformanceLog[] = [];
        const baseRef = collection(db, 'performanceLogs');
        for (let i = 0; i < agentIds.length; i += 30) {
            const chunk = agentIds.slice(i, i + 30);
            if (chunk.length > 0) {
                let q;
                if (P.isSuperAdmin(userData)) q = query(baseRef, where('agentId', 'in', chunk));
                else if (P.isMcAdmin(userData) && userData.marketCenterId) q = query(baseRef, where('marketCenterId', '==', userData.marketCenterId), where('agentId', 'in', chunk));
                else if (P.isCoach(userData)) {
                    // Allow coach to see all logs for managed agents
                     q = query(baseRef, where('marketCenterId', '==', userData.marketCenterId), where('agentId', 'in', chunk));
                }
                else if (P.isTeamLeader(userData) && userData.teamId) q = query(baseRef, where('teamId', '==', userData.teamId), where('agentId', 'in', chunk));
                
                if (q) { const snapshot = await getDocs(q); snapshot.forEach(doc => allLogs.push(processPerformanceLogDoc(doc))); }
            }
        }
        agentIds.forEach(agentId => { results[agentId] = allLogs.filter(log => log.agentId === agentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); });
        return results;
    }, [managedAgents, userData, user]);

    const getPerformanceLogsForCurrentUser = useCallback(async (): Promise<PerformanceLog[]> => {
        if (!user) return [];
        return getPerformanceLogsForAgent(user.uid);
    }, [user, getPerformanceLogsForAgent]);
    
    const updatePerformanceLog = useCallback(async (logId: string, updates: Partial<PerformanceLog>) => {
        const db = getFirestoreInstance();
        if (!db) return;
        await updateDoc(doc(db, 'performanceLogs', logId), updates);
    }, []);

    const updateContributingAgents = useCallback(async (agentIds: string[]) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        const agentIdsMap = agentIds.reduce((acc, id) => { acc[id] = true; return acc; }, {} as Record<string, boolean>);
        await updateDoc(doc(db, 'users', user.uid), { contributingAgentIds: agentIdsMap });
    }, [user]);

    const updateCoachRoster = useCallback(async (coachId: string, agentIds: string[]) => {
        const db = getFirestoreInstance();
        if (!db) return;
        const coachDocRef = doc(db, 'users', coachId);
        const coachDoc = await getDoc(coachDocRef);
        if (!coachDoc.exists()) throw new Error("Coach not found!");
        const coachData = coachDoc.data() as TeamMember;
        const oldAgentIds = new Set(Object.keys(coachData.contributingAgentIds || {}));
        const newAgentIdsSet = new Set(agentIds); // Renamed to avoid confusion with the map
        // Fix: Create newAgentIdsMap from newAgentIdsSet
        const newAgentIdsMap: Record<string, boolean> = {};
        newAgentIdsSet.forEach(id => {
            newAgentIdsMap[id] = true;
        });
        const batch = writeBatch(db);
        batch.update(coachDocRef, { contributingAgentIds: newAgentIdsMap });
        [...newAgentIdsSet].filter(id => !oldAgentIds.has(id)).forEach(agentId => batch.update(doc(db, 'users', agentId), { coachId: coachId }));
        [...oldAgentIds].filter(id => !newAgentIdsSet.has(id)).forEach(agentId => batch.update(doc(db, 'users', agentId), { coachId: deleteField() }));
    }, []);

    const updateUserCoachAssignment = useCallback(async (agentId: string, newCoachId: string | null) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) throw new Error("Auth error.");
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', agentId), { coachId: newCoachId || deleteField() });
        await batch.commit();
    }, [user, userData]);

    const updateUserTeamAffiliation = useCallback(async (agentId: string, newTeamId: string | null) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) throw new Error("Auth error.");
        const agentDocRef = doc(db, 'users', agentId);
        const agentDoc = await getDoc(agentDocRef);
        if (!agentDoc.exists()) throw new Error("Agent not found.");
        const currentAgentData = processUserDoc(agentDoc);
        const oldTeamId = currentAgentData.teamId;
        const batch = writeBatch(db);
        batch.update(agentDocRef, { teamId: newTeamId || deleteField() });
        if (oldTeamId && oldTeamId !== newTeamId) batch.update(doc(db, 'teams', oldTeamId), { memberIds: arrayRemove(agentId) });
        if (newTeamId && oldTeamId !== newTeamId) batch.update(doc(db, 'teams', newTeamId), { memberIds: arrayUnion(agentId) });
        await batch.commit();
    }, [user, userData]);

    const getBudgetModelForUser = useCallback(async (userId: string): Promise<BudgetModelInputs | null> => {
        const db = getFirestoreInstance();
        if (!db) return null;
        const docRef = doc(db, 'budgetModels', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as BudgetModelInputs : null;
    }, []);

    const saveBudgetModel = useCallback(async (data: BudgetModelInputs) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) throw new Error("Auth error.");
        // Add scoping fields for rules
        await setDoc(doc(db, 'budgetModels', user.uid), { 
            ...data, 
            userId: user.uid, 
            marketCenterId: userData.marketCenterId || null,
            teamId: userData.teamId || null,
            coachId: userData.coachId || null 
        });
    }, [user, userData]);
    
    const getMarketCenters = useCallback(async (): Promise<MarketCenter[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const snapshot = await getDocs(collection(db, 'marketCenters'));
        return snapshot.docs.map(doc => ({id: doc.id, ...(doc.data() as any)}) as MarketCenter);
    }, []);

    const createMarketCenter = useCallback(async (mcData: Omit<MarketCenter, 'id' | 'adminIds'>) => {
        const db = getFirestoreInstance();
        if (!db) return;
        await addDoc(collection(db, 'marketCenters'), { ...mcData, adminIds: [] });
    }, []);

    const deleteMarketCenter = useCallback(async (id: string) => {
        const db = getFirestoreInstance();
        if (!db) return;
        await deleteDoc(doc(db, 'marketCenters', id));
    }, []);

    const assignMcAdmin = useCallback(async (email: string, marketCenterId: string) => {
        const db = getFirestoreInstance();
        if (!db) return;
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error("User not found.");
        const userToUpdate = snapshot.docs[0];
        const batch = writeBatch(db);
        batch.update(userToUpdate.ref, { role: 'market_center_admin', marketCenterId });
        batch.update(doc(db, 'marketCenters', marketCenterId), { adminIds: arrayUnion(userToUpdate.id) });
        await batch.commit();
    }, []);

    const removeMcAdmin = useCallback(async (userId: string, marketCenterId: string) => {
        const db = getFirestoreInstance();
        if (!db) return;
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', userId), { role: 'agent', marketCenterId: deleteField() });
        batch.update(doc(db, 'marketCenters', marketCenterId), { adminIds: arrayRemove(userId) });
        await batch.commit();
    }, []);

    const updateUserMarketCenter = useCallback(async (marketCenterId: string | null) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        await updateDoc(doc(db, 'users', user.uid), { marketCenterId: marketCenterId || deleteField() });
    }, [user]);

    const updateUserRole = useCallback(async (userId: string, role: TeamMember['role']) => {
        const db = getFirestoreInstance();
        if (!db) return;
        await updateDoc(doc(db, 'users', userId), { role });
    }, []);

    const updateUserMarketCenterForAdmin = useCallback(async (userId: string, marketCenterId: string | null) => {
        const db = getFirestoreInstance();
        if (!db) return;
        await updateDoc(doc(db, 'users', userId), { marketCenterId: marketCenterId || deleteField() });
    }, []);

    const updateUserRoleAndMarketCenterAffiliation = useCallback(async (userId: string, newRole: TeamMember['role'], newMarketCenterId: string | null) => {
        const db = getFirestoreInstance();
        if (!db) throw new Error("Firebase is not configured.");

        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            throw new Error("User not found.");
        }

        const currentUserData = processUserDoc(userDocSnap);
        const oldRole = currentUserData.role;
        const oldMarketCenterId = currentUserData.marketCenterId;

        const batch = writeBatch(db);

        // 1. Update user document's role and marketCenterId
        const userUpdates: Partial<TeamMember> = { role: newRole };
        if (newMarketCenterId === null) {
            userUpdates.marketCenterId = deleteField() as any; // Firestore deleteField
        } else {
            userUpdates.marketCenterId = newMarketCenterId;
        }
        batch.update(userDocRef, userUpdates);

        // 2. Update market center adminIds array if necessary
        const wasMcAdmin = oldRole === 'market_center_admin';
        const isMcAdmin = newRole === 'market_center_admin';

        // Remove user from old Market Center's adminIds if:
        // - They were an MC Admin AND (no longer an MC Admin OR changed MCs)
        if (wasMcAdmin && oldMarketCenterId && (!isMcAdmin || oldMarketCenterId !== newMarketCenterId)) {
            batch.update(doc(db, 'marketCenters', oldMarketCenterId), {
                adminIds: arrayRemove(userId)
            });
        }

        // Add user to new Market Center's adminIds if:
        // - They are now an MC Admin AND (were not before OR changed MCs)
        if (isMcAdmin && newMarketCenterId && (!wasMcAdmin || oldMarketCenterId !== newMarketCenterId)) {
            batch.update(doc(db, 'marketCenters', newMarketCenterId), {
                adminIds: arrayUnion(userId)
            });
        }
        
        await batch.commit();
    }, []);

    const getAllTeams = useCallback(async (): Promise<Team[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const snapshot = await getDocs(collection(db, 'teams'));
        return snapshot.docs.map(d => ({id: d.id, ...(d.data() as any)}) as Team);
    }, []);

    const getAllTransactionsForAdmin = useCallback(async (): Promise<Transaction[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const snapshot = await getDocs(collection(db, 'transactions'));
        return snapshot.docs.map(processTransactionDoc);
    }, []);
    
    const updatePlaybookProgress = useCallback(async (playbookId: string, completedLessonIds: string[]) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        await updateDoc(doc(db, 'users', user.uid), { [`playbookProgress.${playbookId}`]: completedLessonIds });
    }, [user]);

    const updateOnboardingChecklistProgress = useCallback(async (completedItemIds: string[]) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        await updateDoc(doc(db, 'users', user.uid), { onboardingChecklistProgress: completedItemIds });
    }, [user]);

    const getPlaybooksForUser = useCallback(async (userId: string): Promise<Playbook[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.exists() ? processUserDoc(userDoc) : null;
        if (!userData) return [];
        const playbooksRef = collection(db, 'playbooks');
        const queriesToRun = [query(playbooksRef, where('teamId', '==', null), where('marketCenterId', '==', null))];
        if (userData.teamId) queriesToRun.push(query(playbooksRef, where('teamId', '==', userData.teamId)));
        if (userData.marketCenterId) queriesToRun.push(query(playbooksRef, where('marketCenterId', '==', userData.marketCenterId)));
        const allPlaybooks = new Map<string, Playbook>();
        for (const q of queriesToRun) {
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => { if (!allPlaybooks.has(doc.id)) allPlaybooks.set(doc.id, processPlaybookDoc(doc)); });
        }
        return Array.from(allPlaybooks.values());
    }, []);

    const getTransactionsForMarketCenter = useCallback(async (marketCenterId: string): Promise<Transaction[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const q = query(collection(db, 'transactions'), where('marketCenterId', '==', marketCenterId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processTransactionDoc);
    }, []);

    const getCommissionProfilesForMarketCenter = useCallback(async (agentIds: string[]): Promise<CommissionProfile[]> => {
        const db = getFirestoreInstance();
        if (!userData || !db) return [];
        if (!P.isSuperAdmin(userData) && !userData.marketCenterId) return [];
        
        // Optimization: If MC Admin, fetch all by MC ID first.
        if (P.isMcAdmin(userData) && userData.marketCenterId) {
             const q = query(
                collection(db, 'commissionProfiles'), 
                where('marketCenterId', '==', userData.marketCenterId)
            );
            const snapshot = await getDocs(q);
            const allProfiles = snapshot.docs.map(processCommissionProfileDoc);
            
            // Optional: Filter in memory if specific agentIds were requested, though for reporting usually all are needed.
            if (agentIds.length > 0) {
                const agentIdSet = new Set(agentIds);
                return allProfiles.filter(p => agentIdSet.has(p.id));
            }
            return allProfiles;
        }

        // Fallback logic for Super Admin or other roles requiring chunked lookup by ID
        if (agentIds.length === 0) return [];
        const profiles: CommissionProfile[] = [];
        const collectionRef = collection(db, 'commissionProfiles');

        for (let i = 0; i < agentIds.length; i += 30) {
            const chunk = agentIds.slice(i, i + 30);
            if (chunk.length > 0) {
                const q = query(collectionRef, where(documentId(), 'in', chunk));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => {
                    profiles.push(processCommissionProfileDoc(doc));
                });
            }
        }
        return profiles;
    }, [userData]);
    
    const getBudgetModelsForMarketCenter = useCallback(async (marketCenterId: string): Promise<BudgetModelInputs[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const q = query(collection(db, 'budgetModels'), where('marketCenterId', '==', marketCenterId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as BudgetModelInputs);
    }, []);

    const getCandidatesForMarketCenter = useCallback(async (marketCenterId: string): Promise<Candidate[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const q = query(collection(db, 'candidates'), where('marketCenterId', '==', marketCenterId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString(), lastContacted: (doc.data().lastContacted as Timestamp)?.toDate().toISOString() } as Candidate));
    }, []);

    const getCandidatesForRecruiter = useCallback(async (recruiterId: string): Promise<Candidate[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const q = query(collection(db, 'candidates'), where('recruiterId', '==', recruiterId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString(), lastContacted: (doc.data().lastContacted as Timestamp)?.toDate().toISOString() } as Candidate));
    }, []);

    const addCandidate = useCallback(async (data: Omit<Candidate, 'id' | 'createdAt' | 'lastContacted'>) => {
        const db = getFirestoreInstance();
        if (!db) throw new Error("Config error.");
        const docRef = await addDoc(collection(db, 'candidates'), { ...data, createdAt: serverTimestamp(), lastContacted: serverTimestamp() });
        return docRef.id;
    }, []);

    const updateCandidate = useCallback(async (id: string, data: Partial<Candidate>) => {
        const db = getFirestoreInstance();
        if (!db) return;
        const { id: candidateId, ...updates } = data;
        await updateDoc(doc(db, 'candidates', id), { ...updates, lastContacted: serverTimestamp() });
    }, []);

    const deleteCandidate = useCallback(async (id: string) => {
        const db = getFirestoreInstance();
        if (!db) return;
        await deleteDoc(doc(db, 'candidates', id));
    }, []);
    
    const getCandidateActivities = useCallback(async (candidateId: string): Promise<CandidateActivity[]> => {
        const db = getFirestoreInstance();
        if (!db) return [];
        const q = query(collection(db, 'candidateActivities'), where('candidateId', '==', candidateId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString() } as CandidateActivity));
    }, []);

    const addCandidateActivity = useCallback(async (candidateId: string, note: string) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) throw new Error("Auth error.");
        await addDoc(collection(db, 'candidateActivities'), { candidateId, note, userId: user.uid, userName: userData.name, createdAt: serverTimestamp() });
    }, [user, userData]);

    const getOrgBlueprintForUser = useCallback(async (userId: string): Promise<OrgBlueprint | null> => {
        const db = getFirestoreInstance();
        if (!db) return null;
        const docRef = doc(db, 'orgBlueprints', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as OrgBlueprint : null;
    }, []);

    // --- Client Lead Methods ---
    const addClientLead = useCallback(async (data: Omit<ClientLead, 'id' | 'createdAt' | 'lastContacted'>) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) throw new Error("Auth error.");
        const docRef = await addDoc(collection(db, 'clientLeads'), {
            ...data, createdAt: serverTimestamp(), lastContacted: serverTimestamp(), ownerId: user.uid, teamId: userData.teamId || null, marketCenterId: userData.marketCenterId || null,
        });
        return docRef.id;
    }, [user, userData]);

    const updateClientLead = useCallback(async (id: string, data: Partial<ClientLead>) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        const { id: clientLeadId, ...updates } = data;
        await updateDoc(doc(db, 'clientLeads', id), { ...updates, lastContacted: serverTimestamp() });
    }, [user]);

    const deleteClientLead = useCallback(async (id: string) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        await deleteDoc(doc(db, 'clientLeads', id));
    }, [user]);

    const getClientLeadsForUser = useCallback(async (userId: string): Promise<ClientLead[]> => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        const q = query(collection(db, 'clientLeads'), where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processClientLeadDoc);
    }, [user]);

    const getClientLeadsForTeam = useCallback(async (teamId: string): Promise<ClientLead[]> => {
        const db = getFirestoreInstance();
        if (!user || !teamId || !db) throw new Error("Auth error.");
        const q = query(collection(db, 'clientLeads'), where('teamId', '==', teamId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processClientLeadDoc);
    }, [user]);

    const getClientLeadActivities = useCallback(async (clientLeadId: string): Promise<ClientLeadActivity[]> => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        const q = query(collection(db, 'clientLeadActivities'), where('clientLeadId', '==', clientLeadId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processClientLeadActivityDoc);
    }, [user]);

    const addClientLeadActivity = useCallback(async (clientLeadId: string, note: string) => {
        const db = getFirestoreInstance();
        if (!user || !userData || !db) throw new Error("Auth error.");
        await addDoc(collection(db, 'clientLeadActivities'), { clientLeadId, note, userId: user.uid, userName: userData.name, createdAt: serverTimestamp() });
    }, [user, userData]);

    // --- Zapier ---
    const regenerateZapierApiKey = useCallback(async (): Promise<string> => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        const newKey = crypto.randomUUID();
        await updateDoc(doc(db, 'users', user.uid), { zapierApiKey: newKey });
        return newKey;
    }, [user]);

    const getWebhooks = useCallback(async (): Promise<Record<string, string>> => {
        const db = getFirestoreInstance();
        if (!user || !db) return {};
        const snapshot = await getDocs(collection(db, `users/${user.uid}/webhooks`));
        const webhooks: Record<string, string> = {};
        snapshot.forEach(doc => { webhooks[doc.id] = doc.data().url; });
        return webhooks;
    }, [user]);

    const saveWebhook = useCallback(async (event: string, url: string) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        await setDoc(doc(db, `users/${user.uid}/webhooks`, event), { url });
    }, [user]);

    const deleteWebhook = useCallback(async (event: string) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        await deleteDoc(doc(db, `users/${user.uid}/webhooks`, event));
    }, [user]);

    // --- Todo List ---
    const addTodo = useCallback(async (data: Partial<Omit<TodoItem, 'id' | 'userId' | 'createdAt' | 'isCompleted'>>) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        
        // Sanitize data to remove any potential 'undefined' values which cause Firestore addDoc to fail
        const safeData: any = { ...data };
        Object.keys(safeData).forEach(key => {
            if (safeData[key] === undefined) {
                delete safeData[key];
            }
        });

        const dataToSave: any = { 
            ...safeData, 
            userId: user.uid, 
            isCompleted: false, 
            createdAt: serverTimestamp(), 
            order: data.order || Date.now(), 
            text: data.text || 'New Task', 
            dueDate: data.dueDate || null, 
            priority: data.priority || 'Medium' 
        };
        
        if (data.clientLeadId) { 
            try {
                const leadDoc = await getDoc(doc(db, 'clientLeads', data.clientLeadId)); 
                if (leadDoc.exists()) dataToSave.clientLeadName = leadDoc.data().name;
            } catch(e) { console.warn("Could not fetch client lead name for todo"); }
        } else if (data.candidateId) {
            try {
                const candidateDoc = await getDoc(doc(db, 'candidates', data.candidateId)); 
                if (candidateDoc.exists()) dataToSave.candidateName = candidateDoc.data().name;
            } catch(e) { console.warn("Could not fetch candidate name for todo"); }
        }
        
        await addDoc(collection(db, 'todos'), dataToSave);
    }, [user]);

    const updateTodo = useCallback(async (todoId: string, updates: Partial<Omit<TodoItem, 'id' | 'userId' | 'createdAt'>>) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        const updatesWithTimestamp: any = { ...updates };
        if (updates.dueDate === '') updatesWithTimestamp.dueDate = null;
        await updateDoc(doc(db, 'todos', todoId), updatesWithTimestamp);
    }, [user]);

    const deleteTodo = useCallback(async (todoId: string) => {
        const db = getFirestoreInstance();
        if (!user || !db) throw new Error("Auth error.");
        await deleteDoc(doc(db, 'todos', todoId));
    }, [user]);

    const getTodosForUserDateRange = useCallback(async (startDate: string, endDate: string): Promise<TodoItem[]> => {
        const db = getFirestoreInstance();
        if (!user || !db) return [];
        const q = query(collection(db, 'todos'), where('userId', '==', user.uid), where('dueDate', '>=', startDate), where('dueDate', '<=', endDate), orderBy('dueDate', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processTodoItemDoc);
    }, [user]);

    const getUndatedTodosForUser = useCallback(async (): Promise<TodoItem[]> => {
        const db = getFirestoreInstance();
        if (!user || !db) return [];
        const q = query(collection(db, 'todos'), where('userId', '==', user.uid), where('dueDate', '==', null));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processTodoItemDoc);
    }, [user]);

    const getLinkableContacts = useCallback(async (): Promise<{ leads: ClientLead[], candidates: Candidate[] }> => {
        if (!user || !userData) return { leads: [], candidates: [] };
        let leads: ClientLead[] = [];
        let candidates: Candidate[] = [];
        if (P.isTeamLeader(userData) && userData.teamId) leads = await getClientLeadsForTeam(userData.teamId);
        else leads = await getClientLeadsForUser(user.uid);
        if (P.isRecruiter(userData) || P.isCoach(userData) || P.isMcAdmin(userData) || P.isSuperAdmin(userData)) {
            if (P.isMcAdmin(userData) && userData.marketCenterId) candidates = await getCandidatesForMarketCenter(userData.marketCenterId);
            else if (P.isRecruiter(userData)) candidates = await getCandidatesForRecruiter(user.uid);
        }
        return { leads, candidates };
    }, [user, userData, getClientLeadsForTeam, getClientLeadsForUser, getCandidatesForMarketCenter, getCandidatesForRecruiter]);

    const value = useMemo(() => ({
        user, userData, loading, managedAgents, loadingAgents, agentsError, signUpWithEmail, createAccountForAgent, signInWithEmail, logout,
        updateUserProfile, updatePassword, joinTeam, createTeam, updateTheme, getTeamById, getUsersByIds,
        getAllUsers, getUsersForMarketCenter, leaveTeam, removeAgentFromTeam, getUserById, updateUserNewAgentStatus, getNewAgentResourcesForUser,
        saveNewAgentResources, updateUserMetrics, assignHomeworkToUser, getAssignedResourcesForUser,
        getHomeworkForManagedUsers, getHabitLogsForManagedUsers, getHabitLogsForUser, deleteHomeworkForUser, getCommissionProfileForUser,
        saveCommissionProfile, getAllTransactions, getTransactionsForUser, getAllCommissionProfiles, addPerformanceLog,
        getPerformanceLogsForAgent, getPerformanceLogsForCurrentUser, getPerformanceLogsForManagedUsers, updatePerformanceLog, updateContributingAgents,
        updateCoachRoster, updateUserCoachAssignment, updateUserTeamAffiliation, getBudgetModelForUser, saveBudgetModel, getMarketCenters, createMarketCenter, deleteMarketCenter, assignMcAdmin,
        removeMcAdmin, updateUserMarketCenter, updateUserMarketCenterForAdmin, updateUserRole, updateUserRoleAndMarketCenterAffiliation, getAllTeams, getAllTransactionsForAdmin,
        updatePlaybookProgress, updateOnboardingChecklistProgress, getOrgBlueprintForUser, getPlaybooksForUser,
        getTransactionsForMarketCenter, getCommissionProfilesForMarketCenter, getBudgetModelsForMarketCenter, getCandidatesForMarketCenter,
        getCandidatesForRecruiter,
        addCandidate, updateCandidate, deleteCandidate, getCandidateActivities, addCandidateActivity,
        addClientLead, updateClientLead, deleteClientLead, getClientLeadsForUser, getClientLeadsForTeam, getClientLeadActivities, addClientLeadActivity,
        regenerateZapierApiKey, getWebhooks, saveWebhook, deleteWebhook,
        addTodo, updateTodo, deleteTodo, getTodosForUserDateRange, getUndatedTodosForUser, getLinkableContacts
    }), [
        user, userData, loading, managedAgents, loadingAgents, agentsError, signUpWithEmail, createAccountForAgent, signInWithEmail, logout,
        updateUserProfile, updatePassword, joinTeam, createTeam, updateTheme, getTeamById, getUsersByIds,
        getAllUsers, getUsersForMarketCenter, leaveTeam, removeAgentFromTeam, getUserById, updateUserNewAgentStatus, getNewAgentResourcesForUser,
        saveNewAgentResources, updateUserMetrics, assignHomeworkToUser, getAssignedResourcesForUser,
        getHomeworkForManagedUsers, getHabitLogsForManagedUsers, getHabitLogsForUser, deleteHomeworkForUser, getCommissionProfileForUser,
        saveCommissionProfile, getAllTransactions, getTransactionsForUser, getAllCommissionProfiles, addPerformanceLog,
        getPerformanceLogsForAgent, getPerformanceLogsForCurrentUser, getPerformanceLogsForManagedUsers, updatePerformanceLog, updateContributingAgents,
        updateCoachRoster, updateUserCoachAssignment, updateUserTeamAffiliation, getBudgetModelForUser, saveBudgetModel, getMarketCenters, createMarketCenter, deleteMarketCenter, assignMcAdmin,
        removeMcAdmin, updateUserMarketCenter, updateUserMarketCenterForAdmin, updateUserRole, updateUserRoleAndMarketCenterAffiliation, getAllTeams, getAllTransactionsForAdmin,
        updatePlaybookProgress, updateOnboardingChecklistProgress, getOrgBlueprintForUser, getPlaybooksForUser,
        getTransactionsForMarketCenter, getCommissionProfilesForMarketCenter, getBudgetModelsForMarketCenter, getCandidatesForMarketCenter,
        getCandidatesForRecruiter,
        addCandidate, updateCandidate, deleteCandidate, getCandidateActivities, addCandidateActivity,
        addClientLead, updateClientLead, deleteClientLead, getClientLeadsForUser, getClientLeadsForTeam, getClientLeadActivities, addClientLeadActivity,
        regenerateZapierApiKey, getWebhooks, saveWebhook, deleteWebhook,
        addTodo, updateTodo, deleteTodo, getTodosForUserDateRange, getUndatedTodosForUser, getLinkableContacts
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};