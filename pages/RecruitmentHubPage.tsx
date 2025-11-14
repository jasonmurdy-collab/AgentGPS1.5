

import React, { useState, useMemo, useCallback, DragEvent, FC, useEffect } from 'react';
import { useAuth, P } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { UserSearch, PlusCircle, Mail, Phone, X, Trash2, Edit, Send, Briefcase, User, PhoneCall, Mail as MailIcon, DollarSign, ClipboardList } from 'lucide-react';
import type { Candidate, PipelineStage, CandidateActivity, TeamMember } from '../types';
import { PIPELINE_STAGES } from '../types';
import { createPortal } from 'react-dom';
import { Spinner } from '../components/ui/Spinner';
import { CandidateCard } from '../components/recruitment/CandidateCard';
import { RecruitmentStats } from '../components/recruitment/RecruitmentStats';

// --- UTILITY FUNCTIONS ---
function timeAgo(dateString: string) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// --- SUB-COMPONENTS ---

const AddCandidateModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Candidate, 'id' | 'createdAt' | 'lastContacted'>) => Promise<void>;
}> = ({ isOpen, onClose, onSubmit }) => {
    const { user, userData } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [stage, setStage] = useState<PipelineStage>('Lead');
    const [currentBrokerage, setCurrentBrokerage] = useState('');
    const [gciLast12Months, setGciLast12Months] = useState('');
    const [unitsLast12Months, setUnitsLast12Months] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userData?.marketCenterId) return;
        setLoading(true);
        try {
            await onSubmit({ 
                name, email, phone, stage, recruiterId: user.uid, marketCenterId: userData.marketCenterId,
                currentBrokerage, 
                gciLast12Months: Number(gciLast12Months) || undefined,
                unitsLast12Months: Number(unitsLast12Months) || undefined,
            });
            setName(''); setEmail(''); setPhone(''); setStage('Lead');
            setCurrentBrokerage(''); setGciLast12Months(''); setUnitsLast12Months('');
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to add candidate.');
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Add New Candidate</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-primary/10"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-border pb-2">Contact Info</h3>
                    <div>
                        <label htmlFor="add-candidate-name" className={labelClasses}>Full Name</label>
                        <input id="add-candidate-name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="add-candidate-email" className={labelClasses}>Email</label>
                            <input id="add-candidate-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClasses} required />
                        </div>
                        <div>
                            <label htmlFor="add-candidate-phone" className={labelClasses}>Phone (Optional)</label>
                            <input id="add-candidate-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClasses} />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold border-b border-border pb-2 pt-4">Business Details</h3>
                    <div>
                        <label htmlFor="add-candidate-brokerage" className={labelClasses}>Current Brokerage (Optional)</label>
                        <input id="add-candidate-brokerage" type="text" value={currentBrokerage} onChange={e => setCurrentBrokerage(e.target.value)} className={inputClasses} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="add-candidate-gci" className={labelClasses}>GCI - Last 12 mo (Optional)</label>
                            <input id="add-candidate-gci" type="number" value={gciLast12Months} onChange={e => setGciLast12Months(e.target.value)} className={inputClasses} placeholder="e.g., 150000" />
                        </div>
                        <div>
                            <label htmlFor="add-candidate-units" className={labelClasses}>Units - Last 12 mo (Optional)</label>
                            <input id="add-candidate-units" type="number" value={unitsLast12Months} onChange={e => setUnitsLast12Months(e.target.value)} className={inputClasses} placeholder="e.g., 12" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="add-candidate-stage" className={labelClasses}>Initial Stage</label>
                        <select id="add-candidate-stage" value={stage} onChange={e => setStage(e.target.value as PipelineStage)} className={inputClasses}>
                            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-text-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="min-w-[120px] flex justify-center items-center py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold">{loading ? <Spinner /> : "Add Candidate"}</button>
                    </div>
                </form>
            </Card>
        </div>,
        document.body
    );
};

const CandidateDetailModal: FC<{
    candidate: Candidate;
    recruiters: TeamMember[];
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<Candidate>) => void;
    onDelete: (id: string) => void;
}> = ({ candidate, recruiters, onClose, onUpdate, onDelete }) => {
    const { getCandidateActivities, addCandidateActivity, user, userData } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(candidate);
    const [activities, setActivities] = useState<CandidateActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [isLoggingNote, setIsLoggingNote] = useState(false);

    const fetchActivities = useCallback(async () => {
        setLoadingActivities(true);
        const fetchedActivities = await getCandidateActivities(candidate.id);
        setActivities(fetchedActivities);
        setLoadingActivities(false);
    }, [candidate.id, getCandidateActivities]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);
    
    useEffect(() => {
        setEditData(candidate);
    }, [candidate]);

    const handleSave = () => {
        const updates: Partial<Candidate> = {};
        if (editData.name !== candidate.name) updates.name = editData.name;
        if (editData.email !== candidate.email) updates.email = editData.email;
        if (editData.phone !== candidate.phone) updates.phone = editData.phone;
        if (editData.stage !== candidate.stage) updates.stage = editData.stage;
        if (editData.recruiterId !== candidate.recruiterId) updates.recruiterId = editData.recruiterId;
        if (editData.currentBrokerage !== candidate.currentBrokerage) updates.currentBrokerage = editData.currentBrokerage;
        
        const gciNum = Number(editData.gciLast12Months) || 0;
        if (gciNum !== (candidate.gciLast12Months || 0)) updates.gciLast12Months = gciNum;
        
        const unitsNum = Number(editData.unitsLast12Months) || 0;
        if (unitsNum !== (candidate.unitsLast12Months || 0)) updates.unitsLast12Months = unitsNum;

        if (Object.keys(updates).length > 0) {
            onUpdate(candidate.id, updates);
        }
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${candidate.name}? This action cannot be undone.`)) {
            onDelete(candidate.id);
        }
    };
    
    const handleLogNote = async () => {
        if (!newNote.trim()) return;
        setIsLoggingNote(true);
        await addCandidateActivity(candidate.id, newNote.trim());
        setNewNote('');
        await fetchActivities();
        setIsLoggingNote(false);
    };
    
    const canManageRecruits = userData?.isSuperAdmin || userData?.role === 'market_center_admin' || userData?.role === 'productivity_coach';
    const canEdit = canManageRecruits || user?.uid === candidate.recruiterId;
    const inputClasses = "w-full bg-input border border-border rounded-md p-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
    const labelClasses = "block text-xs font-semibold text-text-secondary mb-0.5";

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-border">
                    <div className="flex-grow">
                        {isEditing ? (
                            <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="text-3xl font-bold bg-input border border-border rounded-md px-2 py-1" />
                        ) : (
                            <h2 className="text-3xl font-bold">{candidate.name}</h2>
                        )}
                        <p className="text-sm text-text-secondary">In <span className="font-semibold text-primary">{candidate.stage}</span> stage</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                         {!isEditing && canEdit && (
                            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-primary/10 text-primary font-semibold py-2 px-3 rounded-lg text-sm">
                                <Edit size={14}/> Edit Details
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-primary/10 self-start"><X /></button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Left Column - Details */}
                        <div className="md:col-span-1 space-y-4">
                            {isEditing ? (
                                <div className="space-y-4">
                                     <h3 className="font-bold text-lg border-b border-border pb-2">Edit Details</h3>
                                     <div><label className={labelClasses}>Email</label><input type="email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} className={inputClasses}/></div>
                                     <div><label className={labelClasses}>Phone</label><input type="tel" value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} className={inputClasses}/></div>
                                     <h3 className="font-bold text-lg border-b border-border pb-2 pt-2">Business Info</h3>
                                     <div><label className={labelClasses}>Current Brokerage</label><input type="text" value={editData.currentBrokerage || ''} onChange={e => setEditData({ ...editData, currentBrokerage: e.target.value })} className={inputClasses}/></div>
                                     <div><label className={labelClasses}>GCI (Last 12 mo)</label><input type="number" value={editData.gciLast12Months || ''} onChange={e => setEditData({ ...editData, gciLast12Months: Number(e.target.value) })} className={inputClasses}/></div>
                                     <div><label className={labelClasses}>Units (Last 12 mo)</label><input type="number" value={editData.unitsLast12Months || ''} onChange={e => setEditData({ ...editData, unitsLast12Months: Number(e.target.value) })} className={inputClasses}/></div>
                                     <h3 className="font-bold text-lg border-b border-border pb-2 pt-2">Assignment</h3>
                                     <div><label className={labelClasses}>Pipeline Stage</label><select value={editData.stage} onChange={e => setEditData({ ...editData, stage: e.target.value as PipelineStage })} className={inputClasses}>{PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                     <div><label className={labelClasses}>Recruiter</label><select value={editData.recruiterId} onChange={e => setEditData({...editData, recruiterId: e.target.value})} className={inputClasses}>{recruiters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg border-b border-border pb-2">Candidate Details</h3>
                                    <div><label className={labelClasses}>Email</label><p className="flex items-center gap-2 text-sm"><MailIcon size={14}/> {candidate.email}</p></div>
                                    <div><label className={labelClasses}>Phone</label><p className="flex items-center gap-2 text-sm"><PhoneCall size={14}/> {candidate.phone || 'Not provided'}</p></div>
                                    <h3 className="font-bold text-lg border-b border-border pb-2 pt-2">Business Info</h3>
                                    <div><label className={labelClasses}>Current Brokerage</label><p className="flex items-center gap-2 text-sm"><Briefcase size={14}/> {candidate.currentBrokerage || 'Not provided'}</p></div>
                                    <div><label className={labelClasses}>GCI (Last 12 mo)</label><p className="flex items-center gap-2 text-sm"><DollarSign size={14}/> ${candidate.gciLast12Months?.toLocaleString() || '0'}</p></div>
                                    <div><label className={labelClasses}>Units (Last 12 mo)</label><p className="flex items-center gap-2 text-sm"><ClipboardList size={14}/> {candidate.unitsLast12Months?.toLocaleString() || '0'}</p></div>
                                    <h3 className="font-bold text-lg border-b border-border pb-2 pt-2">Assignment</h3>
                                    <div><label className={labelClasses}>Recruiter</label><p className="flex items-center gap-2 text-sm"><User size={14}/> {recruiters.find(r => r.id === candidate.recruiterId)?.name || 'Unknown'}</p></div>
                                </div>
                            )}
                            
                            {isEditing ? (
                                <div className="flex items-center gap-2 pt-2">
                                    <button onClick={handleSave} className="flex-1 bg-primary text-on-accent font-semibold py-2 rounded-lg">Save</button>
                                    <button onClick={() => { setIsEditing(false); setEditData(candidate); }} className="flex-1 border border-border py-2 rounded-lg">Cancel</button>
                                </div>
                            ) : (
                                canEdit && <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 mt-2 bg-destructive/10 text-destructive font-semibold py-2 rounded-lg"><Trash2 size={14}/> Delete Candidate</button>
                            )}
                        </div>
                        {/* Right Column - Timeline */}
                        <div className="md:col-span-2">
                            <h3 className="font-bold text-lg mb-4">Activity Timeline</h3>
                            {loadingActivities ? <Spinner/> : (
                                <div className="space-y-4">
                                     {activities.map(activity => (
                                        <div key={activity.id} className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-accent text-on-accent flex items-center justify-center text-xs font-bold flex-shrink-0" title={activity.userName}>{activity.userName.split(' ').map(n=>n[0]).join('')}</div>
                                            <div className="w-full">
                                                <div className="flex justify-between items-baseline">
                                                    <p className="font-semibold text-sm">{activity.userName}</p>
                                                    <p className="text-xs text-text-secondary">{timeAgo(activity.createdAt)}</p>
                                                </div>
                                                <p className="text-sm p-2 bg-background/50 rounded-md mt-1">{activity.note}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {activities.length === 0 && <p className="text-sm text-center text-text-secondary py-4">No activities logged yet.</p>}
                                </div>
                            )}
                            
                            {canEdit && <div className="mt-6 pt-4 border-t border-border">
                                <h4 className="font-semibold mb-2">Log a new note or activity</h4>
                                <div className="flex items-start gap-2">
                                    <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Log a call, meeting, or general note..." className="w-full bg-input border border-border rounded-md p-2 text-sm min-h-[60px]"/>
                                    <button onClick={handleLogNote} disabled={isLoggingNote} className="p-2 bg-primary text-on-accent rounded-md disabled:bg-opacity-50"><Send size={16}/></button>
                                </div>
                            </div>}
                        </div>
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};

const RecruitmentHubPage: React.FC = () => {
    const { user, userData, getCandidatesForMarketCenter, getCandidatesForRecruiter, addCandidate, updateCandidate, deleteCandidate, getUsersForMarketCenter } = useAuth();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [allMcUsers, setAllMcUsers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [draggedOverColumn, setDraggedOverColumn] = useState<PipelineStage | null>(null);
    const [recruiterFilter, setRecruiterFilter] = useState('all');

    const canManageRecruits = P.isCoach(userData) || P.isRecruiter(userData);
    const isAdmin = P.isMcAdmin(userData);
    const recruitersInMc = useMemo(() => {
        return allMcUsers.filter(u => u.role === 'recruiter' || P.isCoach(u) || P.isSuperAdmin(u));
    }, [allMcUsers]);

    const fetchData = useCallback(async () => {
        if (!user || !userData) { setLoading(false); return; }
        setLoading(true);
        let finalCandidates: Candidate[] = [];
        let finalUsers: TeamMember[] = [];
    
        try {
            if ((P.isMcAdmin(userData) || P.isCoach(userData)) && userData.marketCenterId) {
                [finalCandidates, finalUsers] = await Promise.all([
                    getCandidatesForMarketCenter(userData.marketCenterId),
                    getUsersForMarketCenter(userData.marketCenterId),
                ]);
            } else if (P.isRecruiter(userData)) { 
                finalCandidates = await getCandidatesForRecruiter(user.uid);
                if (userData.marketCenterId) {
                    try {
                        finalUsers = await getUsersForMarketCenter(userData.marketCenterId);
                    } catch (e) {
                        console.warn("Could not fetch all MC users for this role. Defaulting to own user.", e);
                        finalUsers = [userData];
                    }
                } else {
                    finalUsers = [userData];
                }
            } else {
                finalCandidates = [];
                finalUsers = [userData];
            }
            setCandidates(finalCandidates);
            setAllMcUsers(finalUsers);
        } catch (error) { 
            console.error("Failed to fetch recruitment data:", error); 
        } finally { 
            setLoading(false); 
        }
    }, [user, userData, getCandidatesForMarketCenter, getCandidatesForRecruiter, getUsersForMarketCenter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const usersMap = useMemo(() => new Map(allMcUsers.map(u => [u.id, u])), [allMcUsers]);

    const filteredCandidates = useMemo(() => {
        if (!isAdmin || recruiterFilter === 'all') return candidates;
        return candidates.filter(c => c.recruiterId === recruiterFilter);
    }, [candidates, recruiterFilter, isAdmin]);

    const candidatesByStage = useMemo(() => {
        return PIPELINE_STAGES.reduce((acc, stage) => {
            acc[stage] = filteredCandidates.filter(c => c.stage === stage);
            return acc;
        }, {} as Record<PipelineStage, Candidate[]>);
    }, [filteredCandidates]);

    const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
        e.dataTransfer.setData("candidateId", id);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, newStage: PipelineStage) => {
        e.preventDefault();
        const candidateId = e.dataTransfer.getData("candidateId");
        const candidate = candidates.find(c => c.id === candidateId);
        if (candidate && user && (canManageRecruits || candidate.recruiterId === user.uid)) {
            handleUpdateCandidate(candidateId, { stage: newStage });
        }
        setDraggedOverColumn(null);
    };
    
    const handleUpdateCandidate = async (id: string, updates: Partial<Candidate>) => {
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...updates, lastContacted: new Date().toISOString() } : c));
        if (selectedCandidate?.id === id) {
            setSelectedCandidate(prev => prev ? { ...prev, ...updates, lastContacted: new Date().toISOString() } : null);
        }
        await updateCandidate(id, updates);
    };

    const handleAddCandidate = async (data: Omit<Candidate, 'id' | 'createdAt' | 'lastContacted'>) => {
        await addCandidate(data);
        fetchData(); // Refetch to get the new candidate with server timestamp
    };

    const handleDeleteCandidate = async (id: string) => {
        await deleteCandidate(id);
        setCandidates(prev => prev.filter(c => c.id !== id));
        setSelectedCandidate(null);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Recruitment Hub</h1>
                        <p className="text-lg text-text-secondary mt-1">Your collaborative command center for talent acquisition.</p>
                    </div>
                    {(userData?.role === 'recruiter' || canManageRecruits) && (
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                            <PlusCircle className="mr-2" size={20} /> New Candidate
                        </button>
                    )}
                </div>
                {isAdmin && (
                    <div className="mt-6">
                        <label className="text-sm font-semibold text-text-secondary mr-2">Filter by Recruiter:</label>
                        <select value={recruiterFilter} onChange={e => setRecruiterFilter(e.target.value)} className="bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="all">All Recruiters</option>
                            {recruitersInMc.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                )}
            </header>

            {loading ? <div className="flex h-full w-full items-center justify-center"><Spinner className="w-10 h-10"/></div> : (
                <><div className="px-4 sm:px-6 lg:px-8"><RecruitmentStats candidates={filteredCandidates} /></div>
                <div className="flex-1 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-4">
                    <div className="flex gap-6 h-full">
                        {PIPELINE_STAGES.map(stage => (
                            <div
                                key={stage}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage)}
                                onDragEnter={() => setDraggedOverColumn(stage)}
                                onDragLeave={() => setDraggedOverColumn(null)}
                                className={`w-80 flex-shrink-0 bg-surface rounded-2xl p-3 flex flex-col transition-colors ${draggedOverColumn === stage ? 'bg-primary/5' : ''}`}
                            >
                                <h2 className="font-bold text-text-primary p-2 mb-2 flex justify-between items-center flex-shrink-0">
                                    {stage}
                                    <span className="text-sm font-normal bg-background px-2 py-0.5 rounded-full">{candidatesByStage[stage].length}</span>
                                </h2>
                                <div className="flex-grow overflow-y-auto pr-1">
                                    {candidatesByStage[stage].map(candidate => {
                                        const canDrag = user ? (canManageRecruits || candidate.recruiterId === user.uid) : false;
                                        return (
                                            <CandidateCard 
                                                key={candidate.id} 
                                                candidate={candidate}
                                                owner={usersMap.get(candidate.recruiterId)}
                                                canDrag={canDrag}
                                                onDragStart={handleDragStart}
                                                onClick={() => setSelectedCandidate(candidate)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div></>
            )}
            
            <AddCandidateModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddCandidate}
            />
            
            {selectedCandidate && (
                <CandidateDetailModal
                    candidate={selectedCandidate}
                    recruiters={recruitersInMc}
                    onClose={() => setSelectedCandidate(null)}
                    onUpdate={handleUpdateCandidate}
                    onDelete={handleDeleteCandidate}
                />
            )}
        </div>
    );
};

export default RecruitmentHubPage;