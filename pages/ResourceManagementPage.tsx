import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, P } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { Playbook, LearningPath, NewAgentResources, NewAgentGoalTemplate, NewAgentHomework, NewAgentResourceLink, ChecklistItem, TeamMember } from '../types';
import { Edit3, Plus, Edit, Trash2, BookOpen, Route, Sparkles, Rocket, Target, ClipboardList, Link as LinkIcon, ListChecks, CheckSquare } from 'lucide-react';
import { getFirestoreInstance } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, addDoc, serverTimestamp, setDoc, getDocs } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { generatePlaybookFromOutline, generateGoalSuggestions } from '../lib/gemini';
import { createPortal } from 'react-dom';
import { GoalModal } from '../components/goals/AddGoalModal';

const PlaybookCard: React.FC<{ playbook: Playbook; onDelete: (id: string) => void }> = ({ playbook, onDelete }) => {
    const moduleCount = playbook.modules?.length || 0;
    const lessonCount = playbook.modules?.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0) || 0;

    return (
        <Card className="flex flex-col justify-between">
            <div>
                <h3 className="text-xl font-bold text-text-primary">{playbook.title}</h3>
                <p className="text-sm text-text-secondary mt-2">{playbook.description}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
                 <div className="flex items-center justify-between text-xs text-text-secondary font-semibold mb-3">
                    <span>{moduleCount} {moduleCount === 1 ? 'Module' : 'Modules'}</span>
                    <span>{lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Link to={`/resource-management/${playbook.id}`} className="flex-1 flex items-center justify-center gap-2 bg-primary/10 text-primary font-semibold py-2 px-3 rounded-lg hover:bg-primary/20 transition-colors">
                        <Edit size={16}/> Edit
                    </Link>
                    <button onClick={() => onDelete(playbook.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full">
                        <Trash2 size={16}/>
                    </button>
                </div>
            </div>
        </Card>
    );
};

const LearningPathCard: React.FC<{ path: LearningPath; onDelete: (id: string) => void }> = ({ path, onDelete }) => (
    <Card className="flex flex-col justify-between">
        <div>
            <h3 className="text-xl font-bold text-text-primary">{path.title}</h3>
            <p className="text-sm text-text-secondary mt-2">{path.description}</p>
        </div>
        <div className="mt-4 pt-3 border-t border-border">
             <div className="flex items-center justify-between text-xs text-text-secondary font-semibold mb-3">
                <span>{path.playbookIds.length} {path.playbookIds.length === 1 ? 'Playbook' : 'Playbooks'}</span>
            </div>
            <div className="flex items-center gap-2">
                <Link to={`/learning-path-editor/${path.id}`} className="flex-1 flex items-center justify-center gap-2 bg-primary/10 text-primary font-semibold py-2 px-3 rounded-lg hover:bg-primary/20 transition-colors">
                    <Edit size={16}/> Edit Path
                </Link>
                <button onClick={() => onDelete(path.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full">
                    <Trash2 size={16}/>
                </button>
            </div>
        </div>
    </Card>
);

const CreatePlaybookModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onStartFromScratch: () => void;
    onGenerateWithAi: (title: string, outline: string) => Promise<void>;
}> = ({ isOpen, onClose, onStartFromScratch, onGenerateWithAi }) => {
    const [isAiMode, setIsAiMode] = useState(false);
    const [title, setTitle] = useState('');
    const [outline, setOutline] = useState('');
    const [generating, setGenerating] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        try {
            await onGenerateWithAi(title, outline);
            onClose(); // Close on success
        } catch (error) {
            alert("Failed to generate playbook. Please try again.");
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };
    
    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Create New Playbook</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-primary/10">&times;</button>
                </div>
                {!isAiMode ? (
                     <div className="flex flex-col md:flex-row gap-4">
                        <button onClick={onStartFromScratch} className="flex-1 flex flex-col items-center justify-center p-6 bg-surface border-2 border-border rounded-lg hover:border-primary transition-colors">
                            <Edit3 size={32} className="mb-2 text-primary"/>
                            <h3 className="font-bold">Start from Scratch</h3>
                            <p className="text-sm text-text-secondary">Build your playbook manually</p></button>
                        <button onClick={() => setIsAiMode(true)} className="flex-1 flex flex-col items-center justify-center p-6 bg-surface border-2 border-border rounded-lg hover:border-accent transition-colors">
                            <Sparkles size={32} className="mb-2 text-accent"/>
                            <h3 className="font-bold">Generate with AI</h3>
                            <p className="text-sm text-text-secondary">Provide an outline and let AI do the work.</p>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <p className="text-sm text-text-secondary -mt-2 mb-4">Tell AI what your playbook is about. Be as specific as possible for the best results.</p>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Playbook Title</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-input border border-border rounded-md p-2" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Outline (e.g., Module 1: Lesson 1, Lesson 2; Module 2: ...)</label>
                            <textarea value={outline} onChange={e => setOutline(e.target.value)} className="w-full bg-input border border-border rounded-md p-2 min-h-[150px]" placeholder="Module 1: The Basics&#10;- Introduction to Real Estate&#10;- Setting Up Your Database&#10;Module 2: Lead Generation&#10;- Prospecting Strategies&#10;- Open House Systems" required />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <button type="button" onClick={() => setIsAiMode(false)} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-primary/10">Back</button>
                            <button type="submit" disabled={generating} className="py-2 px-4 rounded-lg bg-accent text-on-accent font-semibold">{generating ? <Spinner/> : 'Generate Playbook'}</button>
                        </div>
                    </form>
                )}
            </Card>
        </div>,
        document.body
    );
};

const NewAgentResourcesCard: React.FC<{
    agent: { id: string, name: string, isNewAgent?: boolean, assignedLearningPathId?: string, onboardingChecklistProgress?: string[] };
    learningPaths: LearningPath[];
    onToggleNewAgentStatus: (agentId: string, currentStatus: boolean) => Promise<void>;
    onAssignLearningPath: (agentId: string, pathId: string | null) => Promise<void>;
    onGenerateGoalSuggestions: (agentId: string) => Promise<void>;
}> = ({ agent, learningPaths, onToggleNewAgentStatus, onAssignLearningPath, onGenerateGoalSuggestions }) => {
    const [assignPathId, setAssignPathId] = useState<string>(agent.assignedLearningPathId || '');
    const [savingPath, setSavingPath] = useState(false);

    useEffect(() => {
        setAssignPathId(agent.assignedLearningPathId || '');
    }, [agent.assignedLearningPathId]);

    const handleSavePath = async () => {
        setSavingPath(true);
        await onAssignLearningPath(agent.id, assignPathId === '' ? null : assignPathId);
        setSavingPath(false);
    };

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">New Agent Resources: {agent.name}</h3>
                <div className="flex items-center gap-2">
                    <label htmlFor={`toggle-new-agent-${agent.id}`} className="text-sm text-text-secondary">New Agent</label>
                    <button
                        role="switch"
                        id={`toggle-new-agent-${agent.id}`}
                        aria-checked={!!agent.isNewAgent}
                        onClick={() => onToggleNewAgentStatus(agent.id, !!agent.isNewAgent)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${agent.isNewAgent ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${agent.isNewAgent ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                    </button>
                </div>
            </div>
            {agent.isNewAgent && (
                <div className="space-y-4 pt-4 border-t border-border">
                    <div>
                        <label htmlFor={`assign-path-${agent.id}`} className="block text-sm font-medium text-text-secondary mb-1">Assign Learning Path</label>
                        <div className="flex gap-2">
                            <select
                                id={`assign-path-${agent.id}`}
                                value={assignPathId}
                                onChange={e => setAssignPathId(e.target.value)}
                                className="flex-1 bg-input border border-border rounded-md p-2"
                            >
                                <option value="">-- No Path Assigned --</option>
                                {learningPaths.map(path => (
                                    <option key={path.id} value={path.id}>{path.title}</option>
                                ))}
                            </select>
                            <button onClick={handleSavePath} disabled={savingPath || assignPathId === (agent.assignedLearningPathId || '')} className="p-2 bg-primary text-on-accent rounded-md">{savingPath ? <Spinner className="w-5 h-5"/> : <CheckSquare size={20}/>}</button>
                        </div>
                    </div>
                     <div>
                        <button onClick={() => onGenerateGoalSuggestions(agent.id)} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded-lg text-sm text-text-secondary hover:border-primary hover:text-primary">
                            <Target size={16}/> Generate Goal Suggestion
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
};


const ResourceManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, userData, getUserById, updateUserNewAgentStatus, getUsersByIds } = useAuth(); // getUsersByIds added
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
    const [managedAgents, setManagedAgents] = useState<({ id: string, name: string, isNewAgent?: boolean, assignedLearningPathId?: string, onboardingChecklistProgress?: string[] })[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatePlaybookModalOpen, setIsCreatePlaybookModalOpen] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [goalModalInitialData, setGoalModalInitialData] = useState<Partial<NewAgentGoalTemplate>>({});
    const [targetAgentForGoal, setTargetAgentForGoal] = useState<string | null>(null);

    // Filter playbooks and learning paths based on user's marketCenterId/teamId
    const filterByScope = useCallback((items: (Playbook | LearningPath)[]) => {
        if (userData?.isSuperAdmin) {
            return items; // Super Admins see everything
        }
        return items.filter(item => {
            const isGlobal = !item.marketCenterId && !item.teamId;
            const isMcScoped = item.marketCenterId === userData?.marketCenterId && !item.teamId;
            const isTeamScoped = item.teamId === userData?.teamId;
            return isGlobal || isMcScoped || isTeamScoped;
        });
    }, [userData]);

    const fetchResources = useCallback(() => {
        if (!user || !userData) { setLoading(false); return () => {}; }
        setLoading(true);
        const db = getFirestoreInstance();

        const playbooksQuery = collection(db, 'playbooks');
        const pathsQuery = collection(db, 'learningPaths');

        const unsubscribePlaybooks = onSnapshot(playbooksQuery, (snapshot) => {
            const fetchedPlaybooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Playbook));
            setPlaybooks(filterByScope(fetchedPlaybooks) as Playbook[]);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching playbooks:", error);
            setLoading(false);
        });

        const unsubscribeLearningPaths = onSnapshot(pathsQuery, (snapshot) => {
            const fetchedPaths = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearningPath));
            setLearningPaths(filterByScope(fetchedPaths) as LearningPath[]);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching learning paths:", error);
            setLoading(false);
        });

        // Fetch managed agents for assigning resources
        const fetchManagedAgents = async () => {
            let agentsToManage: TeamMember[] = [];
            if (P.isSuperAdmin(userData)) {
                // Fix: Correctly extract agent IDs from contributingAgentIds object keys
                const contributingAgentIds = Object.keys(userData.contributingAgentIds || {});
                if (contributingAgentIds.length > 0) {
                    agentsToManage = await getUsersByIds(contributingAgentIds);
                }
            } else if (userData.marketCenterId && P.isMcAdmin(userData)) {
                const q = query(collection(db, 'users'), where('marketCenterId', '==', userData.marketCenterId));
                const snapshot = await getDocs(q);
                agentsToManage = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
            } else if (userData.teamId && (P.isTeamLeader(userData) || P.isCoach(userData))) {
                const q = query(collection(db, 'users'), where('teamId', '==', userData.teamId));
                const snapshot = await getDocs(q);
                agentsToManage = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
            }
            setManagedAgents(agentsToManage.filter(a => a.id !== user.uid));
        };
        fetchManagedAgents();

        return () => {
            unsubscribePlaybooks();
            unsubscribeLearningPaths();
        };
    }, [user, userData, filterByScope, getUsersByIds]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const handleCreatePlaybook = async (title: string, outline?: string) => {
        setLoading(true);
        try {
            if (!user || !userData) throw new Error("User not authenticated.");
            const newPlaybookRef = doc(collection(getFirestoreInstance(), 'playbooks'));
            const basePlaybook: Playbook = {
                id: newPlaybookRef.id,
                creatorId: user.uid,
                title: title,
                description: "AI-generated playbook content.",
                createdAt: serverTimestamp(),
                modules: [],
            };
            // Set scope based on user role if not Super Admin
            if (P.isTeamLeader(userData) && !P.isMcAdmin(userData) && userData.teamId) {
                basePlaybook.teamId = userData.teamId;
            } else if (P.isMcAdmin(userData) && userData.marketCenterId) {
                basePlaybook.marketCenterId = userData.marketCenterId;
            }

            if (outline) {
                const generatedContent = await generatePlaybookFromOutline(title, outline);
                await setDoc(newPlaybookRef, { ...basePlaybook, ...generatedContent });
            } else {
                await setDoc(newPlaybookRef, basePlaybook);
            }
            navigate(`/resource-management/${newPlaybookRef.id}`);
        } catch (error) {
            console.error("Error creating playbook:", error);
            alert("Failed to create playbook.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePlaybook = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this playbook and all its lessons? This cannot be undone.")) {
            await deleteDoc(doc(getFirestoreInstance(), 'playbooks', id));
        }
    };

    const handleCreateLearningPath = () => {
        navigate('/learning-path-editor/new');
    };

    const handleDeleteLearningPath = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this learning path? This cannot be undone.")) {
            await deleteDoc(doc(getFirestoreInstance(), 'learningPaths', id));
        }
    };

    const handleAssignLearningPath = async (agentId: string, pathId: string | null) => {
        if (!user || !userData) return;
        await setDoc(doc(getFirestoreInstance(), 'users', agentId), { assignedLearningPathId: pathId }, { merge: true });
        fetchResources(); // Re-fetch to update agent data
    };

    const handleToggleNewAgentStatus = async (agentId: string, currentStatus: boolean) => {
        await updateUserNewAgentStatus(agentId, currentStatus);
        fetchResources(); // Re-fetch to update agent data
    };

    const handleGenerateGoalSuggestions = async (agentId: string) => {
        setLoading(true);
        setTargetAgentForGoal(agentId);
        try {
            const suggestion = await generateGoalSuggestions();
            setGoalModalInitialData({
                title: suggestion.title,
                metric: suggestion.metric,
                type: suggestion.type
            });
            setIsGoalModalOpen(true);
        } catch (error) {
            console.error("Error generating goal suggestion:", error);
            alert("Failed to generate goal suggestion.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddGoalFromSuggestion = async (goalData: any) => {
        if (!targetAgentForGoal) return;
        setLoading(true);
        try {
            if (!user || !userData) throw new Error("User not authenticated.");
            const targetUserData = await getUserById(targetAgentForGoal);
            if (!targetUserData) throw new Error("Target agent not found.");

            const goalToAdd: any = {
                ...goalData,
                currentValue: 0,
                userId: targetAgentForGoal,
                userName: targetUserData.name,
                teamId: targetUserData.teamId || null,
                marketCenterId: targetUserData.marketCenterId || null,
                coachId: targetUserData.coachId || null,
                createdAt: serverTimestamp(),
                isArchived: false,
            };
            await addDoc(collection(getFirestoreInstance(), 'goals'), goalToAdd);
            alert(`Goal "${goalData.title}" assigned to ${targetUserData.name}.`);
        } catch (error) {
            console.error("Failed to add goal from suggestion:", error);
            alert("Failed to add goal.");
        } finally {
            setLoading(false);
            setIsGoalModalOpen(false);
        }
    };
    
    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>;
    }

    // Determine if the current user has permissions to create/manage resources
    const canManageResources = P.canManageResources(userData);

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                            <Edit3 size={48} className="text-accent-secondary" />
                            Talent Development Center
                        </h1>
                        <p className="text-lg text-text-secondary mt-1">Manage all your playbooks, learning paths, and new agent resources.</p>
                    </div>
                    {canManageResources && (
                        <div className="flex items-center gap-3">
                            <button onClick={() => setIsCreatePlaybookModalOpen(true)} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                                <Plus className="mr-2" size={20} /> New Playbook
                            </button>
                            <button onClick={handleCreateLearningPath} className="flex items-center justify-center bg-accent-secondary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                                <Plus className="mr-2" size={20} /> New Learning Path
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><BookOpen /> Playbooks</h2>
                    {playbooks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {playbooks.map(playbook => (
                                <PlaybookCard key={playbook.id} playbook={playbook} onDelete={handleDeletePlaybook} />
                            ))}
                        </div>
                    ) : (
                        <Card><p className="text-center text-text-secondary py-8">No playbooks created yet. Use the "New Playbook" button to get started.</p></Card>
                    )}
                </div>

                <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><Route /> Learning Paths</h2>
                    {learningPaths.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {learningPaths.map(path => (
                                <LearningPathCard key={path.id} path={path} onDelete={handleDeleteLearningPath} />
                            ))}
                        </div>
                    ) : (
                        <Card><p className="text-center text-text-secondary py-8">No learning paths created yet. Use the "New Learning Path" button to get started.</p></Card>
                    )}
                </div>

                {canManageResources && (
                     <div>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><Rocket/> New Agent Onboarding & Resources</h2>
                        {managedAgents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {managedAgents.map(agent => (
                                    <NewAgentResourcesCard
                                        key={agent.id}
                                        agent={agent}
                                        learningPaths={learningPaths}
                                        onAssignLearningPath={handleAssignLearningPath}
                                        onToggleNewAgentStatus={handleToggleNewAgentStatus}
                                        onGenerateGoalSuggestions={handleGenerateGoalSuggestions}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card><p className="text-center text-text-secondary py-8">No agents in your program to manage resources for.</p></Card>
                        )}
                    </div>
                )}
            </div>

            <CreatePlaybookModal
                isOpen={isCreatePlaybookModalOpen}
                onClose={() => setIsCreatePlaybookModalOpen(false)}
                onStartFromScratch={() => handleCreatePlaybook('New Playbook', undefined)}
                onGenerateWithAi={handleCreatePlaybook}
            />
             <GoalModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                onSubmit={handleAddGoalFromSuggestion}
                title="AI Goal Suggestion"
                description={`Assign this suggested goal to ${managedAgents.find(a => a.id === targetAgentForGoal)?.name || 'the agent'}.`}
                submitButtonText="Assign Goal"
                initialGoalData={goalModalInitialData}
            />
        </div>
    );
};

export default ResourceManagementPage;