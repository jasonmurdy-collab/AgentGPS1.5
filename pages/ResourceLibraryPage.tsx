

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { Playbook, LearningPath, Lesson } from '../types';
import { BookOpen, Search, Layers, BookOpen as LeadGenIcon, TrendingUp, ChevronsRight } from 'lucide-react';
import { getFirestoreInstance } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
// Fix: Import the processing utility for playbook documents.
import { processPlaybookDoc } from '../lib/firestoreUtils';


const StaticPlaybookCard: React.FC<{ title: string; description: string; to: string; icon: React.ElementType; }> = ({ title, description, to, icon: Icon }) => (
    <Link to={to} className="block h-full">
        <Card className="h-full flex flex-col justify-between hover:border-primary hover:bg-primary/5 transition-all group">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Icon className="text-accent-secondary" size={24}/>
                    <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">{title}</h3>
                </div>
                <p className="text-sm text-text-secondary mt-2 flex-grow">{description}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border text-right">
                <span className="text-sm font-semibold text-primary">View Playbook &rarr;</span>
            </div>
        </Card>
    </Link>
);

const PlaybookProgressCard: React.FC<{
    playbook: Playbook;
    progress: number;
    totalLessons: number;
    completedLessons: number;
}> = ({ playbook, progress, totalLessons, completedLessons }) => {
    return (
        <Link to={`/resource-library/${playbook.id}`} className="block h-full">
            <Card className="h-full flex flex-col hover:border-primary hover:bg-primary/5 transition-all group">
                <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">{playbook.title}</h3>
                <p className="text-sm text-text-secondary mt-2 flex-grow">{playbook.description}</p>
                <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex justify-between items-center mb-1 text-xs font-semibold">
                        <span className="text-primary">{progress.toFixed(0)}% Complete</span>
                        <span className="text-text-secondary">{completedLessons}/{totalLessons} Lessons</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </Card>
        </Link>
    );
};

const UpNextCard: React.FC<{
    nextLesson: Lesson;
    playbook: Playbook;
}> = ({ nextLesson, playbook }) => {
    return (
        <Card className="bg-primary/10 border-primary/20">
            <h2 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2"><TrendingUp/> Up Next</h2>
            <p className="text-text-secondary mb-4">Jump back into your learning journey.</p>
            <Link to={`/resource-library/${playbook.id}`} className="block p-4 bg-surface rounded-lg hover:shadow-lg transition-shadow">
                <p className="text-sm text-text-secondary font-semibold">{playbook.title}</p>
                <h3 className="text-xl font-bold text-primary flex items-center justify-between">
                    {nextLesson.title}
                    <ChevronsRight />
                </h3>
            </Link>
        </Card>
    )
}


const ResourceLibraryPage: React.FC = () => {
    const { userData } = useAuth();
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPlaybooks = useCallback(async () => {
        if (!userData) { setLoading(false); return; }
        setLoading(true);
        const playbooksRef = collection(getFirestoreInstance(), 'playbooks');
        const queriesToRun = [
            query(playbooksRef, where('teamId', '==', null), where('marketCenterId', '==', null)),
        ];
        if (userData.teamId) {
            queriesToRun.push(query(playbooksRef, where('teamId', '==', userData.teamId)));
        }
        if (userData.marketCenterId) {
            queriesToRun.push(query(playbooksRef, where('marketCenterId', '==', userData.marketCenterId)));
        }
        try {
            const snapshots = await Promise.all(queriesToRun.map(q => getDocs(q)));
            const allPlaybooks = new Map<string, Playbook>();
            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    if (!allPlaybooks.has(doc.id)) {
                        allPlaybooks.set(doc.id, processPlaybookDoc(doc));
                    }
                });
            });
            setPlaybooks(Array.from(allPlaybooks.values()));
        } catch (error) {
            console.error("Error fetching playbooks:", error);
        } finally {
            setLoading(false);
        }
    }, [userData]);

    useEffect(() => {
        fetchPlaybooks();
    }, [fetchPlaybooks]);
    
    const filteredPlaybooks = useMemo(() => {
        return playbooks.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [playbooks, searchTerm]);
    
    const progressData = useMemo(() => {
        return playbooks.map(playbook => {
            const totalLessons = playbook.modules.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0);
            const completedLessons = userData?.playbookProgress?.[playbook.id]?.length || 0;
            const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
            return { playbook, progress, totalLessons, completedLessons };
        });
    }, [playbooks, userData?.playbookProgress]);

    const nextLessonInfo = useMemo(() => {
        for (const { playbook, completedLessons, totalLessons } of progressData) {
            if (completedLessons > 0 && completedLessons < totalLessons) {
                const firstUncompleted = playbook.modules.flatMap(m => m.lessons).find(l => !userData?.playbookProgress?.[playbook.id]?.includes(l.id));
                if (firstUncompleted) {
                    return { playbook, nextLesson: firstUncompleted };
                }
            }
        }
        return null;
    }, [progressData, userData?.playbookProgress]);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>;
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                    <BookOpen size={48} className="text-accent-secondary" />
                    My Growth
                </h1>
                <p className="text-lg text-text-secondary mt-1">Your central hub for playbooks, training, and lead generation strategies.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
                {nextLessonInfo && <UpNextCard playbook={nextLessonInfo.playbook} nextLesson={nextLessonInfo.nextLesson} />}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StaticPlaybookCard 
                        title="Lead Generation Playbook"
                        description="Actionable, proven strategies to fuel your pipeline, from direct prospecting to digital marketing."
                        to="/resource-library/lead-gen"
                        icon={LeadGenIcon}
                    />
                     <StaticPlaybookCard 
                        title="MREA Playbook"
                        description="A deep dive into the foundational models of The Millionaire Real Estate Agent for building a scalable business."
                        to="/resource-library/mrea-playbook"
                        icon={Layers}
                    />
                </div>

                <div>
                    <h2 className="text-2xl font-bold mb-4">Your Playbooks</h2>
                    <div className="relative mb-6">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input 
                            type="text" 
                            placeholder="Search playbooks..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full max-w-sm bg-input border border-border rounded-lg pl-12 pr-4 py-3"
                        />
                    </div>
                    {filteredPlaybooks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPlaybooks.map(playbook => {
                                const data = progressData.find(p => p.playbook.id === playbook.id);
                                return data ? <PlaybookProgressCard key={playbook.id} {...data} /> : null;
                            })}
                        </div>
                    ) : (
                         <Card><p className="text-center text-text-secondary py-8">No playbooks found.</p></Card>
                    )}
                </div>
            </div>
        </div>
    );
};
export default ResourceLibraryPage;