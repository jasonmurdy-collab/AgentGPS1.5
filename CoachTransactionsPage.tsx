
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { CommissionProfile, Transaction, ProcessedTransaction, TeamMember } from '../types';
import { BarChartHorizontal, ChevronDown, ChevronUp, Search, AlertTriangle } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, documentId, doc, getDoc, DocumentSnapshot } from 'firebase/firestore';
import { processTransactionsForCoach } from '../lib/transactionUtils';
import { processTransactionDoc } from '../lib/firestoreUtils';

type SortableKeys = 'agentName' | 'acceptanceDate' | 'gci' | 'netCommission' | 'companyDollarPaid' | 'royaltyPaid';

interface SortConfig {
    key: SortableKeys;
    direction: 'ascending' | 'descending';
}

interface EnrichedTransaction extends ProcessedTransaction {
    agentName: string;
}

// New Mobile Card Component for each transaction
const TransactionMobileCard: React.FC<{ transaction: EnrichedTransaction }> = ({ transaction }) => (
    <Card className="mb-4 p-4">
        <div className="flex justify-between items-start mb-2">
            <div>
                <p className="font-bold text-lg text-text-primary">{transaction.address}</p>
                <p className="text-sm text-text-secondary">Agent: {transaction.agentName}</p>
            </div>
            <p className="text-sm text-text-secondary">{new Date(transaction.acceptanceDate).toLocaleDateString('en-CA', { timeZone: 'UTC' })}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
            <p><strong>GCI:</strong> ${transaction.gci.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p><strong>Net:</strong> <span className="text-success">${transaction.netCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
            <p><strong>Company $:</strong> <span className="text-destructive">${transaction.companyDollarPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
            <p><strong>Royalty:</strong> <span className="text-destructive">${transaction.royaltyPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
        </div>
    </Card>
);

const CoachTransactionsPage: React.FC = () => {
    const { managedAgents: agents, loadingAgents, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [processedTransactions, setProcessedTransactions] = useState<EnrichedTransaction[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'acceptanceDate', direction: 'descending' });

    useEffect(() => {
        const fetchData = async () => {
            if (loadingAgents || !userData || agents.length === 0) {
                setProcessedTransactions([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const agentIds = agents.map(a => a.id);
                const idChunks: string[][] = [];
                for (let i = 0; i < agentIds.length; i += 30) {
                    idChunks.push(agentIds.slice(i, i + 30));
                }

                const fetchTransactionsForChunk = async (chunk: string[]) => {
                    let tQuery;
                    const transactionsRef = collection(db, 'transactions');
                    
                    if (userData?.role === 'market_center_admin' && userData.marketCenterId) {
                        tQuery = query(transactionsRef, where('marketCenterId', '==', userData.marketCenterId), where('userId', 'in', chunk));
                    } else if (userData?.role === 'team_leader' && userData.teamId) {
                        tQuery = query(transactionsRef, where('teamId', '==', userData.teamId), where('userId', 'in', chunk));
                    } else {
                        tQuery = query(transactionsRef, where('userId', 'in', chunk));
                    }

                    const tSnap = await getDocs(tQuery);
                    return tSnap.docs.map(processTransactionDoc);
                };

                const fetchProfilesForChunk = async (chunk: string[]) => {
                    const pQuery = query(collection(db, 'commissionProfiles'), where(documentId(), 'in', chunk));
                    const pSnap = await getDocs(pQuery);
                    return pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionProfile));
                };

                const transactionPromises = idChunks.map(fetchTransactionsForChunk);
                const profilePromises = idChunks.map(fetchProfilesForChunk);

                const [transactionResults, profileResults] = await Promise.all([
                    Promise.allSettled(transactionPromises),
                    Promise.allSettled(profilePromises)
                ]);
                
                const allTransactions = transactionResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);
                const allProfiles = profileResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);

                let errorMessages: string[] = [];
                const transactionErrors = transactionResults.filter(r => r.status === 'rejected');
                if (transactionErrors.length > 0) {
                    errorMessages.push("Could not load some transaction data due to permissions.");
                    console.error("Transaction fetch errors:", transactionErrors);
                }

                const profileErrors = profileResults.filter(r => r.status === 'rejected');
                if (profileErrors.length > 0) {
                    errorMessages.push("Could not load some commission profile data due to permissions.");
                    console.error("Profile fetch errors:", profileErrors);
                }

                if (errorMessages.length > 0) {
                    setError(errorMessages.join(' '));
                }

                const processed = processTransactionsForCoach(allTransactions, allProfiles, agents);
                setProcessedTransactions(processed);

            } catch (error: any) {
                console.error("Failed to fetch agent transaction data:", error);
                setError("An unexpected error occurred while fetching agent transaction data.");
                setProcessedTransactions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [agents, loadingAgents, userData]);

    const filteredAndSortedTransactions = useMemo(() => {
        let sortableItems = [...processedTransactions];
        if (filter) {
            sortableItems = sortableItems.filter(t => 
                t.agentName.toLowerCase().includes(filter.toLowerCase()) ||
                t.address.toLowerCase().includes(filter.toLowerCase())
            );
        }

        sortableItems.sort((a, b) => {
            let aValue: string | number | Date = a[sortConfig.key];
            let bValue: string | number | Date = b[sortConfig.key];
            
            if (sortConfig.key === 'acceptanceDate') {
                aValue = new Date(a.acceptanceDate);
                bValue = new Date(b.acceptanceDate);
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return sortableItems;
    }, [processedTransactions, filter, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const summaryStats = useMemo(() => {
        return filteredAndSortedTransactions.reduce((acc, t) => {
            acc.totalGci += t.gci;
            acc.totalNet += t.netCommission;
            acc.totalCompanyDollar += t.companyDollarPaid;
            acc.totalRoyalty += t.royaltyPaid;
            return acc;
        }, { totalGci: 0, totalNet: 0, totalCompanyDollar: 0, totalRoyalty: 0 });
    }, [filteredAndSortedTransactions]);

    const SortableHeader: React.FC<{ sortKey: SortableKeys; children: React.ReactNode; className?: string }> = ({ sortKey, children, className }) => {
        const isSorted = sortConfig.key === sortKey;
        return (
            <th className={`p-3 font-semibold text-text-primary cursor-pointer ${className}`} onClick={() => requestSort(sortKey)}>
                <div className="flex items-center gap-1">
                    {children}
                    {isSorted ? (sortConfig.direction === 'ascending' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}
                </div>
            </th>
        );
    };

    if (loading || loadingAgents) {
        return <div className="flex justify-center items-center h-full"><Spinner className="w-10 h-10"/></div>
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                   <BarChartHorizontal className="text-accent-secondary" size={48} />
                   Agent Transactions
                </h1>
                <p className="text-lg text-text-secondary mt-1">A complete overview of all agent-logged transactions.</p>
            </header>

             <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                {error && (
                    <Card className="bg-destructive-surface text-destructive border-destructive">
                        <div className="flex flex-col items-center justify-center text-center p-4">
                            <AlertTriangle className="w-12 h-12 mb-4" />
                            <p className="font-bold text-lg">Error Fetching Transactions</p>
                            <p className="mt-2 max-w-md">{error}</p>
                        </div>
                    </Card>
                )}
                
                {!error && (
                    <>
                        <Card>
                            <h2 className="text-xl font-bold mb-4">Summary Totals (Filtered)</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-center">
                                <div>
                                    <p className="text-xs text-text-secondary uppercase tracking-wider">Transactions</p>
                                    <p className="text-2xl font-bold text-text-primary">{filteredAndSortedTransactions.length.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-text-secondary uppercase tracking-wider">Total GCI</p>
                                    <p className="text-2xl font-bold text-text-primary">${summaryStats.totalGci.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-text-secondary uppercase tracking-wider">Total Net Commission</p>
                                    <p className="text-2xl font-bold text-success">${summaryStats.totalNet.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-text-secondary uppercase tracking-wider">Total Company $</p>
                                    <p className="text-2xl font-bold text-destructive">${summaryStats.totalCompanyDollar.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-text-secondary uppercase tracking-wider">Total Royalty</p>
                                    <p className="text-2xl font-bold text-destructive">${summaryStats.totalRoyalty.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="mb-4">
                                <div className="relative">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"/>
                                    <input
                                        type="text"
                                        placeholder="Filter by agent name or address..."
                                        value={filter}
                                        onChange={e => setFilter(e.target.value)}
                                        className="w-full max-w-sm bg-input border border-border rounded-md pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                            {/* Mobile View: Cards */}
                            <div className="block md:hidden space-y-4">
                                {filteredAndSortedTransactions.length > 0 ? (
                                    filteredAndSortedTransactions.map(t => (
                                        <TransactionMobileCard key={t.id} transaction={t} />
                                    ))
                                ) : (
                                    <p className="text-center text-text-secondary py-8">No transactions found.</p>
                                )}
                            </div>

                            {/* Desktop View: Table */}
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-background/50">
                                        <tr>
                                            <SortableHeader sortKey="agentName">Agent</SortableHeader>
                                            <SortableHeader sortKey="acceptanceDate">Date</SortableHeader>
                                            <th className="p-3 font-semibold text-text-primary">Address</th>
                                            <SortableHeader sortKey="gci" className="text-right">GCI</SortableHeader>
                                            <SortableHeader sortKey="netCommission" className="text-right">Net Commission</SortableHeader>
                                            <SortableHeader sortKey="companyDollarPaid" className="text-right">Company $</SortableHeader>
                                            <SortableHeader sortKey="royaltyPaid" className="text-right">Royalty</SortableHeader>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAndSortedTransactions.map(t => (
                                            <tr key={t.id} className="border-t border-border">
                                                <td className="p-3 font-semibold">{t.agentName}</td>
                                                <td className="p-3 whitespace-nowrap">{new Date(t.acceptanceDate).toLocaleDateString('en-CA', { timeZone: 'UTC' })}</td>
                                                <td className="p-3">{t.address}</td>
                                                <td className="p-3 text-right">${t.gci.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                <td className="p-3 text-right text-success font-semibold">${t.netCommission.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                <td className="p-3 text-right text-destructive">${t.companyDollarPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                <td className="p-3 text-right text-destructive">${t.royaltyPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredAndSortedTransactions.length === 0 && (
                                    <p className="text-center text-text-secondary py-8">No transactions found.</p>
                                )}
                            </div>
                        </Card>
                    </>
                )}
             </div>
        </div>
    );
};

export default CoachTransactionsPage;
