
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFirestoreInstance } from '../firebaseConfig';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Playbook, Lesson, QuizContent, ChecklistContent, SubmissionRequirement } from '../types';
import { 
    ArrowLeft, BookOpen, Link as LinkIcon, Video, FileText, 
    BrainCircuit, ListChecks, CheckSquare, CheckCircle, XCircle, 
    ArrowRight, ArrowLeft as ArrowLeftIcon, ChevronDown, ChevronUp, 
    Presentation, Upload, Eye, ExternalLink, X, AlertTriangle,
    Maximize2, Minimize2, Share2, Headphones, Expand, Shrink,
    Menu
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { processPlaybookDoc } from '../lib/firestoreUtils';
import { createPortal } from 'react-dom';

/**
 * Robust Video Parser for YouTube, Loom, and Vimeo
 */
const parseVideoUrl = (url: string): { type: 'youtube' | 'loom' | 'vimeo' | 'invalid', id: string | null, embedUrl: string | null } => {
    if (!url) return { type: 'invalid', id: null, embedUrl: null };

    // YouTube
    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const ytMatch = url.match(ytRegExp);
    if (ytMatch && ytMatch[2].length === 11) {
        return { type: 'youtube', id: ytMatch[2], embedUrl: `https://www.youtube.com/embed/${ytMatch[2]}` };
    }

    // Loom
    const loomRegExp = /loom\.com\/(share|embed)\/([a-f0-9]+)/;
    const loomMatch = url.match(loomRegExp);
    if (loomMatch) {
        return { type: 'loom', id: loomMatch[2], embedUrl: `https://www.loom.com/embed/${loomMatch[2]}` };
    }

    // Vimeo
    const vimeoRegExp = /vimeo\.com\/(?:.*\/)?([0-9]+)/;
    const vimeoMatch = url.match(vimeoRegExp);
    if (vimeoMatch) {
        return { type: 'vimeo', id: vimeoMatch[1], embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
    }

    return { type: 'invalid', id: null, embedUrl: null };
};

// --- AUDIO PLAYER COMPONENT (For NotebookLM Podcasts) ---
const AudioPlayer: React.FC<{ url: string; title: string }> = ({ url, title }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Simple logic to try and make Drive links playable audio
    const playableUrl = useMemo(() => {
        if (url.includes('drive.google.com') && url.includes('/view')) {
            return url.replace('/view', '/preview'); // Often works for audio preview
        }
        return url;
    }, [url]);

    return (
        <div className="w-full bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-md">
                    <Headphones size={24} className="text-white" />
                </div>
                <div>
                    <p className="text-xs font-bold uppercase opacity-80 tracking-widest">Audio Overview</p>
                    <h3 className="font-bold text-lg">{title}</h3>
                </div>
            </div>
            <div className="p-4 bg-background">
                <audio 
                    controls 
                    className="w-full" 
                    src={playableUrl}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                >
                    Your browser does not support the audio element.
                </audio>
                {url.includes('drive.google.com') && (
                    <p className="text-xs text-text-secondary mt-2 text-center">
                        Having trouble playing? <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open in Drive</a>
                    </p>
                )}
            </div>
        </div>
    );
};

const VideoPlayer: React.FC<{ url: string; title: string }> = ({ url, title }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [copied, setCopied] = useState(false);
    const videoData = useMemo(() => parseVideoUrl(url), [url]);

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const playerContent = (
        <div className={`relative group w-full bg-black overflow-hidden shadow-2xl ${isFocused ? 'h-full' : 'aspect-video rounded-2xl'}`}>
            {videoData.type !== 'invalid' ? (
                <iframe 
                    className="w-full h-full border-none"
                    src={videoData.embedUrl!}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                ></iframe>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/50 gap-4 p-8 text-center">
                    <AlertTriangle size={48} className="text-warning" />
                    <div>
                        <p className="font-bold text-lg">Unsupported Video Source</p>
                        <p className="text-sm">We currently support YouTube, Loom, and Vimeo.</p>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2">
                        <ExternalLink size={16} /> Open External Link
                    </a>
                </div>
            )}

            {/* Overlay Controls */}
            <div className={`absolute top-4 right-4 flex gap-2 transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button 
                    onClick={handleCopy}
                    className="p-2 bg-black/60 backdrop-blur-md text-white rounded-lg hover:bg-black/80 transition-colors"
                    title="Copy Video URL"
                >
                    {copied ? <CheckCircle size={18} className="text-success" /> : <Share2 size={18} />}
                </button>
                <button 
                    onClick={() => setIsFocused(!isFocused)}
                    className="p-2 bg-black/60 backdrop-blur-md text-white rounded-lg hover:bg-black/80 transition-colors"
                    title={isFocused ? "Exit Focus Mode" : "Enter Focus Mode"}
                >
                    {isFocused ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                {isFocused && (
                    <button 
                        onClick={() => setIsFocused(false)}
                        className="p-2 bg-destructive/80 backdrop-blur-md text-white rounded-lg hover:bg-destructive transition-colors"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        </div>
    );

    if (isFocused) {
        return createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-12 animate-in fade-in duration-300">
                <div className="w-full h-full max-w-6xl relative flex flex-col gap-4">
                    <div className="flex items-center justify-between text-white px-2">
                        <h3 className="text-xl font-bold truncate pr-8">{title}</h3>
                        <div className="flex items-center gap-4 text-sm font-medium opacity-60">
                            Focus Mode Active
                        </div>
                    </div>
                    <div className="flex-1 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        {playerContent}
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return playerContent;
};

const DrivePreviewModal: React.FC<{ url: string; title: string; onClose: () => void }> = ({ url, title, onClose }) => {
    const embedUrl = getEmbeddableDriveUrl(url);

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
            <div className="w-full h-full max-w-6xl bg-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText size={20} className="text-primary" />
                        </div>
                        <h3 className="font-bold text-lg truncate max-w-[200px] md:max-w-md">{title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg hover:bg-primary/5 text-text-secondary transition-colors"
                        >
                            <ExternalLink size={16} /> <span className="hidden sm:inline">Open in Drive</span>
                        </a>
                        <button 
                            onClick={onClose} 
                            className="p-2 hover:bg-destructive/10 text-text-secondary hover:text-destructive rounded-lg transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-background relative">
                    {embedUrl ? (
                        <iframe 
                            src={embedUrl} 
                            className="w-full h-full border-none" 
                            title={title}
                            allow="autoplay"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                            <AlertTriangle size={48} className="text-warning" />
                            <div>
                                <p className="font-bold text-xl">Preview Unavailable</p>
                                <p className="text-text-secondary">This link format might not support in-app previewing.</p>
                            </div>
                            <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="bg-primary text-on-accent px-6 py-2 rounded-lg font-bold"
                            >
                                Open External Resource
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const getEmbeddableDriveUrl = (url: string): string | null => {
    if (!url || !url.includes('drive.google.com') && !url.includes('docs.google.com')) return null;

    try {
        if (url.includes('/file/d/')) {
            return url.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
        }
        if (url.includes('/document/d/') || url.includes('/spreadsheets/d/') || url.includes('/presentation/d/')) {
            const baseUrl = url.split(/[?#]/)[0];
            if (baseUrl.endsWith('/edit')) {
                return baseUrl.replace(/\/edit$/, '/preview');
            }
            if (!baseUrl.endsWith('/preview')) {
                return `${baseUrl}/preview`;
            }
            return baseUrl;
        }
    } catch (e) {
        console.error("Error parsing Drive URL", e);
    }
    return url;
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
    const navigate = useNavigate();
    const { user, userData, updatePlaybookProgress } = useAuth();
    const [playbook, setPlaybook] = useState<Playbook | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [submissionText, setSubmissionText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    // Focus Mode State
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // For mobile or manual toggle

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

    const { currentIndex, prevLesson, nextLesson, progressPercentage } = useMemo(() => {
        if (!activeLesson || allLessonsFlat.length === 0) return { currentIndex: -1, prevLesson: null, nextLesson: null, progressPercentage: 0 };
        const idx = allLessonsFlat.findIndex(l => l.id === activeLesson.id);
        const progress = (completedLessons.length / allLessonsFlat.length) * 100;
        return {
            currentIndex: idx,
            prevLesson: idx > 0 ? allLessonsFlat[idx - 1] : null,
            nextLesson: idx < allLessonsFlat.length - 1 ? allLessonsFlat[idx + 1] : null,
            progressPercentage: progress
        };
    }, [activeLesson, allLessonsFlat, completedLessons]);


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
        const canMarkComplete = ['text', 'video', 'link', 'presentation', 'audio'].includes(lesson.type);

        const sanitizedHtml = lesson.type === 'text' ? DOMPurify.sanitize(marked(lesson.content as string)) : '';
        const isDriveLink = lesson.type === 'link' && ((lesson.content as string).includes('drive.google.com') || (lesson.content as string).includes('docs.google.com'));

        return (
            <div className={`space-y-8 ${isFocusMode ? 'animate-in fade-in slide-in-from-bottom-4 duration-500' : ''}`}>
                {lesson.type === 'audio' && (
                    <AudioPlayer url={lesson.content as string} title={lesson.title} />
                )}
                {lesson.type === 'video' && (
                     <VideoPlayer url={lesson.content as string} title={lesson.title} />
                )}
                {lesson.type === 'link' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="p-8 bg-surface border-2 border-dashed border-border rounded-3xl flex flex-col items-center text-center max-w-md w-full">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                                {isDriveLink ? <FileText size={32} className="text-primary" /> : <LinkIcon size={32} className="text-primary" />}
                            </div>
                            <h3 className="font-bold text-xl mb-2">{lesson.title}</h3>
                            <p className="text-sm text-text-secondary mb-6">
                                {isDriveLink ? 'This resource is a Google Drive document.' : 'This resource is an external link.'}
                            </p>
                            
                            <div className="flex flex-col w-full gap-3">
                                {isDriveLink && (
                                    <button 
                                        onClick={() => setPreviewUrl(lesson.content as string)} 
                                        className="flex items-center justify-center gap-2 bg-primary text-on-accent font-bold py-3 px-6 rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
                                    >
                                        <Eye size={18} /> Preview Document
                                    </button>
                                )}
                                <a 
                                    href={lesson.content as string} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className={`flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl transition-all ${isDriveLink ? 'bg-surface border border-border hover:bg-primary/5 text-text-primary' : 'bg-primary text-on-accent shadow-lg shadow-primary/20 hover:bg-opacity-90'}`}
                                >
                                    <ExternalLink size={18} /> {isDriveLink ? 'Open in Drive' : 'Open Resource'}
                                </a>
                            </div>
                        </div>
                    </div>
                )}
                {lesson.type === 'presentation' && (
                    <SlideViewer content={lesson.content as string} />
                )}
                {lesson.type === 'text' && (
                    <div className="prose dark:prose-invert max-w-none text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
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
                        <button onClick={handleMarkComplete} disabled={isCompleted} className={`flex items-center gap-2 py-3 px-8 rounded-full font-bold shadow-lg transition-all ${isCompleted ? 'bg-success text-on-success cursor-default' : 'bg-primary text-on-accent hover:scale-105 active:scale-95'}`}>
                           <CheckSquare size={18}/> {isCompleted ? 'Lesson Completed' : 'Mark as Complete'}
                        </button>
                    </div>
                )}
            </div>
        );
    };
    
    if (loading) return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>;
    if (error) return <Card className="m-8 text-center text-destructive">{error}</Card>;
    if (!playbook) return null;
    
    const LessonIcon = { link: LinkIcon, video: Video, text: FileText, quiz: BrainCircuit, checklist: ListChecks, presentation: Presentation, submission: Upload, audio: Headphones };
    const totalLessons = allLessonsFlat.length;

    return (
        <div className="h-full flex flex-col bg-background relative">
            {/* Top Navigation Bar (Always Visible) */}
            <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/resource-library')} className="p-2 hover:bg-primary/10 rounded-full text-text-secondary transition-colors" title="Back to Library">
                        <ArrowLeft size={20} />
                    </button>
                    {!isFocusMode && (
                        <h1 className="font-bold text-lg truncate max-w-[200px] sm:max-w-md">{playbook.title}</h1>
                    )}
                </div>

                {/* Progress Bar (Centered in Focus Mode) */}
                <div className={`flex items-center gap-3 transition-all duration-500 ${isFocusMode ? 'flex-1 justify-center max-w-2xl mx-auto' : 'w-1/3 hidden md:flex'}`}>
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                        <div className="h-full bg-success transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-text-secondary whitespace-nowrap">{Math.round(progressPercentage)}%</span>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => { setIsFocusMode(!isFocusMode); setIsSidebarOpen(!isFocusMode); }}
                        className={`p-2 rounded-full transition-colors ${isFocusMode ? 'bg-primary text-on-accent' : 'hover:bg-primary/10 text-text-secondary'}`}
                        title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
                    >
                        {isFocusMode ? <Shrink size={20} /> : <Expand size={20} />}
                    </button>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-primary/10 rounded-full text-text-secondary">
                        <Menu size={20} />
                    </button>
                </div>
            </header>
            
            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar Navigation */}
                <nav 
                    className={`
                        fixed md:relative z-20 h-full bg-surface border-r border-border transition-all duration-300 ease-in-out flex flex-col
                        ${isSidebarOpen && !isFocusMode ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden'}
                    `}
                >
                    <div className="p-4 border-b border-border bg-surface sticky top-0 z-10">
                        <h2 className="font-bold text-lg">Course Content</h2>
                        <p className="text-xs text-text-secondary">{completedLessons.length} / {totalLessons} lessons completed</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-4">
                        {playbook.modules.map(module => (
                            <div key={module.id} className="mb-2">
                                <button 
                                    onClick={() => setExpandedModules(p => ({...p, [module.id]: !p[module.id]}))} 
                                    className="w-full flex justify-between items-center p-2 hover:bg-primary/5 rounded-lg transition-colors text-left"
                                >
                                    <span className="font-bold text-sm text-text-primary">{module.title}</span>
                                    <ChevronDown size={16} className={`transition-transform duration-200 text-text-secondary ${expandedModules[module.id] ? 'rotate-180' : ''}`} />
                                </button>
                                
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${expandedModules[module.id] ? 'max-h-[1000px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                    {module.lessons.map(lesson => {
                                        const Icon = LessonIcon[lesson.type];
                                        const isCompleted = completedLessons.includes(lesson.id);
                                        const isActive = activeLesson?.id === lesson.id;
                                        
                                        return (
                                            <button 
                                                key={lesson.id} 
                                                onClick={() => { setActiveLesson(lesson); if (window.innerWidth < 768) setIsSidebarOpen(false); }} 
                                                className={`w-full text-left flex items-center gap-3 p-2 pl-4 rounded-lg text-sm transition-all border-l-2 ${isActive ? 'bg-primary/10 text-primary border-primary font-semibold' : 'border-transparent text-text-secondary hover:bg-primary/5 hover:text-text-primary'}`}
                                            >
                                                {isCompleted ? <CheckCircle size={14} className="text-success flex-shrink-0" /> : <Icon size={14} className="opacity-70 flex-shrink-0" />}
                                                <span className="truncate">{lesson.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </nav>

                {/* Main Content Area */}
                <main className={`flex-1 overflow-y-auto bg-background transition-all duration-300 ${isFocusMode ? 'px-0' : 'px-0'}`}>
                    {activeLesson ? (
                        <div className={`mx-auto transition-all duration-500 ${isFocusMode ? 'max-w-3xl py-12 px-6' : 'max-w-5xl py-8 px-4 md:px-8'}`}>
                            {isFocusMode && (
                                <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Current Lesson</p>
                                    <h2 className="text-3xl md:text-4xl font-black text-text-primary">{activeLesson.title}</h2>
                                </div>
                            )}
                            
                            {!isFocusMode && (
                                <div className="mb-6 pb-4 border-b border-border">
                                    <h2 className="text-2xl font-bold text-text-primary">{activeLesson.title}</h2>
                                </div>
                            )}

                            <div className="min-h-[400px]">
                                {renderLessonContent(activeLesson)}
                            </div>

                            {/* Navigation Footer */}
                            <div className="mt-16 pt-8 border-t border-border flex justify-between items-center">
                                <button 
                                    onClick={() => setActiveLesson(prevLesson)} 
                                    disabled={!prevLesson} 
                                    className="flex items-center gap-2 py-3 px-5 rounded-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface border border-transparent hover:border-border transition-all"
                                >
                                   <ArrowLeftIcon size={18}/> <span className="hidden sm:inline">Previous</span>
                                </button>
                                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                                    {currentIndex + 1} of {totalLessons}
                                </span>
                                <button 
                                    onClick={() => setActiveLesson(nextLesson)} 
                                    disabled={!nextLesson} 
                                    className="flex items-center gap-2 py-3 px-5 rounded-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed bg-primary text-on-accent hover:bg-opacity-90 hover:scale-105 transition-all shadow-lg shadow-primary/20"
                                >
                                   <span className="hidden sm:inline">Next Lesson</span> <ArrowRight size={18}/>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                                <BookOpen size={48} className="text-primary opacity-50" />
                            </div>
                            <h2 className="text-3xl font-bold text-text-primary mb-2">Welcome to {playbook.title}</h2>
                            <p className="text-text-secondary max-w-md">Select a lesson from the menu to begin your learning journey.</p>
                            <button onClick={() => setIsSidebarOpen(true)} className="mt-8 md:hidden px-6 py-3 bg-primary text-on-accent rounded-xl font-bold">
                                Open Menu
                            </button>
                        </div>
                    )}
                </main>
            </div>
            
            {/* Modal for Google Drive Preview */}
            {previewUrl && activeLesson && (
                <DrivePreviewModal 
                    url={previewUrl} 
                    title={activeLesson.title} 
                    onClose={() => setPreviewUrl(null)} 
                />
            )}
        </div>
    );
};

export default PlaybookViewerPage;
