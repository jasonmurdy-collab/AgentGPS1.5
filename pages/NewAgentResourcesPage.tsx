

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Rocket, CheckCircle, ChevronDown, ChevronUp, ClipboardList, Link as LinkIcon, ListChecks } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import type { Playbook, Module, Lesson, NewAgentHomework, NewAgentResourceLink, ChecklistItem } from '../types';
import { getFirestoreInstance } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { processPlaybookDoc } from '../lib/firestoreUtils';

const NewAgentResourcesPage: React.FC = () => {
    const { user, userData, getNewAgentResourcesForUser, updateOnboardingChecklistProgress } = useAuth();
    const [onboardingPlaybook, setOnboardingPlaybook] = useState<Playbook | null>(null);
    const [homework, setHomework] = useState<NewAgentHomework[]>([]);
    const [resourceLinks, setResourceLinks] = useState<NewAgentResourceLink[]>([]);
    const [onboardingChecklist, setOnboardingChecklist] = useState<ChecklistItem[]>([]);
    const [completedChecklistItems, setCompletedChecklistItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchOnboardingData = async () => {
            if (!user || !userData) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const resources = await getNewAgentResourcesForUser(user.uid);
                if (resources) {
                    setHomework(resources.homework || []);
                    setResourceLinks(resources.resourceLinks || []);
                    setOnboardingChecklist(resources.onboardingChecklist || []);
                    setCompletedChecklistItems(new Set(userData.onboardingChecklistProgress || []));

                    if (resources.assignedOnboardingPlaybookId) {
                        const playbookDoc = await getDoc(doc(getFirestoreInstance(), 'playbooks', resources.assignedOnboardingPlaybookId));
                        if (playbookDoc.exists()) {
                            const pb = processPlaybookDoc(playbookDoc);
                            setOnboardingPlaybook(pb);
                            
                            const initialExpanded: Record<string, boolean> = {};
                            pb.modules.forEach(m => initialExpanded[m.id] = true);
                            setExpandedModules(initialExpanded);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch onboarding resources:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOnboardingData();
    }, [user, userData, getNewAgentResourcesForUser]);
    
    const completedLessons = useMemo(() => {
        if (!userData || !onboardingPlaybook?.id || !userData.playbookProgress) return [];
        return userData.playbookProgress[onboardingPlaybook.id] || [];
    }, [userData, onboardingPlaybook]);

    const homeworkByWeek = useMemo(() => {
        return (homework || []).reduce((acc, hw) => {
            const week = `Week ${hw.week}`;
            if (!acc[week]) acc[week] = [];
            acc[week].push(hw);
            return acc;
        }, {} as Record<string, NewAgentHomework[]>);
    }, [homework]);

    const handleChecklistItemToggle = useCallback((itemId: string) => {
        const newCompletedSet = new Set<string>(completedChecklistItems);
        if (newCompletedSet.has(itemId)) {
            newCompletedSet.delete(itemId);
        } else {
            newCompletedSet.add(itemId);
        }
        setCompletedChecklistItems(newCompletedSet);
        updateOnboardingChecklistProgress(Array.from(newCompletedSet));
    }, [completedChecklistItems, updateOnboardingChecklistProgress]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner className="w-10 h-10" /></div>;
    }

    const hasContent = onboardingPlaybook || homework.length > 0 || resourceLinks.length > 0 || onboardingChecklist.length > 0;

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                    <Rocket className="text-accent-secondary" size={48} />
                    My Launchpad
                </h1>
                <p className="text-lg text-text-secondary mt-1">Your personalized onboarding journey. Complete these lessons to get started.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                {!hasContent ? (
                    <Card className="text-center py-12">
                        <h2 className="text-2xl font-bold">Welcome!</h2>
                        <p className="text-text-secondary mt-2">Your launchpad is being prepared by your coach. Check back soon!</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <div className="space-y-6">
                            {onboardingPlaybook && (
                                <Card>
                                     <h2 className="text-2xl font-bold mb-4">Onboarding Playbook: {onboardingPlaybook.title}</h2>
                                    {onboardingPlaybook.modules.map(module => (
                                        <div key={module.id} className="mb-2">
                                            <button
                                                onClick={() => setExpandedModules(p => ({...p, [module.id]: !p[module.id]}))}
                                                className="w-full text-left p-2 flex justify-between items-center hover:bg-primary/5 transition-colors rounded-md"
                                            >
                                                <h3 className="text-lg font-bold">{module.title}</h3>
                                                <ChevronDown size={20} className={`transition-transform ${expandedModules[module.id] ? 'rotate-180' : ''}`} />
                                            </button>
                                            {expandedModules[module.id] && (
                                                <div className="pl-4 mt-2">
                                                    {module.lessons.map(lesson => {
                                                        const isCompleted = completedLessons.includes(lesson.id);
                                                        return (
                                                            <Link
                                                                key={lesson.id}
                                                                to={`/resource-library/${onboardingPlaybook.id}`}
                                                                className="flex items-center gap-3 p-2 border-t border-border hover:bg-primary/5"
                                                            >
                                                                {isCompleted ? <CheckCircle size={20} className="text-success flex-shrink-0" /> : <div className="w-5 h-5 border-2 border-border rounded-full flex-shrink-0" />}
                                                                <span className={`flex-1 ${isCompleted ? 'line-through text-text-secondary' : 'text-text-primary'}`}>{lesson.title}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </Card>
                            )}
                             {homework.length > 0 && (
                                <Card>
                                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><ClipboardList/> Weekly Homework</h2>
                                    <div className="space-y-4">
                                        {Object.keys(homeworkByWeek).sort((a, b) => parseInt(a.replace('Week ', '')) - parseInt(b.replace('Week ', ''))).map(week => (
                                            <div key={week}>
                                                <h3 className="font-bold text-lg">{week}</h3>
                                                <div className="pl-4 border-l-2 border-border mt-1 space-y-3">
                                                    {homeworkByWeek[week].map(hw => (
                                                        <div key={hw.id} className="p-3 bg-background/50 rounded-md">
                                                            <p className="font-semibold">{hw.title}</p>
                                                            <p className="text-sm text-text-secondary mt-1">{hw.description}</p>
                                                            {hw.url && <a href={hw.url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent font-semibold hover:underline mt-2 inline-block">View Resource &rarr;</a>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                        <div className="space-y-6">
                            {onboardingChecklist.length > 0 && (
                                <Card>
                                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><ListChecks /> Onboarding Checklist</h2>
                                    <div className="space-y-2">
                                        {onboardingChecklist.map(item => (
                                            <label key={item.id} htmlFor={`checklist-${item.id}`} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg cursor-pointer hover:bg-primary/5">
                                                <input
                                                    type="checkbox"
                                                    id={`checklist-${item.id}`}
                                                    checked={completedChecklistItems.has(item.id)}
                                                    onChange={() => handleChecklistItemToggle(item.id)}
                                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span className={`flex-1 text-sm ${completedChecklistItems.has(item.id) ? 'line-through text-text-secondary' : 'text-text-primary'}`}>{item.text}</span>
                                            </label>
                                        ))}
                                    </div>
                                </Card>
                            )}
                            {resourceLinks.length > 0 && (
                                <Card>
                                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><LinkIcon/> Essential Resources</h2>
                                    <div className="space-y-2">
                                        {resourceLinks.map(link => (
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" key={link.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg hover:bg-primary/5 transition-colors group">
                                                <LinkIcon size={16} className="text-text-secondary group-hover:text-primary"/>
                                                <span className="font-semibold text-text-primary group-hover:text-primary flex-1">{link.title}</span>
                                                <span className="text-xs text-text-secondary group-hover:text-primary">&rarr;</span>
                                            </a>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewAgentResourcesPage;