
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useAuth, P } from '../contexts/AuthContext';
import type { TeamMember, Team, MarketCenter } from '../types';
import { User, Briefcase, Building, Target, Search, Edit, ArrowLeft, X, UserPlus } from 'lucide-react';
import { createPortal } from 'react-dom';

const UserRow: React.FC<{
    user: TeamMember;
    teams: Map<string, string>;
    coaches: TeamMember[];
    onAssignCoach: (agent: TeamMember) => void;
    onAssignTeam: (agent: TeamMember) => void;
    isMobile?: boolean; // New prop for conditional rendering
}> = ({ user, teams, coaches, onAssignCoach, onAssignTeam, isMobile = false }) => {
    const formatRole = (role: TeamMember['role']) => {
        if (role === 'team_leader') return 'Team Leader';
        if (role === 'productivity_coach') return 'Productivity Coach';
        if (role === 'recruiter') return 'Recruiter';
        return 'Agent';
    };

    const currentTeamName = user.teamId ? teams.get(user.teamId) || 'N/A' : 'Not Assigned';
    const currentCoachName = user.coachId ? coaches.find(c => c.id === user.coachId)?.name || 'N/A' : 'Not Assigned';

    if (isMobile) {
        return (
            <Card className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-lg text-text-primary">{user.name}</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onAssignTeam(user)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-full"
                            title="Assign Team"
                        >
                            <Briefcase size={16} />
                        </button>
                        <button
                            onClick={() => onAssignCoach(user)}
                            className="p-2 text-accent-secondary hover:bg-accent-secondary/10 rounded-full"
                            title="Assign Coach"
                        >
                            <User size={16} />
                        </button>
                    </div>
                </div>
                <p className="text-sm text-text-secondary">{user.email}</p>
                <div className="mt-2 text-sm">
                    <p><strong>Role:</strong> {formatRole(user.role)}</p>
                    <p><strong>Team:</strong> {currentTeamName}</p>
                    <p><strong>Coach:</strong> {currentCoachName}</p>
                </div>
            </Card>
        );
    }

    return (
        <tr className="border-t border-border">
            <td className="p-3 font-semibold">{user.name}</td>
            <td className="p-3 text-text-secondary">{user.email}</td>
            <td className="p-3 text-text-secondary">{formatRole(user.role)}</td>
            <td className="p-3 text-text-secondary">{currentTeamName}</td>
            <td className="p-3 text-text-secondary">{currentCoachName}</td>
            <td className="p-3 flex items-center gap-2">
                <button
                    onClick={() => onAssignTeam(user)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-full"
                    title="Assign Team"
                >
                    <Briefcase size={16} />
                </button>
                <button
                    onClick={() => onAssignCoach(user)}
                    className="p-2 text-accent-secondary hover:bg-accent-secondary/10 rounded-full"
                    title="Assign Coach"
                >
                    <User size={16} />
                </button>
            </td>
        </tr>
    );
};

interface AssignTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    agent: TeamMember | null;
    allTeams: Team[];
    onSave: (agentId: string, newTeamId: string | null) => Promise<void>;
}

