import React, { useState, useEffect, useMemo, FC } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { Transaction, CommissionProfile, BudgetModelInputs, Candidate, PipelineStage, TeamMember } from '../types';
import { Building, TrendingUp, DollarSign, Users, PiggyBank, Home, HeartHandshake, UserPlus, Rocket, Crown, Award, AlertTriangle } from 'lucide-react';
import { PIPELINE_STAGES } from '../types';

// --- WIDGET COMPONENTS ---

const KpiCard: FC<{ title: string, value: string, icon: FC<any> }> = ({ title, value, icon: Icon }) => (
    <Card className="p-4">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
                <Icon size={24} className="text-primary" />
            </div>
            <div>
                <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold text-text-primary">{value}</p>
            </div>
        </div>
    </Card>
);

const Gauge: FC<{ value: number; maxValue: number; label: string }> = ({ value, maxValue, label }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const strokeDashoffset = 283 * (1 - (percentage / 100)); // 283 is circumference of circle with r=45
    return (
        <div className="flex flex-col items-center">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle className="text-border" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                <circle
                    className="text-primary"
                    strokeWidth="10"
                    strokeDasharray="283"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
            </svg>
            <div className="text-center -mt-20">
                <p className="text-3xl font-bold">{value.toFixed(2)}</p>
                <p className="text-sm text-text-secondary">{label}</p>
            </div>
        </div>
    );
};

