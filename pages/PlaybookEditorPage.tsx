

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, P } from '../contexts/AuthContext';
import { getFirestoreInstance } from '../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, collection } from 'firebase/firestore';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Playbook, Module, Lesson, QuizContent, ChecklistContent, QuizQuestion, ChecklistItem, QuizQuestionOption, Team, MarketCenter, SubmissionRequirement } from '../types';
import { Save, Plus, Trash2, Edit, ChevronUp, ChevronDown, Link, Video, FileText, BrainCircuit, ListChecks, CheckSquare, Sparkles, GripVertical, ClipboardSignature, Presentation, Upload } from 'lucide-react';
import { generateQuiz, generateRolePlayScenario } from '../lib/gemini';
import { createPortal } from 'react-dom';
import { processPlaybookDoc } from '../lib/firestoreUtils';
import { RichTextEditor } from '../components/ui/RichTextEditor';

const QuizEditor: React.FC<{ content: QuizContent; onUpdate: (newContent: QuizContent) => void; }> = React.memo(({ content, onUpdate }) => {
    const [sourceText, setSourceText] = useState('');
    const [numQuestions, setNumQuestions] = useState(3);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateQuiz = useCallback(async () => {
        if (!sourceText.trim() || numQuestions < 1) {
            setError('Please provide source text and a valid number of questions.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const quiz = await generateQuiz(sourceText, numQuestions);
            onUpdate(quiz);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [sourceText, numQuestions, onUpdate]);

    const updateQuestion = useCallback((qId: string, field: 'questionText', value: string) => {
        const newContent = content.map(q => q.id === qId ? { ...q, [field]: value } : q);
        onUpdate(newContent);
    }, [content, onUpdate]);

    const updateOption = useCallback((qId: string, oId: string, field: 'text' | 'isCorrect', value: string | boolean) => {
        onUpdate(content.map(q => {
            if (q.id !== qId) {
                return q;
            }
    
            if (field === 'isCorrect') {
                return {
                    ...q,
                    options: q.options.map(opt => ({
                        ...opt,
                        isCorrect: opt.id === oId,
                    })),
                };
            }
    
            // field must be 'text'
            return {
                ...q,
                options: q.options.map(opt => {
                    if (opt.id === oId) {
                        return { ...opt, text: value as string };
                    }
                    return opt;
                }),
            };
        }));
    }, [content, onUpdate]);
    
    const addQuestion = useCallback(() => {
        const newQuestion: QuizQuestion = { id: `q-${Date.now()}`, questionText: 'New Question', options: [] };
        onUpdate([...content, newQuestion]);
    }, [content, onUpdate]);
    
    const deleteQuestion = useCallback((qId: string) => {
        if (window.confirm("Are you sure you want to delete this question?")) {
            onUpdate(content.filter(q => q.id !== qId));
        }
    }, [content, onUpdate]);
    
    const addOption = useCallback((qId: string) => {
        const newOption: QuizQuestionOption = { id: `o-${Date.now()}`, text: 'New Option', isCorrect: false };
        onUpdate(content.map(q => q.id === qId ? { ...q, options: [...q.options, newOption] } : q));
    }, [content, onUpdate]);

    const deleteOption = useCallback((qId: string, oId: string) => {
        if (window.confirm("Are you sure you want to delete this option?")) {
            onUpdate(content.map(q => q.id === qId ? { ...q, options: q.options.filter(o => o.id !== oId) } : q));
        }
    }, [content, onUpdate]);

    return (
        <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
                <h4 className="font-bold mb-2 flex items-center gap-2"><Sparkles size={18}/> AI Quiz Generator</h4>
                <p className="text-sm text-text-secondary mb-3">Provide some text and let AI generate a quiz for you.</p>
                {error && <p className="text-destructive text-sm mb-2">{error}</p>}
                <textarea
                    value={sourceText}
                    onChange={e => setSourceText(e.target.value)}
                    placeholder="Paste the source text for your quiz here..."
                    className="w-full min-h-[100px] bg-input border border-border rounded-md p-2 text-sm"
                />
                <div className="flex items-center gap-4 mt-2">
                    <div>
                        <label className="text-xs font-medium"># of Questions</label>
                        <input type="number" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value, 10))} className="w-20 bg-input border border-border rounded-md p-2 text-sm" min="1" max="10" />
                    </div>
                    <button onClick={handleGenerateQuiz} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 bg-primary text-on-accent font-semibold py-2 px-3 rounded-lg disabled:bg-opacity-50">
                        {isLoading ? <Spinner /> : 'Generate Quiz'}
                    </button>
                </div>
            </Card>

            <h4 className="font-bold">Quiz Content</h4>
            <div className="space-y-3">
                {content.map(q => (
                    <div key={q.id} className="p-3 bg-background/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <input value={q.questionText} onChange={e => updateQuestion(q.id, 'questionText', e.target.value)} className="w-full font-semibold bg-transparent border-b border-border focus:border-primary outline-none" />
                            <button onClick={() => deleteQuestion(q.id)} className="p-1 text-destructive rounded-full hover:bg-destructive/10"><Trash2 size={14}/></button>
                        </div>
                        <div className="space-y-1 pl-4">
                            {q.options.map(opt => (
                                <div key={opt.id} className="flex items-center gap-2">
                                    <input type="radio" name={`correct-opt-${q.id}`} checked={opt.isCorrect} onChange={() => updateOption(q.id, opt.id, 'isCorrect', true)} />
                                    <input value={opt.text} onChange={e => updateOption(q.id, opt.id, 'text', e.target.value)} className="w-full text-sm bg-transparent border-b border-border focus:border-primary outline-none" />
                                    <button onClick={() => deleteOption(q.id, opt.id)} className="p-1 text-destructive rounded-full hover:bg-destructive/10"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            <button onClick={() => addOption(q.id)} className="text-xs font-semibold text-primary mt-1">+ Add Option</button>
                        </div>
                    </div>
                ))}
                <button onClick={addQuestion} className="w-full text-sm font-semibold text-primary py-2 border-dashed border-2 border-border rounded-lg hover:border-primary hover:text-primary transition-colors">+ Add Question</button>
            </div>
        </div>
    );
});

const ChecklistEditor: React.FC<{ content: ChecklistContent; onUpdate: (newContent: ChecklistContent) => void; }> = React.memo(({ content, onUpdate }) => {
    const [newItemText, setNewItemText] = useState('');

    const addItem = useCallback(() => {
        if (!newItemText.trim()) return;
        const newItem: ChecklistItem = { id: `item-${Date.now()}`, text: newItemText.trim() };
        onUpdate([...content, newItem]);
        setNewItemText('');
    }, [newItemText, content, onUpdate]);
    
    const updateItem = useCallback((id: string, text: string) => {
        onUpdate(content.map(item => item.id === id ? { ...item, text } : item));
    }, [content, onUpdate]);

    const deleteItem = useCallback((id: string) => {
        if (window.confirm("Are you sure you want to delete this checklist item?")) {
            onUpdate(content.filter(item => item.id !== id));
        }
    }, [content, onUpdate]);

    return (
        <div className="space-y-2">
            {content.map(item => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                    <CheckSquare size={16} className="text-text-secondary"/>
                    <input value={item.text} onChange={e => updateItem(item.id, e.target.value)} className="w-full bg-transparent border-b border-border focus:border-primary outline-none text-sm"/>
                    <button onClick={() => deleteItem(item.id)} className="p-1 text-destructive rounded-full hover:bg-destructive/10"><Trash2 size={14}/></button>
                </div>
            ))}
             <div className="flex items-center gap-2 pt-2">
                <input value={newItemText} onChange={e => setNewItemText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem())} placeholder="Add new checklist item..." className="w-full bg-input border-border border rounded-md p-2 text-sm" />
                <button onClick={addItem} className="bg-primary text-on-accent font-semibold py-2 px-3 rounded-lg text-sm">Add</button>
            </div>
        </div>
    );
});

const AiAssistant: React.FC<{ lesson: Lesson; onUpdate: (field: keyof Lesson, value: any) => void; }> = React.memo(({ lesson, onUpdate }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    
    const handleGenerateRolePlay = useCallback(async () => {
        if (!lesson.content) return;
        setIsGenerating(true);
        try {
            const scenario = await generateRolePlayScenario(lesson.content as string);
            onUpdate('content', (lesson.content as string) + scenario);
        } catch (error) {
            alert("Failed to generate role-play scenario.");
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    }, [lesson.content, onUpdate]);

    return (
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-bold mb-2 flex items-center gap-2"><Sparkles size={18}/> AI Assistant</h4>
            <div className="space-y-2">
                <p className="text-sm text-text-secondary">Generate a role-playing scenario based on your lesson text.</p>
                <button onClick={handleGenerateRolePlay} disabled={isGenerating || !lesson.content} className="w-full flex justify-center items-center gap-2 bg-primary/20 text-primary font-semibold py-2 px-3 rounded-lg text-sm disabled:opacity-50">
                    {isGenerating ? <Spinner/> : 'Generate Role-Play Scenario'}
                </button>
            </div>
        </div>
    );
});

const LessonEditor: React.FC<{ lesson: Lesson, onUpdate: (field: keyof Lesson, value: any) => void; }> = React.memo(({ lesson, onUpdate }) => {
    return (
        <>
            {lesson.type === 'text' && (
                <RichTextEditor 
                    content={lesson.content as string} 
                    onChange={html => onUpdate('content', html)} 
                    placeholder="Enter lesson text here..."
                />
            )}
            {(lesson.type === 'video' || lesson.type === 'link') && (
                <input type="url" value={lesson.content as string} onChange={e => onUpdate('content', e.target.value)} className="w-full bg-input border border-border rounded-md p-2 text-sm" placeholder={lesson.type === 'video' ? "YouTube URL or Video ID" : "https://example.com/document.pdf"} />
            )}
            {lesson.type === 'presentation' && (
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Presentation Embed Code or URL</label>
                    <textarea 
                        value={lesson.content as string} 
                        onChange={e => onUpdate('content', e.target.value)} 
                        className="w-full min-h-[100px] bg-input border border-border rounded-md p-2 text-sm" 
                        placeholder='<iframe src="..." ...></iframe> or https://...' 
                    />
                </div>
            )}
            {lesson.type === 'submission' && (
                <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-bold flex items-center gap-2"><Upload size={16}/> Submission Settings</h4>
                    <div>
                        <label className="block text-sm font-medium mb-1">Prompt / Instructions</label>
                        <input
                            type="text"
                            value={(lesson.content as SubmissionRequirement)?.prompt || ''}
                            onChange={e => onUpdate('content', { ...lesson.content as any, prompt: e.target.value })}
                            className="w-full bg-input border border-border rounded-md p-2"
                            placeholder="e.g., Upload a video of your listing presentation..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Submission Type</label>
                        <select
                            value={(lesson.content as SubmissionRequirement)?.uploadType || 'text_entry'}
                            onChange={e => onUpdate('content', { ...lesson.content as any, uploadType: e.target.value })}
                            className="w-full bg-input border border-border rounded-md p-2"
                        >
                            <option value="text_entry">Written Response</option>
                            <option value="file_upload">File Upload (PDF/Doc)</option>
                            <option value="video_link">Video URL (Loom/YouTube)</option>
                        </select>
                    </div>
                </div>
            )}
            {lesson.type === 'quiz' && (
                <QuizEditor content={Array.isArray(lesson.content) ? lesson.content as QuizContent : []} onUpdate={newContent => onUpdate('content', newContent)} />
            )}
            {lesson.type === 'checklist' && (
                <ChecklistEditor content={Array.isArray(lesson.content) ? lesson.content as ChecklistContent : []} onUpdate={newContent => onUpdate('content', newContent)} />
            )}
            {lesson.type === 'text' && (
                <AiAssistant lesson={lesson} onUpdate={onUpdate} />
            )}
        </>
    );
});

const LESSON_TYPE_PALETTE = [
    { name: 'Text', type: 'text', icon: FileText, defaultTitle: 'New Text Lesson' },
    { name: 'Video', type: 'video', icon: Video, defaultTitle: 'New Video Lesson' },
    { name: 'Link', type: 'link', icon: Link, defaultTitle: 'New Link' },
    { name: 'Slide Deck', type: 'presentation', icon: Presentation, defaultTitle: 'New Presentation' },
    { name: 'Quiz', type: 'quiz', icon: BrainCircuit, defaultTitle: 'New Quiz' },
    { name: 'Checklist', type: 'checklist', icon: ListChecks, defaultTitle: 'New Checklist' },
    { name: 'Submission', type: 'submission', icon: Upload, defaultTitle: 'New Assignment' },
    { name: 'Script', type: 'text', icon: ClipboardSignature, defaultTitle: 'New Script' },
    { name: 'Generate Content', type: 'text', icon: Sparkles, defaultTitle: 'AI Generated Content' },
];

const LessonPalette: React.FC<{}> = React.memo(() => {
    const handleDragStart = useCallback((e: React.DragEvent, lessonInfo: typeof LESSON_TYPE_PALETTE[0]) => {
        e.dataTransfer.setData('lessonInfo', JSON.stringify(lessonInfo));
        e.dataTransfer.effectAllowed = 'copy';
    }, []);

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Lesson Palette</h2>
            <p className="text-sm text-text-secondary mb-4">Drag a lesson type and drop it into a module on the right.</p>
            <div className="space-y-2">
                {LESSON_TYPE_PALETTE.map(item => (
                    <div key={item.name} draggable onDragStart={e => handleDragStart(e, item)} className="p-3 bg-background/50 rounded-lg cursor-grab active:cursor-grabbing border border-border hover:border-primary transition-colors flex items-center gap-3">
                        <item.icon size={20} className="text-primary" />
                        <span className="font-semibold text-text-primary text-sm">{item.name}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
});

const LessonTile: React.FC<{
    lesson: Lesson;
    moduleId: string;
    onUpdate: (moduleId: string, lessonId: string, field: keyof Lesson, value: any) => void;
    onDelete: (moduleId: string, lessonId: string) => void;
}> = React.memo(({ lesson, moduleId, onUpdate, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Determine icon based on type and title for special cases
    const getIcon = useCallback(() => {
        if (lesson.title.toLowerCase().includes('script')) return ClipboardSignature;
        if (lesson.title.toLowerCase().includes('ai generated')) return Sparkles;
        return { link: Link, video: Video, text: FileText, quiz: BrainCircuit, checklist: ListChecks, presentation: Presentation, submission: Upload }[lesson.type];
    }, [lesson.title, lesson.type]);
    const LessonIcon = getIcon();

    const handleLessonUpdate = useCallback((field: keyof Lesson, value: any) => {
        onUpdate(moduleId, lesson.id, field, value);
    }, [moduleId, lesson.id, onUpdate]);

    const handleLessonDelete = useCallback(() => {
        onDelete(moduleId, lesson.id);
    }, [moduleId, lesson.id, onDelete]);

    return (
        <div className="bg-background/50 rounded-lg border border-border">
            <div className="flex items-center p-2">
                <div className="cursor-grab text-text-secondary/50 hover:text-text-secondary"><GripVertical size={20} /></div>
                <div className="flex items-center gap-2 flex-grow cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <LessonIcon size={16} className="text-text-secondary"/>
                    <span className="font-semibold text-sm">{lesson.title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-text-secondary hover:bg-primary/10 rounded-full">
                        {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </button>
                    <button onClick={handleLessonDelete} className="p-2 text-destructive hover:bg-destructive/10 rounded-full"><Trash2 size={14}/></button>
                </div>
            </div>
            {isExpanded && (
                <div className="p-3 border-t border-border">
                    <input
                        type="text"
                        value={lesson.title}
                        onChange={e => handleLessonUpdate('title', e.target.value)}
                        className="font-bold text-lg bg-transparent outline-none border-b-2 border-border focus:border-primary w-full mb-4"
                    />
                    <LessonEditor lesson={lesson} onUpdate={handleLessonUpdate} />
                </div>
            )}
        </div>
    );
});

const PlaybookEditorPage: React.FC = () => {
    const { playbookId } = useParams<{ playbookId: string }>();
    const navigate = useNavigate();
    const { user, userData, getAllTeams, getMarketCenters } = useAuth();
    const [playbook, setPlaybook] = useState<Playbook | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [teams, setTeams] = useState<Team[]>([]);
    const [marketCenters, setMarketCenters] = useState<MarketCenter[]>([]);
    const [draggedItem, setDraggedItem] = useState<{ type: 'module' | 'lesson'; id: string; moduleId?: string } | null>(null);
    const [dragOverItem, setDragOverItem] = useState<{ type: 'module' | 'lesson'; id: string; moduleId?: string } | null>(null);

    useEffect(() => {
        const fetchPlaybook = async () => {
            if (!user || !playbookId) { navigate('/resource-management'); return; }
            setLoading(true);
            if (playbookId === 'new') {
                const newPlaybook: Playbook = { id: '', creatorId: user.uid, title: 'New Playbook', description: '', createdAt: new Date().toISOString(), modules: [] };
                if (P.isTeamLeader(userData) && !P.isMcAdmin(userData) && userData.teamId) {
                    newPlaybook.teamId = userData.teamId;
                }
                setPlaybook(newPlaybook);
                setLoading(false);
            } else {
                const docRef = doc(getFirestoreInstance(), 'playbooks', playbookId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().creatorId === user.uid) {
                    setPlaybook(processPlaybookDoc(docSnap));
                } else {
                    setError('Playbook not found or you do not have permission to edit it.');
                }
                setLoading(false);
            }
        };
        fetchPlaybook();
    }, [playbookId, user, userData, navigate]);
    
     useEffect(() => {
        if (P.isSuperAdmin(userData)) {
            getAllTeams().then(setTeams);
            getMarketCenters().then(setMarketCenters);
        }
    }, [userData, getAllTeams, getMarketCenters]);

    const handleSave = useCallback(async () => {
        if (!playbook) return;
        setSaving(true);
        try {
            const docRef = playbook.id ? doc(getFirestoreInstance(), 'playbooks', playbook.id) : doc(collection(getFirestoreInstance(), 'playbooks'));
            const { id, ...playbookData } = playbook;
            const dataToSave = { ...playbookData, teamId: playbook.teamId || null, marketCenterId: playbook.marketCenterId || null, createdAt: playbook.id ? Timestamp.fromDate(new Date(playbook.createdAt)) : serverTimestamp() };
            await setDoc(docRef, dataToSave, { merge: true });
            if (!playbook.id) navigate(`/resource-management/${docRef.id}`, { replace: true });
        } catch (err) {
            console.error(err);
            setError('Failed to save playbook.');
        } finally {
            setSaving(false);
        }
    }, [playbook, navigate]);

    const updatePlaybook = useCallback((field: keyof Playbook, value: any) => setPlaybook(p => p ? { ...p, [field]: value } : null), []);

    const addModule = useCallback(() => {
        if (!playbook) return;
        const newModule: Module = { id: `mod-${Date.now()}`, title: 'New Module', order: playbook.modules.length, lessons: [] };
        updatePlaybook('modules', [...playbook.modules, newModule]);
        setExpandedModules(prev => ({ ...prev, [newModule.id]: true }));
    }, [playbook, updatePlaybook]);

    const updateModule = useCallback((moduleId: string, field: keyof Module, value: any) => {
        if (!playbook) return;
        updatePlaybook('modules', playbook.modules.map(m => m.id === moduleId ? { ...m, [field]: value } : m));
    }, [playbook, updatePlaybook]);
    
    const deleteModule = useCallback((moduleId: string) => {
        if (!playbook || !window.confirm("Are you sure you want to delete this module and all its lessons?")) return;
        updatePlaybook('modules', playbook.modules.filter(m => m.id !== moduleId).map((m, i) => ({ ...m, order: i })));
    }, [playbook, updatePlaybook]);
    
    const updateLesson = useCallback((moduleId: string, lessonId: string, field: keyof Lesson, value: any) => {
        if (!playbook) return;
        updatePlaybook('modules', playbook.modules.map(m => (m.id === moduleId) ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, [field]: value } : l) } : m));
    }, [playbook, updatePlaybook]);

    const deleteLesson = useCallback((moduleId: string, lessonId: string) => {
        if (!playbook || !window.confirm("Are you sure you want to delete this lesson?")) return;
        updatePlaybook('modules', playbook.modules.map(m => (m.id === moduleId) ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId).map((l, i) => ({ ...l, order: i })) } : m));
    }, [playbook, updatePlaybook]);

    const handleDragStart = useCallback((e: React.DragEvent, type: 'module' | 'lesson', id: string, moduleId?: string) => {
        setDraggedItem({ type, id, moduleId });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('reorderInfo', JSON.stringify({ type, id, moduleId }));
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, type: 'module' | 'lesson', id: string, moduleId?: string) => {
        e.preventDefault();
        const reorderInfo = e.dataTransfer.getData('reorderInfo');
        if (reorderInfo) {
            const parsed = JSON.parse(reorderInfo);
            if (parsed.type === type && (type === 'module' || parsed.moduleId === moduleId)) {
                if (!dragOverItem || dragOverItem.id !== id) setDragOverItem({ type, id, moduleId });
            }
        } else if (e.dataTransfer.types.includes('lessoninfo')) {
            e.dataTransfer.dropEffect = 'copy';
        }
    }, [dragOverItem]);
    
    const handleDrop = useCallback((targetType: 'module' | 'lesson' | 'module-dropzone', targetId: string) => {
        if (draggedItem && dragOverItem && draggedItem.id !== dragOverItem.id) {
            // Handle reordering
            if (draggedItem.type === 'module' && playbook) {
                const newModules = [...playbook.modules];
                const [draggedModule] = newModules.splice(newModules.findIndex(m => m.id === draggedItem.id), 1);
                newModules.splice(newModules.findIndex(m => m.id === dragOverItem.id), 0, draggedModule);
                updatePlaybook('modules', newModules.map((m, i) => ({ ...m, order: i })));
            } else if (draggedItem.type === 'lesson' && playbook && draggedItem.moduleId === dragOverItem.moduleId) {
                updatePlaybook('modules', playbook.modules.map(m => {
                    if (m.id === draggedItem.moduleId) {
                        const newLessons = [...m.lessons];
                        const [draggedLesson] = newLessons.splice(newLessons.findIndex(l => l.id === draggedItem.id), 1);
                        newLessons.splice(newLessons.findIndex(l => l.id === dragOverItem.id), 0, draggedLesson);
                        return { ...m, lessons: newLessons.map((l, i) => ({ ...l, order: i })) };
                    }
                    return m;
                }));
            }
        }
        setDraggedItem(null);
        setDragOverItem(null);
    }, [draggedItem, dragOverItem, playbook, updatePlaybook]);
    
    const handleDropNewLesson = useCallback((e: React.DragEvent, moduleId: string) => {
        e.preventDefault();
        const lessonInfoStr = e.dataTransfer.getData("lessonInfo");
        if (lessonInfoStr && playbook) {
            const lessonInfo = JSON.parse(lessonInfoStr);
            const module = playbook.modules.find(m => m.id === moduleId);
            if (!module) return;
            
            // Fix the content initialization here to include default properties for SubmissionRequirement
            const initialContent = lessonInfo.type === 'submission' 
                ? { prompt: '', uploadType: 'text_entry', required: true } as SubmissionRequirement
                : ((lessonInfo.type === 'quiz' || lessonInfo.type === 'checklist') ? [] : '');

            const newLesson: Lesson = { 
                id: `les-${Date.now()}`, 
                title: lessonInfo.defaultTitle, 
                type: lessonInfo.type, 
                content: initialContent, 
                order: module.lessons.length 
            };
            updatePlaybook('modules', playbook.modules.map(m => m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m));
        }
    }, [playbook, updatePlaybook]);
    
    if (loading) return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>;
    if (error) return <Card className="m-8 text-center text-destructive">{error}</Card>;
    if (!playbook) return null;

    return (
        <div className="h-full flex flex-col">
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8 border-b border-border">
                <div className="flex justify-between items-center flex-wrap gap-4">
                     <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-text-primary truncate" title={playbook.title}>{playbook.title}</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/resource-management')} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-primary/10">Back</button>
                        <button onClick={handleSave} disabled={saving} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 min-w-[150px]">
                            {saving ? <Spinner /> : <><Save className="mr-2" size={16}/> Save Playbook</>}
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 p-4 sm:p-6 lg:p-8">
                    <div className="lg:col-span-1 lg:sticky lg:top-28 self-start"><LessonPalette /></div>
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <h2 className="text-xl font-bold mb-4">Playbook Settings</h2>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-text-secondary mb-1">Title</label><input type="text" value={playbook.title} onChange={e => updatePlaybook('title', e.target.value)} className="w-full bg-input border border-border rounded-md p-2" /></div>
                                <div><label className="block text-sm font-medium text-text-secondary mb-1">Description</label><textarea value={playbook.description} onChange={e => updatePlaybook('description', e.target.value)} className="w-full bg-input border border-border rounded-md p-2 min-h-[80px]" /></div>
                                
                                <div className="pt-4 border-t border-border">
                                    <h3 className="text-lg font-bold mb-2">Visibility & Scope</h3>
                                    
                                    {P.isSuperAdmin(userData) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-1">Assign to Market Center</label>
                                                <select value={playbook.marketCenterId || ''} onChange={e => updatePlaybook('marketCenterId', e.target.value || null)} className="w-full bg-input border border-border rounded-md p-2">
                                                    <option value="">Global (All Users)</option>
                                                    {marketCenters.map(mc => <option key={mc.id} value={mc.id}>{mc.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-1">Assign to Team</label>
                                                <select value={playbook.teamId || ''} onChange={e => updatePlaybook('teamId', e.target.value || null)} className="w-full bg-input border border-border rounded-md p-2">
                                                    <option value="">Global / MC Wide</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                                <p className="text-xs text-text-secondary mt-1">Leave as "Global / MC Wide" if assigning to a Market Center.</p>
                                            </div>
                                        </div>
                                    )}

                                    {P.isMcAdmin(userData) && !P.isSuperAdmin(userData) && (
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Set Visibility</label>
                                            <select
                                                value={playbook.marketCenterId || ''}
                                                onChange={e => {
                                                    updatePlaybook('marketCenterId', e.target.value || null);
                                                    updatePlaybook('teamId', null);
                                                }}
                                                className="w-full bg-input border border-border rounded-md p-2"
                                            >
                                                <option value="">Global (All Users)</option>
                                                <option value={userData.marketCenterId!}>My Market Center Only</option>
                                            </select>
                                        </div>
                                    )}

                                    {P.isTeamLeader(userData) && !P.isMcAdmin(userData) && userData.teamId && (
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Visibility</label>
                                            <div className="p-2 bg-input border border-border rounded-md text-text-secondary">
                                                Available to: My Team Only
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {playbook.modules.map((module) => (
                            <div key={module.id} onDragOver={e => handleDragOver(e, 'module', module.id)} onDrop={() => handleDrop('module', module.id)} onDragEnd={() => setDraggedItem(null)} className={`transition-all duration-150 ${dragOverItem?.type === 'module' && dragOverItem?.id === module.id ? 'pt-2' : ''}`}>
                                {dragOverItem?.type === 'module' && dragOverItem?.id === module.id && <div className="h-1.5 bg-primary rounded-full mb-2" />}
                                <Card draggable onDragStart={e => handleDragStart(e, 'module', module.id)} onDragLeave={() => setDragOverItem(null)} className={`transition-opacity ${draggedItem?.type === 'module' && draggedItem?.id === module.id ? 'opacity-30' : ''}`} onDragOver={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2 flex-grow"><div className="cursor-grab text-text-secondary/50 hover:text-text-secondary"><GripVertical size={20} /></div><input type="text" value={module.title} onChange={e => updateModule(module.id, 'title', e.target.value)} className="text-2xl font-bold bg-transparent outline-none border-b-2 border-transparent focus:border-primary w-full" /></div>
                                        <div className="flex items-center"><button onClick={() => setExpandedModules(p => ({...p, [module.id]: !p[module.id]}))} className="p-2 text-text-secondary hover:bg-primary/10 rounded-full">{expandedModules[module.id] ? <ChevronUp/> : <ChevronDown/>}</button><button onClick={() => deleteModule(module.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full"><Trash2 size={16}/></button></div>
                                    </div>
                                    { (expandedModules[module.id] ?? true) && (
                                        <div onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={e => handleDropNewLesson(e, module.id)} className="space-y-4 min-h-[60px] border-2 border-dashed border-transparent hover:border-primary/50 p-2 rounded-lg">
                                            {module.lessons.map((lesson) => (
                                                <div key={lesson.id} onDragOver={e => handleDragOver(e, 'lesson', lesson.id, module.id)} onDrop={() => handleDrop('lesson', lesson.id)} onDragEnd={() => setDraggedItem(null)} className={`transition-all duration-150 ${dragOverItem?.type === 'lesson' && dragOverItem?.id === lesson.id ? 'pt-2' : ''}`}>
                                                    {dragOverItem?.type === 'lesson' && dragOverItem?.id === lesson.id && <div className="h-1 bg-primary/50 rounded-full mb-2" />}
                                                    <div draggable onDragStart={e => handleDragStart(e, 'lesson', lesson.id, module.id)} onDragLeave={() => setDragOverItem(null)} className={`transition-opacity ${draggedItem?.type === 'lesson' && draggedItem?.id === lesson.id ? 'opacity-30' : ''}`}><LessonTile lesson={lesson} moduleId={module.id} onUpdate={updateLesson} onDelete={deleteLesson} /></div>
                                                </div>
                                            ))}
                                            {module.lessons.length === 0 && <p className="text-center text-sm text-text-secondary py-4">Drop a lesson here to start</p>}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        ))}
                        <button onClick={addModule} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-lg text-text-secondary hover:border-primary hover:text-primary transition-colors"><Plus size={16}/> Add Module</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaybookEditorPage;
