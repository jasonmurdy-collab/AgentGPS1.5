import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Save, Plus, Trash2, Settings, ArrowLeft, Eye, Edit, Minus } from 'lucide-react';
import type { HabitTrackerTemplate, HabitActivitySetting } from '../types';
import { getFirestoreInstance } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';

// Preview Component (re-using visual style from DailyHabitsTrackerPage)
const MetricStepperPreview: React.FC<{ label: string; unit: string; points: number; }> = ({ label, unit, points }) => (
    <div className="bg-background/50 p-3 rounded-lg flex items-center justify-between">
        <div className="flex-1 pr-2">
            <p className="font-bold text-text-primary truncate">{label}</p>
            <p className="text-xs text-text-secondary">{points} {points === 1 ? 'pt' : 'pts'} / {unit}</p>
        </div>
        <div className="flex items-center gap-2 opacity-50">
            <button className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full" disabled><Minus size={16}/></button>
            <span className="w-16 text-center font-bold text-2xl">0</span>
            <button className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full" disabled><Plus size={16}/></button>
        </div>
    </div>
);

// Editor Component
const TemplateEditor: React.FC<{
    template: HabitTrackerTemplate;
    onSave: (template: HabitTrackerTemplate) => Promise<void>;
    onCancel: () => void;
    saving: boolean;
}> = ({ template, onSave, onCancel, saving }) => {
    const [editedTemplate, setEditedTemplate] = useState<HabitTrackerTemplate>(template);

    const updateField = (field: keyof HabitTrackerTemplate, value: any) => {
        setEditedTemplate(prev => ({ ...prev, [field]: value }));
    };

    const updateActivity = (id: string, field: keyof HabitActivitySetting, value: string | number) => {
        const newActivities = editedTemplate.activities.map(act =>
            act.id === id ? { ...act, [field]: value } : act
        );
        updateField('activities', newActivities);
    };

    const addActivity = () => {
        const newActivity: HabitActivitySetting = {
            id: `custom-${Date.now()}`,
            name: 'New Activity',
            worth: 1,
            unit: 'action'
        };
        updateField('activities', [...editedTemplate.activities, newActivity]);
    };

    const deleteActivity = (id: string) => {
        updateField('activities', editedTemplate.activities.filter(act => act.id !== id));
    };

    const handleSave = async () => {
        await onSave(editedTemplate);
    };

    const availableRoles: (HabitTrackerTemplate['isDefaultForRole'])[] = ['agent', 'team_leader', 'productivity_coach', 'market_center_admin', 'recruiter', null];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel: Settings */}
            <Card>
                <h3 className="text-2xl font-bold mb-4">{template.id ? 'Edit Template' : 'Create New Template'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Template Name</label>
                        <input type="text" value={editedTemplate.name} onChange={e => updateField('name', e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                        <textarea value={editedTemplate.description || ''} onChange={e => updateField('description', e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary min-h-[80px]" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Set as Default for Role</label>
                        <select value={editedTemplate.isDefaultForRole || 'null'} onChange={e => updateField('isDefaultForRole', e.target.value === 'null' ? null : e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary">
                            <option value="null">None (Custom Template)</option>
                            {availableRoles.filter(r => r).map(role => (
                                <option key={role as string} value={role as string}>{role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <h4 className="text-lg font-semibold mb-2">Activities</h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {editedTemplate.activities.map(activity => (
                                <div key={activity.id} className="p-3 bg-background/50 rounded-lg grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-5">
                                        <label className="text-xs font-semibold text-text-secondary">Name</label>
                                        <input type="text" value={activity.name} onChange={e => updateActivity(activity.id, 'name', e.target.value)} className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-sm"/>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="text-xs font-semibold text-text-secondary">Unit</label>
                                        <input type="text" value={activity.unit} onChange={e => updateActivity(activity.id, 'unit', e.target.value)} className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-sm"/>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold text-text-secondary">Points</label>
                                        <input type="number" value={activity.worth} onChange={e => updateActivity(activity.id, 'worth', parseInt(e.target.value, 10) || 0)} className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-sm"/>
                                    </div>
                                    <div className="col-span-2 flex justify-end">
                                         <button onClick={() => deleteActivity(activity.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={addActivity} className="mt-3 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded-lg text-sm text-text-secondary hover:border-primary hover:text-primary">
                            <Plus size={14}/> Add Activity
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-border">
                    <button onClick={onCancel} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-primary/10">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="min-w-[120px] flex justify-center items-center py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold">
                        {saving ? <Spinner /> : 'Save Template'}
                    </button>
                </div>
            </Card>

            {/* Right Panel: Preview */}
            <Card>
                 <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><Eye/> Live Preview</h3>
                 <div className="space-y-4">
                    {editedTemplate.activities.map(activity => (
                        <MetricStepperPreview key={activity.id} label={activity.name} unit={activity.unit} points={activity.worth} />
                    ))}
                    {editedTemplate.activities.length === 0 && <p className="text-text-secondary text-center py-8">Add activities to see a preview.</p>}
                 </div>
            </Card>
        </div>
    );
};

// Main Page Component
const HabitTrackerDesignerPage: React.FC = () => {
    const { user, userData } = useAuth();
    const [templates, setTemplates] = useState<HabitTrackerTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<HabitTrackerTemplate | null>(null);
    const isSuperAdmin = userData?.isSuperAdmin;

    const fetchTemplates = useCallback(async () => {
        if (!userData) { setLoading(false); return; }
        setLoading(true);
        try {
            const templatesRef = collection(getFirestoreInstance(), 'habitTrackerTemplates');
            const queriesToRun = [
                query(templatesRef, where('marketCenterId', '==', null)) // Global templates
            ];

            if (userData.marketCenterId) {
                queriesToRun.push(query(templatesRef, where('marketCenterId', '==', userData.marketCenterId)));
            }

            const snapshots = await Promise.all(queriesToRun.map(q => getDocs(q)));
            const allTemplates = new Map<string, HabitTrackerTemplate>();

            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    if (!allTemplates.has(doc.id)) {
                        allTemplates.set(doc.id, { id: doc.id, ...doc.data() } as HabitTrackerTemplate);
                    }
                });
            });
            
            setTemplates(Array.from(allTemplates.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')));

        } catch (error) {
            console.error("Failed to fetch habit tracker templates:", error);
        } finally {
            setLoading(false);
        }
    }, [userData]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleCreateNew = () => {
        if (!user) return;
        setEditingTemplate({
            id: '',
            name: 'New Template',
            activities: [],
            creatorId: user.uid,
            marketCenterId: userData?.marketCenterId || null,
        });
    };

    const handleSaveTemplate = async (template: HabitTrackerTemplate) => {
        setSaving(true);
        const templatesRef = collection(getFirestoreInstance(), 'habitTrackerTemplates');
        const docRef = template.id ? doc(templatesRef, template.id) : doc(templatesRef);
        
        const batch = writeBatch(getFirestoreInstance());

        // If setting a default, unset any other template that has it
        if (template.isDefaultForRole) {
            const q = query(templatesRef, where('isDefaultForRole', '==', template.isDefaultForRole));
            const existingDefaults = await getDocs(q);
            existingDefaults.forEach(doc => {
                if (doc.id !== docRef.id) { // Don't unset the one we're currently saving
                    batch.update(doc.ref, { isDefaultForRole: null });
                }
            });
        }
        
        const dataToSave = { ...template };
        if (!dataToSave.id) {
            delete (dataToSave as Partial<HabitTrackerTemplate>).id;
        }

        batch.set(docRef, dataToSave);

        await batch.commit();
        setSaving(false);
        setEditingTemplate(null);
        fetchTemplates();
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (window.confirm("Are you sure you want to delete this template? This cannot be undone.")) {
            await deleteDoc(doc(getFirestoreInstance(), 'habitTrackerTemplates', templateId));
            fetchTemplates();
        }
    };
    
    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>;
    }

    if (editingTemplate) {
        return (
            <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8">
                <button onClick={() => setEditingTemplate(null)} className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4">
                    <ArrowLeft size={16}/> Back to All Templates
                </button>
                <TemplateEditor template={editingTemplate} onSave={handleSaveTemplate} onCancel={() => setEditingTemplate(null)} saving={saving} />
            </div>
        );
    }
    
    const pageDescription = (isSuperAdmin || userData?.role === 'market_center_admin')
      ? "As an admin, you can create and manage habit tracker templates. Set a template as a default for a user role, or create custom templates."
      : "These are the habit tracker templates available to you.";

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-3">
                           <Settings/> Habit Tracker Designer
                        </h1>
                        <p className="text-lg text-text-secondary mt-1">{pageDescription}</p>
                    </div>
                    <button onClick={handleCreateNew} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                        <Plus className="mr-2" size={20} /> Create New Template
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.length > 0 ? templates.map(template => (
                        <Card key={template.id} className="flex flex-col">
                            <div className="flex-grow">
                                <h3 className="text-xl font-bold">{template.name}</h3>
                                {template.isDefaultForRole && (
                                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 inline-block">
                                        Default for {template.isDefaultForRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}s
                                    </span>
                                )}
                                <p className="text-sm text-text-secondary mt-2">{template.description || 'No description.'}</p>
                            </div>
                             <div className="mt-4 pt-4 border-t border-border flex items-center justify-end gap-2">
                                <button onClick={() => handleDeleteTemplate(template.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full"><Trash2 size={16}/></button>
                                <button onClick={() => setEditingTemplate(template)} className="flex items-center gap-2 text-sm bg-primary/10 text-primary font-semibold py-1.5 px-3 rounded-lg hover:bg-primary/20"><Edit size={14}/> Edit</button>
                            </div>
                        </Card>
                    )) : (
                         <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
                            <h2 className="text-2xl font-bold">No Templates Created Yet</h2>
                            <p className="text-text-secondary mt-2">Click "Create New Template" to get started.</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HabitTrackerDesignerPage;