const HorizontalFunnel: FC<{ data: { stage: string, count: number }[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return <p className="text-sm text-center text-text-secondary">No recruitment data available.</p>;

    return (
        <div className="space-y-2">
            {data.map((item, index) => {
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                return (
                    <div key={item.stage} className="flex items-center gap-2">
                        <span className="text-xs font-semibold w-28 text-right text-text-secondary truncate">{item.stage}</span>
                        <div className="flex-1 bg-background rounded-full h-6">
                            <div
                                className="bg-primary h-6 rounded-full flex items-center justify-end px-2 text-on-accent text-xs font-bold"
                                style={{ width: `${percentage}%`, minWidth: '2rem' }}
                            >
                                {item.count}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---

const MarketCenterHubPage: React.FC = () => {
    const { userData, managedAgents, getTransactionsForMarketCenter, getCommissionProfilesForMarketCenter, getBudgetModelsForMarketCenter, getCandidatesForMarketCenter } = useAuth();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [profiles, setProfiles] = useState<CommissionProfile[]>([]);
    const [budgets, setBudgets] = useState<BudgetModelInputs[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchData = async () => {
            if (!userData?.marketCenterId) { 
                setError("No Market Center assigned to your admin account.");
                setLoading(false); 
                return; 
            }
            setLoading(true);
            setError(null); // Clear previous errors
            try {
                const agentIds = managedAgents.map(a => a.id);
                const [t, p, b, c] = await Promise.all([
                    getTransactionsForMarketCenter(userData.marketCenterId),
                    getCommissionProfilesForMarketCenter(agentIds),
                    getBudgetModelsForMarketCenter(userData.marketCenterId),
                    getCandidatesForMarketCenter(userData.marketCenterId)
                ]);
                setTransactions(t);
                setProfiles(p);
                setBudgets(b);
                setCandidates(c);
            } catch (err: any) {
                console.error("Failed to fetch MC Hub data:", err);
                if (err.code === 'permission-denied') {
                    setError("Permission Denied: Could not fetch some data. Please check Firebase Security Rules or contact support.");
                } else {
                    setError(`An unexpected error occurred: ${err.message || 'Failed to load data.'}`);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userData, managedAgents, getTransactionsForMarketCenter, getCommissionProfilesForMarketCenter, getBudgetModelsForMarketCenter, getCandidatesForMarketCenter]);

    const stats = useMemo(() => {
        const agentCount = managedAgents.length;
        const totalGci = transactions.reduce((sum, t) => sum + (t.salePrice * (t.commissionRate / 100)), 0);
        const tpa = agentCount > 0 ? transactions.length / agentCount : 0;

        const { totalBudgetGci, totalNetIncome } = budgets.reduce((acc, budget) => {
            const opEx = budget.compensation + budget.leadGeneration + budget.occupancy + budget.educationCoaching + budget.officeExpenses + budget.commsTech + budget.auto + budget.equipment + budget.insurance;
            const cos = budget.listingSpecialistCompensation + budget.buyerSpecialistCompensation + budget.otherCOS;
            acc.totalBudgetGci += budget.gci;
            acc.totalNetIncome += budget.gci - cos - opEx;
            return acc;
        }, { totalBudgetGci: 0, totalNetIncome: 0 });

        const listingsTaken = transactions.filter(t => t.type === 'Listing Sale').length;
        const listingsClosed = transactions.filter(t => t.type === 'Listing Sale' && t.closeDate).length;

        const recruitmentFunnelData = PIPELINE_STAGES.map(stage => ({
            stage,
            count: candidates.filter(c => c.stage === stage).length,
        }));
        
        const profilesMap = new Map(profiles.map(p => [p.id, p]));
        const cappingAgents = managedAgents.map(agent => {
            const profile = profilesMap.get(agent.id);
            if (!profile) return null;
            const agentTransactions = transactions.filter(t => t.userId === agent.id);
            // This is a simplified cap calculation. A real one would consider anniversary date.
            const gciTowardsCap = agentTransactions.reduce((sum, t) => sum + (t.salePrice * (t.commissionRate / 100)), 0);
            const progress = (gciTowardsCap / (profile as CommissionProfile).commissionCap) * 100;
            return { ...agent, progress };
        }).filter((a): a is TeamMember & { progress: number } => a !== null && a.progress > 80 && a.progress < 100)
        .sort((a,b) => b.progress - a.progress);
        
        const futureLeaders = managedAgents.filter(a => a.gci > 500000 || a.listings > 20)
        .sort((a,b) => b.gci - a.gci)
        .slice(0, 5);

        return {
            agentCount, totalGci, totalTransactions: transactions.length, tpa,
            totalBudgetGci, totalNetIncome, listingsTaken, listingsClosed, recruitmentFunnelData,
            cappingAgents, futureLeaders,
            activeRecruits: candidates.filter(c => c.stage !== 'Signed' && c.stage !== 'Not a Fit').length,
        };
    }, [managedAgents, transactions, profiles, budgets, candidates]);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-10 h-10"/></div>;
    }

    const Widget: FC<{ title: string; icon: FC<any>, children: React.ReactNode, className?: string }> = ({ title, icon: Icon, children, className }) => (
        <Card className={`flex flex-col ${className}`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Icon size={20} className="text-accent-secondary"/> {title}
            </h3>
            <div className="flex-grow flex flex-col justify-center">{children}</div>
        </Card>
    );

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                   <Building className="text-accent-secondary" size={48} />
                   Market Center Command Center
                </h1>
                <p className="text-lg text-text-secondary mt-1">Your strategic overview of MC health and growth potential.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                {error && (
                    <Card className="bg-destructive-surface text-destructive border-destructive">
                        <div className="flex flex-col items-center justify-center p-4">
                            <AlertTriangle className="w-12 h-12 mb-4" />
                            <p className="font-bold text-lg">Error Loading Data</p>
                            <p className="mt-2 max-w-md">{error}</p>
                        </div>
                    </Card>
                )}

                {!error && (
                    <>
                        {/* Top Level KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KpiCard title="Total GCI (YTD)" value={`$${stats.totalGci.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} icon={DollarSign} />
                            <KpiCard title="Total Agents" value={stats.agentCount.toLocaleString()} icon={Users} />
                            <KpiCard title="Total Transactions (YTD)" value={stats.totalTransactions.toLocaleString()} icon={TrendingUp} />
                            <KpiCard title="Recruitment Pipeline" value={stats.activeRecruits.toLocaleString()} icon={UserPlus} />
                        </div>
                        
                        {/* Main Dashboard Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            {/* Health Column */}
                            <div className="space-y-6">
                                <Widget title="Productivity Index" icon={TrendingUp}>
                                <Gauge value={stats.tpa} maxValue={12} label="Transactions Per Agent" />
                                <p className="text-xs text-center text-text-secondary mt-2">Target: 12 TPA</p>
                                </Widget>
                                <Widget title="Profitability Snapshot" icon={PiggyBank}>
                                <div className="w-full space-y-3">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1"><span className="font-semibold">Aggregate GCI</span><span>${stats.totalBudgetGci.toLocaleString()}</span></div>
                                        <div className="w-full bg-background rounded-full h-6"><div className="bg-primary h-6 rounded-full" style={{width: '100%'}}></div></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1"><span className="font-semibold">Projected Net Income</span><span>${stats.totalNetIncome.toLocaleString()}</span></div>
                                        <div className="w-full bg-background rounded-full h-6"><div className="bg-success h-6 rounded-full" style={{width: `${stats.totalBudgetGci > 0 ? (stats.totalNetIncome / stats.totalBudgetGci) * 100 : 0}%`}}></div></div>
                                    </div>
                                    <p className="text-xs text-text-secondary text-center pt-2">Based on {budgets.length} agents who completed their Budget Model.</p>
                                </div>
                                </Widget>
                                <Widget title="Listing Inventory Trend" icon={Home}>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <p className="text-3xl font-bold">{stats.listingsTaken}</p>
                                            <p className="text-sm text-text-secondary">New Listings Taken (YTD)</p>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold">{stats.listingsClosed}</p>
                                            <p className="text-sm text-text-secondary">Closed Listings (YTD)</p>
                                        </div>
                                    </div>
                                </Widget>
                                <Widget title="Agent Retention Meter" icon={HeartHandshake}>
                                    <p className="text-center text-text-secondary text-sm">Coming Soon: This widget will track your 12-month agent retention rate.</p>
                                </Widget>
                            </div>

                            {/* Growth Column */}
                            <div className="space-y-6">
                                <Widget title="Recruitment Funnel" icon={UserPlus}>
                                    <HorizontalFunnel data={stats.recruitmentFunnelData} />
                                </Widget>
                                <Widget title="'Capping Agents' Watchlist" icon={Crown}>
                                    {stats.cappingAgents.length > 0 ? (
                                        <div className="space-y-3">
                                            {stats.cappingAgents.map(agent => (
                                                <div key={agent.id}>
                                                    <div className="flex justify-between text-sm mb-1 font-semibold"><span>{agent.name}</span><span>{agent.progress.toFixed(0)}%</span></div>
                                                    <div className="w-full bg-background rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{width: `${agent.progress}%`}}></div></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-sm text-center text-text-secondary">No agents are currently over 80% to cap.</p>}
                                </Widget>
                                <Widget title="Future Team Leaders" icon={Award}>
                                    {stats.futureLeaders.length > 0 ? (
                                        <ul className="space-y-2">
                                            {stats.futureLeaders.map(agent => (
                                                <li key={agent.id} className="p-2 bg-background/50 rounded-md font-semibold text-sm">{agent.name}</li>
                                            ))}
                                        </ul>
                                    ) : <p className="text-sm text-center text-text-secondary">No agents currently meet the high-producer criteria for team leadership.</p>}
                                </Widget>
                                <Widget title="New Agent Ramp-Up Velocity" icon={Rocket}>
                                    <p className="text-center text-text-secondary text-sm">Coming Soon: This widget will measure the average GCI of new agents in their first 90 days.</p>
                                </Widget>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MarketCenterHubPage;