const AssignTeamModal: React.FC<AssignTeamModalProps> = ({ isOpen, onClose, agent, allTeams, onSave }) => {
    const [selectedTeamId, setSelectedTeamId] = useState<string>(agent?.teamId || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (agent) setSelectedTeamId(agent.teamId || '');
    }, [agent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agent) return;
        setSaving(true);
        try {
            await onSave(agent.id, selectedTeamId === '' ? null : selectedTeamId);
            onClose();
        } catch (error) {
            console.error("Failed to assign team:", error);
            alert("Failed to assign team. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !agent) return null;

    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Assign Team to {agent.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-primary/5"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="team-select" className={labelClasses}>Select Team</label>
                        <select
                            id="team-select"
                            value={selectedTeamId}
                            onChange={e => setSelectedTeamId(e.target.value)}
                            className={inputClasses}
                        >
                            <option value="">-- No Team --</option>
                            {allTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-primary/10">Cancel</button>
                        <button type="submit" disabled={saving} className="min-w-[120px] flex justify-center items-center py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold hover:bg-opacity-90 disabled:bg-opacity-50">
                            {saving ? <Spinner /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>,
        document.body
    );
};

interface AssignCoachModalProps {
    isOpen: boolean;
    onClose: () => void;
    agent: TeamMember | null;
    allCoaches: TeamMember[];
    onSave: (agentId: string, newCoachId: string | null) => Promise<void>;
}

const AssignCoachModal: React.FC<AssignCoachModalProps> = ({ isOpen, onClose, agent, allCoaches, onSave }) => {
    const [selectedCoachId, setSelectedCoachId] = useState<string>(agent?.coachId || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (agent) setSelectedCoachId(agent.coachId || '');
    }, [agent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agent) return;
        setSaving(true);
        try {
            await onSave(agent.id, selectedCoachId === '' ? null : selectedCoachId);
            onClose();
        } catch (error) {
            console.error("Failed to assign coach:", error);
            alert("Failed to assign coach. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !agent) return null;

    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Assign Coach to {agent.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-primary/5"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="coach-select" className={labelClasses}>Select Coach</label>
                        <select
                            id="coach-select"
                            value={selectedCoachId}
                            onChange={e => setSelectedCoachId(e.target.value)}
                            className={inputClasses}
                        >
                            <option value="">-- No Coach --</option>
                            {allCoaches.map(coach => <option key={coach.id} value={coach.id}>{coach.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-primary/10">Cancel</button>
                        <button type="submit" disabled={saving} className="min-w-[120px] flex justify-center items-center py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold hover:bg-opacity-90 disabled:bg-opacity-50">
                            {saving ? <Spinner /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>,
        document.body
    );
};


const AgentAssignmentPage: React.FC = () => {
    // Fix: Updated useAuth destructuring to import the new functions
    const { userData, getUsersForMarketCenter, getAllTeams, updateUserCoachAssignment, updateUserTeamAffiliation } = useAuth();
    const [mcAgents, setMcAgents] = useState<TeamMember[]>([]);
    const [allCoaches, setAllCoaches] = useState<TeamMember[]>([]);
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterSearch, setFilterSearch] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterTeamId, setFilterTeamId] = useState('all');
    const [filterCoachId, setFilterCoachId] = useState('all');

    const [isAssignTeamModalOpen, setIsAssignTeamModalOpen] = useState(false);
    const [isAssignCoachModalOpen, setIsAssignCoachModalOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<TeamMember | null>(null);

    const currentMarketCenterId = userData?.marketCenterId;

    const fetchData = useCallback(async () => {
        if (!currentMarketCenterId) {
            setError("No Market Center assigned to your admin account.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const [usersInMc, allTeamsData] = await Promise.all([
                getUsersForMarketCenter(currentMarketCenterId),
                getAllTeams(),
            ]);

            const agentsOnly = usersInMc.filter(u => u.id !== userData.id);
            setMcAgents(agentsOnly);
            setAllTeams(allTeamsData);

            const coachesInMc = usersInMc.filter(u => P.isCoach(u) || P.isTeamLeader(u) || P.isSuperAdmin(u));
            setAllCoaches(coachesInMc);

        } catch (err: any) {
            console.error("Failed to fetch data for agent assignment:", err);
            setError(`Failed to load agents or teams: ${err.message || 'Check permissions.'}`);
        } finally {
            setLoading(false);
        }
    }, [currentMarketCenterId, userData, getUsersForMarketCenter, getAllTeams]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAssignCoachClick = (agent: TeamMember) => {
        setSelectedAgent(agent);
        setIsAssignCoachModalOpen(true);
    };

    const handleAssignTeamClick = (agent: TeamMember) => {
        setSelectedAgent(agent);
        setIsAssignTeamModalOpen(true);
    };

    // Fix: Using the new updateUserCoachAssignment from AuthContext
    const handleSaveCoachAssignment = async (agentId: string, newCoachId: string | null) => {
        await updateUserCoachAssignment(agentId, newCoachId);
        fetchData(); // Re-fetch to update the table
    };

    // Fix: Using the new updateUserTeamAffiliation from AuthContext
    const handleSaveTeamAssignment = async (agentId: string, newTeamId: string | null) => {
        await updateUserTeamAffiliation(agentId, newTeamId);
        fetchData(); // Re-fetch to update the table
    };

    const filteredAgents = useMemo(() => {
        let filtered = mcAgents;

        if (filterSearch) {
            const lowercasedSearch = filterSearch.toLowerCase();
            filtered = filtered.filter(u =>
                u.name?.toLowerCase().includes(lowercasedSearch) ||
                u.email?.toLowerCase().includes(lowercasedSearch)
            );
        }
        if (filterRole !== 'all') {
            filtered = filtered.filter(u => u.role === filterRole);
        }
        if (filterTeamId !== 'all') {
            filtered = filtered.filter(u => (filterTeamId === 'none' ? !u.teamId : u.teamId === filterTeamId));
        }
        if (filterCoachId !== 'all') {
            filtered = filtered.filter(u => (filterCoachId === 'none' ? !u.coachId : u.coachId === filterCoachId));
        }

        return filtered;
    }, [mcAgents, filterSearch, filterRole, filterTeamId, filterCoachId]);

    const teamOptionsMap = useMemo(() => new Map(allTeams.map(t => [t.id, t.name])), [allTeams]);
    const coachOptionsMap = useMemo(() => new Map(allCoaches.map(c => [c.id, c.name])), [allCoaches]);

    if (!P.isMcAdmin(userData) && !P.isSuperAdmin(userData)) {
        return (
            <Card className="m-8 text-center text-destructive">
                <p>You do not have permission to view this page.</p>
            </Card>
        );
    }

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-10 h-10" /></div>;
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                    <UserPlus className="text-accent-secondary" size={48} />
                    Agent Assignments
                </h1>
                <p className="text-lg text-text-secondary mt-1">Manage team and coach assignments for agents in your market center.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                {error && (
                    <Card className="bg-destructive-surface text-destructive border-destructive">
                        <p className="font-bold">Error Loading Data</p>
                        <p>{error}</p>
                    </Card>
                )}

                <Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <label htmlFor="search" className="text-xs font-semibold text-text-secondary">Search</label>
                            <Search size={16} className="absolute left-3 bottom-2.5 text-text-secondary" />
                            <input
                                id="search"
                                name="search"
                                type="text"
                                placeholder="Name or email..."
                                value={filterSearch}
                                onChange={e => setFilterSearch(e.target.value)}
                                className="w-full bg-input border border-border rounded-md pl-9 pr-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label htmlFor="role" className="text-xs font-semibold text-text-secondary">Role</label>
                            <select id="role" name="role" value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="all">All Roles</option>
                                <option value="agent">Agent</option>
                                <option value="team_leader">Team Leader</option>
                                <option value="productivity_coach">Productivity Coach</option>
                                <option value="recruiter">Recruiter</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="teamId" className="text-xs font-semibold text-text-secondary">Team</label>
                            <select id="teamId" name="teamId" value={filterTeamId} onChange={e => setFilterTeamId(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="all">All Teams</option>
                                <option value="none">Not Assigned</option>
                                {allTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="coachId" className="text-xs font-semibold text-text-secondary">Coach</label>
                            <select id="coachId" name="coachId" value={filterCoachId} onChange={e => setFilterCoachId(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="all">All Coaches</option>
                                <option value="none">Not Assigned</option>
                                {allCoaches.map(coach => <option key={coach.id} value={coach.id}>{coach.name}</option>)}
                            </select>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-2xl font-bold mb-4">Agents in Market Center</h2>
                    <div className="block md:hidden space-y-4">
                        {filteredAgents.length > 0 ? (
                            filteredAgents.map(agent => (
                                <UserRow
                                    key={agent.id}
                                    user={agent}
                                    teams={teamOptionsMap}
                                    coaches={allCoaches}
                                    onAssignCoach={handleAssignCoachClick}
                                    onAssignTeam={handleAssignTeamClick}
                                    isMobile={true}
                                />
                            ))
                        ) : (
                            <p className="text-center text-text-secondary py-8">No agents found matching your filters.</p>
                        )}
                    </div>
                    <div className="overflow-x-auto hidden md:block">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-background/50">
                                <tr>
                                    <th className="p-3 font-semibold text-text-primary">Name</th>
                                    <th className="p-3 font-semibold text-text-primary">Email</th>
                                    <th className="p-3 font-semibold text-text-primary">Role</th>
                                    <th className="p-3 font-semibold text-text-primary">Team</th>
                                    <th className="p-3 font-semibold text-text-primary">Coach</th>
                                    <th className="p-3 font-semibold text-text-primary">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAgents.length > 0 ? (
                                    filteredAgents.map(agent => (
                                        <UserRow
                                            key={agent.id}
                                            user={agent}
                                            teams={teamOptionsMap}
                                            coaches={allCoaches}
                                            onAssignCoach={handleAssignCoachClick}
                                            onAssignTeam={handleAssignTeamClick}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center text-text-secondary py-8">No agents found matching your filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <AssignTeamModal
                isOpen={isAssignTeamModalOpen}
                onClose={() => { setIsAssignTeamModalOpen(false); setSelectedAgent(null); }}
                agent={selectedAgent}
                allTeams={allTeams}
                onSave={handleSaveTeamAssignment}
            />

            <AssignCoachModal
                isOpen={isAssignCoachModalOpen}
                onClose={() => { setIsAssignCoachModalOpen(false); setSelectedAgent(null); }}
                agent={selectedAgent}
                allCoaches={allCoaches}
                onSave={handleSaveCoachAssignment}
            />
        </div>
    );
};

export default AgentAssignmentPage;