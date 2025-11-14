import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { OrgBlueprint, TeamMember, Transaction } from '../types';
import { Network, DollarSign, BarChart2, ClipboardSignature, FileCheck, Search, Home, Briefcase } from 'lucide-react';

const ROLES_AVAILABLE = [
  { name: 'Administrative Assistant', icon: ClipboardSignature },
  { name: 'Transaction Coordinator', icon: FileCheck },
  { name: 'Buyer\'s Agent', icon: Search },
  { name: 'Listing Specialist', icon: Home },
  { name: 'CEO / General Manager', icon: Briefcase },
];

const CoachBlueprintViewPage: React.FC = () => {
    const { managedAgents, loadingAgents } = useAuth();
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [blueprint, setBlueprint] = useState<OrgBlueprint | null>(null);
    const [kpis, setKpis] = useState({ gci: 0, transactions: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedAgentId) {
            setBlueprint(null);
            setKpis({ gci: 0, transactions: 0 });
            return;
        }

        setLoading(true);
        setError(null);

        // Fetch blueprint
        const blueprintDocRef = doc(db, 'orgBlueprints', selectedAgentId);
        const unsubBlueprint = onSnapshot(blueprintDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setBlueprint(docSnap.data() as OrgBlueprint);
            } else {
                setBlueprint({ userId: selectedAgentId, nodes: [] });
            }
        }, (err: any) => {
            console.error("Error fetching blueprint for agent:", err);
             if (err.code === 'permission-denied') {
                setError("Permission Denied: Your role cannot view this agent's blueprint. Please check Firestore security rules.");
            } else {
                setError("Could not load agent's blueprint.");
            }
        });

        // Fetch KPIs
        const fetchKpis = async () => {
            try {
                const q = query(collection(db, 'transactions'), where('userId', '==', selectedAgentId));
                const snapshot = await getDocs(q);
                let totalGci = 0;
                snapshot.forEach(doc => {
                    const t = doc.data() as Transaction;
                    totalGci += t.salePrice * (t.commissionRate / 100);
                });
                setKpis({ gci: totalGci, transactions: snapshot.size });
            } catch (err: any) {
                 console.error("Error fetching KPIs for agent:", err);
                 if (err.code === 'permission-denied') {
                    setError("Permission Denied: Your role cannot view this agent's KPIs. Please check Firestore security rules.");
                 } else {
                    setError("Could not load agent's KPIs.");
                 }
            }
        };

        Promise.all([fetchKpis()]).finally(() => setLoading(false));

        return () => {
            unsubBlueprint();
        };
    }, [selectedAgentId]);

    const selectedAgent = useMemo(() => managedAgents.find(a => a.id === selectedAgentId), [managedAgents, selectedAgentId]);

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                   <Network className="text-accent-secondary" size={48} />
                   Agent Architect Viewer
                </h1>
                <p className="text-lg text-text-secondary mt-1">Review the organizational blueprints of your agents.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:p-8 pb-8">
                 <Card className="mb-8">
                    <label htmlFor="agent-select" className="block text-sm font-medium text-text-secondary mb-1">Select an Agent to View</label>
                    <select
                        id="agent-select"
                        value={selectedAgentId}
                        onChange={e => setSelectedAgentId(e.target.value)}
                        className="w-full max-w-sm bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={loadingAgents}
                    >
                        <option value="">{loadingAgents ? 'Loading agents...' : '-- Select an Agent --'}</option>
                        {managedAgents.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                        ))}
                    </select>
                </Card>

                {loading && <div className="flex justify-center py-8"><Spinner/></div>}

                {error && <Card><p className="text-destructive text-center">{error}</p></Card>}
                
                {!loading && !error && selectedAgentId && (
                     <div className="text-center">
                        <div className="inline-block relative">
                            <Card className="p-4 w-72 border-2 border-primary shadow-lg">
                                <p className="text-xs font-semibold text-primary">AGENT</p>
                                <h3 className="text-xl font-bold">{selectedAgent?.name || '...'}</h3>
                                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-left">
                                    <div className="flex items-center gap-2"><DollarSign size={16} className="text-accent-secondary"/><div><p className="text-xs">GCI</p><p className="font-bold">${kpis.gci.toLocaleString()}</p></div></div>
                                    <div className="flex items-center gap-2"><BarChart2 size={16} className="text-accent-secondary"/><div><p className="text-xs">Transactions</p><p className="font-bold">{kpis.transactions.toLocaleString()}</p></div></div>
                                </div>
                            </Card>
                            {blueprint && blueprint.nodes.length > 0 && (
                                 <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-0.5 h-5 bg-border"></div>
                            )}
                        </div>
                        
                        <div className="mt-10 relative pt-5 min-h-[200px]">
                            {blueprint && blueprint.nodes.length > 0 && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-border"></div>
                            )}

                            <div className="flex justify-center flex-wrap gap-4 px-4">
                            {blueprint && blueprint.nodes.length > 0 && (
                                <div className="absolute top-0 left-1/2 h-0.5 bg-border" style={{ width: `calc(100% - ${(100/blueprint.nodes.length)}%)`, transform: 'translateX(-50%)' }}></div>
                            )}

                            {blueprint?.nodes.map(node => {
                                const roleInfo = ROLES_AVAILABLE.find(r => r.name === node.role);
                                const Icon = roleInfo?.icon || Network;
                                return (
                                    <div key={node.id} className="relative pt-5">
                                         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-border"></div>
                                        <Card className="w-56 p-3 opacity-70 border-dashed">
                                            <div className="flex items-center gap-2">
                                                <Icon size={18} className="text-text-secondary" />
                                                <p className="text-sm font-bold text-text-secondary">{node.role}</p>
                                            </div>
                                        </Card>
                                    </div>
                                )
                            })}
                             {blueprint?.nodes.length === 0 && (
                                <div className="text-text-secondary py-16">
                                    <p>This agent has not built their blueprint yet.</p>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoachBlueprintViewPage;