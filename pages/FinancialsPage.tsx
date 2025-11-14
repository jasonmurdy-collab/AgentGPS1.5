

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../contexts/TransactionsContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { TransactionCard } from '../components/transactions/TransactionCard';
import type { CommissionProfile, Transaction, ProcessedTransaction, BudgetModelInputs } from '../types';
import { PlusCircle, Save, Briefcase, DollarSign, Calculator } from 'lucide-react';
import { processTransactionsForUser } from '../lib/transactionUtils';

const BudgetModelCalculator = lazy(() => import('../components/financials/BudgetModelCalculator'));

const CommissionProfileForm: React.FC = () => {
    const { user, getCommissionProfileForUser, saveCommissionProfile } = useAuth();
    const [profile, setProfile] = useState<Omit<CommissionProfile, 'id'>>({
        commissionSplit: 80,
        commissionCap: 16000,
        postCapTransactionFee: 250,
        royaltyFee: 6,
        royaltyFeeCap: 3000,
        capAnniversaryDate: new Date().toISOString().split('T')[0],
        marketCenterId: null,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            setLoading(true);
            const data = await getCommissionProfileForUser(user.uid);
            if (data) {
                const { id, ...rest } = data;
                setProfile({
                    ...rest,
                    capAnniversaryDate: new Date(data.capAnniversaryDate).toISOString().split('T')[0]
                });
            }
            setLoading(false);
        };
        fetchProfile();
    }, [user, getCommissionProfileForUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFeedback('');
        try {
            await saveCommissionProfile(profile);
            setFeedback('Profile saved successfully!');
        } catch (error) {
            setFeedback('Failed to save profile.');
        } finally {
            setSaving(false);
            setTimeout(() => setFeedback(''), 3000);
        }
    };
    
    if (loading) {
        return <div className="flex justify-center items-center py-8"><Spinner/></div>;
    }

    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

    return (
        <Card>
            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="commissionSplit" className={labelClasses}>Commission Split (%)</label>
                        <input type="number" name="commissionSplit" value={profile.commissionSplit} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="commissionCap" className={labelClasses}>Commission Cap ($)</label>
                        <input type="number" name="commissionCap" value={profile.commissionCap} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="royaltyFee" className={labelClasses}>Royalty Fee (%)</label>
                        <input type="number" name="royaltyFee" value={profile.royaltyFee} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="royaltyFeeCap" className={labelClasses}>Royalty Fee Cap ($)</label>
                        <input type="number" name="royaltyFeeCap" value={profile.royaltyFeeCap} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="postCapTransactionFee" className={labelClasses}>Post-Cap Transaction Fee ($)</label>
                        <input type="number" name="postCapTransactionFee" value={profile.postCapTransactionFee} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="capAnniversaryDate" className={labelClasses}>Cap Anniversary Date</label>
                        <input type="date" name="capAnniversaryDate" value={profile.capAnniversaryDate} onChange={handleChange} className={inputClasses} />
                    </div>
                </div>
                <div className="flex justify-end items-center gap-4">
                    {feedback && <span className={`text-sm ${feedback.includes('Failed') ? 'text-destructive' : 'text-success'}`}>{feedback}</span>}
                    <button type="submit" disabled={saving} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 min-w-[120px]">
                        {saving ? <Spinner /> : 'Save Profile'}
                    </button>
                </div>
            </form>
        </Card>
    );
};

const initialBudgetInputs: Omit<BudgetModelInputs, 'userId'> = {
    gci: 1000000,
    listingSpecialistCompensation: 0,
    buyerSpecialistCompensation: 0,
    otherCOS: 0,
    compensation: 144000,
    leadGeneration: 90000,
    occupancy: 10000,
    educationCoaching: 25000,
    officeExpenses: 10000,
    commsTech: 10000,
    auto: 6000,
    equipment: 3000,
    insurance: 2000,
    marketCenterId: null,
};

