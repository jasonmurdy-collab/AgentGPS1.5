
import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { BookOpen, Rocket, Route, CheckCircle, ChevronRight, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TrainingHubPage: React.FC = () => {
    const { userData } = useAuth();

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Training & Resources</h1>
                <p className="text-lg text-text-secondary mt-1">Your personalized learning center and skill development hub.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Link to="/my-launchpad" className="block">
                            <Card className="flex items-center gap-6 p-8 hover:bg-primary/5 border-2 border-primary/20 transition-all group">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Rocket size={40} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-text-primary group-hover:text-primary transition-colors">My Launchpad</h2>
                                    <p className="text-text-secondary">Your onboarding journey and weekly homework assignments.</p>
                                </div>
                                <ChevronRight className="text-text-secondary group-hover:text-primary transition-all group-hover:translate-x-1" />
                            </Card>
                        </Link>

                        <Link to="/resource-library" className="block">
                            <Card className="flex items-center gap-6 p-8 hover:bg-accent-secondary/5 border-2 border-accent-secondary/20 transition-all group">
                                <div className="w-16 h-16 rounded-2xl bg-accent-secondary/10 flex items-center justify-center text-accent-secondary">
                                    <BookOpen size={40} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-text-primary group-hover:text-accent-secondary transition-colors">Growth Library</h2>
                                    <p className="text-text-secondary">Access standard playbooks, lead-gen strategies, and MREA models.</p>
                                </div>
                                <ChevronRight className="text-text-secondary group-hover:text-accent-secondary transition-all group-hover:translate-x-1" />
                            </Card>
                        </Link>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="h-full bg-surface/50 border-dashed border-2">
                            <div className="flex items-center gap-2 mb-6">
                                <CheckCircle className="text-success" size={20} />
                                <h3 className="font-bold text-lg">My Progress</h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Overall Completion</p>
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-2xl font-black">42%</span>
                                        <span className="text-sm text-text-secondary">12/28 Lessons</span>
                                    </div>
                                    <div className="w-full bg-background rounded-full h-2">
                                        <div className="bg-success h-2 rounded-full" style={{ width: '42%' }}></div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <h4 className="font-bold text-sm mb-3">Recently Completed</h4>
                                    <div className="space-y-3">
                                        {['Database Setup', 'Sphere Nurture', 'Time Management'].map(lesson => (
                                            <div key={lesson} className="flex items-center gap-2 text-sm text-text-secondary">
                                                <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                                                {lesson}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainingHubPage;
