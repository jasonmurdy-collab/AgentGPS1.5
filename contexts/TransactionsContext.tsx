import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { Transaction } from '../types';
import { useAuth } from './AuthContext';
import { useGoals } from './GoalContext';
import { getFirestoreInstance } from '../firebaseConfig';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, DocumentSnapshot, Timestamp, writeBatch, increment } from 'firebase/firestore';
import { processTransactionDoc } from '../lib/firestoreUtils';

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  updateTransaction: (transactionId: string, updates: Partial<Omit<Transaction, 'id' | 'userId'>>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  loading: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const { user, userData, loading: authLoading } = useAuth();
  const { goals, loading: goalsLoading } = useGoals();

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    if (authLoading) {
      setInternalLoading(true);
      return;
    }

    if (user?.uid) {
      setInternalLoading(true);
      const transactionsCollectionRef = collection(getFirestoreInstance(), 'transactions');
      const q = query(
        transactionsCollectionRef, 
        where("userId", "==", user.uid)
      );

      unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedTransactions = querySnapshot.docs.map(processTransactionDoc);
        // Sort client-side to avoid needing a composite index
        fetchedTransactions.sort((a, b) => new Date(b.acceptanceDate).getTime() - new Date(a.acceptanceDate).getTime());
        setTransactions(fetchedTransactions);
        setInternalLoading(false);
      }, (error) => {
        console.error("Error fetching transactions:", error);
        setTransactions([]);
        setInternalLoading(false);
      });

    } else {
      setTransactions([]);
      setInternalLoading(false);
    }
    
    return () => unsubscribe();
  }, [user, authLoading]);

  const addTransaction = useCallback(async (newTransaction: Omit<Transaction, 'id' | 'userId'>) => {
    if (!user || !userData) throw new Error("User not authenticated.");

    const batch = writeBatch(getFirestoreInstance());
    const newTransactionRef = doc(collection(getFirestoreInstance(), 'transactions'));
    
    const dataToSave: any = {
      ...newTransaction,
      userId: user.uid,
      teamId: userData?.teamId || null,
      marketCenterId: userData?.marketCenterId || null,
      coachId: userData?.coachId || null,
      acceptanceDate: Timestamp.fromDate(new Date(newTransaction.acceptanceDate)),
    };

    if (newTransaction.closeDate) dataToSave.closeDate = Timestamp.fromDate(new Date(newTransaction.closeDate));
    if (newTransaction.conditionsDate) dataToSave.conditionsDate = Timestamp.fromDate(new Date(newTransaction.conditionsDate));
    if (newTransaction.expiryDate) dataToSave.expiryDate = Timestamp.fromDate(new Date(newTransaction.expiryDate));

    batch.set(newTransactionRef, dataToSave);

    const gci = newTransaction.salePrice * (newTransaction.commissionRate / 100);
    const listingIncrement = newTransaction.type === 'Listing Sale' ? 1 : 0;
    
    const userMetricsUpdate: { [key: string]: any } = {};
    if (gci > 0) userMetricsUpdate.gci = increment(gci);
    if (listingIncrement > 0) userMetricsUpdate.listings = increment(listingIncrement);
    
    if (Object.keys(userMetricsUpdate).length > 0) {
        batch.update(doc(getFirestoreInstance(), 'users', user.uid), userMetricsUpdate);
    }

    if (gci > 0) {
      const gciGoals = goals.filter(g => g.metric.toLowerCase().includes('gci'));
      gciGoals.forEach(goal => batch.update(doc(getFirestoreInstance(), 'goals', goal.id), { currentValue: increment(gci) }));
    }
    if (listingIncrement > 0) {
      const listingGoals = goals.filter(g => g.metric.toLowerCase().includes('listing'));
      listingGoals.forEach(goal => batch.update(doc(getFirestoreInstance(), 'goals', goal.id), { currentValue: increment(listingIncrement) }));
    }

    await batch.commit();

  }, [user, userData, goals]);

  const updateTransaction = useCallback(async (transactionId: string, updates: Partial<Omit<Transaction, 'id' | 'userId'>>) => {
    if (!user) throw new Error("User not authenticated.");

    const batch = writeBatch(getFirestoreInstance());
    const transactionDocRef = doc(getFirestoreInstance(), 'transactions', transactionId);

    const originalTransaction = transactions.find(t => t.id === transactionId);
    let gciDiff = 0;
    let listingsDiff = 0;

    if (originalTransaction) {
        const originalGci = originalTransaction.salePrice * (originalTransaction.commissionRate / 100);
        const originalListings = originalTransaction.type === 'Listing Sale' ? 1 : 0;

        const newSalePrice = updates.salePrice !== undefined ? updates.salePrice : originalTransaction.salePrice;
        const newCommissionRate = updates.commissionRate !== undefined ? updates.commissionRate : originalTransaction.commissionRate;
        const newType = updates.type !== undefined ? updates.type : originalTransaction.type;
        
        const newGci = newSalePrice * (newCommissionRate / 100);
        const newListings = newType === 'Listing Sale' ? 1 : 0;

        gciDiff = newGci - originalGci;
        listingsDiff = newListings - originalListings;
        
        const userMetricsUpdate: { [key: string]: any } = {};
        if (gciDiff !== 0) userMetricsUpdate.gci = increment(gciDiff);
        if (listingsDiff !== 0) userMetricsUpdate.listings = increment(listingsDiff);

        if (Object.keys(userMetricsUpdate).length > 0) {
            batch.update(doc(getFirestoreInstance(), 'users', user.uid), userMetricsUpdate);
        }
    }

    const updatesWithTimestamp: any = { ...updates };
    if (updates.acceptanceDate) updatesWithTimestamp.acceptanceDate = Timestamp.fromDate(new Date(updates.acceptanceDate));
    if (updates.closeDate) updatesWithTimestamp.closeDate = Timestamp.fromDate(new Date(updates.closeDate));
    if (updates.conditionsDate) updatesWithTimestamp.conditionsDate = Timestamp.fromDate(new Date(updates.conditionsDate));
    if (updates.expiryDate) updatesWithTimestamp.expiryDate = Timestamp.fromDate(new Date(updates.expiryDate));

    batch.update(transactionDocRef, updatesWithTimestamp);
    
    if (gciDiff !== 0) {
      const gciGoals = goals.filter(g => g.metric.toLowerCase().includes('gci'));
      gciGoals.forEach(goal => batch.update(doc(getFirestoreInstance(), 'goals', goal.id), { currentValue: increment(gciDiff) }));
    }
    if (listingsDiff !== 0) {
      const listingGoals = goals.filter(g => g.metric.toLowerCase().includes('listing'));
      listingGoals.forEach(goal => batch.update(doc(getFirestoreInstance(), 'goals', goal.id), { currentValue: increment(listingsDiff) }));
    }

    await batch.commit();

  }, [user, transactions, goals]);

  const deleteTransaction = useCallback(async (transactionId: string) => {
    if (!user) throw new Error("User not authenticated.");
    
    const batch = writeBatch(getFirestoreInstance());
    const transactionDocRef = doc(getFirestoreInstance(), 'transactions', transactionId);

    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (transactionToDelete) {
        const gci = transactionToDelete.salePrice * (transactionToDelete.commissionRate / 100);
        const listingDecrement = transactionToDelete.type === 'Listing Sale' ? 1 : 0;
        
        const userMetricsUpdate: { [key: string]: any } = {};
        if (gci > 0) userMetricsUpdate.gci = increment(-gci);
        if (listingDecrement > 0) userMetricsUpdate.listings = increment(-listingDecrement);

        if (Object.keys(userMetricsUpdate).length > 0) {
            batch.update(doc(getFirestoreInstance(), 'users', user.uid), userMetricsUpdate);
        }
        
        if (gci > 0) {
            const gciGoals = goals.filter(g => g.metric.toLowerCase().includes('gci'));
            gciGoals.forEach(goal => batch.update(doc(getFirestoreInstance(), 'goals', goal.id), { currentValue: increment(-gci) }));
        }
        if (listingDecrement > 0) {
            const listingGoals = goals.filter(g => g.metric.toLowerCase().includes('listing'));
            listingGoals.forEach(goal => batch.update(doc(getFirestoreInstance(), 'goals', goal.id), { currentValue: increment(-listingDecrement) }));
        }
    }

    batch.delete(transactionDocRef);
    await batch.commit();

  }, [user, transactions, goals]);
  
  const loading = useMemo(() => authLoading || internalLoading || goalsLoading, [authLoading, internalLoading, goalsLoading]);

  const value = useMemo(() => ({ transactions, addTransaction, updateTransaction, deleteTransaction, loading }),
    [transactions, loading, addTransaction, updateTransaction, deleteTransaction]
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactions = (): TransactionsContextType => {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
};