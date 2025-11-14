import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { DollarSign, Hash, Percent, TrendingUp, AlertCircle, Calculator } from 'lucide-react';

const formatCurrency = (value: number) => {
    if (isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const NumberInput: React.FC<{ label: string, value: number | string, onChange: (val: number) => void, placeholder?: string, isCurrency?: boolean }> = ({ label, value, onChange, placeholder, isCurrency }) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <div className="relative">
            {isCurrency && <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"/>}
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                placeholder={placeholder}
                className={`w-full bg-input border border-border rounded-md py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary ${isCurrency ? 'pl-9' : 'pl-3'}`}
            />
        </div>
    </div>
);

const ResultDisplay: React.FC<{ label: string; value: string; isHighlighted?: boolean }> = ({ label, value, isHighlighted }) => (
    <div className={`p-4 rounded-lg ${isHighlighted ? 'bg-primary/10' : 'bg-background/50'}`}>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className={`text-2xl font-bold ${isHighlighted ? 'text-primary' : 'text-text-primary'}`}>{value}</p>
    </div>
);

const FocusingQuestion: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 rounded-r-lg">
        <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-1 flex-shrink-0" />
            <div>
                <h4 className="font-bold text-red-800 dark:text-red-200">Focusing Question</h4>
                <p className="text-sm text-red-700 dark:text-red-300">{children}</p>
            </div>
        </div>
    </div>
);

const DatabaseValueCalculatorPage: React.FC = () => {
    // Shared state
    const [totalContacts, setTotalContacts] = useState<number | string>(15000);
    const [transactionsLastYear, setTransactionsLastYear] = useState<number | string>(227);
    
    // Calculator 1 state
    const [leadCost, setLeadCost] = useState<number | string>(26);
    const [annualMultiplier, setAnnualMultiplier] = useState<number | string>(3);
    
    // Calculator 3 state
    const [acceptableRate, setAcceptableRate] = useState<number | string>(4);
    const [avgSalesPrice, setAvgSalesPrice] = useState<number | string>(550000);
    
    const numContacts = typeof totalContacts === 'number' ? totalContacts : 0;
    const numTransactions = typeof transactionsLastYear === 'number' ? transactionsLastYear : 0;

    const assetValueResult = useMemo(() => {
        const cost = typeof leadCost === 'number' ? leadCost : 0;
        const multiplier = typeof annualMultiplier === 'number' ? annualMultiplier : 0;
        const dbValue = numContacts * cost;
        const assetValue = dbValue * multiplier;
        return { dbValue, assetValue };
    }, [numContacts, leadCost, annualMultiplier]);

    const conversionRateResult = useMemo(() => {
        if (numContacts === 0) return 0;
        return (numTransactions / numContacts) * 100;
    }, [numContacts, numTransactions]);
    
    const financialOpportunityResult = useMemo(() => {
        const rate = typeof acceptableRate === 'number' ? acceptableRate : 0;
        const price = typeof avgSalesPrice === 'number' ? avgSalesPrice : 0;
        const potentialTransactions = numContacts * (rate / 100);
        const additionalUnits = potentialTransactions - numTransactions;
        const additionalVolume = additionalUnits * price;
        return { potentialTransactions, additionalUnits, additionalVolume };
    }, [numContacts, acceptableRate, numTransactions, avgSalesPrice]);
    
    return (
        <div className="space-y-8">
            <Card>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-3"><Calculator/> 1. Database Asset Value</h2>
                <p className="text-sm text-text-secondary mb-4">Determine the value of your database from a cost perspective if you had to rebuild it today.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <NumberInput label="Total Contacts in Database" value={totalContacts} onChange={val => setTotalContacts(val)} />
                    <NumberInput label="Lead Cost Multiplier" value={leadCost} onChange={val => setLeadCost(val)} isCurrency />
                    <NumberInput label="Annual Multiplier" value={annualMultiplier} onChange={val => setAnnualMultiplier(val)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResultDisplay label="Database Value (Cost Method)" value={formatCurrency(assetValueResult.dbValue)} />
                    <ResultDisplay label="Total Asset Value" value={formatCurrency(assetValueResult.assetValue)} isHighlighted />
                </div>
                <FocusingQuestion>
                    Are you treating your database like a cash asset that is worth {formatCurrency(assetValueResult.assetValue)}? Would your calendar support your answer?
                </FocusingQuestion>
            </Card>

            <Card>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-3"><Percent/> 2. Current Conversion Rate</h2>
                <p className="text-sm text-text-secondary mb-4">Determine your current total database conversion rate from last year's performance.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <NumberInput label="Total Contacts in Database" value={totalContacts} onChange={val => setTotalContacts(val)} />
                    <NumberInput label="Transactions Closed Last Year" value={transactionsLastYear} onChange={val => setTransactionsLastYear(val)} />
                </div>
                 <ResultDisplay label="Database Conversion Rate" value={`${conversionRateResult.toFixed(2)}%`} isHighlighted />
                 <FocusingQuestion>
                    Is {conversionRateResult.toFixed(2)}% an acceptable conversion rate to you? If your database includes SOI, past clients, random contacts, and purchased leads, the answer may be no.
                </FocusingQuestion>
            </Card>
            
            <Card>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-3"><TrendingUp/> 3. Total Financial Opportunity</h2>
                <p className="text-sm text-text-secondary mb-4">Determine the financial opportunity you could be realizing from your database.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <NumberInput label="Total Contacts in Database" value={totalContacts} onChange={val => setTotalContacts(val)} />
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Acceptable Conversion Rate</label>
                        <div className="relative">
                            <input type="number" value={acceptableRate} onChange={e => setAcceptableRate(parseFloat(e.target.value) || 0)} className="w-full bg-input border border-border rounded-md py-2 pl-3 pr-8 text-text-primary" />
                            <Percent size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"/>
                        </div>
                    </div>
                    <NumberInput label="Your Average Sales Price" value={avgSalesPrice} onChange={val => setAvgSalesPrice(val)} isCurrency />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <ResultDisplay label="Potential Transactions" value={Math.round(financialOpportunityResult.potentialTransactions).toLocaleString()} />
                     <ResultDisplay label="Additional Closed Units" value={Math.round(financialOpportunityResult.additionalUnits).toLocaleString()} />
                     <ResultDisplay label="Additional Volume" value={formatCurrency(financialOpportunityResult.additionalVolume)} isHighlighted />
                </div>
                <FocusingQuestion>
                    Your team could be closing {Math.round(financialOpportunityResult.potentialTransactions)} units from this database. This would add another {Math.round(financialOpportunityResult.additionalUnits)} closed units for an additional {formatCurrency(financialOpportunityResult.additionalVolume)} in volume. Is this the missing money needed to live your best life?
                </FocusingQuestion>
            </Card>
        </div>
    );
};

export default DatabaseValueCalculatorPage;
