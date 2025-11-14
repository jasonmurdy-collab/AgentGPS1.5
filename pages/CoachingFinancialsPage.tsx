
import React, { useState, useEffect, useMemo, FC } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Transaction, TeamMember } from '../types';
import { getFirestoreInstance } from '../firebaseConfig';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { PieChart, DollarSign, Users, TrendingUp, AlertTriangle, Settings } from 'lucide-react';

const StatCard: React.FC<{ title: string, value: string, icon: React.ElementType, color: string }> = ({ title, value, icon: Icon, color }) => (
    <Card>
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full bg-${color}/20`}>
                <Icon className={`text-${color}`} size={24} />
            </div>
            <div>
                <p className="text-sm text-text-secondary">{title}</p>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
            </div>
        </div>
    </Card>
);

const AgentSettingsTab: React.FC<{
    agents: TeamMember[];
    contributingIds: string[];
    onUpdate: (newIds: string[]) => Promise<void>;
}> = ({ agents, contributingIds, onUpdate }) => {
    const [localContributingIds, setLocalContributingIds] = useState(contributingIds);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        setLocalContributingIds(contributingIds);
    }, [contributingIds]);

    const handleToggle = (agentId: string) => {
        setLocalContributingIds(prev => {
            if (prev.includes(agentId)) {
                return prev.filter(id => id !== agentId);
            } else {
                return [...prev, agentId];
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setFeedback('');
        try {
            await onUpdate(localContributingIds);
            setFeedback('Settings saved successfully!');
        } catch (error) {
            setFeedback('Error saving settings.');
        } finally {
            setSaving(false);
            setTimeout(() => setFeedback(''), 3000);
        }
    };

    return (
        <Card>
            <h2 className="text-xl font-bold mb-2">Contributing Agent Settings</h2>
            <p className="text-sm text-text-secondary mb-6">Select which agents' production should be included in your coaching financial calculations. Agents not selected will be excluded from all summaries and projections.</p>
            
            <div className="space-y-3 mb-6">
                {agents.length > 0 ? agents.map(agent => (
                    <div key={agent.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <span className="font-semibold">{agent.name}</span>
                        <button
                            role="switch"
                            aria-checked={localContributingIds.includes(agent.id)}
                            onClick={() => handleToggle(agent.id)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${localContributingIds.includes(agent.id) ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${localContributingIds.includes(agent.id) ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                )) : (
                    <p className="text-center text-text-secondary py-4">No agents available to configure.</p>
                )}
            </div>
            
            <div className="flex justify-end items-center gap-4">
                 {feedback && <span className={`text-sm ${feedback.includes('Error') ? 'text-destructive' : 'text-success'}`}>{feedback}</span>}
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 min-w-[120px]"
                >
                    {saving ? <Spinner/> : 'Save Settings'}
                </button>
            </div>
        </Card>
    );
};


const CoachingFinancialsPage: React.FC = () => {
    const { managedAgents, loadingAgents, userData, updateContributingAgents, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [coachingCommission, setCoachingCommission] = useState(5); // Default 5%
    const [growthProjection, setGrowthProjection] = useState(0); // Default 0%
    const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
    
    const contributingAgentIds = useMemo(() => {
        return Object.keys(userData?.contributingAgentIds || {});
    }, [userData?.contributingAgentIds]);

    const contributingAgents = useMemo(() => {
        return managedAgents.filter(a => contributingAgentIds.includes(a.id));
    }, [managedAgents, contributingAgentIds]);

    useEffect(() => {
        const fetchTransactions = async () => {
            if (loadingAgents || !userData || !user) {
                setLoading(false);
                setTransactions([]);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                // Securely query for all transactions this coach can see
                const q = query(collection(getFirestoreInstance(), 'transactions'), where('coachId', '==', user.uid));
                const querySnapshot = await getDocs(q);
                
                const allCoachTransactions = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        acceptanceDate: data.acceptanceDate?.toDate ? data.acceptanceDate.toDate().toISOString() : data.acceptanceDate,
                    } as Transaction;
                });

                // Filter client-side based on the selected contributing agents
                const contributingAgentIdsSet = new Set(contributingAgents.map(a => a.id));
                const filteredTransactions = allCoachTransactions.filter(t => contributingAgentIdsSet.has(t.userId));
                
                setTransactions(filteredTransactions);

            } catch (err: any) {
                console.error("Error fetching transactions:", err);
                if (err.code === 'permission-denied') {
                    setError("Permission Denied: Your role does not have permission to view agent transactions. Please contact an administrator to update the backend security rules.");
                } else {
                    setError("An unexpected error occurred while fetching data.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, [contributingAgents, loadingAgents, user, userData]);

    const agentGciData = useMemo(() => {
        const gciMap = new Map<string, { gci: number, transactionCount: number }>();
        transactions.forEach(t => {
            const agentData = gciMap.get(t.userId) || { gci: 0, transactionCount: 0 };
            agentData.gci += t.salePrice * (t.commissionRate / 100);
            agentData.transactionCount += 1;
            gciMap.set(t.userId, agentData);
        });
        return Array.from(gciMap.entries()).map(([userId, data]) => {
            const agent = contributingAgents.find(a => a.id === userId);
            return {
                userId,
                agentName: agent?.name || 'Unknown Agent',
                ...data
            };
        }).sort((a,b) => b.gci - a.gci);
    }, [transactions, contributingAgents]);

    const summaryStats = useMemo(() => {
        const totalGci = agentGciData.reduce((sum, agent) => sum + agent.gci, 0);
        const totalTransactions = agentGciData.reduce((sum, agent) => sum + agent.transactionCount, 0);
        const projectedIncome = totalGci * (coachingCommission / 100);
        const projectedGrowthGci = totalGci * (1 + (growthProjection / 100));
        const projectedGrowthIncome = projectedGrowthGci * (coachingCommission / 100);

        return { totalGci, totalTransactions, projectedIncome, projectedGrowthGci, projectedGrowthIncome };
    }, [agentGciData, coachingCommission, growthProjection]);

    if (loading || loadingAgents) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>;
    }

    const TabButton: React.FC<{ tabId: 'dashboard' | 'settings'; children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tabId ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/10'}`}>
            {children}
        </button>
    );

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                   <PieChart className="text-accent-secondary" size={48} />
                   Coaching Financials
                </h1>
                <p className="text-lg text-text-secondary mt-1">Analyze and project your coaching income.</p>
                <div className="mt-6 flex items-center gap-2 p-1 bg-surface rounded-lg w-fit">
                    <TabButton tabId="dashboard"><PieChart size={16}/> Dashboard</TabButton>
                    <TabButton tabId="settings"><Settings size={16}/> Agent Settings</TabButton>
                </div>
            </header>
            
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                {activeTab === 'dashboard' && (
                     <>
                        {error ? (
                            <Card className="bg-destructive-surface text-destructive border-destructive">
                                <p className="font-bold">Error Fetching Data</p>
                                <p>{error}</p>
                            </Card>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <StatCard title="Total Agent GCI" value={`$${summaryStats.totalGci.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={DollarSign} color="primary" />
                                    <StatCard title="Total Transactions" value={summaryStats.totalTransactions.toLocaleString()} icon={Users} color="primary" />
                                    <StatCard title="Projected Coaching Income" value={`$${summaryStats.projectedIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={TrendingUp} color="success" />
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <Card className="lg:col-span-1">
                                        <h2 className="text-xl font-bold mb-4">Projection Settings</h2>
                                        <div>
                                            <label htmlFor="coachingCommission" className="block text-sm font-medium text-text-secondary mb-1">Coaching Income Percentage</label>
                                            <div className="relative">
                                                <input type="number" id="coachingCommission" value={coachingCommission} onChange={e => setCoachingCommission(parseFloat(e.target.value) || 0)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary pr-8"/>
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">%</span>
                                            </div>
                                        </div>
                                        <div className="mt-6">
                                            <label htmlFor="growthProjection" className="block text-sm font-medium text-text-secondary mb-1">GCI Growth Projection: <span className="font-bold text-primary">{growthProjection}%</span></label>
                                            <input type="range" id="growthProjection" min="-50" max="100" value={growthProjection} onChange={e => setGrowthProjection(parseInt(e.target.value))} className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"/>
                                            <div className="flex justify-between text-xs text-text-secondary mt-1">
                                                <span>-50%</span>
                                                <span>0%</span>
                                                <span>100%</span>
                                            </div>
                                        </div>
                                    </Card>
                                    
                                    <Card className="lg:col-span-2">
                                        <h2 className="text-xl font-bold mb-4">Future Projections</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                                            <div className="bg-background/50 p-4 rounded-lg">
                                                <p className="text-sm text-text-secondary">Projected Total GCI</p>
                                                <p className="text-3xl font-bold text-text-primary">${summaryStats.projectedGrowthGci.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                            </div>
                                             <div className="bg-background/50 p-4 rounded-lg">
                                                <p className="text-sm text-text-secondary">Projected Coaching Income</p>
                                                <p className="text-3xl font-bold text-success">${summaryStats.projectedGrowthIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                            </div>
                                        </div>
                                        {growthProjection !== 0 && (
                                            <p className="text-sm text-text-secondary text-center mt-4">Based on a <span className={`font-bold ${growthProjection > 0 ? 'text-success' : 'text-destructive'}`}>{growthProjection}%</span> {growthProjection > 0 ? 'increase' : 'decrease'} in GCI.</p>
                                        )}
                                    </Card>
                                </div>
                                
                                <Card>
                                    <h2 className="text-xl font-bold mb-4">Agent GCI Breakdown</h2>
                                     <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-background/50">
                                                <tr>
                                                    <th className="p-3 font-semibold text-text-primary">Agent</th>
                                                    <th className="p-3 font-semibold text-text-primary text-right">Transactions</th>
                                                    <th className="p-3 font-semibold text-text-primary text-right">GCI</th>
                                                    <th className="p-3 font-semibold text-text-primary text-right">Projected Income</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {agentGciData.map(agent => (
                                                    <tr key={agent.userId} className="border-t border-border">
                                                        <td className="p-3 font-semibold">{agent.agentName}</td>
                                                        <td className="p-3 text-right">{agent.transactionCount}</td>
                                                        <td className="p-3 text-right">${agent.gci.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                        <td className="p-3 text-right font-semibold text-success">${(agent.gci * (coachingCommission / 100)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {agentGciData.length === 0 && (
                                            <p className="text-center text-text-secondary py-8">No transaction data available for your selected contributing agents.</p>
                                        )}
                                    </div>
                                </Card>
                            </>
                        )}
                    </>
                )}

                {activeTab === 'settings' && (
                    <AgentSettingsTab
                        agents={managedAgents}
                        contributingIds={contributingAgentIds}
                        onUpdate={updateContributingAgents}
                    />
                )}
            </div>
        </div>
    );
};

export default CoachingFinancialsPage;
