import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Palette, ClipboardCopy, Briefcase, Sun, Moon, Building, Shield, UserCircle, LogOut, KeyRound, Network, RefreshCw, Save, Trash2, Zap, MessageSquare, Phone, CheckCircle } from 'lucide-react';
import type { Team, TeamMember, MarketCenter } from '../types';
import { Link } from 'react-router-dom';

const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary";
const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
const buttonClasses = "w-full flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors duration-200 disabled:bg-opacity-50 disabled:cursor-not-allowed";

const FeedbackMessage: React.FC<{ message: string; type: 'success' | 'error' }> = ({ message, type }) => {
    if (!message) return null;
    return <p className={`text-xs mt-2 ${type === 'success' ? 'text-success' : 'text-destructive'}`}>{message}</p>;
};

const ProfileInfoForm: React.FC = () => {
    const { user, userData, updateUserProfile } = useAuth();
    const [name, setName] = useState(userData?.name || '');
    const [bio, setBio] = useState(userData?.bio || '');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: 'success' as 'success' | 'error' });

    useEffect(() => {
        if(userData) {
            setName(userData.name || '');
            setBio(userData.bio || '');
        }
    }, [userData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFeedback({ message: '', type: 'success' });
        if (!name.trim()) {
            setFeedback({ message: 'Name cannot be empty.', type: 'error' });
            setLoading(false);
            return;
        }
        try {
            await updateUserProfile({ name, bio });
            setFeedback({ message: 'Profile updated successfully!', type: 'success' });
        } catch (err) {
            setFeedback({ message: 'Failed to update profile.', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setFeedback({ message: '', type: 'success' }), 3000);
        }
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Profile Information</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-accent font-bold text-3xl flex-shrink-0">
                        {(name || ' ').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <label htmlFor="name" className={labelClasses}>Full Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className={inputClasses} />
                    </div>
                </div>
                 <div>
                    <label htmlFor="bio" className={labelClasses}>Bio</label>
                    <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} className={`${inputClasses} min-h-[100px]`} placeholder="Tell us a bit about yourself..."></textarea>
                </div>
                <div>
                    <label htmlFor="email" className={labelClasses}>Email</label>
                    <input type="email" id="email" value={user?.email || ''} className={`${inputClasses} bg-surface cursor-not-allowed`} readOnly />
                </div>
                <div className="pt-2">
                    <button type="submit" disabled={loading} className={buttonClasses}>
                        {loading ? <Spinner /> : 'Save Changes'}
                    </button>
                    <FeedbackMessage {...feedback} />
                </div>
            </form>
        </Card>
    );
};

const TwilioSettingsForm: React.FC = () => {
    const { userData, updateUserProfile } = useAuth();
    const [sid, setSid] = useState(userData?.twilioSid || '');
    const [token, setToken] = useState(userData?.twilioToken || '');
    const [number, setNumber] = useState(userData?.twilioNumber || '');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: 'success' as 'success' | 'error' });

    useEffect(() => {
        if (userData) {
            setSid(userData.twilioSid || '');
            setToken(userData.twilioToken || '');
            setNumber(userData.twilioNumber || '');
        }
    }, [userData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFeedback({ message: '', type: 'success' });
        try {
            // Explicitly pass the Twilio fields
            await updateUserProfile({
                twilioSid: sid.trim(),
                twilioToken: token.trim(),
                twilioNumber: number.trim()
            });
            setFeedback({ message: 'Twilio settings saved successfully!', type: 'success' });
        } catch (err) {
            console.error("Twilio Save Error:", err);
            setFeedback({ message: 'Failed to save settings. Please try again.', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setFeedback({ message: '', type: 'success' }), 3000);
        }
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><MessageSquare size={24}/> Communication Settings</h2>
            <p className="text-sm text-text-secondary mb-4">Connect your Twilio account to send SMS directly to leads and recruits from AgentGPS.</p>
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label htmlFor="twilioSid" className={labelClasses}>Twilio Account SID</label>
                    <input type="text" id="twilioSid" value={sid} onChange={e => setSid(e.target.value)} className={inputClasses} placeholder="AC..." />
                </div>
                <div>
                    <label htmlFor="twilioToken" className={labelClasses}>Twilio Auth Token</label>
                    <input type="password" id="twilioToken" value={token} onChange={e => setToken(e.target.value)} className={inputClasses} placeholder="••••••••" />
                </div>
                <div>
                    <label htmlFor="twilioNumber" className={labelClasses}>Twilio Phone Number</label>
                    <input type="text" id="twilioNumber" value={number} onChange={e => setNumber(e.target.value)} className={inputClasses} placeholder="+1..." />
                </div>
                <div className="pt-2">
                    <button type="submit" disabled={loading} className={buttonClasses}>
                        {loading ? <Spinner /> : (userData?.twilioSid ? 'Update Twilio Connection' : 'Connect Twilio')}
                    </button>
                    <FeedbackMessage {...feedback} />
                </div>
            </form>
        </Card>
    );
};

const PasswordUpdateForm: React.FC = () => {
    const { updatePassword } = useAuth();
    const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: 'success' as 'success' | 'error' });
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswords(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFeedback({ message: '', type: 'success' });
        if (passwords.newPassword.length < 6) {
            setFeedback({ message: 'Password must be at least 6 characters.', type: 'error' });
            setLoading(false);
            return;
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            setFeedback({ message: 'Passwords do not match.', type: 'error' });
            setLoading(false);
            return;
        }
        try {
            await updatePassword(passwords.newPassword);
            setFeedback({ message: 'Password updated successfully!', type: 'success' });
            setPasswords({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            setFeedback({ message: 'Failed to update password. You may need to sign in again.', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setFeedback({ message: '', type: 'success' }), 3000);
        }
    };
    
    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><KeyRound size={24}/> Security</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="newPassword" className={labelClasses}>New Password</label>
                    <input type="password" id="newPassword" value={passwords.newPassword} onChange={handleChange} className={inputClasses} />
                </div>
                 <div>
                    <label htmlFor="confirmPassword" className={labelClasses}>Confirm New Password</label>
                    <input type="password" id="confirmPassword" value={passwords.confirmPassword} onChange={handleChange} className={inputClasses} />
                </div>
                 <div className="pt-2">
                    <button type="submit" disabled={loading} className={buttonClasses}>
                        {loading ? <Spinner /> : 'Update Password'}
                    </button>
                    <FeedbackMessage {...feedback} />
                </div>
            </form>
        </Card>
    );
};


const AppearanceSettings: React.FC = () => {
    const { userData, updateTheme } = useAuth();
    const currentTheme = userData?.theme || 'light';

    const ThemeButton: React.FC<{ theme: 'light' | 'dark', icon: React.ElementType, label: string }> = ({ theme, icon: Icon, label }) => (
        <button
            onClick={() => updateTheme(theme)}
            className={`flex-1 p-4 rounded-lg text-center transition-all duration-200 border-2 flex flex-col items-center justify-center gap-2 ${currentTheme === theme ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border hover:border-primary/50'}`}
        >
            <Icon size={24} />
            <h3 className="font-bold text-lg">{label}</h3>
        </button>
    );

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Palette size={24}/> Appearance</h2>
            <p className="text-text-secondary mb-6 text-sm">Personalize the look and feel of your workspace.</p>
            <div className="flex items-center gap-4">
                <ThemeButton theme="light" icon={Sun} label="Light Mode" />
                <ThemeButton theme="dark" icon={Moon} label="Dark Mode" />
            </div>
        </Card>
    );
};

