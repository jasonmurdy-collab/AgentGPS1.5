
import React, { useState, useMemo, useCallback, FC, useEffect, lazy, Suspense } from 'react';
import { useAuth, P } from '../contexts/AuthContext';
import { Users, PlusCircle, Calculator, Search, Filter, X } from 'lucide-react';
import type { ClientLead, ClientLeadPipelineStage, TeamMember } from '../types';
import { CLIENT_LEAD_PIPELINE_STAGES } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { AddClientLeadModal } from '../components/pipeline/AddClientLeadModal';
import { ClientLeadCard } from '../components/pipeline/ClientLeadCard';
import { ClientLeadDetailModal } from '../components/pipeline/ClientLeadDetailModal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';

const DatabaseValueCalculatorPage = lazy(() => import('./DatabaseValueCalculatorPage'));

const ClientPipelinePage: React.FC = () => {
    const { user, userData, getClientLeadsForUser, getClientLeadsForTeam, addClientLead, updateClientLead, deleteClientLead, getUsersByIds } = useAuth();
    const [leads, setLeads] = useState<ClientLead[]>([]);
    const [teamMembers, setTeamMembers] = useState<Map<string, TeamMember>>(new Map());
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<ClientLead | null>(null);
    
    const isTeamLeader = P.isTeamLeader(userData);
    const [activeTab, setActiveTab] = useState<'pipeline' | 'calculator'>('pipeline');
    const [view, setView] = useState<'team' | 'personal'>(isTeamLeader ? 'team' : 'personal');

    // Search and Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState<string>('all');

    const fetchData = useCallback(async () => {
        if (!user || !userData) { setLoading(false); return; }
        setLoading(true);
        try {
            let leadsData: ClientLead[] = [];
            if (isTeamLeader && view === 'team' && userData.teamId) {
                leadsData = await getClientLeadsForTeam(userData.teamId);
            } else {
                leadsData = await getClientLeadsForUser(user.uid);
            }
            setLeads(leadsData);

            if (isTeamLeader && view === 'team') {
                const ownerIds = [...new Set(leadsData.map(l => l.ownerId))];
                if (ownerIds.length > 0) {
                    const users = await getUsersByIds(ownerIds);
                    setTeamMembers(new Map(users.map(u => [u.id, u])));
                }
            }

        } catch (error) { 
            console.error("Failed to fetch client leads:", error);
            toast.error("Failed to load leads");
        } 
        finally { setLoading(false); }
    }, [user, userData, view, isTeamLeader, getClientLeadsForTeam, getClientLeadsForUser, getUsersByIds]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                lead.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSource = sourceFilter === 'all' || lead.leadSource === sourceFilter;
            return matchesSearch && matchesSource;
        });
    }, [leads, searchQuery, sourceFilter]);

    const leadsByStage = useMemo(() => {
        return CLIENT_LEAD_PIPELINE_STAGES.reduce((acc, stage) => {
            acc[stage] = filteredLeads.filter(lead => lead.stage === stage);
            return acc;
        }, {} as Record<ClientLeadPipelineStage, ClientLead[]>);
    }, [filteredLeads]);

    const sources = useMemo(() => {
        const s = new Set(leads.map(l => l.leadSource).filter(Boolean));
        return Array.from(s);
    }, [leads]);
    
    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const leadId = draggableId;
        const newStage = destination.droppableId as ClientLeadPipelineStage;

        // Optimistic Update
        const previousLeads = [...leads];
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));

        try {
            await updateClientLead(leadId, { stage: newStage });
            toast.success(`Moved to ${newStage}`);
        } catch (error) {
            console.error("Failed to update lead stage:", error);
            setLeads(previousLeads); // Rollback
            toast.error("Failed to move lead. Please try again.");
        }
    };

    const handleAddLead = async (data: Omit<ClientLead, 'id' | 'createdAt' | 'lastContacted' | 'ownerId' | 'teamId' | 'marketCenterId'>) => {
        try {
            await addClientLead(data as any);
            toast.success("Lead added successfully");
            fetchData();
        } catch (err) {
            console.error('Error adding lead:', err);
            toast.error("Failed to add lead");
        }
    };

    const handleUpdateLead = async (id: string, updates: Partial<ClientLead>) => {
        const previousLeads = [...leads];
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates, lastContacted: new Date().toISOString() } : l));
        
        if (selectedLead?.id === id) {
            setSelectedLead(prev => prev ? { ...prev, ...updates, lastContacted: new Date().toISOString() } : null);
        }

        try {
            await updateClientLead(id, updates);
            toast.success("Lead updated");
        } catch (err) {
            console.error('Error updating lead:', err);
            setLeads(previousLeads);
            toast.error("Failed to update lead");
        }
    };
    
    const handleDeleteLead = async (id: string) => {
        try {
            await deleteClientLead(id);
            setLeads(prev => prev.filter(l => l.id !== id));
            setSelectedLead(null);
            toast.success("Lead deleted");
        } catch (err) {
            console.error('Error deleting lead:', err);
            toast.error("Failed to delete lead");
        }
    };
    
    const TabButton: FC<{ tabId: 'pipeline' | 'calculator'; label: string; icon: FC<any> }> = ({ tabId, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tabId ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/10'}`}
        >
            <Icon size={16}/> {label}
        </button>
    );

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Client Pipeline</h1>
                        <p className="text-lg text-text-secondary mt-1">Manage your client relationships from lead to close.</p>
                    </div>
                    {activeTab === 'pipeline' && (
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-6 rounded-xl hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all">
                            <PlusCircle className="mr-2" size={20} /> New Lead
                        </button>
                    )}
                </div>
                
                <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 p-1 bg-surface rounded-lg w-fit">
                            <TabButton tabId="pipeline" label="Client Pipeline" icon={Users} />
                            <TabButton tabId="calculator" label="Database Calculator" icon={Calculator} />
                        </div>
                        {isTeamLeader && activeTab === 'pipeline' && (
                            <div className="flex items-center gap-2 p-1 bg-surface rounded-lg w-fit">
                                <button onClick={() => setView('team')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${view === 'team' ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/10'}`}>
                                    Team View
                                </button>
                                <button onClick={() => setView('personal')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${view === 'personal' ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/10'}`}>
                                    My View
                                </button>
                            </div>
                        )}
                    </div>

                    {activeTab === 'pipeline' && (
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search leads..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none w-64"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                                <select 
                                    value={sourceFilter}
                                    onChange={e => setSourceFilter(e.target.value)}
                                    className="pl-10 pr-8 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                                >
                                    <option value="all">All Sources</option>
                                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {loading ? <div className="flex h-full w-full items-center justify-center"><Spinner className="w-10 h-10"/></div> : (
                <>
                    {activeTab === 'pipeline' && (
                        <div className="flex-1 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-4">
                            <DragDropContext onDragEnd={onDragEnd}>
                                <div className="flex gap-6 h-full min-w-max pb-4">
                                    {CLIENT_LEAD_PIPELINE_STAGES.map(stage => (
                                        <Droppable key={stage} droppableId={stage}>
                                            {(provided, snapshot) => (
                                                <div
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className={`w-80 flex-shrink-0 bg-surface rounded-2xl p-3 flex flex-col transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5 ring-2 ring-primary/20' : ''}`}
                                                >
                                                    <h2 className="font-bold text-text-primary p-2 mb-2 flex justify-between items-center flex-shrink-0">
                                                        {stage}
                                                        <span className="text-sm font-normal bg-background px-2 py-0.5 rounded-full">{leadsByStage[stage]?.length || 0}</span>
                                                    </h2>
                                                    <div className="flex-grow overflow-y-auto pr-1 space-y-3">
                                                        {leadsByStage[stage]?.map((lead, index) => (
                                                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        className={snapshot.isDragging ? 'z-50' : ''}
                                                                    >
                                                                        <ClientLeadCard 
                                                                            lead={lead}
                                                                            owner={isTeamLeader && view === 'team' ? teamMembers.get(lead.ownerId) : undefined}
                                                                            onClick={() => setSelectedLead(lead)}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                </div>
                                            )}
                                        </Droppable>
                                    ))}
                                </div>
                            </DragDropContext>
                        </div>
                    )}
                     {activeTab === 'calculator' && (
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4">
                            <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Spinner /></div>}>
                                <DatabaseValueCalculatorPage />
                            </Suspense>
                        </div>
                    )}
                </>
            )}
            
            <AddClientLeadModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddLead}
            />
            
            {selectedLead && (
                <ClientLeadDetailModal
                    lead={selectedLead}
                    teamMembers={isTeamLeader && view === 'team' ? Array.from(teamMembers.values()) : []}
                    onClose={() => setSelectedLead(null)}
                    onUpdate={handleUpdateLead}
                    onDelete={handleDeleteLead}
                />
            )}
        </div>
    );
};

export default ClientPipelinePage;
