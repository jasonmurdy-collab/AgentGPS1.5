import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { DiscoveryGuideData } from '../../types';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { Link } from 'react-router-dom';
import { Compass, Target, Star } from 'lucide-react';
import { getFirestoreInstance } from '../../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

export const GpsSummaryCard: React.FC = () => {
    const { user } = useAuth();
    const [guideData, setGuideData] = useState<DiscoveryGuideData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setTimeout(() => setLoading(false), 0);
            return;
        }
        
        const db = getFirestoreInstance();
        if (!db) return;
        const docRef = doc(db, 'businessGps', user.uid);
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const fetchedData = docSnap.data() as any;
                setGuideData(fetchedData.gpsData || null);
            } else {
                setGuideData(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching GPS data snapshot:", error);
            setGuideData(null);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
          <Card className="flex flex-col h-full animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 rounded-full bg-surface/50"></div>
              <div className="h-7 w-1/2 bg-surface/50 rounded"></div>
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <div className="h-4 w-1/3 bg-surface/50 rounded mb-2"></div>
                <div className="h-6 w-3/4 bg-surface/50 rounded"></div>
              </div>
              <div>
                <div className="h-4 w-1/3 bg-surface/50 rounded mb-2"></div>
                <div className="h-5 w-1/2 bg-surface/50 rounded mb-1"></div>
                <div className="h-5 w-1/2 bg-surface/50 rounded"></div>
              </div>
            </div>
            <div className="mt-4 h-5 w-1/4 bg-surface/50 rounded self-end"></div>
          </Card>
        );
    }

    const hasData = guideData && guideData.gpsGoal.targetGoal;
    
    if (!hasData) {
        return (
            <Card className="flex flex-col justify-center items-center text-center h-full">
                <Compass size={48} className="text-accent-secondary mb-4" />
                <h2 className="text-2xl font-bold text-text-primary">Define Your Compass</h2>
                <p className="text-text-secondary mt-2 max-w-sm">
                    Your Business GPS is the foundation of your success. Map out your goals and priorities to see your strategic summary here.
                </p>
                <Link to="/business-gps" className="mt-4 bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                    Start Your GPS
                </Link>
            </Card>
        );
    }
    
    const priorities = guideData.gpsPriorities.filter(p => p.what);

    return (
        <Card className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
                <Compass className="text-accent-secondary" size={24} />
                <h2 className="text-2xl font-bold">Your Business GPS</h2>
            </div>
            
            <div className="space-y-4 flex-1">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
                        <Target size={16}/>
                        <span>YOUR BIG GOAL</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary mt-1">{guideData.gpsGoal.targetGoal}</p>
                </div>
                
                {priorities.length > 0 && (
                    <div>
                         <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
                            <Star size={16}/>
                            <span>TOP PRIORITIES</span>
                        </div>
                        <ul className="space-y-1 mt-2">
                           {priorities.map(p => (
                                <li key={p.id} className="text-text-secondary pl-2 border-l-2 border-primary/30">
                                    {p.what}
                                </li>
                           ))}
                        </ul>
                    </div>
                )}
            </div>
            
            <div className="mt-4 text-right">
                <Link to="/business-gps" className="text-sm font-semibold text-primary hover:underline">
                    View Full GPS &rarr;
                </Link>
            </div>
        </Card>
    )
}