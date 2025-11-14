import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { Playbook, LearningPath, Lesson } from '../types';
import { BookOpen, Search, Layers, BookOpen as LeadGenIcon, TrendingUp, ChevronsRight } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';

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
        const playbooksRef = collection(db, 'playbooks');
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
                snapshot.docs.forEach(doc => {
                    if (!allPlaybooks.has(doc.id)) {
                        const data = doc.data();
                        allPlaybooks.set(doc.id, {
                            id: doc.id, ...data,
                            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                        } as Playbook);
                    }
                });
            });
            setPlaybooks(Array.from(allPlaybooks.values()));
        } catch (error) { console.error("Error fetching playbooks:", error); } 
        finally { setLoading(false); }
    }, [userData]);

    useEffect(() => {
        fetchPlaybooks();
    }, [fetchPlaybooks]);

    const { upNext, filteredPlaybooks } = useMemo(() => {
        if (!playbooks.length || !userData) return { upNext: null, filteredPlaybooks: [] };

        let nextLesson: Lesson | null = null;
        let nextPlaybook: Playbook | null = null;
        
        // This logic can be expanded when Learning Paths are formally implemented and assigned
        for (const pb of playbooks) {
            const allLessons = pb.modules.flatMap(m => m.lessons);
            const completed = userData.playbookProgress?.[pb.id] || [];
            const firstUncompleted = allLessons.find(l => !completed.includes(l.id));

            if (firstUncompleted) {
                nextLesson = firstUncompleted;
                nextPlaybook = pb;
                break;
            }
        }
        
        let filtered = playbooks;
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = playbooks.filter(playbook =>
                playbook.title.toLowerCase().includes(lowercasedTerm) ||
                playbook.description.toLowerCase().includes(lowercasedTerm)
            );
        }

        return {
            upNext: nextLesson && nextPlaybook ? { nextLesson, playbook: nextPlaybook } : null,
            filteredPlaybooks: filtered
        };

    }, [playbooks, userData, searchTerm]);

    const getPlaybookProgress = (playbook: Playbook) => {
        const totalLessons = playbook.modules.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0);
        const completedLessons = userData?.playbookProgress?.[playbook.id]?.length || 0;
        const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
        return { progress, totalLessons, completedLessons };
    };

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                   <TrendingUp className="text-accent-secondary" size={48} />
                   My Growth
                </h1>
                <p className="text-lg text-text-secondary mt-1">Your personalized hub for learning and development.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
                {loading ? <Spinner /> : upNext && <UpNextCard {...upNext} />}

                <div>
                    <h2 className="text-2xl font-bold mb-4">Core Playbooks</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StaticPlaybookCard
                            title="MREA Playbook"
                            description="A deep dive into the foundational models of The Millionaire Real Estate Agent."
                            to="/resource-library/mrea-playbook"
                            icon={Layers}
                        />
                        <StaticPlaybookCard
                            title="Lead Generation Playbook"
                            description="Actionable ideas to fuel your pipeline. Click any idea to create a goal."
                            to="/resource-library/lead-gen"
                            icon={LeadGenIcon}
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Custom Playbooks</h2>
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"/>
                            <input
                                type="text"
                                placeholder="Search playbooks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full max-w-sm bg-input border border-border rounded-md pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-10"><Spinner /></div>
                    ) : filteredPlaybooks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPlaybooks.map(playbook => {
                                const { progress, totalLessons, completedLessons } = getPlaybookProgress(playbook);
                                return (
                                    <PlaybookProgressCard 
                                        key={playbook.id} 
                                        playbook={playbook} 
                                        progress={progress}
                                        totalLessons={totalLessons}
                                        completedLessons={completedLessons}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="text-center py-12">
                            <h2 className="text-xl font-bold">No Custom Playbooks Found</h2>
                            <p className="text-text-secondary mt-2">
                                {searchTerm 
                                ? "No playbooks match your search."
                                : "Your coach or team leader has not added any custom playbooks yet."}
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResourceLibraryPage;