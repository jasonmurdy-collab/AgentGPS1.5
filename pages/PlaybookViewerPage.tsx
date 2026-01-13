

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFirestoreInstance } from '../firebaseConfig';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Playbook, Module, Lesson, QuizContent, ChecklistContent, SubmissionRequirement } from '../types';
import { ArrowLeft, BookOpen, Link as LinkIcon, Video, FileText, BrainCircuit, ListChecks, CheckSquare, CheckCircle, XCircle, ArrowRight, ArrowLeft as ArrowLeftIcon, ChevronDown, ChevronUp, Presentation, Upload } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { processPlaybookDoc } from '../lib/firestoreUtils';

const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const SlideViewer: React.FC<{ content: string }> = ({ content }) => {
    const isEmbed = content.trim().startsWith('<iframe');
    if (isEmbed) {
        return (
            <div
                className="aspect-video w-full rounded-lg overflow-hidden border border-border bg-black [&>iframe]:w-full [&>iframe]:h-full"
                dangerouslySetInnerHTML={{ __html: content }}
            />
        );
    }
    // Fallback for direct PDF links or URLs
    return (
        <iframe src={content} className="w-full h-[600px] rounded-lg border border-border bg-surface" title="Slide Deck" />
    );
};

const ChecklistViewer: React.FC<{
    lesson: Lesson;
    completedLessons: string[];
    onProgressUpdate: (completedIds: string[]) => void;
}> = ({ lesson, completedLessons, onProgressUpdate }) => {
    const content = Array.isArray(lesson.content) ? lesson.content as ChecklistContent : [];
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

    const handleCheckChange = (itemId: string) => {
        setCheckedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    useEffect(() => {
        if (content.length > 0 && checkedItems.size === content.length && !completedLessons.includes(lesson.id)) {
            onProgressUpdate([...completedLessons, lesson.id]);
        }
    }, [checkedItems, content.length, lesson.id, completedLessons, onProgressUpdate]);
    
    return (
         <div className="space-y-3">
            {content.map(item => (
                <label key={item.id} htmlFor={`checklist-${item.id}`} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
                    <input
                        type="checkbox"
                        id={`checklist-${item.id}`}
                        checked={checkedItems.has(item.id)}
                        onChange={() => handleCheckChange(item.id)}
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                    />
                    <span className={`flex-1 ${checkedItems.has(item.id) ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                        {item.text}
                    </span>
                </label>
            ))}
        </div>
    );
};

const QuizViewer: React.FC<{
    lesson: Lesson;
    completedLessons: string[];
    onProgressUpdate: (completedIds: string[]) => void;
}> = ({ lesson, completedLessons, onProgressUpdate }) => {
    const content = Array.isArray(lesson.content) ? lesson.content as QuizContent : [];
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);

    const score = useMemo(() => {
        if (!isSubmitted || content.length === 0) return 0;
        const correctCount = content.reduce((count, question) => {
            const correctAnswer = question.options.find(opt => opt.isCorrect)?.id;
            if (selectedAnswers[question.id] === correctAnswer) {
                return count + 1;
            }
            return count;
        }, 0);
        return (correctCount / content.length) * 100;
    }, [isSubmitted, content, selectedAnswers]);

    const handleAnswerSelect = (questionId: string, optionId: string) => {
        if (isSubmitted) return;
        setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmit = () => {
        setIsSubmitted(true);
        if (!completedLessons.includes(lesson.id)) {
            onProgressUpdate([...completedLessons, lesson.id]);
        }
    };
    
    return (
        <div className="space-y-6">
            {content.map(q => {
                const correctAnswerId = q.options.find(opt => opt.isCorrect)?.id;
                const userAnswerId = selectedAnswers[q.id];
                return (
                    <div key={q.id} className={`p-4 rounded-lg border ${isSubmitted ? (userAnswerId === correctAnswerId ? 'border-success bg-success/5' : 'border-destructive bg-destructive/5') : 'border-border'}`}>
                        <p className="font-bold mb-3">{q.questionText}</p>
                        <div className="space-y-2">
                            {q.options.map(opt => {
                                let feedbackIcon = null;
                                if (isSubmitted) {
                                    if (opt.isCorrect) {
                                        feedbackIcon = <CheckCircle size={16} className="text-success" />;
                                    } else if (userAnswerId === opt.id) {
                                        feedbackIcon = <XCircle size={16} className="text-destructive" />;
                                    }
                                }
                                return (
                                    <label key={opt.id} className={`flex items-center gap-3 p-2 rounded-md transition-colors ${!isSubmitted ? 'cursor-pointer hover:bg-primary/5' : 'cursor-default'}`}>
                                        <input type="radio" name={`quiz-${q.id}`} checked={selectedAnswers[q.id] === opt.id} onChange={() => handleAnswerSelect(q.id, opt.id)} disabled={isSubmitted} className="h-4 w-4 text-primary focus:ring-primary"/>
                                        <span className="flex-1">{opt.text}</span>
                                        {feedbackIcon}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            <div className="flex flex-col items-center gap-4 mt-6">
                {!isSubmitted ? (
                     <button onClick={handleSubmit} className="bg-primary text-on-accent font-semibold py-2 px-6 rounded-lg">Submit Quiz</button>
                ): (
                    <div className="text-center p-4 bg-background/50 rounded-lg">
                        <p className="text-lg font-bold">Your Score</p>
                        <p className={`text-4xl font-black ${score >= 70 ? 'text-success' : 'text-warning'}`}>{score.toFixed(0)}%</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const PlaybookViewerPage: React.FC = () => {
    const { playbookId } = useParams<{ playbookId: string }>();
    const { user, userData, updatePlaybookProgress } = useAuth();
    const [playbook, setPlaybook] = useState<Playbook | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [submissionText, setSubmissionText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const completedLessons = useMemo(() => {
        if (!userData || !playbookId || !userData.playbookProgress) return [];
        return userData.playbookProgress[playbookId] || [];
    }, [userData, playbookId]);

    const handleProgressUpdate = useCallback(async (newCompletedIds: string[]) => {
        if (!playbookId) return;
        try {
            await updatePlaybookProgress(playbookId, newCompletedIds);
        } catch (error) {
            console.error("Failed to update playbook progress:", error);
        }
    }, [playbookId, updatePlaybookProgress]);

    const allLessonsFlat = useMemo(() => {
        if (!playbook) return [];
        return playbook.modules.flatMap(m => m.lessons);
    }, [playbook]);

    const { currentIndex, prevLesson, nextLesson } = useMemo(() => {
        if (!activeLesson || allLessonsFlat.length === 0) return { currentIndex: -1, prevLesson: null, nextLesson: null };
        const idx = allLessonsFlat.findIndex(l => l.id === activeLesson.id);
        return {
            currentIndex: idx,
            prevLesson: idx > 0 ? allLessonsFlat[idx - 1] : null,
            nextLesson: idx < allLessonsFlat.length - 1 ? allLessonsFlat[idx + 1] : null,
        };
    }, [activeLesson, allLessonsFlat]);


    useEffect(() => {
        const fetchPlaybook = async () => {
            if (!playbookId) { setError("Playbook ID is missing."); setLoading(false); return; }
            setLoading(true);
            try {
                const docSnap = await getDoc(doc(getFirestoreInstance(), 'playbooks', playbookId));
                if (docSnap.exists()) {
                    const pb = processPlaybookDoc(docSnap);
                    setPlaybook(pb);

                    const firstUncompleted = pb.modules.flatMap(m => m.lessons).find(l => !userData?.playbookProgress?.[playbookId]?.includes(l.id));
                    setActiveLesson(firstUncompleted || pb.modules?.[0]?.lessons?.[0] || null);
                    
                    const initialExpanded: Record<string, boolean> = {};
                    pb.modules.forEach(m => initialExpanded[m.id] = true);
                    setExpandedModules(initialExpanded);

                } else { setError('Playbook not found.'); }
            } catch (err) { console.error(err); setError('Failed to load playbook.'); }
             finally { setLoading(false); }
        };
        fetchPlaybook();
    }, [playbookId, userData]);

    const handleMarkComplete = () => {
        if (!activeLesson || completedLessons.includes(activeLesson.id)) return;
        handleProgressUpdate([...completedLessons, activeLesson.id]);
    };

    const handleSubmitWork = async (lessonId: string) => {
        if (!user || !playbookId) return;
        setSubmitting(true);
        try {
            await addDoc(collection(getFirestoreInstance(), 'submissions'), {
                userId: user.uid,
                lessonId: lessonId,
                playbookId: playbookId,
                content: submissionText,
                status: 'pending',
                submittedAt: serverTimestamp()
            });
            handleProgressUpdate([...completedLessons, lessonId]);
            setSubmissionText('');
            alert('Assignment submitted successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to submit assignment.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderLessonContent = (lesson: Lesson) => {
        const isCompleted = completedLessons.includes(lesson.id);
        const canMarkComplete = ['text', 'video', 'link', 'presentation'].includes(lesson.type);

        const videoId = lesson.type === 'video' ? getYouTubeId(lesson.content as string) : null;
        const sanitizedHtml = lesson.type === 'text' ? DOMPurify.sanitize(marked(lesson.content as string)) : '';

        return (
            <>
                {lesson.type === 'video' && (
                     videoId ? <div className="aspect-video bg-black rounded-lg"><iframe className="w-full h-full rounded-lg" src={`https://www.youtube.com/embed/${videoId}`} title={lesson.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div> : <p className="text-destructive">Invalid YouTube URL.</p>
                )}
                {lesson.type === 'link' && (
                    <a href={lesson.content as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-on-accent font-semibold py-3 px-5 rounded-lg hover:bg-opacity-90"><LinkIcon size={16}/> Open Resource</a>
                )}
                {lesson.type === 'presentation' && (
                    <SlideViewer content={lesson.content as string} />
                )}
                {lesson.type === 'text' && (
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                )}
                {lesson.type === 'quiz' && (
                    <QuizViewer lesson={lesson} completedLessons={completedLessons} onProgressUpdate={handleProgressUpdate} />
                )}
                {lesson.type === 'checklist' && (
                    <ChecklistViewer lesson={lesson} completedLessons={completedLessons} onProgressUpdate={handleProgressUpdate} />
                )}
                {lesson.type === 'submission' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-surface border border-border rounded-lg">
                            <h3 className="font-bold mb-2">Assignment:</h3>
                            <p>{(lesson.content as SubmissionRequirement).prompt}</p>
                        </div>
                        {isCompleted ? (
                            <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-success flex items-center gap-2">
                                <CheckCircle size={20} />
                                <span className="font-semibold">Assignment Submitted</span>
                            </div>
                        ) : (
                            <>
                                <textarea
                                    className="w-full min-h-[150px] bg-input border border-border rounded-lg p-3 text-sm"
                                    placeholder="Type your response or paste your link here..."
                                    value={submissionText}
                                    onChange={e => setSubmissionText(e.target.value)}
                                />
                                <button
                                    onClick={() => handleSubmitWork(lesson.id)}
                                    disabled={submitting || !submissionText.trim()}
                                    className="bg-primary text-on-accent px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? <Spinner className="w-4 h-4" /> : 'Submit Assignment'}
                                </button>
                            </>
                        )}
                    </div>
                )}
                {canMarkComplete && (
                    <div className="mt-8 pt-6 border-t border-border flex justify-center">
                        <button onClick={handleMarkComplete} disabled={isCompleted} className="flex items-center gap-2 py-2 px-6 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed bg-success text-on-success">
                           <CheckSquare size={16}/> {isCompleted ? 'Completed' : 'Mark as Complete'}
                        </button>
                    </div>
                )}
            </>
        );
    };
    
    if (loading) return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>;
    if (error) return <Card className="m-8 text-center text-destructive">{error}</Card>;
    if (!playbook) return null;
    
    const LessonIcon = { link: LinkIcon, video: Video, text: FileText, quiz: BrainCircuit, checklist: ListChecks, presentation: Presentation, submission: Upload };
    const totalLessons = allLessonsFlat.length;

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <Link to="/resource-library" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4"><ArrowLeft size={16}/> Back to My Growth</Link>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">{playbook.title}</h1>
                <p className="text-lg text-text-secondary mt-1">{playbook.description}</p>
            </header>
            
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden px-4 sm:px-6 lg:px-8 pb-8 gap-6">
                <nav className="w-full md:w-1/3 lg:w-1/4 bg-surface rounded-2xl p-4 flex flex-col overflow-y-auto">
                    <h2 className="text-lg font-bold mb-3 flex-shrink-0">Contents</h2>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                        {playbook.modules.map(module => (
                            <div key={module.id}>
                                <button onClick={() => setExpandedModules(p => ({...p, [module.id]: !p[module.id]}))} className="w-full flex justify-between items-center font-semibold text-text-primary">
                                    {module.title}
                                    <ChevronDown size={16} className={`transition-transform ${expandedModules[module.id] ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedModules[module.id] && (
                                    <div className="mt-2 space-y-1 pl-2 border-l-2 border-border">
                                        {module.lessons.map(lesson => {
                                            const Icon = LessonIcon[lesson.type];
                                            const isCompleted = completedLessons.includes(lesson.id);
                                            return (
                                                <button key={lesson.id} onClick={() => setActiveLesson(lesson)} className={`w-full text-left flex items-center gap-2 p-2 rounded-md text-sm transition-colors ${activeLesson?.id === lesson.id ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5'}`}>
                                                    {isCompleted ? <CheckCircle size={14} className="text-success flex-shrink-0" /> : <Icon size={14} className="text-text-secondary flex-shrink-0" />}
                                                    <span className={`truncate ${isCompleted ? 'text-text-secondary' : ''}`}>{lesson.title}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </nav>

                <main className="w-full md:w-2/3 lg:w-3/4 bg-surface rounded-2xl flex flex-col overflow-hidden">
                    {activeLesson ? (
                        <>
                            <div className="p-6 flex-grow overflow-y-auto">
                                <h2 className="text-3xl font-bold mb-6">{activeLesson.title}</h2>
                                {renderLessonContent(activeLesson)}
                            </div>
                            <div className="flex justify-between items-center p-4 border-t border-border flex-shrink-0">
                                <button onClick={() => setActiveLesson(prevLesson)} disabled={!prevLesson} className="flex items-center gap-2 py-2 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10">
                                   <ArrowLeftIcon size={16}/> Previous
                                </button>
                                <span className="text-sm text-text-secondary">{currentIndex + 1} / {totalLessons}</span>
                                <button onClick={() => setActiveLesson(nextLesson)} disabled={!nextLesson} className="flex items-center gap-2 py-2 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10">
                                   Next <ArrowRight size={16}/>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <BookOpen size={48} className="text-text-secondary mb-4" />
                            <h2 className="text-2xl font-bold">Welcome to the Playbook</h2>
                            <p className="text-text-secondary mt-2">Select a lesson from the left to get started.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default PlaybookViewerPage;