const TeamManagement: React.FC = () => {
    const { userData, getTeamById, getUsersByIds, joinTeam, createTeam, leaveTeam } = useAuth();
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [teamCode, setTeamCode] = useState('');
    const [actionFeedback, setActionFeedback] = useState({ message: '', type: 'success' as 'success' | 'error' });
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    useEffect(() => {
        if (!userData?.teamId) {
            setTeam(null);
            setMembers([]);
            return;
        }
        setLoading(true);
        const fetchTeam = async () => {
            const teamData = await getTeamById(userData.teamId!);
            setTeam(teamData);
            if (teamData) {
                const memberData = await getUsersByIds(teamData.memberIds);
                setMembers(memberData);
            }
            setLoading(false);
        };
        fetchTeam();
    }, [userData?.teamId, getTeamById, getUsersByIds]);
    
    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const result = await joinTeam(teamCode);
        setActionFeedback({ message: result.message, type: result.success ? 'success' : 'error' });
        setLoading(false);
        if (result.success) setTeamCode('');
    };

    const handleCreate = async () => {
        const teamName = prompt('Enter your new team name:');
        if (teamName) {
            setLoading(true);
            await createTeam(teamName);
            setLoading(false); // Auth listener will handle UI update
        }
    };
    
    const handleLeave = async () => {
        if (window.confirm('Are you sure you want to leave your team?')) {
            setLoading(true);
            const result = await leaveTeam();
            if (!result.success) {
                setActionFeedback({ message: result.message, type: 'error' });
            }
            setLoading(false); // Auth listener will handle UI update
        }
    };

    const handleCopyCode = () => {
        if (!team?.teamCode) return;
        navigator.clipboard.writeText(team.teamCode);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    };

    if (team) {
        return (
            <Card>
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><Briefcase size={24}/> Team Affiliation</h2>
                        <p className="text-lg font-semibold text-primary">{team.name}</p>
                    </div>
                    {userData?.role !== 'team_leader' && <button onClick={handleLeave} disabled={loading} className="flex items-center gap-2 text-sm bg-destructive/10 text-destructive font-semibold py-1.5 px-3 rounded-lg hover:bg-destructive/20">{loading ? <Spinner/> : <><LogOut size={14}/> Leave Team</>}</button>}
                </div>
                {userData?.role === 'team_leader' && (
                    <div className="mt-4">
                        <label className={labelClasses}>Team Invite Code</label>
                        <div className="flex items-center gap-2 bg-input p-2 rounded-lg">
                            <p className="flex-1 font-mono text-center text-lg tracking-widest text-text-primary">{team.teamCode}</p>
                            <button onClick={handleCopyCode} className="p-2 rounded-md text-text-secondary hover:bg-primary/20 hover:text-text-primary">{copyStatus === 'copied' ? <span className="text-xs font-semibold text-primary">Copied!</span> : <ClipboardCopy size={20} />}</button>
                        </div>
                    </div>
                )}
                <div className="mt-4 pt-4 border-t border-border">
                    <h3 className="font-semibold mb-2">Team Members ({members.length})</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {members.map(m => <p key={m.id} className="text-sm text-text-secondary">{m.name}</p>)}
                    </div>
                </div>
            </Card>
        );
    }

    return (
         <Card>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Briefcase size={24}/> Team Affiliation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                    <h3 className="text-lg font-bold">Join a Team</h3>
                    <form onSubmit={handleJoin} className="space-y-2 mt-2">
                        <label htmlFor="teamCode" className={labelClasses}>Enter Team Code</label>
                        <input id="teamCode" type="text" value={teamCode} onChange={e => setTeamCode(e.target.value)} className={inputClasses}/>
                        <button type="submit" disabled={loading || !teamCode} className={buttonClasses}>
                            {loading ? <Spinner /> : 'Join Team'}
                        </button>
                         <FeedbackMessage {...actionFeedback} />
                    </form>
                </div>
                <div className="text-center md:border-l md:pl-6 border-border">
                    <h3 className="text-lg font-bold">Create a Team</h3>
                    <p className="text-sm text-text-secondary my-2">Start your own team and become a Team Leader.</p>
                     <button onClick={handleCreate} disabled={loading} className={buttonClasses}>
                        {loading ? <Spinner /> : 'Create Your Team'}
                    </button>
                </div>
            </div>
        </Card>
    );
};


