


import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { Settings, SlidersHorizontal, Users, Building, Plus, Trash2, UserPlus, X, ClipboardCopy, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { MarketCenter, TeamMember, Team } from '../types';
import { Spinner } from '../components/ui/Spinner';


const SignupLinkGenerator: React.FC = () => {
    const { getAllTeams, getMarketCenters } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [marketCenters, setMarketCenters] = useState<MarketCenter[]>([]);
    // Fix: Correctly initialize useState with an initial boolean value.
    const [loading, setLoading] = useState(true);

    const [role, setRole] = useState<TeamMember['role']>('agent');
    const [teamId, setTeamId] = useState('');
    const [mcId, setMcId] = useState('');

    const [generatedLink, setGeneratedLink] = useState('');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [teamsData, mcData] = await Promise.all([getAllTeams(), getMarketCenters()]);
            setTeams(teamsData);
            setMarketCenters(mcData);
            setLoading(false);
        };
        fetchData();
    }, [getAllTeams, getMarketCenters]);

    const handleGenerate = () => {
        const baseUrl = `${window.location.origin}${window.location.pathname}#`;
        const params = new URLSearchParams();
        if (role) params.append('role', role);
        if (teamId) params.append('teamId', teamId);
        if (mcId) params.append('mcId', mcId);
        setGeneratedLink(`${baseUrl}?${params.toString()}`);
    };

    const handleCopy = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    };

    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary";
    const labelClasses = "block text-xs font-medium text-text-secondary mb-1";

    return (
        <div className="space-y-4 mt-6 pt-6 border-t border-border">
            <h2 className="text-2xl font-bold flex items-center gap-3"><LinkIcon/> Generate Sign-up Link</h2>
            <p className="text-sm text-text-secondary -mt-2">Create a custom link to onboard new users with a pre-assigned role and affiliations.</p>
            {loading ? <Spinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="role" className={labelClasses}>Role</label>
                        <select id="role" value={role} onChange={(e) => setRole(e.target.value as TeamMember['role'])} className={inputClasses}>
                            <option value="agent">Agent</option>
                            <option value="team_leader">Team Leader</option>
                            <option value="productivity_coach">Productivity Coach</option>
                            <option value="recruiter">Recruiter</option>
                            <option value="market_center_admin">MC Admin</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="mc" className={labelClasses}>Market Center (Optional)</label>
                        <select id="mc" value={mcId} onChange={(e) => setMcId(e.target.value)} className={inputClasses}>
                            <option value="">None</option>
                            {marketCenters.map(mc => <option key={mc.id} value={mc.id}>{mc.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="team" className={labelClasses}>Team (Optional)</label>
                        <select id="team" value={teamId} onChange={(e) => setTeamId(e.target.value)} className={inputClasses}>
                            <option value="">None</option>
                             {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
            )}
             <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-2 bg-accent/20 text-accent font-semibold py-2 px-4 rounded-lg">
                Generate Link
            </button>
            {generatedLink && (
                 <div className="flex items-center gap-2 bg-input p-2 rounded-lg">
                    <input type="text" readOnly value={generatedLink} className="flex-1 bg-transparent text-sm text-text-primary outline-none" />
                    <button 
                        onClick={handleCopy} 
                        className="p-2 rounded-md text-text-secondary hover:bg-accent/20 hover:text-text-primary disabled:cursor-not-allowed transition-colors"
                    >
                        {copyStatus === 'copied' ? (
                            <span className="text-xs font-semibold text-accent">Copied!</span>
                        ) : (
                            <ClipboardCopy size={20} />
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

const MarketCenterManagement: React.FC = () => {
    const { 
        getMarketCenters, 
        createMarketCenter, 
        deleteMarketCenter,
        assignMcAdmin,
        removeMcAdmin,
        getUsersByIds,
    } = useAuth();
    
    const [marketCenters, setMarketCenters] = useState<MarketCenter[]>([]);
    const [adminsMap, setAdminsMap] = useState<Record<string, TeamMember[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                    acc[mc.id] = mc.adminIds
                        .map(adminId => adminUserLookup.get(adminId))
                        .filter((user): user is TeamMember => !!user);
                    return acc;
                }, {} as Record<string, TeamMember[]>);

                setAdminsMap(newAdminsMap);
            } else {
                setAdminsMap({});
            }

        } catch (e) {
            setError('Failed to load market centers.');
        } finally {
            setLoading(false);
        }
    }, [getMarketCenters, getUsersByIds]);
    
    useEffect(() => {
        fetchMarketCenters();
    }, [fetchMarketCenters]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMcName || !newMcNumber || !newMcLocation || !newMcAgentCount) return;
        setLoading(true);
        const agentCountNum = parseInt(newMcAgentCount, 10);
        if(isNaN(agentCountNum)) {
            alert('Agent count must be a number.');
            setLoading(false);
            return;
        }

        await createMarketCenter({
            name: newMcName,
            marketCenterNumber: newMcNumber,
            location: newMcLocation,
            agentCount: agentCountNum,
        });
        
        setNewMcName('');
        setNewMcNumber('');
        setNewMcLocation('');
        setNewMcAgentCount('');
        setIsCreateModalOpen(false);
        fetchMarketCenters();
    };

    const handleDelete = async (mcId: string) => {
        if (window.confirm("Are you sure? This will delete the market center but will NOT delete its users.")) {
            setLoading(true);
            await deleteMarketCenter(mcId);
            fetchMarketCenters();
        }
    };
    
    const handleAddAdmin = async (e: React.FormEvent, mcId: string) => {
        e.preventDefault();
        const email = addAdminEmails[mcId];
        if(!email) return;
        setLoading(true);
        try {
            await assignMcAdmin(email, mcId);
            setAddAdminEmails(prev => ({ ...prev, [mcId]: '' }));
            fetchMarketCenters();
        } catch(error) {
            if (error instanceof Error) {
                alert(error.message);
            } else {
                alert('An unknown error occurred.');
            }
            setLoading(false);
        }
    };

    const handleRemoveAdmin = async (userId: string, mcId: string) => {
        if(window.confirm("Are you sure you want to remove this user as an MC Admin? Their role will be reverted to Agent.")) {
            setLoading(true);
            await removeMcAdmin(userId, mcId);
            fetchMarketCenters();
        }
    };


    if (loading) return <Spinner />;
    if (error) return <p className="text-destructive">{error}</p>;

    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary";
    const labelClasses = "block text-xs font-medium text-text-secondary mb-1";


    return (
        <div className="space-y-4 mt-6 pt-6 border-t border-border">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-3"><Building/> Market Center Management</h2>
                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 text-sm bg-primary/10 text-primary font-semibold py-1.5 px-3 rounded-lg hover:bg-primary/20"><Plus size={16}/> Create Market Center</button>
            </div>
            {marketCenters.map(mc => (
                <Card key={mc.id} className="bg-background/50">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="text-lg font-bold">{mc.name}</h4>
                            <p className="text-sm text-text-secondary">MC #{mc.marketCenterNumber} &bull; {mc.location} &bull; ~{mc.agentCount} Agents</p>
                        </div>
                        <button onClick={() => handleDelete(mc.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-full"><Trash2 size={16}/></button>
                    </div>
                    <div className="mt-4">
                        <h5 className="text-sm font-semibold mb-2">MC Admins</h5>
                        <div className="space-y-2">
                           {(adminsMap[mc.id] || []).map(admin => (
                               <div key={admin.id} className="flex justify-between items-center p-2 bg-surface rounded-lg">
                                   <p className="text-sm">{admin.name} ({admin.email})</p>
                                   <button onClick={() => handleRemoveAdmin(admin.id, mc.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded-full"><X size={14}/></button>
                               </div>
                           ))}
                           {(adminsMap[mc.id] || []).length === 0 && <p className="text-xs text-text-secondary">No admins assigned.</p>}
                        </div>
                         <form onSubmit={(e) => handleAddAdmin(e, mc.id)} className="mt-4 pt-4 border-t border-border flex items-end gap-2">
                            <div className="flex-grow">
                                <label className="text-xs font-medium text-text-secondary">Add Admin by Email</label>
                                <input 
                                    type="email"
                                    placeholder="user@example.com"
                                    value={addAdminEmails[mc.id] || ''}
                                    onChange={e => setAddAdminEmails(prev => ({...prev, [mc.id]: e.target.value}))}
                                    className="w-full bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-sm"
                                />
                            </div>
                            <button type="submit" className="p-2 bg-primary/20 text-primary rounded-md font-semibold text-sm"><UserPlus size={16}/></button>
                         </form>
                    </div>
                </Card>
            ))}

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-mc-title">
                    <Card className="w-full max-w-md">
                         <form onSubmit={handleCreate} className="space-y-4">
                            <h3 id="create-mc-title" className="text-lg font-bold mb-4">Create New Market Center</h3>
                            <div>
                                <label htmlFor="mcName" className={labelClasses}>Brokerage Name</label>
                                <input id="mcName" type="text" value={newMcName} onChange={(e) => setNewMcName(e.target.value)} placeholder="e.g., KW Ignite Realty" className={inputClasses} required />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="mcNumber" className={labelClasses}>Market Center Number</label>
                                    <input id="mcNumber" type="text" value={newMcNumber} onChange={(e) => setNewMcNumber(e.target.value)} placeholder="e.g., 1234" className={inputClasses} required />
                                </div>
                                <div>
                                    <label htmlFor="mcAgentCount" className={labelClasses}>Rough Agent Count</label>
                                    <input id="mcAgentCount" type="number" value={newMcAgentCount} onChange={(e) => setNewMcAgentCount(e.target.value)} placeholder="e.g., 150" className={inputClasses} required />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="mcLocation" className={labelClasses}>Location Details</label>
                                <input id="mcLocation" type="text" value={newMcLocation} onChange={(e) => setNewMcLocation(e.target.value)} placeholder="e.g., City, State/Province" className={inputClasses} required />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-primary/10">Cancel</button>
                                <button type="submit" className="py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold">Create</button>
                            </div>
                         </form>
                    </Card>
                </div>
            )}
        </div>
    );
};


const AdminSettingsPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <header className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
          <SlidersHorizontal className="text-accent-secondary" size={48} />
          Admin Settings
        </h1>
        <p className="text-lg text-text-secondary mt-1">Global configuration for the AgentGPS platform.</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card>
          <h2 className="text-2xl font-bold mb-4">Global Settings</h2>
          <div className="space-y-6">
            <Link to="/habit-settings" className="block p-6 bg-surface border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="text-primary" />
                <h3 className="text-lg font-bold text-text-primary">Habit Tracker Settings</h3>
              </div>
              <p className="text-sm text-text-secondary">
                Configure the default activities and point values for the Daily Habits Tracker across the entire platform.
              </p>
            </Link>
            <MarketCenterManagement />
            <SignupLinkGenerator />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettingsPage;