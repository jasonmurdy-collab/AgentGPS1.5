
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { 
    Settings, 
    SlidersHorizontal, 
    Users, 
    Building, 
    Plus, 
    Trash2, 
    UserPlus, 
    X, 
    ClipboardCopy, 
    Link as LinkIcon, 
    Database, 
    Download,
    FileSpreadsheet,
    Target,
    Briefcase,
    Megaphone,
    Send,
    Edit,
    Calendar as CalendarIcon,
    CheckCircle,
    Image as ImageIcon,
    Video as VideoIcon,
    MinusCircle,
    Info,
    ExternalLink,
    HelpCircle,
    Network,
    RefreshCw,
    Save,
    Zap,
    // Add missing KeyRound icon
    KeyRound
} from 'lucide-react';
import { useAuth, P } from '../contexts/AuthContext';
import { useGoals } from '../contexts/GoalContext';
import type { MarketCenter, TeamMember, Team, Announcement } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { getFirestoreInstance } from '../firebaseConfig';
import { collection, getDocs, addDoc, serverTimestamp, orderBy, query, deleteDoc, doc, where, updateDoc, getDoc } from 'firebase/firestore';
import { RichTextEditor } from '../components/ui/RichTextEditor';

const ConnectionCenter: React.FC = () => {
    const { userData, regenerateZapierApiKey, getWebhooks, saveWebhook, deleteWebhook } = useAuth();
    const [apiKey, setApiKey] = useState(userData?.zapierApiKey || '');
    const [loadingKey, setLoadingKey] = useState(!userData?.zapierApiKey);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [webhooks, setWebhooks] = useState<Record<string, string>>({});
    const [webhookInputs, setWebhookInputs] = useState<Record<string, string>>({});
    const [loadingWebhooks, setLoadingWebhooks] = useState(true);
    const [savingWebhook, setSavingWebhook] = useState<string | null>(null);

    const AVAILABLE_TRIGGERS = {
        'new_goal': 'New Goal Created',
        'new_transaction': 'New Transaction Logged',
        'new_client_lead': 'New Client Lead Added',
    };

    useEffect(() => {
        if (!userData?.zapierApiKey) {
            setLoadingKey(true);
            regenerateZapierApiKey().then(newKey => {
                setApiKey(newKey);
                setLoadingKey(false);
            });
        }
    }, [userData?.zapierApiKey, regenerateZapierApiKey]);

    useEffect(() => {
        getWebhooks().then(fetchedWebhooks => {
            setWebhooks(fetchedWebhooks);
            setWebhookInputs(fetchedWebhooks);
            setLoadingWebhooks(false);
        });
    }, [getWebhooks]);

    const handleRegenerateKey = async () => {
        if (window.confirm("Are you sure? Regenerating your API key will break any existing integrations.")) {
            setLoadingKey(true);
            const newKey = await regenerateZapierApiKey();
            setApiKey(newKey);
            setLoadingKey(false);
        }
    };

    const handleCopyKey = () => {
        navigator.clipboard.writeText(apiKey);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    };
    
    const handleWebhookInputChange = (eventKey: string, value: string) => {
        setWebhookInputs(prev => ({ ...prev, [eventKey]: value }));
    };

    const handleSaveWebhook = async (eventKey: string) => {
        const url = webhookInputs[eventKey];
        if (!url || !url.startsWith('https://hooks.zapier.com/')) {
            alert('Please enter a valid Zapier webhook URL.');
            return;
        }
        setSavingWebhook(eventKey);
        await saveWebhook(eventKey, url);
        setWebhooks(prev => ({ ...prev, [eventKey]: url }));
        setSavingWebhook(null);
    };

    const handleDeleteWebhook = async (eventKey: string) => {
        if (window.confirm("Are you sure you want to remove this webhook?")) {
            setSavingWebhook(eventKey);
            await deleteWebhook(eventKey);
            setWebhooks(prev => {
                const newWebhooks = { ...prev };
                delete newWebhooks[eventKey];
                return newWebhooks;
            });
            setWebhookInputs(prev => {
                const newInputs = { ...prev };
                delete newInputs[eventKey];
                return newInputs;
            });
            setSavingWebhook(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="bg-primary/5 border-primary/20">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <Zap size={24}/>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Zapier Connection</h2>
                        <p className="text-sm text-text-secondary">Sync your production and leads with 6,000+ apps.</p>
                    </div>
                </div>
                
                <div className="p-4 bg-surface rounded-xl border border-border">
                    <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2 uppercase tracking-widest"><KeyRound size={14}/> Your Private API Key</h3>
                    <p className="text-xs text-text-secondary mb-3">Keep this key secret. Use it when setting up "AgentGPS" actions in your Zapier account.</p>
                    <div className="flex items-center gap-2 bg-input p-2 rounded-lg border border-border">
                        {loadingKey ? <Spinner /> : <input type="text" readOnly value={apiKey} className="flex-1 bg-transparent text-sm font-mono text-text-primary outline-none" />}
                        <button onClick={handleCopyKey} className="p-2 rounded-md text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors">{copyStatus === 'copied' ? <CheckCircle size={20} className="text-success" /> : <ClipboardCopy size={20} />}</button>
                    </div>
                    <button onClick={handleRegenerateKey} disabled={loadingKey} className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-destructive hover:underline"><RefreshCw size={10}/> Regenerate Key</button>
                </div>
            </Card>

            <Card>
                <h3 className="text-xl font-bold mb-4">Automated Triggers</h3>
                <p className="text-sm text-text-secondary mb-6">Create a "Webhook" trigger in Zapier, then paste the unique URL for each event type below.</p>
                {loadingWebhooks ? <Spinner/> : (
                    <div className="space-y-6">
                        {Object.entries(AVAILABLE_TRIGGERS).map(([eventKey, eventLabel]) => (
                            <div key={eventKey} className="group">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-sm font-bold text-text-primary">{eventLabel}</label>
                                    {webhooks[eventKey] && <span className="text-[10px] font-black text-success uppercase bg-success/10 px-2 py-0.5 rounded-full">Connected</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                                        <input 
                                            type="url" 
                                            value={webhookInputs[eventKey] || ''} 
                                            onChange={e => handleWebhookInputChange(eventKey, e.target.value)} 
                                            placeholder="https://hooks.zapier.com/..." 
                                            className="w-full bg-input border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all" 
                                        />
                                    </div>
                                    {webhooks[eventKey] ? (
                                        <button onClick={() => handleDeleteWebhook(eventKey)} disabled={savingWebhook === eventKey} className="p-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors">{savingWebhook === eventKey ? <Spinner className="w-5 h-5"/> : <Trash2 size={20}/>}</button>
                                    ) : (
                                        <button onClick={() => handleSaveWebhook(eventKey)} disabled={savingWebhook === eventKey} className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors">{savingWebhook === eventKey ? <Spinner className="w-5 h-5"/> : <Save size={20}/>}</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

const CommunicationCenter: React.FC = () => {
    const { userData, user } = useAuth();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [importance, setImportance] = useState<'normal' | 'high'>('normal');
    const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
    const [mediaUrl, setMediaUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const canPost = P.isSuperAdmin(userData) || P.isMcAdmin(userData) || P.isCoach(userData) || P.isTeamLeader(userData);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            if (!userData) return;
            const db = getFirestoreInstance();
            if (!db) return;
            
            let q;
            if (userData.marketCenterId) {
                q = query(
                    collection(db, 'announcements'), 
                    where('marketCenterId', '==', userData.marketCenterId),
                    orderBy('date', 'desc')
                );
            } else {
                q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
            }

            try {
                const snap = await getDocs(q);
                setAnnouncements(snap.docs.map(d => ({id: d.id, ...d.data()} as Announcement)));
            } catch (error) {
                console.error("Error fetching announcements:", error);
            }
        };
        fetchAnnouncements();
    }, [refreshTrigger, userData]);

    const handlePost = async () => {
        if (!title || !body || !user) return;
        if (mediaType !== 'none' && !mediaUrl) {
            alert("Please provide a media URL for the selected media type.");
            return;
        }
        setLoading(true);
        try {
            const db = getFirestoreInstance();
            if (!db) throw new Error("Database not connected");
            const targetMcId = userData?.marketCenterId || null;

            await addDoc(collection(db, 'announcements'), {
                title,
                body,
                importance,
                mediaType,
                mediaUrl: mediaType !== 'none' ? mediaUrl : '',
                date: serverTimestamp(),
                authorId: user.uid,
                authorName: userData?.name || 'Admin',
                marketCenterId: targetMcId
            });
            setTitle('');
            setBody('');
            setImportance('normal');
            setMediaType('none');
            setMediaUrl('');
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error(error);
            alert('Failed to post announcement.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Delete this announcement?")) return;
        const db = getFirestoreInstance();
        if (!db) return;
        await deleteDoc(doc(db, 'announcements', id));
        setRefreshTrigger(prev => prev + 1);
    };

    if (!canPost) return null;

    return (
        <Card className="mt-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Megaphone /> Communication Center</h2>
            <p className="text-sm text-text-secondary mb-4">Post updates and news to the Dashboard feed for your Market Center.</p>
            
            <div className="space-y-4 mb-8 p-4 bg-background/50 rounded-lg border border-border">
                <h3 className="font-semibold text-lg">Create New Announcement</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold mb-1">Title</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary"
                            placeholder="e.g., Weekly Team Meeting Moved"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1">Importance</label>
                        <select 
                            value={importance} 
                            onChange={e => setImportance(e.target.value as 'normal' | 'high')}
                            className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary"
                        >
                            <option value="normal">Normal</option>
                            <option value="high">High (Red Alert)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold mb-2">Media Attachment</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button 
                            type="button"
                            onClick={() => setMediaType('none')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${mediaType === 'none' ? 'bg-primary text-white border-primary' : 'bg-input text-text-secondary border-border hover:border-primary'}`}
                        >
                            <MinusCircle size={14}/> No Media
                        </button>
                        <button 
                            type="button"
                            onClick={() => setMediaType('image')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${mediaType === 'image' ? 'bg-primary text-white border-primary' : 'bg-input text-text-secondary border-border hover:border-primary'}`}
                        >
                            <ImageIcon size={14}/> Image
                        </button>
                        <button 
                            type="button"
                            onClick={() => setMediaType('video')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${mediaType === 'video' ? 'bg-primary text-white border-primary' : 'bg-input text-text-secondary border-border hover:border-primary'}`}
                        >
                            <VideoIcon size={14}/> Video (YouTube)
                        </button>
                    </div>

                    {mediaType !== 'none' && (
                        <div className="animate-in fade-in slide-in-from-top-1">
                            <label className="block text-xs font-semibold mb-1">
                                {mediaType === 'image' ? 'Image URL (Direct link to .jpg, .png, .webp)' : 'YouTube URL'}
                            </label>
                            <input 
                                type="url" 
                                value={mediaUrl} 
                                onChange={e => setMediaUrl(e.target.value)} 
                                className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary"
                                placeholder={mediaType === 'image' ? 'https://example.com/image.jpg' : 'https://youtube.com/watch?v=...'}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold mb-1">Message Body</label>
                    <RichTextEditor content={body} onChange={setBody} placeholder="Write your announcement here..." />
                </div>
                <button 
                    onClick={handlePost} 
                    disabled={loading || !title || !body}
                    className="flex items-center gap-2 bg-primary text-on-accent px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                    {loading ? <Spinner className="w-4 h-4" /> : <Send size={16} />} Post Announcement
                </button>
            </div>

            <h3 className="font-semibold text-lg mb-2">Recent Posts</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {announcements.map(a => (
                    <div key={a.id} className="flex justify-between items-center p-3 bg-input rounded-md border border-border">
                        <div>
                            <p className="font-bold text-sm">
                                {a.title} 
                                {a.importance === 'high' && <span className="text-destructive text-xs ml-2">(High)</span>}
                                {a.mediaType !== 'none' && <span className="text-accent-secondary text-xs ml-2">({a.mediaType})</span>}
                            </p>
                            <p className="text-xs text-text-secondary">Posted by {a.authorName}</p>
                        </div>
                        <button onClick={() => handleDelete(a.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-full"><Trash2 size={16}/></button>
                    </div>
                ))}
                {announcements.length === 0 && <p className="text-sm text-text-secondary">No recent announcements found.</p>}
            </div>
        </Card>
    );
};

const MarketCenterLeadershipSettings: React.FC = () => {
    const { userData } = useAuth();
    const [mcData, setMcData] = useState<MarketCenter | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [calendarUrl, setCalendarUrl] = useState('');
    const [feedback, setFeedback] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const fetchMc = async () => {
            if (!userData?.marketCenterId) return;
            const db = getFirestoreInstance();
            if (!db) return;
            const mcDoc = await getDoc(doc(db, 'marketCenters', userData.marketCenterId));
            if (mcDoc.exists()) {
                const data = mcDoc.data() as MarketCenter;
                setMcData({ id: mcDoc.id, ...data });
                setCalendarUrl(data.calendarEmbedUrl || '');
            }
            setLoading(false);
        };
        fetchMc();
    }, [userData]);

    const handleUrlChange = (val: string) => {
        // Automatically extract src if an iframe tag is pasted
        if (val.includes('<iframe')) {
            const match = val.match(/src=["']([^"']+)["']/);
            if (match && match[1]) {
                setCalendarUrl(match[1]);
                return;
            }
        }
        setCalendarUrl(val);
    };

    const handleSave = async () => {
        if (!userData?.marketCenterId) return;
        setSaving(true);
        setFeedback('');
        try {
            const db = getFirestoreInstance();
            if (!db) return;
            await updateDoc(doc(db, 'marketCenters', userData.marketCenterId), {
                calendarEmbedUrl: calendarUrl
            });
            setFeedback('Calendar URL updated!');
            setTimeout(() => setFeedback(''), 3000);
        } catch (error) {
            console.error(error);
            setFeedback('Update failed.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-4"><Spinner /></div>;
    if (!mcData) return null;

    return (
        <Card className="mt-6">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2"><CalendarIcon /> Market Center Configuration</h2>
                <button 
                    onClick={() => setShowHelp(!showHelp)} 
                    className="flex items-center gap-1 text-sm font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <HelpCircle size={16} /> Setup Guide
                </button>
            </div>
            
            <p className="text-sm text-text-secondary mb-6">Manage settings for <strong>{mcData.name}</strong>.</p>
            
            {showHelp && (
                <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-bold flex items-center gap-2"><Info size={18} className="text-primary"/> How to connect your Google Calendar</h3>
                    <ol className="text-sm space-y-3 list-decimal list-inside text-text-secondary">
                        <li>Open your <strong>Google Calendar</strong> on a computer.</li>
                        <li>Click the <Settings size={14} className="inline"/> icon and go to <strong>Settings</strong>.</li>
                        <li>On the left sidebar, find <strong>Settings for my calendars</strong> and select your MC calendar.</li>
                        <li>Under <strong>Access permissions for events</strong>, check <strong>Make available to public</strong>. 
                            <p className="ml-5 text-[10px] text-destructive font-bold uppercase mt-1 italic">
                                * Note: If your Google Workspace admin has disabled this, you must ask them to allow "Public Sharing" for your domain.
                            </p>
                        </li>
                        <li>Scroll down to <strong>Integrate calendar</strong> and find the <strong>Embed code</strong>.</li>
                        <li>Copy the entire code and paste it below. We will extract the link for you!</li>
                    </ol>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Google Calendar Embed URL or Code</label>
                    <textarea 
                        value={calendarUrl} 
                        onChange={e => handleUrlChange(e.target.value)} 
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary min-h-[80px] font-mono text-xs"
                        placeholder="Paste <iframe ...> code or the src URL here..."
                    />
                    <div className="flex items-start gap-2 mt-2">
                        <Info size={14} className="text-text-secondary mt-0.5" />
                        <p className="text-[11px] text-text-secondary">
                            This calendar will be visible to every agent in your Market Center. 
                            Ensure the calendar's <strong>Public Sharing</strong> is turned on in Google, or agents will only see a blank screen.
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-4">
                    {feedback && <span className="text-sm text-success flex items-center gap-1"><CheckCircle size={14}/> {feedback}</span>}
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="bg-primary text-on-accent px-4 py-2 rounded-lg font-semibold min-w-[120px]"
                    >
                        {saving ? <Spinner className="mx-auto" /> : 'Save Calendar Link'}
                    </button>
                </div>
            </div>
        </Card>
    );
};

const MarketCenterManagement: React.FC = () => {
    const { getMarketCenters, createMarketCenter, deleteMarketCenter, assignMcAdmin, removeMcAdmin, getUsersByIds } = useAuth();
    const [marketCenters, setMarketCenters] = useState<MarketCenter[]>([]);
    const [adminsMap, setAdminsMap] = useState<Record<string, TeamMember[]>>({});
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newMcName, setNewMcName] = useState('');
    const [newMcNumber, setNewMcNumber] = useState('');
    const [newMcLocation, setNewMcLocation] = useState('');
    const [newMcAgentCount, setNewMcAgentCount] = useState('');
    const [addAdminEmails, setAddAdminEmails] = useState<Record<string, string>>({});
    
    const fetchMarketCenters = useCallback(async () => {
        setLoading(true);
        try {
            const mcs = await getMarketCenters();
            setMarketCenters(mcs);
            const allAdminIds = [...new Set(mcs.flatMap(mc => mc.adminIds))];
            if (allAdminIds.length > 0) {
                const adminUsers = await getUsersByIds(allAdminIds);
                const adminUserLookup = new Map(adminUsers.map(user => [user.id, user]));
                const newAdminsMap = mcs.reduce((acc, mc) => {
                    acc[mc.id] = mc.adminIds.map(adminId => adminUserLookup.get(adminId)).filter((user): user is TeamMember => !!user);
                    return acc;
                }, {} as Record<string, TeamMember[]>);
                setAdminsMap(newAdminsMap);
            } else {
                setAdminsMap({});
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [getMarketCenters, getUsersByIds]);
    
    useEffect(() => { fetchMarketCenters(); }, [fetchMarketCenters]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMcName || !newMcNumber || !newMcLocation || !newMcAgentCount) return;
        setLoading(true);
        await createMarketCenter({ name: newMcName, marketCenterNumber: newMcNumber, location: newMcLocation, agentCount: parseInt(newMcAgentCount, 10) || 0 });
        setIsCreateModalOpen(false);
        fetchMarketCenters();
    };

    const handleDelete = async (mcId: string) => {
        if (window.confirm("Are you sure? This will delete the market center.")) {
            setLoading(true);
            await deleteMarketCenter(mcId);
            fetchMarketCenters();
        }
    };
    
    if (loading) return <Spinner />;

    return (
        <div className="space-y-4 mt-6 pt-6 border-t border-border">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-3"><Building/> Market Center Management (Global)</h2>
                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 text-sm bg-primary/10 text-primary font-semibold py-1.5 px-3 rounded-lg hover:bg-primary/20"><Plus size={16}/> Create MC</button>
            </div>
            {marketCenters.map(mc => (
                <Card key={mc.id} className="bg-background/50">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="text-lg font-bold">{mc.name}</h4>
                            <p className="text-sm text-text-secondary">MC #{mc.marketCenterNumber} &bull; {mc.location}</p>
                        </div>
                        <button onClick={() => handleDelete(mc.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-full"><Trash2 size={16}/></button>
                    </div>
                </Card>
            ))}
        </div>
    );
};

const AdminSettingsPage: React.FC = () => {
    const { userData } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'integrations'>('general');
    const isSuperAdmin = P.isSuperAdmin(userData);
    const isLeadership = P.isMcAdmin(userData) || P.isCoach(userData);

    const TabButton: React.FC<{ tabId: 'general' | 'integrations'; label: string; icon: React.ElementType }> = ({ tabId, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === tabId ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-secondary hover:border-border'}`}
        >
            <Icon size={16} /> {label}
        </button>
    );

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                    <SlidersHorizontal className="text-accent-secondary" size={48} />
                    Settings
                </h1>
                <p className="text-lg text-text-secondary mt-1">
                    {isSuperAdmin ? 'Platform-wide configuration and administration.' : 'Market Center management and communication center.'}
                </p>
                <div className="mt-8 flex border-b border-border">
                    <TabButton tabId="general" label="General Admin" icon={Settings} />
                    <TabButton tabId="integrations" label="Connection Center" icon={Zap} />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                {activeTab === 'general' ? (
                    <div className="space-y-6">
                        {isLeadership && (
                            <>
                                <MarketCenterLeadershipSettings />
                                <CommunicationCenter />
                            </>
                        )}
                        
                        {isSuperAdmin && (
                            <>
                                <Link to="/habit-settings" className="block p-6 bg-surface border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Settings className="text-primary" />
                                        <h3 className="text-lg font-bold text-text-primary">Habit Tracker Settings</h3>
                                    </div>
                                    <p className="text-sm text-text-secondary">Configure platform-wide default activities.</p>
                                </Link>
                                <MarketCenterManagement />
                            </>
                        )}
                    </div>
                ) : (
                    <ConnectionCenter />
                )}
            </div>
        </div>
    );
};

export default AdminSettingsPage;