const BudgetTabContent: React.FC = () => {
    const { user, getBudgetModelForUser, saveBudgetModel } = useAuth();
    const [budgetData, setBudgetData] = useState<BudgetModelInputs | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        getBudgetModelForUser(user.uid).then(data => {
            setBudgetData(data);
            setLoading(false);
        });
    }, [user, getBudgetModelForUser]);

    if (loading) {
        return <div className="flex justify-center items-center py-8"><Spinner/></div>;
    }

    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>}>
            <BudgetModelCalculator 
                initialData={budgetData || { ...initialBudgetInputs, userId: user?.uid || '' }}
                onSave={saveBudgetModel}
            />
        </Suspense>
    );
};

const FinancialsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'transactions' | 'budget' | 'profile'>('transactions');
    const { transactions, loading: loadingTransactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
    const { user, getCommissionProfileForUser } = useAuth();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [commissionProfile, setCommissionProfile] = useState<CommissionProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    useEffect(() => {
        if (!user) { setLoadingProfile(false); return; }
        getCommissionProfileForUser(user.uid).then(profile => {
            setCommissionProfile(profile);
            setLoadingProfile(false);
        });
    }, [user, getCommissionProfileForUser]);

    const processedTransactions = useMemo(() => 
        processTransactionsForUser(transactions, commissionProfile),
        [transactions, commissionProfile]
    );

    const handleOpenModalForAdd = () => {
        setTransactionToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (transaction: Transaction) => {
        setTransactionToEdit(transaction);
        setIsModalOpen(true);
    };
    
    const handleSubmitTransaction = async (data: Omit<Transaction, 'id' | 'userId'>) => {
        if (transactionToEdit) {
            await updateTransaction(transactionToEdit.id, data);
        } else {
            await addTransaction(data);
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this transaction?")) {
            await deleteTransaction(id);
        }
    };
    
    const TabButton: React.FC<{ tabId: 'transactions' | 'budget' | 'profile'; children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tabId ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/10'}`}>
            {children}
        </button>
    );

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Financials</h1>
                        <p className="text-lg text-text-secondary mt-1">Manage transactions, analyze your budget, and configure your commission.</p>
                    </div>
                    {activeTab === 'transactions' && (
                        <button onClick={handleOpenModalForAdd} className="flex items-center justify-center bg-accent text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                            <PlusCircle className="mr-2" size={20} />
                            Log New Transaction
                        </button>
                    )}
                </div>
                 <div className="mt-6 flex items-center gap-2 p-1 bg-surface rounded-lg w-fit">
                    <TabButton tabId="transactions"><Briefcase size={16}/> My Transactions</TabButton>
                    <TabButton tabId="budget"><Calculator size={16}/> Budget Model</TabButton>
                    <TabButton tabId="profile"><DollarSign size={16}/> Commission Profile</TabButton>
                </div>
            </header>
            
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                {activeTab === 'transactions' && (
                    loadingTransactions || loadingProfile ? (
                        <div className="flex justify-center items-center py-8"><Spinner/></div>
                    ) : processedTransactions.length > 0 ? (
                        <div className="space-y-4">
                            {processedTransactions.map(t => (
                                <TransactionCard 
                                    key={t.id} 
                                    transaction={t} 
                                    onEdit={() => handleOpenModalForEdit(t)}
                                    onDelete={() => handleDeleteTransaction(t.id)}
                                />
                            ))}
                        </div>
                    ) : (
                         <Card className="text-center py-12">
                            <h2 className="text-2xl font-bold">No Transactions Logged</h2>
                            <p className="text-text-secondary mt-2">Click "Log New Transaction" to get started.</p>
                        </Card>
                    )
                )}
                
                {activeTab === 'budget' && <BudgetTabContent />}

                {activeTab === 'profile' && <CommissionProfileForm />}
            </div>
            
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmitTransaction}
                transactionToEdit={transactionToEdit}
            />
        </div>
    );
};

export default FinancialsPage;