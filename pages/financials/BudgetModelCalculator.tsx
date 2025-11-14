
import React, { useState, useMemo, FC, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { ArrowDown, Hash, Users, BarChart, Save, DollarSign, TrendingDown, PieChart, Lightbulb, AlertTriangle } from 'lucide-react';
import type { BudgetModelInputs } from '../../types';
import { Spinner } from '../ui/Spinner';

type NumericBudgetInputKeys = 'gci' | 'listingSpecialistCompensation' | 'buyerSpecialistCompensation' | 'otherCOS' | 
    'compensation' | 'leadGeneration' | 'occupancy' | 'educationCoaching' | 'officeExpenses' | 'commsTech' | 
    'auto' | 'equipment' | 'insurance';

const opExCategories: { id: NumericBudgetInputKeys; name: string }[] = [
    { id: 'compensation', name: 'Compensation (Admin/Staff)' },
    { id: 'leadGeneration', name: 'Lead Generation' },
    { id: 'occupancy', name: 'Occupancy' },
    { id: 'educationCoaching', name: 'Education/Coaching' },
    { id: 'officeExpenses', name: 'Office Expenses' },
    { id: 'commsTech', name: 'Comms/Tech' },
    { id: 'auto', name: 'Auto' },
    { id: 'equipment', name: 'Equipment' },
    { id: 'insurance', name: 'Insurance' },
];

const cosCategories: { id: NumericBudgetInputKeys; name: string }[] = [
    { id: 'listingSpecialistCompensation', name: 'Listing Specialist(s) Compensation' },
    { id: 'buyerSpecialistCompensation', name: 'Buyer Specialist(s) Compensation' },
    { id: 'otherCOS', name: 'Other COS' },
];

const benchmarks = {
    gci1M: { cos: 0.25, opEx: 0.36, net: 0.39 },
    gci2_5M: { cos: 0.30, opEx: 0.30, net: 0.40 },
    detailedOpEx: {
        compensation: 0.144,
        leadGeneration: 0.09,
        occupancy: 0.01,
        educationCoaching: 0.025,
        officeExpenses: 0.01,
        commsTech: 0.01,
        auto: 0.006,
        equipment: 0.003,
        insurance: 0.002,
    } as Record<NumericBudgetInputKeys, number>,
};

const FinancialInput: React.FC<{ label: string, value: number, onChange: (val: number) => void }> = React.memo(({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">$</span>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-input border border-border rounded-md py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary pl-7"
            />
        </div>
    </div>
));

const ResultBar: React.FC<{ label: string, actual: number, benchmark: number, isOverBad?: boolean, formatAsPercent?: boolean }> = React.memo(({ label, actual, benchmark, isOverBad = true, formatAsPercent = true }) => {
    const variance = actual - benchmark;
    const isOver = actual > benchmark;
    const isSignificant = Math.abs(variance) > (benchmark * 0.1); // More than 10% deviation

    let statusColor = 'text-success';
    if (isSignificant) {
        if (isOver && isOverBad) statusColor = 'text-destructive';
        if (!isOver && !isOverBad) statusColor = 'text-destructive';
        if (isOver && !isOverBad) statusColor = 'text-success';
        if (!isOver && isOverBad) statusColor = 'text-success';
    }

    const formatter = (val: number) => formatAsPercent ? `${(val * 100).toFixed(1)}%` : val.toLocaleString();

    return (
        <div>
            <div className="flex justify-between items-center text-sm mb-1">
                <span className="font-semibold text-text-primary">{label}</span>
                <div className="flex items-center gap-2">
                    <span className={`font-bold ${statusColor}`}>{formatter(actual)}</span>
                    <span className="text-text-secondary">/ {formatter(benchmark)}</span>
                </div>
            </div>
            <div className="w-full bg-background rounded-full h-4 relative border border-border">
                <div className={`h-4 rounded-full ${isOver && isOverBad ? 'bg-destructive/50' : 'bg-success/50'}`} style={{ width: `${Math.min(actual / (benchmark * 1.5), 1) * 100}%` }}></div>
                <div className="absolute top-0 h-4 w-0.5 bg-text-primary" style={{ left: `${Math.min(benchmark / (benchmark * 1.5), 1) * 100}%` }}>
                    <div className="absolute -top-1 -translate-x-1/2 text-text-secondary" style={{ fontSize: '8px'}}>▼</div>
                </div>
            </div>
        </div>
    );
});

const CoachingTip: React.FC<{ icon: React.ElementType, title: string, children: React.ReactNode }> = React.memo(({ icon: Icon, title, children }) => (
     <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
        <Icon className="text-accent-secondary mt-1 flex-shrink-0" size={20} />
        <div>
            <h4 className="font-bold text-text-primary">{title}</h4>
            <p className="text-sm text-text-secondary">{children}</p>
        </div>
    </div>
));

interface BudgetModelCalculatorProps {
    initialData: BudgetModelInputs;
    onSave: (data: BudgetModelInputs) => Promise<void>;
}

const BudgetModelCalculator: React.FC<BudgetModelCalculatorProps> = React.memo(({ initialData, onSave }) => {
    const [inputs, setInputs] = useState<BudgetModelInputs>(initialData);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        setInputs(initialData);
    }, [initialData]);

    const handleInputChange = useCallback((key: NumericBudgetInputKeys, value: number) => {
        const numericValue = isNaN(value) ? 0 : value;
        if (numericValue < 0) return;
        setInputs(prev => ({ ...prev, [key]: numericValue }));
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        setFeedback('');
        try {
            await onSave(inputs);
            setFeedback('Budget model saved!');
        } catch (error) {
            setFeedback('Error saving budget model.');
        } finally {
            setSaving(false);
            setTimeout(() => setFeedback(''), 3000);
        }
    }, [onSave, inputs]);

    const calculations = useMemo(() => {
        const totalCOS = inputs.listingSpecialistCompensation + inputs.buyerSpecialistCompensation + inputs.otherCOS;
        const totalOpEx = opExCategories.reduce((sum, cat) => sum + (inputs[cat.id] || 0), 0);
        const grossProfit = inputs.gci - totalCOS;
        const netIncome = grossProfit - totalOpEx;

        const gci = inputs.gci > 0 ? inputs.gci : 1; // Avoid division by zero
        const cosRatio = totalCOS / gci;
        const opExRatio = totalOpEx / gci;
        const netIncomeRatio = netIncome / gci;

        const opExRatios = opExCategories.reduce((acc, cat) => {
            acc[cat.id] = (inputs[cat.id] || 0) / gci;
            return acc;
        }, {} as Record<NumericBudgetInputKeys, number>);

        const mainBenchmark = Math.abs(inputs.gci - 1000000) < Math.abs(inputs.gci - 2500000) ? benchmarks.gci1M : benchmarks.gci2_5M;

        return { totalCOS, totalOpEx, grossProfit, netIncome, cosRatio, opExRatio, netIncomeRatio, opExRatios, mainBenchmark };
    }, [inputs]);
    
    const { cosRatio, opExRatio, netIncomeRatio, opExRatios, mainBenchmark } = calculations;
    
    const highCos = cosRatio > mainBenchmark.cos;
    const highLeadGen = opExRatios.leadGeneration > benchmarks.detailedOpEx['leadGeneration'] * 1.1; // 10% tolerance
    const lowNet = netIncomeRatio < mainBenchmark.net;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Column */}
            <div className="lg:col-span-1 space-y-6">
                 <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Budget Inputs</h2>
                         <div className="flex items-center gap-2">
                             {feedback && <span className="text-xs text-success">{feedback}</span>}
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary text-on-accent font-semibold py-1.5 px-3 rounded-lg text-sm">
                                {saving ? <Spinner/> : <><Save size={14}/> Save</>}
                            </button>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Target Annual GCI</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">$</span>
                            <input type="number" value={inputs.gci} onChange={(e) => handleInputChange('gci', parseFloat(e.target.value) || 0)} className="w-full bg-input border border-border rounded-md py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary pl-7"/>
                        </div>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-xl font-bold mb-3">Cost of Sale (COS)</h3>
                    <div className="space-y-4">
                        {cosCategories.map(cat => (
                            <FinancialInput key={cat.id} label={cat.name} value={inputs[cat.id] || 0} onChange={val => handleInputChange(cat.id, val)} />
                        ))}
                    </div>
                </Card>
                 <Card>
                    <h3 className="text-xl font-bold mb-3">Operating Expenses (OpEx)</h3>
                    <div className="space-y-4">
                        {opExCategories.map(cat => (
                             <FinancialInput key={cat.id} label={cat.name} value={inputs[cat.id] || 0} onChange={val => handleInputChange(cat.id, val)} />
                        ))}
                    </div>
                </Card>
            </div>
            {/* Results Column */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <h2 className="text-2xl font-bold mb-4">Financial Summary</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                        <div className="bg-background/50 p-3 rounded-lg"><p className="text-xs uppercase text-text-secondary">GCI</p><p className="text-2xl font-bold">${calculations.grossProfit.toLocaleString()}</p></div>
                        <div className="bg-background/50 p-3 rounded-lg"><p className="text-xs uppercase text-text-secondary">Total COS</p><p className="text-2xl font-bold">${calculations.totalCOS.toLocaleString()}</p></div>
                        <div className="bg-background/50 p-3 rounded-lg"><p className="text-xs uppercase text-text-secondary">Total OpEx</p><p className="text-2xl font-bold">${calculations.totalOpEx.toLocaleString()}</p></div>
                        <div className="bg-success/20 p-3 rounded-lg"><p className="text-xs uppercase text-success">Net Income</p><p className="text-2xl font-bold text-success">${calculations.netIncome.toLocaleString()}</p></div>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><PieChart/> Budget vs. MREA Benchmarks</h2>
                    <p className="text-sm text-text-secondary mb-4">Compare your budget allocations to the recommended percentages from The Millionaire Real Estate Agent model for a business with ~${inputs.gci > 1750000 ? '2.5M' : '1M'} in GCI.</p>
                    <div className="space-y-4">
                        <ResultBar label="Cost of Sale" actual={cosRatio} benchmark={mainBenchmark.cos} />
                        <ResultBar label="Operating Expenses" actual={opExRatio} benchmark={mainBenchmark.opEx} />
                        <ResultBar label="Net Income" actual={netIncomeRatio} benchmark={mainBenchmark.net} isOverBad={false} />
                    </div>
                </Card>

                {(highCos || highLeadGen || lowNet) && (
                     <Card>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Lightbulb/> Coaching Insights</h2>
                        <div className="space-y-4">
                             {highCos && (
                                <CoachingTip icon={DollarSign} title="High Cost of Sale">
                                    Your Cost of Sale is above the benchmark. Review your commission splits with team members and referral fee agreements to ensure they align with your profitability goals.
                                </CoachingTip>
                             )}
                              {highLeadGen && (
                                <CoachingTip icon={TrendingDown} title="High Lead Gen Spend">
                                    Your Lead Generation budget is higher than the MREA model suggests. Analyze your lead sources to identify the highest ROI. Are you overspending on underperforming channels?
                                </CoachingTip>
                             )}
                              {lowNet && (
                                <CoachingTip icon={AlertTriangle} title="Low Net Income">
                                    Your net income percentage is below the benchmark. This is often a symptom of high expenses (COS or OpEx). Use the detailed expense breakdown below to identify areas for optimization.
                                </CoachingTip>
                             )}
                        </div>
                    </Card>
                )}

                 <Card>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><TrendingDown/> Detailed OpEx Analysis</h2>
                    <p className="text-sm text-text-secondary mb-4">Drill down into your operating expenses to see how they compare to MREA benchmarks for a business at the 7th Level.</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {opExCategories.map(cat => (
                             <ResultBar key={cat.id} label={cat.name} actual={opExRatios[cat.id]} benchmark={benchmarks.detailedOpEx[cat.id]} />
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
});

export default BudgetModelCalculator;
