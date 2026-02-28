import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Megaphone, AlertCircle, Clock } from 'lucide-react';
import { getFirestoreInstance } from '../../firebaseConfig';
import { collection, query, orderBy, limit, getDocs, Timestamp, where } from 'firebase/firestore';
import type { Announcement } from '../../types';
import { Spinner } from '../ui/Spinner';
import DOMPurify from 'dompurify';
import { useAuth } from '../../contexts/AuthContext';

const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const AnnouncementFeed: React.FC = () => {
    const { userData } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            if (!userData) return;
            setLoading(true);
            try {
                const db = getFirestoreInstance();
                if (!db) {
                    setLoading(false);
                    return;
                }
                
                const collectionRef = collection(db, 'announcements');
                let q;
                
                if (userData.marketCenterId) {
                    q = query(
                        collectionRef,
                        where('marketCenterId', '==', userData.marketCenterId),
                        orderBy('date', 'desc'),
                        limit(10)
                    );
                } else {
                    q = query(
                        collectionRef,
                        orderBy('date', 'desc'),
                        limit(10)
                    );
                }

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => {
                    const d = doc.data() as any;
                    return {
                        id: doc.id,
                        title: d.title,
                        body: d.body,
                        date: (d.date as Timestamp)?.toDate().toISOString(),
                        authorId: d.authorId,
                        authorName: d.authorName,
                        importance: d.importance || 'normal',
                        marketCenterId: d.marketCenterId,
                        mediaType: d.mediaType || 'none',
                        mediaUrl: d.mediaUrl || ''
                    } as Announcement;
                });
                setAnnouncements(data);
            } catch (error) {
                console.error("Error fetching announcements:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, [userData]);

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <Card><div className="flex justify-center p-4"><Spinner /></div></Card>;

    return (
        <Card className="flex flex-col h-full max-h-[600px]">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-border">
                <Megaphone className="text-accent-secondary" size={24} />
                <h2 className="text-xl font-bold text-text-primary">Announcements</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {announcements.length > 0 ? (
                    announcements.map(item => (
                        <div key={item.id} className={`rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-md ${item.importance === 'high' ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-background/50'}`}>
                            {/* Media Section */}
                            {item.mediaType === 'image' && item.mediaUrl && (
                                <div className="w-full aspect-video overflow-hidden border-b border-border">
                                    <img 
                                        src={item.mediaUrl} 
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}
                            {item.mediaType === 'video' && item.mediaUrl && (
                                <div className="w-full aspect-video border-b border-border bg-black">
                                    {getYouTubeId(item.mediaUrl) ? (
                                        <iframe 
                                            className="w-full h-full"
                                            src={`https://www.youtube.com/embed/${getYouTubeId(item.mediaUrl)}`}
                                            title={item.title}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs px-4 text-center">
                                            Invalid Video Link
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-lg leading-tight ${item.importance === 'high' ? 'text-destructive' : 'text-text-primary'}`}>
                                        {item.importance === 'high' && <AlertCircle size={16} className="inline mr-1 -mt-1"/>}
                                        {item.title}
                                    </h3>
                                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest flex items-center gap-1 flex-shrink-0 ml-2">
                                        <Clock size={10}/> {formatDate(item.date)}
                                    </span>
                                </div>
                                <div 
                                    className="text-sm text-text-secondary prose dark:prose-invert max-w-none line-clamp-4"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.body) }}
                                />
                                <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
                                    <p className="text-[10px] font-bold text-text-secondary italic">BY {item.authorName.toUpperCase()}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-text-secondary py-8">No announcements yet.</p>
                )}
            </div>
        </Card>
    );
};

export default AnnouncementFeed;
