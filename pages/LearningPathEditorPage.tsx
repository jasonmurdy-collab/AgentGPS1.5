
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFirestoreInstance } from '../firebaseConfig'; // Fix: Import getFirestoreInstance
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { LearningPath, Playbook } from '../types';
import { Save, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { processLearningPathDoc } from '../lib/firestoreUtils';

const LearningPathEditorPage: React.FC = () => {
    const { pathId } = useParams<{ pathId: string }>();
    const navigate = useNavigate();
    const { user, userData } = useAuth();
    
    const [path, setPath] = useState<Partial<LearningPath>>({ title: 'New Learning Path', description: '', playbookIds: [] });
    const [availablePlaybooks, setAvailablePlaybooks] = useState<Playbook[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) { navigate('/resource-management'); return; }

        const fetchPath = async () => {
            if (pathId === 'new') {
                setLoading(false);
                return;
            }
            const docRef = doc(getFirestoreInstance(), 'learningPaths', pathId); // Fix: Use getFirestoreInstance()
            const docSnap = await getDoc(docRef);
            const data = docSnap.data();
            if (docSnap.exists() && data && data.creatorId === user.uid) {
                setPath(processLearningPathDoc(docSnap));
            } else {
                setError('Learning Path not found or permission denied.');
            }
            setLoading(false);
        };

        const q = query(collection(getFirestoreInstance(), 'playbooks'), where('creatorId', '==', user.uid)); // Fix: Use getFirestoreInstance()
        const unsub = onSnapshot(q, (snapshot) => {
            setAvailablePlaybooks(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Playbook)));
        });

        fetchPath();
        return () => unsub();
    }, [pathId, user, navigate]);

    const handleSave = async () => {
        if (!user || !userData || !path.title) return;
        setSaving(true);
        try {
            const docRef = path.id ? doc(getFirestoreInstance(), 'learningPaths', path.id) : doc(collection(getFirestoreInstance(), 'learningPaths')); // Fix: Use getFirestoreInstance()
            const dataToSave = {
                creatorId: user.uid,
                teamId: userData.teamId || null,
                marketCenterId: userData.marketCenterId || null,
                title: path.title,
                description: path.description,
                playbookIds: path.playbookIds,
                createdAt: path.id && path.createdAt ? Timestamp.fromDate(new Date(path.createdAt)) : serverTimestamp(),
            };
            await setDoc(docRef, dataToSave, { merge: true });
            if (!path.id) {
                navigate(`/learning-path-editor/${docRef.id}`, { replace: true });
            }
        } catch (err) {
            console.error(err);
            setError('Failed to save learning path.');
        } finally {
            setSaving(false);
        }
    };
    
    const updateField = (field: keyof LearningPath, value: any) => {
        setPath(p => ({ ...p, [field]: value }));
    };

    const addPlaybook = (playbookId: string) => {
        if (!path.playbookIds?.includes(playbookId)) {
            updateField('playbookIds', [...(path.playbookIds || []), playbookId]);
        }
    };

    const removePlaybook = (playbookId: string) => {
        updateField('playbookIds', (path.playbookIds || []).filter(id => id !== playbookId));
    };

    const movePlaybook = (playbookId: string, direction: 'up' | 'down') => {
        const ids = path.playbookIds || [];
        const index = ids.indexOf(playbookId);
        if (index === -1) return;
        if (direction === 'up' && index > 0) {
            const newIds = [...ids];
            [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
            updateField('playbookIds', newIds);
        }
        if (direction === 'down' && index < ids.length - 1) {
             const newIds = [...ids];
            [newIds[index + 1], newIds[index]] = [newIds[index], newIds[index + 1]];
            updateField('playbookIds', newIds);
        }
    };
    
    if (loading) return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>;
    if (error) return <Card className="m-8 text-center text-destructive">{error}</Card>;

    const playbooksInPath = (path.playbookIds || []).map(id => availablePlaybooks.find(p => p.id === id)).filter(Boolean) as Playbook[];
    const playbooksNotInPath = availablePlaybooks.filter(p => !(path.playbookIds || []).includes(p.id));

    return (
        <div className="h-full flex flex-col">
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8 border-b border-border">
                <div className="flex justify-between items-center flex-wrap gap-4">
                     <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-text-primary truncate" title={path.title}>Learning Path Editor</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/resource-management')} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-primary/10">Back</button>
                        <button onClick={handleSave} disabled={saving} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg min-w-[150px] disabled:opacity-50">
                            {saving ? <Spinner /> : <><Save className="mr-2" size={16}/> Save Path</>}
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6 pt-6">
                <Card>
                    <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
                            <input type="text" value={path.title} onChange={e => updateField('title', e.target.value)} className="w-full bg-input border border-border rounded-md p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                            <textarea value={path.description} onChange={e => updateField('description', e.target.value)} className="w-full bg-input border border-border rounded-md p-2 min-h-[80px]" />
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <h2 className="text-xl font-bold mb-4">Playbooks in this Path</h2>
                         <div className="space-y-2">
                            {playbooksInPath.map((playbook, index) => (
                                <div key={playbook.id} className="p-2 bg-background/50 rounded-lg flex items-center justify-between">
                                    <span className="font-semibold">{playbook.title}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => movePlaybook(playbook.id, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30"><ArrowUp size={14}/></button>
                                        <button onClick={() => movePlaybook(playbook.id, 'down')} disabled={index === playbooksInPath.length - 1} className="p-1 disabled:opacity-30"><ArrowDown size={14}/></button>
                                        <button onClick={() => removePlaybook(playbook.id)} className="p-1 text-destructive"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                            {playbooksInPath.length === 0 && <p className="text-sm text-text-secondary text-center py-4">Add playbooks from the right.</p>}
                        </div>
                    </Card>
                     <Card>
                        <h2 className="text-xl font-bold mb-4">Available Playbooks</h2>
                         <div className="space-y-2">
                             {playbooksNotInPath.map(playbook => (
                                <div key={playbook.id} className="p-2 bg-background/50 rounded-lg flex items-center justify-between">
                                    <span className="font-semibold">{playbook.title}</span>
                                    <button onClick={() => addPlaybook(playbook.id)} className="p-1 text-success"><Plus size={14}/></button>
                                </div>
                            ))}
                             {playbooksNotInPath.length === 0 && <p className="text-sm text-text-secondary text-center py-4">No other playbooks available.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default LearningPathEditorPage;