const MarketCenterAffiliation: React.FC = () => {
    const { userData, getMarketCenters, updateUserMarketCenter } = useAuth();
    const [marketCenters, setMarketCenters] = useState<MarketCenter[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMcId, setSelectedMcId] = useState(userData?.marketCenterId || '');
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: 'success' as 'success' | 'error' });

    useEffect(() => {
        getMarketCenters().then(mcs => {
            setMarketCenters(mcs);
            setLoading(false);
        });
    }, [getMarketCenters]);

    useEffect(() => {
        setSelectedMcId(userData?.marketCenterId || '');
    }, [userData?.marketCenterId]);

    const handleSave = async () => {
        setSaving(true);
        setFeedback({ message: '', type: 'success' });
        try {
            const newMcId = selectedMcId === '' ? null : selectedMcId;
            await updateUserMarketCenter(newMcId);
            setFeedback({ message: 'Market Center updated!', type: 'success' });
        } catch (e) {
            setFeedback({ message: 'Failed to update.', type: 'error' });
        } finally {
            setSaving(false);
            setTimeout(() => setFeedback({ message: '', type: 'success' }), 3000);
        }
    };

    const currentMarketCenter = marketCenters.find(mc => mc.id === userData?.marketCenterId);

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Building size={24}/> Market Center Affiliation</h2>
            {currentMarketCenter && (
                 <div className="bg-background/50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-text-secondary">Current Market Center</p>
                    <p className="font-bold text-lg text-text-primary">{currentMarketCenter.name} (#{currentMarketCenter.marketCenterNumber})</p>
                </div>
            )}
            <div className="space-y-4">
                 <div>
                    <label htmlFor="marketCenter" className={labelClasses}>Select Your Market Center</label>
                    <select 
                        id="marketCenter" 
                        value={selectedMcId}
                        onChange={e => setSelectedMcId(e.target.value)}
                        className={inputClasses}
                        disabled={loading || userData?.role === 'market_center_admin'}
                    >
                        <option value="">-- Not Affiliated --</option>
                        {marketCenters.map(mc => (
                            <option key={mc.id} value={mc.id}>{mc.name} (#{mc.marketCenterNumber})</option>
                        ))}
                    </select>
                     {userData?.role === 'market_center_admin' && <p className="text-xs text-text-secondary mt-1">MC Admins cannot change their affiliation from here.</p>}
                </div>
                <div className="pt-2 flex items-center justify-end gap-4">
                     <FeedbackMessage {...feedback} />
                    <button onClick={handleSave} disabled={saving || selectedMcId === (userData?.marketCenterId || '') || userData?.role === 'market_center_admin'} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg min-w-[180px]">
                        {saving ? <Spinner/> : 'Save Market Center'}
                    </button>
                </div>
            </div>
        </Card>
    );
};

