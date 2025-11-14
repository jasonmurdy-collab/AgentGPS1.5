import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { getAuthInstance, getFirestoreInstance } from './firebaseConfig';
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updatePassword as firebaseUpdatePassword,
    User as FirebaseUser
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
    DocumentSnapshot
} from 'firebase/firestore';
import { createNotification } from './lib/notifications';
import { processDailyTrackerDoc, processTransactionDoc, processNotificationDoc, processCommissionProfileDoc, processUserDoc, processTeamDoc, processPerformanceLogDoc, processPlaybookDoc, processClientLeadDoc, processClientLeadActivityDoc, processTodoItemDoc } from './lib/firestoreUtils';
import type { Team, TeamMember, NewAgentResources, NewAgentGoalTemplate, NewAgentHomework, NewAgentResourceLink, CommissionProfile, Transaction, PerformanceLog, DailyTrackerData, BudgetModelInputs, ProspectingSession, MarketCenter, Goal, Lesson, Candidate, CandidateActivity, ClientLead, ClientLeadActivity, OrgBlueprint, Playbook, TodoItem, Priority } from './types';

// --- PERMISSION HELPERS ---
// This object centralizes role-based access control logic.
// The hierarchy is generally: Super Admin > MC Admin > Prod. Coach > Team Leader > Agent
// Recruiter is a separate track.
export const P = {
  // Hierarchical checks (if you're a coach, you're also a team leader)
  isSuperAdmin: (user: TeamMember | null): boolean => !!user?.isSuperAdmin,
  isMcAdmin: (user: TeamMember | null): boolean => P.isSuperAdmin(user) || user?.role === 'market_center_admin',
  isCoach: (user: TeamMember | null): boolean => P.isMcAdmin(user) || user?.role === 'productivity_coach',
  isTeamLeader: (user: TeamMember | null): boolean => P.isCoach(user) || user?.role === 'team_leader',
  isRecruiter: (user: TeamMember | null): boolean => user?.role === 'recruiter',
  
  // Specific, non-hierarchical checks for routing
  canManageResources: (user: TeamMember | null): boolean => P.isTeamLeader(user) || P.isCoach(user) || P.isMcAdmin(user), // For playbooks etc. TL, Coach, MCA, SA
  canAccessCoachingTools: (user: TeamMember | null): boolean => user?.role === 'team_leader' || user?.role === 'productivity_coach', // for agent logs, agent architect. Just TL and Coach
  canSeeMyPerformance: (user: TeamMember | null): boolean => user?.role === 'agent' || user?.role === 'team_leader', // for my performance. Agent, TL.
  canSeeGrowthArchitect: (user: TeamMember | null): boolean => P.isMcAdmin(user) || user?.role === 'agent' || P.isTeamLeader(user), // MCA, SA, TL, Agent. Excludes Coach.
  canSeeRecruitmentPlaybook: (user: TeamMember | null): boolean => user?.role === 'team_leader' || user?.role === 'recruiter', // TL, Recruiter only.
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
  getBudgetModelForUser: (userId: string) => Promise<BudgetModelInputs | null>;
  saveBudgetModel: (data: BudgetModelInputs) => Promise<void>;
  getMarketCenters: () => Promise<MarketCenter[]>;
  createMarketCenter: (mcData: Omit<MarketCenter, 'id' | 'adminIds'>) => Promise<void>;
  deleteMarketCenter: (id: string) => Promise<void>;
  assignMcAdmin: (email: string, marketCenterId: string) => Promise<void>;
  removeMcAdmin: (userId: string, marketCenterId: string) => Promise<void>;
  updateUserMarketCenter: (marketCenterId: string | null) => Promise<void>;
  updateUserMarketCenterForAdmin: (userId: string, marketCenterId: string | null) => Promise<void>;
  updateUserCoachAssignment: (agentId: string, newCoachId: string | null) => Promise<void>;
  updateUserTeamAffiliation: (agentId: string, newTeamId: string | null) => Promise<void>;
  getAllTeams: () => Promise<Team[]>;
  getAllTransactionsForAdmin: () => Promise<Transaction[]>;
  updateUserRole: (userId: string, role: TeamMember['role']) => Promise<void>;
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
  
  // --- New Client Lead Pipeline Methods ---
  addClientLead: (data: Omit<ClientLead, 'id' | 'createdAt' | 'lastContacted'>) => Promise<string>;
  updateClientLead: (id: string, data: Partial<ClientLead>) => Promise<void>;
  deleteClientLead: (id: string) => Promise<void>;
  getClientLeadsForUser: (userId: string) => Promise<ClientLead[]>;
  getClientLeadsForTeam: (teamId: string) => Promise<ClientLead[]>;
  getClientLeadActivities: (clientLeadId: string) => Promise<ClientLeadActivity[]>;
  addClientLeadActivity: (clientLeadId: string, note: string) => Promise<void>;
  // --- End New Client Lead Pipeline Methods ---

  // --- Zapier Integration Methods ---
  regenerateZapierApiKey: () => Promise<string>;
  getWebhooks: () => Promise<Record<string, string>>;
  saveWebhook: (event: string, url: string) => Promise<void>;
  deleteWebhook: (event: string) => Promise<void>;
  // --- End Zapier Integration Methods ---

  // --- New Todo List Methods ---
  addTodo: (text: string, dueDate: string | null, priority: Priority) => Promise<void>;
  updateTodo: (todoId: string, updates: Partial<Omit<TodoItem, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  getTodosForUserDateRange: (startDate: string, endDate: string) => Promise<TodoItem[]>;
  getUndatedTodosForUser: () => Promise<TodoItem[]>;
  // --- End Todo List Methods ---
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
        const unsubscribe = onAuthStateChanged(getAuthInstance(), (firebaseUser) => {
            setUser(firebaseUser);
            if (!firebaseUser) {
                setUserData(null);
                setLoading(false);
            }
        });
        return unsubscribe;
    }, []);

    const getUsersByIds = useCallback(async (userIds: string[]): Promise<TeamMember[]> => {
        if (userIds.length === 0) return [];
        const users: TeamMember[] = [];
        const chunkSize = 30; 
        for (let i = 0; i < userIds.length; i += chunkSize) {
            const chunk = userIds.slice(i, i + chunkSize);
            const q = query(collection(getFirestoreInstance(), 'users'), where(documentId(), 'in', chunk));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                users.push(processUserDoc(doc));
            });
        }
        return users;
    }, []);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        if (user) {
            setLoading(true);
            const userDocRef = doc(getFirestoreInstance(), 'users', user.uid);
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
        if (!userData) {
            setManagedAgents([]);
            setLoadingAgents(false);
            setAgentsError(null);
            return;
        }

        setLoadingAgents(true);
        setAgentsError(null);
        const usersCollection = collection(getFirestoreInstance(), 'users');
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
        const userCredential = await createUserWithEmailAndPassword(getAuthInstance(), email, password);
        const newUser = userCredential.user;

        const batch = writeBatch(getFirestoreInstance());

        const userDocRef = doc(getFirestoreInstance(), 'users', newUser.uid);
        const userProfile: Omit<UserProfile, 'id'> = {
            name,
            email,
            role: options.role || 'agent',
            gci: 0,
            listings: 0,
            calls: 0,
            appointments: 0,
            isNewAgent: true,
            playbookProgress: {},
            teamId: options.teamId || null,
            marketCenterId: options.marketCenterId || null,
        };

        if (options.teamId) {
            const teamDocRef = doc(getFirestoreInstance(), 'teams', options.teamId);
            batch.update(teamDocRef, { memberIds: arrayUnion(newUser.uid) });
        }
        
        batch.set(userDocRef, userProfile);

        if (options.role === 'market_center_admin' && options.marketCenterId) {
            const mcDocRef = doc(getFirestoreInstance(), 'marketCenters', options.marketCenterId);
            batch.update(mcDocRef, { adminIds: arrayUnion(newUser.uid) });
        }

        await batch.commit();
    }, []);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        await signInWithEmailAndPassword(getAuthInstance(), email, password);
    }, []);

    const logout = useCallback(async () => {
        await signOut(getAuthInstance());
    }, []);

    const updateUserProfile = useCallback(async (profileData: Partial<Pick<TeamMember, 'name' | 'bio'>>) => {
        if (!user) throw new Error("User not authenticated");
        await updateDoc(doc(getFirestoreInstance(), 'users', user.uid), profileData);
    }, [user]);

    const updatePassword = useCallback(async (password: string) => {
        if (!getAuthInstance().currentUser) throw new Error("User not authenticated");
        await firebaseUpdatePassword(getAuthInstance().currentUser, password);
    }, []);
    
    const joinTeam = useCallback(async (teamCode: string) => {
        if (!user || !userData) return { success: false, message: "You must be logged in to join a team." };

        const q = query(collection(getFirestoreInstance(), 'teams'), where('teamCode', '==', teamCode.trim()));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return { success: false, message: "Invalid team code." };
        }
        const teamDoc = snapshot.docs[0];
        const teamId = teamDoc.id;

        const batch = writeBatch(getFirestoreInstance());
        batch.update(doc(getFirestoreInstance(), 'users', user.uid), { teamId });
        batch.update(doc(getFirestoreInstance(), 'teams', teamId), { memberIds: arrayUnion(user.uid) });
        await batch.commit();
        
        return { success: true, message: `Successfully joined ${teamDoc.data().name}!` };
    }, [user, userData]);

    const createTeam = useCallback(async (teamName: string) => {
        if (!user || !userData) throw new Error("User not authenticated.");

        const teamCode = `TEAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const newTeamRef = doc(collection(getFirestoreInstance(), 'teams'));
        const newTeam: Team = {
            id: newTeamRef.id,
            name: teamName,
            creatorId: user.uid,
            memberIds: [user.uid],
            teamCode: teamCode,
        };

        const batch = writeBatch(getFirestoreInstance());
        batch.set(newTeamRef, newTeam);
        batch.update(doc(getFirestoreInstance(), 'users', user.uid), { role: 'team_leader', teamId: newTeamRef.id });
        await batch.commit();

    }, [user, userData]);
    
    const updateTheme = useCallback(async (theme: string) => {
        if (!user) return;
        await updateDoc(doc(getFirestoreInstance(), 'users', user.uid), { theme });
    }, [user]);

    const getTeamById = useCallback(async (teamId: string) => {
        const teamDoc = await getDoc(doc(getFirestoreInstance(), 'teams', teamId));
        return teamDoc.exists() ? processTeamDoc(teamDoc) : null;
    }, []);
    
    const getAllUsers = useCallback(async (): Promise<TeamMember[]> => {
        const snapshot = await getDocs(collection(getFirestoreInstance(), 'users'));
        return snapshot.docs.map(processUserDoc);
    }, []);

    const getUsersForMarketCenter = useCallback(async (marketCenterId: string): Promise<TeamMember[]> => {
        const q = query(collection(getFirestoreInstance(), 'users'), where('marketCenterId', '==', marketCenterId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processUserDoc);
    }, []);

    const leaveTeam = useCallback(async () => {
        if (!user || !userData?.teamId) return { success: false, message: "You are not on a team." };
        if (userData.role === 'team_leader') return { success: false, message: "Team leaders cannot leave their team. You must transfer ownership first." };
        
        const batch = writeBatch(getFirestoreInstance());
        batch.update(doc(getFirestoreInstance(), 'users', user.uid), { teamId: deleteField() });
        batch.update(doc(getFirestoreInstance(), 'teams', userData.teamId), { memberIds: arrayRemove(user.uid) });
        await batch.commit();
        return { success: true, message: "You have left the team." };
    }, [user, userData]);

    const removeAgentFromTeam = useCallback(async (agentId: string) => {
        if (!user || userData?.role !== 'team_leader' || !userData.teamId) return { success: false, message: "You don't have permission to do this." };
        
        const batch = writeBatch(getFirestoreInstance());
        batch.update(doc(getFirestoreInstance(), 'users', agentId), { teamId: deleteField() });
        batch.update(doc(getFirestoreInstance(), 'teams', userData.teamId), { memberIds: arrayRemove(agentId) });
        await batch.commit();
        return { success: true, message: "Agent removed." };
    }, [user, userData]);

    const getUserById = useCallback(async (userId: string) => {
        const userDoc = await getDoc(doc(getFirestoreInstance(), 'users', userId));
        return userDoc.exists() ? processUserDoc(userDoc) : null;
    }, []);

    const updateUserNewAgentStatus = useCallback(async (userId: string, isNew: boolean) => {
        await updateDoc(doc(getFirestoreInstance(), 'users', userId), { isNewAgent: isNew });
    }, []);

    const getNewAgentResourcesForUser = useCallback(async (userId: string): Promise<NewAgentResources | null> => {
        const docRef = doc(getFirestoreInstance(), 'newAgentResources', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as NewAgentResources : null;
    }, []);

    const saveNewAgentResources = useCallback(async (resources: NewAgentResources) => {
        if (!user) throw new Error("User not authenticated.");
        await setDoc(doc(getFirestoreInstance(), 'newAgentResources', user.uid), resources);
    }, [user]);
    
    const updateUserMetrics = useCallback(async (userId: string, metrics: { gci?: number; listings?: number; calls?: number; appointments?: number; }) => {
        const updates: { [key: string]: any } = {};
        if (metrics.gci) updates.gci = increment(metrics.gci);
        if (metrics.listings) updates.listings = increment(metrics.listings);
        if (metrics.calls) updates.calls = increment(metrics.calls);
        if (metrics.appointments) updates.appointments = increment(metrics.appointments);
        
        if (Object.keys(updates).length > 0) {
            await updateDoc(doc(getFirestoreInstance(), 'users', userId), updates);
        }
    }, []);
    
    const assignHomeworkToUser = useCallback(async (userId: string, homework: Omit<NewAgentHomework, 'id' | 'userId' | 'teamId' | 'marketCenterId'>) => {
        if (!user) throw new Error("User not authenticated.");
        const targetUser = await getUserById(userId);
        await addDoc(collection(getFirestoreInstance(), 'homework'), {
            ...homework,
            userId,
            teamId: targetUser?.teamId || null,
            marketCenterId: targetUser?.marketCenterId || null,
            coachId: targetUser?.coachId || null,
        });
        await createNotification({ userId, message: `${userData?.name} assigned you new homework: "${homework.title}"`, link: '/my-launchpad', triggeredByUserId: user.uid, triggeredByUserName: userData?.name });
    }, [user, userData, getUserById]);

    const getAssignedResourcesForUser = useCallback(async (userId: string): Promise<AssignedResources> => {
        const homeworkQuery = query(collection(getFirestoreInstance(), 'homework'), where('userId', '==', userId));
        const linksQuery = query(collection(getFirestoreInstance(), 'resourceLinks'), where('userId', '==', userId));
        
        const [hwSnap, linksSnap] = await Promise.all([getDocs(homeworkQuery), getDocs(linksQuery)]);
        
        return {
            homework: hwSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as NewAgentHomework),
            resourceLinks: linksSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as NewAgentResourceLink),
        };
    }, []);

    const getHomeworkForManagedUsers = useCallback(async () => {
        if (managedAgents.length === 0 || !userData || !user) return {};
        const agentIds = managedAgents.map(a => a.id);
        const collectionRef = collection(getFirestoreInstance(), 'homework');
        const results: NewAgentHomework[] = [];
    
        for (let i = 0; i < agentIds.length; i += 30) {
            const chunk = agentIds.slice(i, i + 30);
            if (chunk.length === 0) continue;
    
            let q;
            if (P.isSuperAdmin(userData)) {
                q = query(collectionRef, where('userId', 'in', chunk));
            } else if (P.isMcAdmin(userData) && userData.marketCenterId) {
                q = query(collectionRef, where('marketCenterId', '==', userData.marketCenterId), where('userId', 'in', chunk));
            } else if (P.isCoach(userData)) {
                q = query(collectionRef, where('coachId', '==', user.uid), where('userId', 'in', chunk));
            } else if (P.isTeamLeader(userData) && userData.teamId) {
                q = query(collectionRef, where('teamId', '==', userData.teamId), where('userId', 'in', chunk));
            }
            
            if (q) {
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => results.push({ id: doc.id, ...(doc.data() as any) }));
            }
        }
        
        return results.reduce((acc, hw) => {
            if (!acc[hw.userId]) acc[hw.userId] = [];
            acc[hw.userId].push(hw);
            return acc;
        }, {} as Record<string, NewAgentHomework[]>);
    }, [managedAgents, userData, user]);

    const getHabitLogsForManagedUsers = useCallback(async () => {
        if (managedAgents.length === 0 || !userData || !user) return {};
    
        const agentIds = managedAgents.map(a => a.id);
        const results: Record<string, DailyTrackerData[]> = {};
        const allLogs: DailyTrackerData[] = [];
        const baseRef = collection(getFirestoreInstance(), 'dailyTrackers');
    
        for (let i = 0; i < agentIds.length; i += 30) {
            const chunk = agentIds.slice(i, i + 30);
            if (chunk.length > 0) {
                let q;
                if (P.isSuperAdmin(userData)) {
                    q = query(baseRef, where('userId', 'in', chunk));
                } else if (P.isMcAdmin(userData) && userData.marketCenterId) {
                    q = query(baseRef, where('marketCenterId', '==', userData.marketCenterId), where('userId', 'in', chunk));
                } else if (P.isCoach(userData)) {
                    q = query(baseRef, where('coachId', '==', user.uid), where('userId', 'in', chunk));
                } else if (P.isTeamLeader(userData) && userData.teamId) {
                    q = query(baseRef, where('teamId', '==', userData.teamId), where('userId', 'in', chunk));
                }
                
                if (q) {
                    const snapshot = await getDocs(q);
                    snapshot.forEach(doc => allLogs.push(processDailyTrackerDoc(doc)));
                }
            }
        }
    
        agentIds.forEach(agentId => {
            results[agentId] = allLogs
                .filter(log => log.userId === agentId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10);
        });
    
        return results;
    }, [managedAgents, userData, user]);

    const getHabitLogsForUser = useCallback(async (userId: string): Promise<DailyTrackerData[]> => {
        if (!user || !userData) return [];
        
        const baseRef = collection(getFirestoreInstance(), 'dailyTrackers');
        let q;
        const isManagerViewing = userId !== user.uid;

        if (isManagerViewing) {
            const agentProfile = await getUserById(userId);
            if (!agentProfile) return [];
            
            if (P.isSuperAdmin(userData)) {
                q = query(baseRef, where('userId', '==', userId), orderBy('date', 'desc'));
            } else if (P.isMcAdmin(userData) && userData.marketCenterId === agentProfile.marketCenterId) {
                q = query(baseRef, where('userId', '==', userId), orderBy('date', 'desc'));
            } else if (P.isCoach(userData) && agentProfile.coachId === user.uid) {
                q = query(baseRef, where('userId', '==', userId), orderBy('date', 'desc'));
            } else if (P.isTeamLeader(userData) && userData.teamId === agentProfile.teamId) {
                q = query(baseRef, where('userId', '==', userId), orderBy('date', 'desc'));
            } else {
                return []; // No permission
            }
        } else {
            q = query(baseRef, where('userId', '==', userId), orderBy('date', 'desc'));
        }

        if (!q) return [];

        const snapshot = await getDocs(q);
        return snapshot.docs.map(processDailyTrackerDoc);
    }, [user, userData, getUserById]);
    
    const deleteHomeworkForUser = useCallback(async (homeworkId: string) => {
        await deleteDoc(doc(getFirestoreInstance(), 'homework', homeworkId));
    }, []);

    const getCommissionProfileForUser = useCallback(async (userId: string): Promise<CommissionProfile | null> => {
        const docRef = doc(getFirestoreInstance(), 'commissionProfiles', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? processCommissionProfileDoc(docSnap) : null;
    }, []);

    const saveCommissionProfile = useCallback(async (profileData: Omit<CommissionProfile, 'id'>) => {
        if (!user || !userData) throw new Error("User not authenticated.");
        await setDoc(doc(getFirestoreInstance(), 'commissionProfiles', user.uid), { 
            ...profileData,
            marketCenterId: userData.marketCenterId || null 
        });
    }, [user, userData]);
    
    const getAllTransactions = useCallback(async (): Promise<Transaction[]> => {
        if (!user) return [];
        const q = query(collection(getFirestoreInstance(), 'transactions'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processTransactionDoc);
    }, [user]);

    const getTransactionsForUser = useCallback(async (userId: string): Promise<Transaction[]> => {
        if (!user || !userData) return [];

        const baseRef = collection(getFirestoreInstance(), 'transactions');
        let q;
        const isManagerViewing = userId !== user.uid;

        if (isManagerViewing) {
            const agentProfile = await getUserById(userId);
            if (!agentProfile) return [];

             if (P.isSuperAdmin(userData)) {
                q = query(baseRef, where('userId', '==', userId));
            } else if (P.isMcAdmin(userData) && userData.marketCenterId === agentProfile.marketCenterId) {
                q = query(baseRef, where('userId', '==', userId));
            } else if (P.isCoach(userData) && agentProfile.coachId === user.uid) {
                q = query(baseRef, where('userId', '==', userId));
            } else if (P.isTeamLeader(userData) && userData.teamId === agentProfile.teamId) {
                q = query(baseRef, where('userId', '==', userId));
            } else {
                return []; // No permission
            }
        } else {
            q = query(baseRef, where('userId', '==', userId));
        }

        if (!q) return [];
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processTransactionDoc);
    }, [user, userData, getUserById]);

    const getAllCommissionProfiles = useCallback(async (): Promise<CommissionProfile[]> => {
        const snapshot = await getDocs(collection(getFirestoreInstance(), 'commissionProfiles'));
        return snapshot.docs.map(processCommissionProfileDoc);
    }, []);

    const addPerformanceLog = useCallback(async (logData: Omit<PerformanceLog, 'id' | 'coachId' | 'date'>) => {
        if (!user || !userData) throw new Error("User not authenticated.");
        const agent = await getUserById(logData.agentId);
        await addDoc(collection(getFirestoreInstance(), 'performanceLogs'), {
            ...logData,
            coachId: user.uid,
            date: serverTimestamp(),
            teamId: agent?.teamId || null,
            marketCenterId: agent?.marketCenterId || null,
        });
        await createNotification({
            userId: logData.agentId,
            message: `${userData.name} added a new performance log for you.`,
            link: '/my-performance',
            triggeredByUserId: user.uid,
            triggeredByUserName: userData.name
        });
    }, [user, userData, getUserById]);

    const getPerformanceLogsForAgent = useCallback(async (agentId: string): Promise<PerformanceLog[]> => {
        if (!userData || !user) return [];

        const isManagerViewing = agentId !== user.uid;
        const baseRef = collection(getFirestoreInstance(), 'performanceLogs');
        let q;
        
        const agentProfile = await getUserById(agentId);
        if (!agentProfile) return [];

        if (isManagerViewing) {
            if (P.isSuperAdmin(userData)) {
                q = query(baseRef, where('agentId', '==', agentId), orderBy('date', 'desc'));
            } else if (P.isMcAdmin(userData) && userData.marketCenterId === agentProfile.marketCenterId) {
                q = query(baseRef, where('agentId', '==', agentId), orderBy('date', 'desc'));
            } else if (P.isCoach(userData) && agentProfile.coachId === user.uid) {
                q = query(baseRef, where('agentId', '==', agentId), orderBy('date', 'desc'));
            } else if (P.isTeamLeader(userData) && userData.teamId === agentProfile.teamId) {
                q = query(baseRef, where('agentId', '==', agentId), orderBy('date', 'desc'));
            } else {
                // Not a manager of this agent
                return [];
            }
        } else {
            // Viewing their own logs
            q = query(baseRef, where('agentId', '==', agentId), orderBy('date', 'desc'));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(processPerformanceLogDoc);
    }, [user, userData, getUserById]);
    
    const getPerformanceLogsForManagedUsers = useCallback(async (): Promise<Record<string, PerformanceLog[]>> => {
        if (managedAgents.length === 0 || !userData || !user) return {};
    
        const agentIds = managedAgents.map(a => a.id);
        const results: Record<string, PerformanceLog[]> = {};
        const allLogs: PerformanceLog[] = [];
        const baseRef = collection(getFirestoreInstance(), 'performanceLogs');
    
        for (let i = 0; i < agentIds.length; i += 30) {
            const chunk = agentIds.slice(i, i + 30);
            if (chunk.length > 0) {
                let q;
                if (P.isSuperAdmin(userData)) {
                    q = query(baseRef, where('agentId', 'in', chunk));
                } else if (P.isMcAdmin(userData) && userData.marketCenterId) {
                    q = query(baseRef, where('marketCenterId', '==', userData.marketCenterId), where('agentId', 'in', chunk));
                } else if (P.isCoach(userData)) {
                    q = query(baseRef, where('coachId', '==', user.uid), where('agentId', 'in', chunk));
                } else if (P.isTeamLeader(userData) && userData.teamId) {
                    q = query(baseRef, where('teamId', '==', userData.teamId), where('agentId', 'in', chunk));
                }
                
                if (q) {
                    const snapshot = await getDocs(q);
                    snapshot.forEach(doc => allLogs.push(processPerformanceLogDoc(doc)));
                }
            }
        }
    
        agentIds.forEach(agentId => {
            results[agentId] = allLogs
                .filter(log => log.agentId === agentId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
    
        return results;
    }, [managedAgents, userData, user]);

    const getPerformanceLogsForCurrentUser = useCallback(async (): Promise<PerformanceLog[]> => {
        if (!user) return [];
        return getPerformanceLogsForAgent(user.uid);
    }, [user, getPerformanceLogsForAgent]);
    
    const updatePerformanceLog = useCallback(async (logId: string, updates: Partial<PerformanceLog>) => {
        await updateDoc(doc(getFirestoreInstance(), 'performanceLogs', logId), updates);
    }, []);

    const updateContributingAgents = useCallback(async (agentIds: string[]) => {
        if (!user) throw new Error("User not authenticated.");
        const agentIdsMap = agentIds.reduce((acc, id) => {
            acc[id] = true;
            return acc;
        }, {} as Record<string, boolean>);
        await updateDoc(doc(getFirestoreInstance(), 'users', user.uid), { contributingAgentIds: agentIdsMap });
    }, [user]);

    const updateCoachRoster = useCallback(async (coachId: string, agentIds: string[]) => {
        const coachDocRef = doc(getFirestoreInstance(), 'users', coachId);
    
        const coachDoc = await getDoc(coachDocRef);
        if (!coachDoc.exists()) {
            throw new Error("Coach not found!");
        }
        const coachData = coachDoc.data() as UserProfile;
        const oldAgentIds = new Set(Object.keys(coachData.contributingAgentIds || {}));
        const newAgentIds = new Set(agentIds);
    
        const batch = writeBatch(getFirestoreInstance());
    
        const newAgentIdsMap = agentIds.reduce((acc, id) => {
            acc[id] = true;
            return acc;
        }, {} as Record<string, boolean>);
        batch.update(coachDocRef, { contributingAgentIds: newAgentIdsMap });
    
        const agentsToAddCoach = [...newAgentIds].filter(id => !oldAgentIds.has(id));
        agentsToAddCoach.forEach(agentId => {
            const agentDocRef = doc(getFirestoreInstance(), 'users', agentId);
            batch.update(agentDocRef, { coachId: coachId });
        });
    
        const agentsToRemoveCoach = [...oldAgentIds].filter(id => !newAgentIds.has(id));
        agentsToRemoveCoach.forEach(agentId => {
            const agentDocRef = doc(getFirestoreInstance(), 'users', agentId);
            batch.update(agentDocRef, { coachId: deleteField() });
        });
        
        await batch.commit();
    }, []);

    const updateUserCoachAssignment = useCallback(async (agentId: string, newCoachId: string | null) => {
        if (!user || !userData) throw new Error("User not authenticated.");
    
        const agentDocRef = doc(getFirestoreInstance(), 'users', agentId);
        const agentDoc = await getDoc(agentDocRef);
        if (!agentDoc.exists()) throw new Error("Agent not found.");
        const currentAgentData = processUserDoc(agentDoc);
        const oldCoachId = currentAgentData.coachId;
    
        const batch = writeBatch(getFirestoreInstance());
        
        // Update the agent's coachId
        batch.update(agentDocRef, { coachId: newCoachId || deleteField() });
    
        await batch.commit();
    }, [user, userData]);

    const updateUserTeamAffiliation = useCallback(async (agentId: string, newTeamId: string | null) => {
        if (!user || !userData) throw new Error("User not authenticated.");
        
        const agentDocRef = doc(getFirestoreInstance(), 'users', agentId);
        const agentDoc = await getDoc(agentDocRef);
        if (!agentDoc.exists()) throw new Error("Agent not found.");
        const currentAgentData = processUserDoc(agentDoc);
        const oldTeamId = currentAgentData.teamId;

        const batch = writeBatch(getFirestoreInstance());

        batch.update(agentDocRef, { teamId: newTeamId || deleteField() });

        if (oldTeamId && oldTeamId !== newTeamId) {
            const oldTeamRef = doc(getFirestoreInstance(), 'teams', oldTeamId);
            batch.update(oldTeamRef, { memberIds: arrayRemove(agentId) });
        }

        if (newTeamId && oldTeamId !== newTeamId) {
            const newTeamRef = doc(getFirestoreInstance(), 'teams', newTeamId);
            batch.update(newTeamRef, { memberIds: arrayUnion(agentId) });
        }

        await batch.commit();
    }, [user, userData]);

    const getBudgetModelForUser = useCallback(async (userId: string): Promise<BudgetModelInputs | null> => {
        const docRef = doc(getFirestoreInstance(), 'budgetModels', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as BudgetModelInputs : null;
    }, []);

    const saveBudgetModel = useCallback(async (data: BudgetModelInputs) => {
        if (!user || !userData) throw new Error("User not authenticated.");
        await setDoc(doc(getFirestoreInstance(), 'budgetModels', user.uid), { 
            ...data, 
            userId: user.uid,
            marketCenterId: userData.marketCenterId || null 
        });
    }, [user, userData]);
    
    const getMarketCenters = useCallback(async (): Promise<MarketCenter[]> => {
        const snapshot = await getDocs(collection(getFirestoreInstance(), 'marketCenters'));
        return snapshot.docs.map(doc => ({id: doc.id, ...(doc.data() as any)}) as MarketCenter);
    }, []);

    const createMarketCenter = useCallback(async (mcData: Omit<MarketCenter, 'id' | 'adminIds'>) => {
        await addDoc(collection(getFirestoreInstance(), 'marketCenters'), { ...mcData, adminIds: [] });
    }, []);

    const deleteMarketCenter = useCallback(async (id: string) => {
        await deleteDoc(doc(getFirestoreInstance(), 'marketCenters', id));
    }, []);

    const assignMcAdmin = useCallback(async (email: string, marketCenterId: string) => {
        const q = query(collection(getFirestoreInstance(), 'users'), where('email', '==', email));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error("User with that email not found.");
        const userToUpdate = snapshot.docs[0];
        
        const batch = writeBatch(getFirestoreInstance());
        batch.update(userToUpdate.ref, { role: 'market_center_admin', marketCenterId });
        batch.update(doc(getFirestoreInstance(), 'marketCenters', marketCenterId), { adminIds: arrayUnion(userToUpdate.id) });
        await batch.commit();
    }, []);

    const removeMcAdmin = useCallback(async (userId: string, marketCenterId: string) => {
        const batch = writeBatch(getFirestoreInstance());
        batch.update(doc(getFirestoreInstance(), 'users', userId), { role: 'agent', marketCenterId: deleteField() });
        batch.update(doc(getFirestoreInstance(), 'marketCenters', marketCenterId), { adminIds: arrayRemove(userId) });
        await batch.commit();
    }, []);

    const updateUserMarketCenter = useCallback(async (marketCenterId: string | null) => {
        if (!user) throw new Error("User not authenticated.");
        await updateDoc(doc(getFirestoreInstance(), 'users', user.uid), { marketCenterId: marketCenterId || deleteField() });
    }, [user]);

    const updateUserMarketCenterForAdmin = useCallback(async (userId: string, marketCenterId: string | null) => {
        await updateDoc(doc(getFirestoreInstance(), 'users', userId), { marketCenterId: marketCenterId || deleteField() });
    }, []);

    const getAllTeams = useCallback(async (): Promise<Team[]> => {
        const snapshot = await getDocs(collection(getFirestoreInstance(), 'teams'));
        return snapshot.docs.map(d => ({id: d.id, ...(d.data() as any)}) as Team);
    }, []);

    const getAllTransactionsForAdmin = useCallback(async (): Promise<Transaction[]> => {
        const snapshot = await getDocs(collection(getFirestoreInstance(), 'transactions'));
        return snapshot.docs.map(processTransactionDoc);
    }, []);
    
    const updateUserRole = useCallback(async (userId: string, role: TeamMember['role']) => {
        await updateDoc(doc(getFirestoreInstance(), 'users', userId), { role });
    }, []);

    const getTransactionsForMarketCenter = useCallback(async (marketCenterId: string): Promise<Transaction[]> => {
        const q = query(collection(getFirestoreInstance(), 'transactions'), where('marketCenterId', '==', marketCenterId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processTransactionDoc);
    }, []);

    const getCommissionProfilesForMarketCenter = useCallback(async (agentIds: string[]): Promise<CommissionProfile[]> => {
        if (agentIds.length === 0) return [];
        const profiles: CommissionProfile[] = [];
        for (let i = 0; i < agentIds.length; i += 30) {
            const chunk = agentIds.slice(i, i + 30);
            if (chunk.length > 0) {
                const q = query(collection(getFirestoreInstance(), 'commissionProfiles'), where(documentId(), 'in', chunk));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => {
                    profiles.push(processCommissionProfileDoc(doc));
                });
            }
        }
        return profiles;
    }, []);
    
    const getBudgetModelsForMarketCenter = useCallback(async (marketCenterId: string): Promise<BudgetModelInputs[]> => {
        const q = query(collection(getFirestoreInstance(), 'budgetModels'), where('marketCenterId', '==', marketCenterId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as BudgetModelInputs);
    }, []);

    const getCandidatesForMarketCenter = useCallback(async (marketCenterId: string): Promise<Candidate[]> => {
        const q = query(collection(getFirestoreInstance(), 'candidates'), where('marketCenterId', '==', marketCenterId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
                lastContacted: (data.lastContacted as Timestamp)?.toDate().toISOString(),
            } as Candidate;
        });
    }, []);

    const getCandidatesForRecruiter = useCallback(async (recruiterId: string): Promise<Candidate[]> => {
        const q = query(collection(getFirestoreInstance(), 'candidates'), where('recruiterId', '==', recruiterId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
                lastContacted: (data.lastContacted as Timestamp)?.toDate().toISOString(),
            } as Candidate;
        });
    }, []);

    const addCandidate = useCallback(async (data: Omit<Candidate, 'id' | 'createdAt' | 'lastContacted'>) => {
        const docRef = await addDoc(collection(getFirestoreInstance(), 'candidates'), {
            ...data,
            createdAt: serverTimestamp(),
            lastContacted: serverTimestamp(),
        });
        return docRef.id;
    }, []);

    const updateCandidate = useCallback(async (id: string, data: Partial<Candidate>) => {
        const { id: candidateId, ...updates } = data;
        await updateDoc(doc(getFirestoreInstance(), 'candidates', id), {
            ...updates,
            lastContacted: serverTimestamp(),
        });
    }, []);

    const deleteCandidate = useCallback(async (id: string) => {
        await deleteDoc(doc(getFirestoreInstance(), 'candidates', id));
    }, []);
    
    const getCandidateActivities = useCallback(async (candidateId: string): Promise<CandidateActivity[]> => {
        const q = query(collection(getFirestoreInstance(), 'candidateActivities'), where('candidateId', '==', candidateId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
            } as CandidateActivity;
        });
    }, []);

    const addCandidateActivity = useCallback(async (candidateId: string, note: string) => {
        if (!user || !userData) throw new Error("User not authenticated.");
        await addDoc(collection(getFirestoreInstance(), 'candidateActivities'), {
            candidateId,
            note,
            userId: user.uid,
            userName: userData.name,
            createdAt: serverTimestamp(),
        });
    }, [user, userData]);

    const getOrgBlueprintForUser = useCallback(async (userId: string): Promise<OrgBlueprint | null> => {
        const docRef = doc(getFirestoreInstance(), 'orgBlueprints', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as OrgBlueprint : null;
    }, []);

    const updatePlaybookProgress = useCallback(async (playbookId: string, completedLessonIds: string[]) => {
        if (!user) throw new Error("User not authenticated");
        await updateDoc(doc(getFirestoreInstance(), 'users', user.uid), {
            [`playbookProgress.${playbookId}`]: completedLessonIds
        });
    }, [user]);

    const updateOnboardingChecklistProgress = useCallback(async (completedItemIds: string[]) => {
        if (!user) throw new Error("User not authenticated");
        await updateDoc(doc(getFirestoreInstance(), 'users', user.uid), {
            onboardingChecklistProgress: completedItemIds
        });
    }, [user]);

    const getPlaybooksForUser = useCallback(async (userId: string): Promise<Playbook[]> => {
        const userDoc = await getDoc(doc(getFirestoreInstance(), 'users', userId));
        const userData = userDoc.exists() ? processUserDoc(userDoc) : null;
        if (!userData) return [];
    
        const playbooksRef = collection(getFirestoreInstance(), 'playbooks');
        const queriesToRun = [
            query(playbooksRef, where('teamId', '==', null), where('marketCenterId', '==', null)), // Global playbooks
        ];
        if (userData.teamId) {
            queriesToRun.push(query(playbooksRef, where('teamId', '==', userData.teamId))); // Team-specific playbooks
        }
        if (userData.marketCenterId) {
            queriesToRun.push(query(playbooksRef, where('marketCenterId', '==', userData.marketCenterId))); // MC-specific playbooks
        }
    
        const allPlaybooks = new Map<string, Playbook>();
        for (const q of queriesToRun) {
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                if (!allPlaybooks.has(doc.id)) {
                    allPlaybooks.set(doc.id, processPlaybookDoc(doc));
                }
            });
        }
        return Array.from(allPlaybooks.values());
    }, []);

    // --- New Client Lead Pipeline Methods ---
    const addClientLead = useCallback(async (data: Omit<ClientLead, 'id' | 'createdAt' | 'lastContacted'>) => {
        if (!user || !userData) throw new Error("User not authenticated.");
        const docRef = await addDoc(collection(getFirestoreInstance(), 'clientLeads'), {
            ...data,
            createdAt: serverTimestamp(),
            lastContacted: serverTimestamp(),
            ownerId: user.uid,
            teamId: userData.teamId || null,
            marketCenterId: userData.marketCenterId || null,
        });
        return docRef.id;
    }, [user, userData]);

    const updateClientLead = useCallback(async (id: string, data: Partial<ClientLead>) => {
        if (!user) throw new Error("User not authenticated.");
        const { id: clientLeadId, ...updates } = data;
        await updateDoc(doc(getFirestoreInstance(), 'clientLeads', id), {
            ...updates,
            lastContacted: serverTimestamp(),
        });
    }, [user]);

    const deleteClientLead = useCallback(async (id: string) => {
        if (!user) throw new Error("User not authenticated.");
        await deleteDoc(doc(getFirestoreInstance(), 'clientLeads', id));
    }, [user]);

    const getClientLeadsForUser = useCallback(async (userId: string): Promise<ClientLead[]> => {
        if (!user) throw new Error("User not authenticated.");
        const q = query(collection(getFirestoreInstance(), 'clientLeads'), where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processClientLeadDoc);
    }, [user]);

    const getClientLeadsForTeam = useCallback(async (teamId: string): Promise<ClientLead[]> => {
        if (!user || !teamId) throw new Error("User not authenticated or team ID missing.");
        const q = query(collection(getFirestoreInstance(), 'clientLeads'), where('teamId', '==', teamId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processClientLeadDoc);
    }, [user]);

    const getClientLeadActivities = useCallback(async (clientLeadId: string): Promise<ClientLeadActivity[]> => {
        if (!user) throw new Error("User not authenticated.");
        const q = query(collection(getFirestoreInstance(), 'clientLeadActivities'), where('clientLeadId', '==', clientLeadId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processClientLeadActivityDoc);
    }, [user]);

    const addClientLeadActivity = useCallback(async (clientLeadId: string, note: string) => {
        if (!user || !userData) throw new Error("User not authenticated.");
        await addDoc(collection(getFirestoreInstance(), 'clientLeadActivities'), {
            clientLeadId,
            note,
            userId: user.uid,
            userName: userData.name,
            createdAt: serverTimestamp(),
        });
    }, [user, userData]);
    // --- End New Client Lead Pipeline Methods ---

    // --- Zapier Integration Methods ---
    const regenerateZapierApiKey = useCallback(async (): Promise<string> => {
        if (!user) throw new Error("User not authenticated.");
        const newKey = crypto.randomUUID();
        await updateDoc(doc(getFirestoreInstance(), 'users', user.uid), { zapierApiKey: newKey });
        return newKey;
    }, [user]);

    const getWebhooks = useCallback(async (): Promise<Record<string, string>> => {
        if (!user) return {};
        const snapshot = await getDocs(collection(getFirestoreInstance(), `users/${user.uid}/webhooks`));
        const webhooks: Record<string, string> = {};
        snapshot.forEach(doc => {
            webhooks[doc.id] = doc.data().url;
        });
        return webhooks;
    }, [user]);

    const saveWebhook = useCallback(async (event: string, url: string) => {
        if (!user) throw new Error("User not authenticated.");
        await setDoc(doc(getFirestoreInstance(), `users/${user.uid}/webhooks`, event), { url });
    }, [user]);

    const deleteWebhook = useCallback(async (event: string) => {
        if (!user) throw new Error("User not authenticated.");
        await deleteDoc(doc(getFirestoreInstance(), `users/${user.uid}/webhooks`, event));
    }, [user]);
    // --- End Zapier Integration Methods ---

    // --- New Todo List Methods ---
    const addTodo = useCallback(async (text: string, dueDate: string | null, priority: Priority) => {
        if (!user) throw new Error("User not authenticated.");
        await addDoc(collection(getFirestoreInstance(), 'todos'), {
            userId: user.uid,
            text,
            dueDate: dueDate, // Stored as ISO string or null
            isCompleted: false,
            createdAt: serverTimestamp(),
            priority: priority,
        });
    }, [user]);

    const updateTodo = useCallback(async (todoId: string, updates: Partial<Omit<TodoItem, 'id' | 'userId' | 'createdAt'>>) => {
        if (!user) throw new Error("User not authenticated.");
        const todoDocRef = doc(getFirestoreInstance(), 'todos', todoId);
        
        const updatesWithTimestamp: any = { ...updates };
        if (updates.dueDate === '') { // Allow setting due date to null
            updatesWithTimestamp.dueDate = null;
        }

        await updateDoc(todoDocRef, updatesWithTimestamp);
    }, [user]);

    const deleteTodo = useCallback(async (todoId: string) => {
        if (!user) throw new Error("User not authenticated.");
        await deleteDoc(doc(getFirestoreInstance(), 'todos', todoId));
    }, [user]);

    const getTodosForUserDateRange = useCallback(async (startDate: string, endDate: string): Promise<TodoItem[]> => {
        if (!user) return [];
        const q = query(
            collection(getFirestoreInstance(), 'todos'),
            where('userId', '==', user.uid),
            where('dueDate', '>=', startDate),
            where('dueDate', '<=', endDate),
            orderBy('dueDate', 'asc') // Simplified to use single orderBy for date range
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processTodoItemDoc);
    }, [user]);

    const getUndatedTodosForUser = useCallback(async (): Promise<TodoItem[]> => {
        if (!user) return [];
        const q = query(
            collection(getFirestoreInstance(), 'todos'),
            where('userId', '==', user.uid),
            where('dueDate', '==', null)
            // Removed orderBy('createdAt', 'desc') to simplify indexing
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processTodoItemDoc);
    }, [user]);
    // --- End Todo List Methods ---

    const value = useMemo(() => ({
        user, userData, loading, managedAgents, loadingAgents, agentsError, signUpWithEmail, signInWithEmail, logout,
        updateUserProfile, updatePassword, joinTeam, createTeam, updateTheme, getTeamById, getUsersByIds,
        getAllUsers, getUsersForMarketCenter, leaveTeam, removeAgentFromTeam, getUserById, updateUserNewAgentStatus, getNewAgentResourcesForUser,
        saveNewAgentResources, updateUserMetrics, assignHomeworkToUser, getAssignedResourcesForUser,
        getHomeworkForManagedUsers, getHabitLogsForManagedUsers, getHabitLogsForUser, deleteHomeworkForUser, getCommissionProfileForUser,
        saveCommissionProfile, getAllTransactions, getTransactionsForUser, getAllCommissionProfiles, addPerformanceLog,
        getPerformanceLogsForAgent, getPerformanceLogsForCurrentUser, getPerformanceLogsForManagedUsers, updatePerformanceLog, updateContributingAgents,
        updateCoachRoster, updateUserCoachAssignment, updateUserTeamAffiliation, getBudgetModelForUser, saveBudgetModel, getMarketCenters, createMarketCenter, deleteMarketCenter, assignMcAdmin,
        removeMcAdmin, updateUserMarketCenter, updateUserMarketCenterForAdmin, getAllTeams, getAllTransactionsForAdmin, updateUserRole,
        updatePlaybookProgress, updateOnboardingChecklistProgress, getOrgBlueprintForUser, getPlaybooksForUser,
        getTransactionsForMarketCenter, getCommissionProfilesForMarketCenter, getBudgetModelsForMarketCenter, getCandidatesForMarketCenter,
        getCandidatesForRecruiter,
        addCandidate, updateCandidate, deleteCandidate, getCandidateActivities, addCandidateActivity,
        
        addClientLead, updateClientLead, deleteClientLead, getClientLeadsForUser, getClientLeadsForTeam, getClientLeadActivities, addClientLeadActivity,

        regenerateZapierApiKey, getWebhooks, saveWebhook, deleteWebhook,

        addTodo, updateTodo, deleteTodo, getTodosForUserDateRange, getUndatedTodosForUser,
    }), [
        user, userData, loading, managedAgents, loadingAgents, agentsError, signUpWithEmail, signInWithEmail, logout,
        updateUserProfile, updatePassword, joinTeam, createTeam, updateTheme, getTeamById, getUsersByIds,
        getAllUsers, getUsersForMarketCenter, leaveTeam, removeAgentFromTeam, getUserById, updateUserNewAgentStatus, getNewAgentResourcesForUser,
        saveNewAgentResources, updateUserMetrics, assignHomeworkToUser, getAssignedResourcesForUser,
        getHomeworkForManagedUsers, getHabitLogsForManagedUsers, getHabitLogsForUser, deleteHomeworkForUser, getCommissionProfileForUser,
        saveCommissionProfile, getAllTransactions, getTransactionsForUser, getAllCommissionProfiles, addPerformanceLog,
        getPerformanceLogsForAgent, getPerformanceLogsForCurrentUser, getPerformanceLogsForManagedUsers, updatePerformanceLog, updateContributingAgents,
        updateCoachRoster, updateUserCoachAssignment, updateUserTeamAffiliation, getBudgetModelForUser, saveBudgetModel, getMarketCenters, createMarketCenter, deleteMarketCenter, assignMcAdmin,
        removeMcAdmin, updateUserMarketCenter, updateUserMarketCenterForAdmin, getAllTeams, getAllTransactionsForAdmin, updateUserRole,
        updatePlaybookProgress, updateOnboardingChecklistProgress, getOrgBlueprintForUser, getPlaybooksForUser,
        getTransactionsForMarketCenter, getCommissionProfilesForMarketCenter, getBudgetModelsForMarketCenter, getCandidatesForMarketCenter,
        getCandidatesForRecruiter,
        addCandidate, updateCandidate, deleteCandidate, getCandidateActivities, addCandidateActivity,
        
        addClientLead, updateClientLead, deleteClientLead, getClientLeadsForUser, getClientLeadsForTeam, getClientLeadActivities, addClientLeadActivity,

        regenerateZapierApiKey, getWebhooks, saveWebhook, deleteWebhook,

        addTodo, updateTodo, deleteTodo, getTodosForUserDateRange, getUndatedTodosForUser,
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