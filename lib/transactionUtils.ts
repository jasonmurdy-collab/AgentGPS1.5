import type { CommissionProfile, Transaction, ProcessedTransaction, TeamMember } from '../types';

const HST_RATE = 0.13; // 13%

// Renamed from EnrichedTransaction for clarity within this file
interface CoachProcessedTransaction extends ProcessedTransaction {
    agentName: string;
}

/**
 * Processes all transactions for a group of users (for Coach/Admin views).
 * @param transactions - All raw transactions for the users.
 * @param profiles - All commission profiles for the users.
 * @param users - The user data for the relevant agents.
 * @returns An array of processed transactions with financial details and agent names.
 */
export const processTransactionsForCoach = (
  transactions: Transaction[],
  profiles: CommissionProfile[],
  users: TeamMember[]
): CoachProcessedTransaction[] => {
  const profilesMap = new Map(profiles.map(p => [p.id, p]));
  const usersMap = new Map(users.map(u => [u.id, u]));

  const transactionsByUser = transactions.reduce((acc, t) => {
    if (!acc[t.userId]) {
      acc[t.userId] = [];
    }
    acc[t.userId].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const allProcessed: CoachProcessedTransaction[] = [];

  for (const userId in transactionsByUser) {
    const userTransactions = transactionsByUser[userId];
    const userProfile = profilesMap.get(userId);
    const userName = usersMap.get(userId)?.name || 'Unknown Agent';

    // Process transactions for a single user
    const processedForUser = processTransactionsForUser(userTransactions, userProfile);

    // Add agentName to each transaction and push to the main array
    processedForUser.forEach(t => {
        allProcessed.push({
            ...t,
            agentName: userName,
        });
    });
  }

  // Return all transactions, sorted by date descending for final display
  return allProcessed.sort((a: CoachProcessedTransaction, b: CoachProcessedTransaction) => new Date(b.acceptanceDate).getTime() - new Date(a.acceptanceDate).getTime());
};


/**
 * Processes transactions for a single user against their commission profile.
 * @param transactions - All raw transactions for a single user.
 * @param profile - The commission profile for that user.
 * @returns An array of processed transactions with calculated financial details.
 */
export const processTransactionsForUser = (
  transactions: Transaction[],
  profile: CommissionProfile | null
): ProcessedTransaction[] => {

  const transactionsWithGCI = transactions.map(t => ({
    ...t,
    gci: t.salePrice * (t.commissionRate / 100),
  }));

  if (!profile) {
    // If no profile, calculations are simple
    return transactionsWithGCI.map(t => ({
      ...t,
      companyDollarPaid: 0,
      royaltyPaid: 0,
      netCommission: t.gci,
      hstOnGci: t.gci * HST_RATE,
    }));
  }

  const sortedTransactions = [...transactionsWithGCI].sort((a, b) => 
    new Date(a.acceptanceDate).getTime() - new Date(b.acceptanceDate).getTime()
  );

  const anniversaryDate = new Date(profile.capAnniversaryDate);
  const today = new Date();
  const anniversaryYearStart = new Date(anniversaryDate);
  anniversaryYearStart.setUTCFullYear(today.getUTCFullYear());
  if (today < anniversaryYearStart) {
    anniversaryYearStart.setUTCFullYear(today.getUTCFullYear() - 1);
  }

  const capYearTransactions = sortedTransactions.filter(t => new Date(t.acceptanceDate) >= anniversaryYearStart);
  
  let runningCompanyDollar = 0;
  let runningRoyalty = 0;
  const processedTransactions: ProcessedTransaction[] = [];
  
  for (const t of capYearTransactions) {
    const potentialRoyalty = t.gci * (profile.royaltyFee / 100);
    const remainingRoyaltyCap = profile.royaltyFeeCap - runningRoyalty;
    const royaltyForThisDeal = Math.min(potentialRoyalty, Math.max(0, remainingRoyaltyCap));

    const gciAfterRoyalty = t.gci - royaltyForThisDeal;

    let companyDollarForThisDeal = 0;
    const isAlreadyCapped = runningCompanyDollar >= profile.commissionCap;

    if (isAlreadyCapped) {
        companyDollarForThisDeal = profile.postCapTransactionFee;
    } else {
        const potentialCompanyDollar = gciAfterRoyalty * (1 - (profile.commissionSplit / 100));
        const remainingCommissionCap = profile.commissionCap - runningCompanyDollar;
        companyDollarForThisDeal = Math.min(potentialCompanyDollar, Math.max(0, remainingCommissionCap));
    }
    
    const netCommission = t.gci - royaltyForThisDeal - companyDollarForThisDeal;
    const hstOnGci = t.gci * HST_RATE;

    processedTransactions.push({
      ...t,
      companyDollarPaid: companyDollarForThisDeal,
      royaltyPaid: royaltyForThisDeal,
      netCommission,
      hstOnGci,
    });

    runningRoyalty += royaltyForThisDeal;
    runningCompanyDollar += companyDollarForThisDeal;
  }
  
  const preCapYearTransactions = sortedTransactions
    .filter(t => new Date(t.acceptanceDate) < anniversaryYearStart)
    .map(t => ({
      ...t,
      companyDollarPaid: 0, 
      royaltyPaid: 0,
      netCommission: t.gci,
      hstOnGci: t.gci * HST_RATE,
    }));

  return [...processedTransactions, ...preCapYearTransactions].sort((a, b) => new Date(b.acceptanceDate).getTime() - new Date(a.acceptanceDate).getTime());
};