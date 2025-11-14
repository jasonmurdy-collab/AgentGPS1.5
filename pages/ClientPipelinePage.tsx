
import React, { useState, useMemo, useCallback, DragEvent, FC, useEffect, lazy, Suspense } from 'react';
import { useAuth, P } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Users, PlusCircle, Calculator } from 'lucide-react';
import type { ClientLead, ClientLeadPipelineStage, ClientLeadActivity, TeamMember } from '../types';
import { CLIENT_LEAD_PIPELINE_STAGES } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { AddClientLeadModal } from '../components/pipeline/AddClientLeadModal';
import { ClientLeadCard } from '../components/pipeline/ClientLeadCard';
import { ClientLeadDetailModal } from '../components/pipeline/ClientLeadDetailModal';

const DatabaseValueCalculatorPage = lazy(() => import('./DatabaseValueCalculatorPage'));

const ClientPipelinePage: React.FC = () => {
    const { user, userData, getClientLeadsForUser, getClientLeadsForTeam, addClientLead, updateClientLead, deleteClientLead, getUsersByIds } = useAuth();
    const [leads, setLeads] = useState<ClientLead[]>([]);
    const [teamMembers, setTeamMembers] = useState<Map<string, TeamMember>>(new Map());
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<ClientLead | null>(null);
    const [draggedOverColumn, setDraggedOverColumn] = useState<ClientLeadPipelineStage | null>(null);
    
    const isTeamLeader = P.isTeamLeader(userData);
    const [activeTab, setActiveTab] = useState<'pipeline' | 'calculator'>('pipeline');
    const [view, setView] = useState<'team' | 'personal'>(isTeamLeader ? 'team' : 'personal');

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

        } catch (error) { console.error("Failed to fetch client leads:", error); } 
        finally { setLoading(false); }
    }, [user, userData, view, isTeamLeader, getClientLeadsForTeam, getClientLeadsForUser, getUsersByIds]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const leadsByStage = useMemo(() => {
        return CLIENT_LEAD_PIPELINE_STAGES.reduce((acc, stage) => {
            acc[stage] = leads.filter(lead => lead.stage === stage);
            return acc;
        }, {} as Record<ClientLeadPipelineStage, ClientLead[]>);
    }, [leads]);
    
    const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
        e.dataTransfer.setData("clientLeadId", id);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, newStage: ClientLeadPipelineStage) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData("clientLeadId");
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
            handleUpdateLead(leadId, { stage: newStage });
        }
        setDraggedOverColumn(null);
    };

    const handleAddLead = async (data: Omit<ClientLead, 'id' | 'createdAt' | 'lastContacted' | 'ownerId' | 'teamId' | 'marketCenterId'>) => {
        await addClientLead(data as any);
        fetchData();
    };

    const handleUpdateLead = async (id: string, updates: Partial<ClientLead>) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates, lastContacted: new Date().toISOString() } : l));
        if (selectedLead?.id === id) {
            setSelectedLead(prev => prev ? { ...prev, ...updates, lastContacted: new Date().toISOString() } : null);
        }
        await updateClientLead(id, updates);
    };
    
    const handleDeleteLead = async (id: string) => {
        await deleteClientLead(id);
        setLeads(prev => prev.filter(l => l.id !== id));
        setSelectedLead(null);
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
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                            <PlusCircle className="mr-2" size={20} /> New Lead
                        </button>
                    )}
                </div>
                <div className="mt-6 flex items-center gap-4">
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
            </header>

            {loading ? <div className="flex h-full w-full items-center justify-center"><Spinner className="w-10 h-10"/></div> : (
                <>
                    {activeTab === 'pipeline' && (
                        <div className="flex-1 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-4">
                            <div className="flex gap-6 h-full">
                                {CLIENT_LEAD_PIPELINE_STAGES.map(stage => (
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
                                            <span className="text-sm font-normal bg-background px-2 py-0.5 rounded-full">{leadsByStage[stage]?.length || 0}</span>
                                        </h2>
                                        <div className="flex-grow overflow-y-auto pr-1">
                                            {leadsByStage[stage]?.map(lead => (
                                                <ClientLeadCard 
                                                    key={lead.id} 
                                                    lead={lead}
                                                    owner={isTeamLeader && view === 'team' ? teamMembers.get(lead.ownerId) : undefined}
                                                    onDragStart={handleDragStart}
                                                    onClick={() => setSelectedLead(lead)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
