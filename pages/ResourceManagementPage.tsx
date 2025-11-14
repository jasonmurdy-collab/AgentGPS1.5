
// Fix: Import useMemo from React.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { Playbook, LearningPath, NewAgentResources, NewAgentGoalTemplate, NewAgentHomework, NewAgentResourceLink, ChecklistItem } from '../types';
import { Edit3, Plus, Edit, Trash2, BookOpen, Route, Sparkles, Rocket, Target, ClipboardList, Link as LinkIcon, ListChecks, CheckSquare } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
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
                            <p className="text-sm text-text-secondary">Build your playbook manually.</p>
                        </button>
                         <button onClick={() => setIsAiMode(true)} className="flex-1 flex flex-col items-center justify-center p-6 bg-surface border-2 border-border rounded-lg hover:border-primary transition-colors">
                            <Sparkles size={32} className="mb-2 text-primary"/>
                            <h3 className="font-bold">Generate with AI</h3>
                            <p className="text-sm text-text-secondary">Create a draft from an outline.</p>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleGenerate}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Playbook Title</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-input border border-border rounded-md p-2" placeholder="e.g., New Agent Onboarding" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Outline</label>
                                <textarea value={outline} onChange={e => setOutline(e.target.value)} required rows={6} className="w-full bg-input border border-border rounded-md p-2" placeholder={"Module 1: Getting Started\n- Lesson: Setting up your CRM\n- Lesson: Understanding local contracts\nModule 2: Lead Generation\n- Lesson: Intro to Sphere of Influence"} />
                                <p className="text-xs text-text-secondary mt-1">Provide module and lesson titles. The AI will generate the content.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-6">
                            <button type="button" onClick={() => setIsAiMode(false)} className="py-2 px-4 rounded-lg text-text-secondary">Back</button>
                             <button type="submit" disabled={generating} className="flex items-center justify-center gap-2 bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg min-w-[150px] disabled:bg-opacity-50">
                                {generating ? <Spinner/> : <><Sparkles size={16}/> Generate</>}
                            </button>
                        </div>
                    </form>
                )}
            </Card>
        </div>,
        document.body
    );
};