const IntegrationsManagement: React.FC = () => {
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
        <Card>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Network size={24}/> Integrations</h2>
            <p className="text-sm text-text-secondary mb-4">Connect AgentGPS to other apps using Zapier.</p>
            
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">API Key</h3>
                    <p className="text-xs text-text-secondary mb-2">Use this key for actions (e.g., creating a lead in AgentGPS from a Facebook Ad).</p>
                    <div className="flex items-center gap-2 bg-input p-2 rounded-lg">
                        {loadingKey ? <Spinner /> : <input type="text" readOnly value={apiKey} className="flex-1 bg-transparent text-sm font-mono text-text-primary outline-none" />}
                        <button onClick={handleCopyKey} className="p-2 rounded-md text-text-secondary hover:bg-accent/20 hover:text-text-primary">{copyStatus === 'copied' ? <span className="text-xs font-semibold text-accent">Copied!</span> : <ClipboardCopy size={20} />}</button>
                    </div>
                    <button onClick={handleRegenerateKey} disabled={loadingKey} className="mt-2 flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"><RefreshCw size={12}/> Regenerate Key</button>
                </div>

                <div className="pt-4 border-t border-border">
                    <h3 className="text-lg font-semibold mb-2">Webhooks (Triggers)</h3>
                    <p className="text-xs text-text-secondary mb-4">When an event happens in AgentGPS, data will be sent to the URL you provide. Get these URLs from the "Webhooks by Zapier" app.</p>
                    {loadingWebhooks ? <Spinner/> : (
                        <div className="space-y-4">
                            {Object.entries(AVAILABLE_TRIGGERS).map(([eventKey, eventLabel]) => (
                                <div key={eventKey}>
                                    <label className="block text-sm font-medium text-text-primary mb-1">{eventLabel}</label>
                                    <div className="flex items-center gap-2">
                                        <input type="url" value={webhookInputs[eventKey] || ''} onChange={e => handleWebhookInputChange(eventKey, e.target.value)} placeholder="Paste Zapier Webhook URL here..." className={inputClasses} />
                                        {webhooks[eventKey] ? (
                                            <button onClick={() => handleDeleteWebhook(eventKey)} disabled={savingWebhook === eventKey} className="p-2 bg-destructive/10 text-destructive rounded-md">{savingWebhook === eventKey ? <Spinner className="w-5 h-5"/> : <Trash2 size={20}/>}</button>
                                        ) : (
                                            <button onClick={() => handleSaveWebhook(eventKey)} disabled={savingWebhook === eventKey} className="p-2 bg-primary/10 text-primary rounded-md">{savingWebhook === eventKey ? <Spinner className="w-5 h-5"/> : <Save size={20}/>}</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};


const ProfilePage: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <header className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
          <UserCircle className="text-accent-secondary" size={48} />
          My Profile
        </h1>
        <p className="text-lg text-text-secondary mt-1">Manage your account details, preferences, and affiliations.</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <ProfileInfoForm />
            <TwilioSettingsForm />
            <TeamManagement />
            <MarketCenterAffiliation />
            <IntegrationsManagement />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <AppearanceSettings />
            <PasswordUpdateForm />
             <Card>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Shield size={24}/> Legal</h2>
                <div className="space-y-2">
                    <Link to="/privacy" className="block text-primary hover:underline">Privacy Policy</Link>
                    <Link to="/terms" className="block text-primary hover:underline">Terms of Service</Link>
                </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;