const OnboardingSetupTab: React.FC<{ playbooks: Playbook[] }> = ({ playbooks }) => {
    const { user, getNewAgentResourcesForUser, saveNewAgentResources } = useAuth();
    const [resources, setResources] = useState<Partial<NewAgentResources>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [goalToEdit, setGoalToEdit] = useState<NewAgentGoalTemplate | null>(null);
    const [generatingGoal, setGeneratingGoal] = useState(false);

    const [newHomework, setNewHomework] = useState({ week: 1, title: '', description: '', url: '' });
    const [newLink, setNewLink] = useState({ title: '', url: '' });
    const [newChecklistItemText, setNewChecklistItemText] = useState('');

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        getNewAgentResourcesForUser(user.uid).then(data => {
            setResources(data || {});
            setLoading(false);
        });
    }, [user, getNewAgentResourcesForUser]);

    const handleSave = async (updatedResources: Partial<NewAgentResources>) => {
        setSaving(true);
        try {
            if (!user) throw new Error("User not authenticated.");
            await saveNewAgentResources(updatedResources as NewAgentResources);
        } catch (error) { console.error(error); } 
        finally { setSaving(false); }
    };
    
    const handleAiGoalSuggestion = async () => {
        setGeneratingGoal(true);
        try {
            const suggestion = await generateGoalSuggestions();
            setGoalToEdit({ id: `ai-${Date.now()}`, ...suggestion } as any);
            setIsGoalModalOpen(true);
        } catch (error) {
            console.error(error);
            alert("Failed to generate AI suggestion.");
        } finally {
            setGeneratingGoal(false);
        }
    };

    const handleAddOrUpdateGoal = (goalData: any) => {
        let updatedTemplates;
        if (goalToEdit && !goalToEdit.id.startsWith('ai-')) {
            updatedTemplates = (resources.goalTemplates || []).map(g => g.id === goalToEdit.id ? { ...g, ...goalData } : g);
        } else {
            const newGoal: NewAgentGoalTemplate = { id: `gt-${Date.now()}`, ...goalData };
            updatedTemplates = [...(resources.goalTemplates || []), newGoal];
        }
        const newResources = { ...resources, goalTemplates: updatedTemplates };
        setResources(newResources);
        handleSave(newResources);
        return Promise.resolve();
    };
    
    const deleteGoalTemplate = (id: string) => {
        if (window.confirm("Are you sure?")) {
            const newTemplates = (resources.goalTemplates || []).filter(g => g.id !== id);
            const newResources = { ...resources, goalTemplates: newTemplates };
            setResources(newResources);
            handleSave(newResources);
        }
    };

    const handleAddHomework = () => {
        if (!newHomework.title.trim() || !newHomework.description.trim()) return;
        const homeworkToAdd: NewAgentHomework = { id: `hw-${Date.now()}`, ...newHomework, userId: '', teamId: null, marketCenterId: null };
        const updatedHomework = [...(resources.homework || []), homeworkToAdd];
        const newResources = { ...resources, homework: updatedHomework };
        setResources(newResources);
        handleSave(newResources);
        setNewHomework({ week: 1, title: '', description: '', url: '' });
    };

    const handleDeleteHomework = (id: string) => {
        if (window.confirm("Are you sure?")) {
            const newHomework = (resources.homework || []).filter(h => h.id !== id);
            const newResources = { ...resources, homework: newHomework };
            setResources(newResources);
            handleSave(newResources);
        }
    };
    
    const handleAddLink = () => {
        if (!newLink.title.trim() || !newLink.url.trim()) return;
        const linkToAdd: NewAgentResourceLink = { id: `link-${Date.now()}`, ...newLink };
        const updatedLinks = [...(resources.resourceLinks || []), linkToAdd];
        const newResources = { ...resources, resourceLinks: updatedLinks };
        setResources(newResources);
        handleSave(newResources);
        setNewLink({ title: '', url: '' });
    };

    const handleDeleteLink = (id: string) => {
         if (window.confirm("Are you sure?")) {
            const newLinks = (resources.resourceLinks || []).filter(l => l.id !== id);
            const newResources = { ...resources, resourceLinks: newLinks };
            setResources(newResources);
            handleSave(newResources);
        }
    };

    const handleAddChecklistItem = () => {
        if (!newChecklistItemText.trim()) return;
        const newItem: ChecklistItem = { id: `cl-${Date.now()}`, text: newChecklistItemText.trim() };
        const updatedChecklist = [...(resources.onboardingChecklist || []), newItem];
        const newResources = { ...resources, onboardingChecklist: updatedChecklist };
        setResources(newResources);
        handleSave(newResources);
        setNewChecklistItemText('');
    };

    const handleDeleteChecklistItem = (id: string) => {
        if (window.confirm("Are you sure?")) {
            const newChecklist = (resources.onboardingChecklist || []).filter(item => item.id !== id);
            const newResources = { ...resources, onboardingChecklist: newChecklist };
            setResources(newResources);
            handleSave(newResources);
        }
    };
    
    const homeworkByWeek = useMemo(() => {
        return (resources.homework || []).reduce((acc, hw) => {
            const week = `Week ${hw.week}`;
            if (!acc[week]) acc[week] = [];
            acc[week].push(hw);
            return acc;
        }, {} as Record<string, NewAgentHomework[]>);
    }, [resources.homework]);

    if (loading) return <Spinner />;

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-xl font-bold mb-2">Default Onboarding Playbook</h2>
                <p className="text-sm text-text-secondary mb-4">Select the playbook that will be automatically presented to users marked as "New Agent" in their "My Launchpad" section.</p>
                <select
                    value={resources.assignedOnboardingPlaybookId || ''}
                    onChange={e => {
                        const newResources = { ...resources, assignedOnboardingPlaybookId: e.target.value };
                        setResources(newResources);
                        handleSave(newResources);
                    }}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary"
                >
                    <option value="">-- No Onboarding Playbook --</option>
                    {playbooks.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
            </Card>
            
            <Card>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><Target/> Onboarding Goal Templates</h2>
                     <div className="flex items-center gap-2">
                         <button onClick={handleAiGoalSuggestion} disabled={generatingGoal} className="flex items-center gap-2 text-sm bg-accent/20 text-accent font-semibold py-1.5 px-3 rounded-lg hover:bg-accent/30 disabled:opacity-50">
                            {generatingGoal ? <Spinner className="w-4 h-4" /> : <><Sparkles size={16}/> AI Suggestion</>}
                        </button>
                        <button onClick={() => { setGoalToEdit(null); setIsGoalModalOpen(true); }} className="flex items-center gap-2 text-sm bg-primary/10 text-primary font-semibold py-1.5 px-3 rounded-lg hover:bg-primary/20"><Plus size={16}/> Add Template</button>
                    </div>
                </div>
                 <p className="text-sm text-text-secondary mb-4 -mt-2">These goals will be automatically assigned to new agents upon their first login.</p>
                 <div className="space-y-2">
                    {(resources.goalTemplates || []).map(g => (
                        <div key={g.id} className="p-3 bg-background/50 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-bold">{g.title}</p>
                                <p className="text-sm text-text-secondary">{g.metric}: {g.targetValue.toLocaleString()} ({g.type})</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setGoalToEdit(g); setIsGoalModalOpen(true); }} className="p-2 hover:bg-primary/20 rounded-full"><Edit size={16}/></button>
                                <button onClick={() => deleteGoalTemplate(g.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                    {(resources.goalTemplates || []).length === 0 && <p className="text-text-secondary text-center py-4">No goal templates created yet.</p>}
                </div>
            </Card>

            <Card>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><ClipboardList/> Weekly Homework Templates</h2>
                <p className="text-sm text-text-secondary mb-4">Structure a 30, 60, or 90-day plan for new agents.</p>
                <div className="p-4 bg-background/50 rounded-lg space-y-3">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-2"><label className="text-xs font-semibold">Title</label><input type="text" value={newHomework.title} onChange={e => setNewHomework({...newHomework, title: e.target.value})} className="w-full bg-input border border-border p-2 rounded-md text-sm" /></div>
                        <div><label className="text-xs font-semibold">Week #</label><input type="number" value={newHomework.week} onChange={e => setNewHomework({...newHomework, week: parseInt(e.target.value) || 1})} className="w-full bg-input border border-border p-2 rounded-md text-sm" /></div>
                        <button onClick={handleAddHomework} className="bg-primary/20 text-primary font-semibold p-2 rounded-md text-sm">Add Homework</button>
                    </div>
                    <div><label className="text-xs font-semibold">Description</label><textarea value={newHomework.description} onChange={e => setNewHomework({...newHomework, description: e.target.value})} rows={2} className="w-full bg-input border border-border p-2 rounded-md text-sm"></textarea></div>
                    <div><label className="text-xs font-semibold">URL (Optional)</label><input type="url" value={newHomework.url} onChange={e => setNewHomework({...newHomework, url: e.target.value})} placeholder="https://example.com" className="w-full bg-input border border-border p-2 rounded-md text-sm" /></div>
                </div>
                <div className="mt-4 space-y-3">
                    {Object.keys(homeworkByWeek).sort((a,b) => parseInt(a.replace('Week ','')) - parseInt(b.replace('Week ',''))).map(week => (
                        <div key={week}>
                            <h3 className="font-bold text-lg">{week}</h3>
                            <div className="pl-4 border-l-2 border-border mt-1 space-y-2">
                                {homeworkByWeek[week].map(hw => (
                                    <div key={hw.id} className="p-2 bg-background/50 rounded-md">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-sm">{hw.title}</p>
                                                <p className="text-xs text-text-secondary">{hw.description}</p>
                                                {hw.url && <a href={hw.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Link</a>}
                                            </div>
                                             <button onClick={() => handleDeleteHomework(hw.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded-full flex-shrink-0"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><ListChecks /> Onboarding Checklist Builder</h2>
                <p className="text-sm text-text-secondary mb-4">Create a list of one-time tasks for new agents (e.g., Get Headshots, Order Business Cards).</p>
                <div className="flex items-center gap-2 pt-2">
                    <input value={newChecklistItemText} onChange={e => setNewChecklistItemText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())} placeholder="Add new checklist item..." className="w-full bg-input border-border border rounded-md p-2 text-sm" />
                    <button onClick={handleAddChecklistItem} className="bg-primary/20 text-primary font-semibold py-2 px-3 rounded-lg text-sm">Add</button>
                </div>
                <div className="mt-4 space-y-2">
                    {(resources.onboardingChecklist || []).map(item => (
                        <div key={item.id} className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                            <CheckSquare size={16} className="text-text-secondary"/>
                            <span className="w-full text-sm">{item.text}</span>
                            <button onClick={() => handleDeleteChecklistItem(item.id)} className="p-1 text-destructive rounded-full hover:bg-destructive/10"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><LinkIcon/> Default Resource Links</h2>
                <p className="text-sm text-text-secondary mb-4">Provide a 'welcome kit' of essential links.</p>
                <div className="flex gap-3 items-end p-4 bg-background/50 rounded-lg">
                    <div className="flex-1"><label className="text-xs font-semibold">Title</label><input type="text" value={newLink.title} onChange={e => setNewLink({...newLink, title: e.target.value})} className="w-full bg-input border border-border p-2 rounded-md text-sm" /></div>
                    <div className="flex-1"><label className="text-xs font-semibold">URL</label><input type="url" value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} className="w-full bg-input border border-border p-2 rounded-md text-sm" /></div>
                    <button onClick={handleAddLink} className="bg-primary/20 text-primary font-semibold p-2 rounded-md text-sm">Add Link</button>
                </div>
                <div className="mt-4 space-y-2">
                    {(resources.resourceLinks || []).map(link => (
                        <div key={link.id} className="p-2 bg-background/50 rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-sm">{link.title}</p>
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline truncate">{link.url}</a>
                            </div>
                            <button onClick={() => handleDeleteLink(link.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded-full flex-shrink-0"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            </Card>


            <GoalModal 
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                onSubmit={handleAddOrUpdateGoal}
                title={goalToEdit && !goalToEdit.id.startsWith('ai-') ? "Edit Goal Template" : "Add Goal Template"}
                submitButtonText={goalToEdit && !goalToEdit.id.startsWith('ai-') ? "Save Changes" : "Add Template"}
                goalToEdit={goalToEdit as any}
                initialGoalData={goalToEdit && goalToEdit.id.startsWith('ai-') ? goalToEdit as any : undefined}
            />
        </div>
    );
};


const ResourceManagementPage: React.FC = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'playbooks' | 'learningPaths' | 'onboarding'>('playbooks');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        if (!user) { setLoading(false); return; }

        setLoading(true);
        const playbooksQuery = query(collection(db, 'playbooks'), where('creatorId', '==', user.uid), orderBy('createdAt', 'desc'));
        const learningPathsQuery = query(collection(db, 'learningPaths'), where('creatorId', '==', user.uid));

        const unsubPlaybooks = onSnapshot(playbooksQuery, (snapshot) => {
            setPlaybooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString() } as Playbook)));
            setLoading(false);
        });

        const unsubLearningPaths = onSnapshot(learningPathsQuery, (snapshot) => {
            setLearningPaths(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearningPath)));
        });

        return () => { unsubPlaybooks(); unsubLearningPaths(); };
    }, [user]);
    
    const handleGeneratePlaybook = async (title: string, outline: string) => {
        if(!user || !userData) throw new Error("User not authenticated");
        
        const playbookData = await generatePlaybookFromOutline(title, outline);
        const newPlaybook: Omit<Playbook, 'id'> = {
            ...playbookData,
            title,
            description: `AI-generated playbook based on outline.`,
            creatorId: user.uid,
            teamId: userData.teamId || null,
            marketCenterId: userData.marketCenterId || null,
            createdAt: serverTimestamp() as any,
        };

        const docRef = await addDoc(collection(db, 'playbooks'), newPlaybook);
        navigate(`/resource-management/${docRef.id}`);
    };

    const handleDelete = async (collectionName: 'playbooks' | 'learningPaths', id: string) => {
        if (window.confirm(`Are you sure you want to permanently delete this ${collectionName === 'playbooks' ? 'playbook' : 'learning path'}? This action cannot be undone.`)) {
            await deleteDoc(doc(db, collectionName, id));
        }
    };
    
    const TabButton: React.FC<{ tabId: 'playbooks' | 'learningPaths' | 'onboarding', children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === tabId ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:border-border hover:text-text-primary'}`}
        >
            {children}
        </button>
    );

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                            <Edit3 className="text-accent-secondary" size={48} />
                            Talent Development Center
                        </h1>
                        <p className="text-lg text-text-secondary mt-1">Create and manage training content for your agents.</p>
                    </div>
                    {activeTab === 'playbooks' ? (
                        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                            <Plus className="mr-2" size={20} /> Create New Playbook
                        </button>
                    ) : activeTab === 'learningPaths' ? (
                         <button onClick={() => navigate('/learning-path-editor/new')} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                            <Plus className="mr-2" size={20} /> Create New Learning Path
                        </button>
                    ) : null}
                </div>
            </header>
            
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex border-b border-border">
                    <TabButton tabId="playbooks"><BookOpen size={16}/> Playbooks</TabButton>
                    <TabButton tabId="learningPaths"><Route size={16}/> Learning Paths</TabButton>
                    <TabButton tabId="onboarding"><Rocket size={16}/> New Agent Launchpad</TabButton>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? <div className="flex justify-center py-10"><Spinner/></div> : 
                 activeTab === 'playbooks' ? (
                    playbooks.length === 0 ? (
                        <Card className="text-center py-12">
                             <h2 className="text-2xl font-bold">Create Your First Playbook</h2>
                            <p className="text-text-secondary mt-2 max-w-md mx-auto">Click "Create New Playbook" to build your first structured course, from onboarding to advanced skills training.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {playbooks.map(playbook => <PlaybookCard key={playbook.id} playbook={playbook} onDelete={() => handleDelete('playbooks', playbook.id)} />)}
                        </div>
                    )
                ) : activeTab === 'learningPaths' ? (
                     learningPaths.length === 0 ? (
                        <Card className="text-center py-12">
                            <h2 className="text-2xl font-bold">Create Your First Learning Path</h2>
                            <p className="text-text-secondary mt-2 max-w-md mx-auto">Click "Create New Learning Path" to group your playbooks into a guided journey for your agents.</p>
                        </Card>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {learningPaths.map(path => <LearningPathCard key={path.id} path={path} onDelete={() => handleDelete('learningPaths', path.id)} />)}
                        </div>
                     )
                ) : (
                    <OnboardingSetupTab playbooks={playbooks} />
                )}
            </div>

            <CreatePlaybookModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onStartFromScratch={() => navigate('/resource-management/new')}
                onGenerateWithAi={handleGeneratePlaybook}
            />
        </div>
    );
};

export default ResourceManagementPage;