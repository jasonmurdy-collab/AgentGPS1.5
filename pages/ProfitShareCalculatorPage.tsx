
import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { PieChart, DollarSign, Users, TrendingUp, Info, UserSearch, Trash2 } from 'lucide-react';

const LEVEL_DEFINITIONS = [
    { level: 1, percentage: 50, color: 'bg-green-500' },
    { level: 2, percentage: 10, color: 'bg-blue-500' },
    { level: 3, percentage: 5, color: 'bg-indigo-500' },
    { level: 4, percentage: 5, color: 'bg-purple-500' },
    { level: 5, percentage: 7.5, color: 'bg-pink-500' },
    { level: 6, percentage: 10, color: 'bg-red-500' },
    { level: 7, percentage: 12.5, color: 'bg-orange-500' },
];

interface Recruit {
    id: number;
    name: string;
    gci: number | string;
    level: number;
}

const ProfitShareCalculatorPage: React.FC = () => {
    // State for the general calculator
    const [avgProfit, setAvgProfit] = useState<number | string>(1000);
    const [agentsPerLevel, setAgentsPerLevel] = useState<number[]>(Array(7).fill(0));

    // State for the key recruit analyzer
    const [recruits, setRecruits] = useState<Recruit[]>([]);
    const [companyDollarSplit, setCompanyDollarSplit] = useState(30);
    const [profitMargin, setProfitMargin] = useState(40);


    const handleAgentsChange = (levelIndex: number, value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
            const newAgents = [...agentsPerLevel];
            newAgents[levelIndex] = 0;
            setAgentsPerLevel(newAgents);
            return;
        };
        const newAgents = [...agentsPerLevel];
        newAgents[levelIndex] = numValue;
        setAgentsPerLevel(newAgents);
    };

    const generalResults = useMemo(() => {
        const parsedAvgProfit = typeof avgProfit === 'string' ? parseInt(avgProfit, 10) || 0 : avgProfit;
        const breakdown = agentsPerLevel.map((numAgents, index) => {
            return numAgents * parsedAvgProfit * (LEVEL_DEFINITIONS[index].percentage / 100);
        });
        const monthlyTotal = breakdown.reduce((sum, val) => sum + val, 0);
        const annualTotal = monthlyTotal * 12;
        const maxLevelValue = Math.max(...breakdown, 1);
        return { breakdown, monthlyTotal, annualTotal, maxLevelValue };
    }, [avgProfit, agentsPerLevel]);
    
    // --- Key Recruit Analyzer Logic ---
    const addRecruit = () => {
        setRecruits([...recruits, { id: Date.now(), name: '', gci: '', level: 1 }]);
    };

    const removeRecruit = (id: number) => {
        setRecruits(recruits.filter(r => r.id !== id));
    };

    const updateRecruit = (id: number, field: keyof Recruit, value: string | number) => {
        setRecruits(recruits.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const recruitResults = useMemo(() => {
        const breakdown = recruits.map(recruit => {
            const parsedGci = typeof recruit.gci === 'string' ? parseInt(recruit.gci, 10) || 0 : recruit.gci;
            const monthlyProfitContribution = (parsedGci / 12) * (companyDollarSplit / 100) * (profitMargin / 100);
            const profitSharePercentage = LEVEL_DEFINITIONS.find(l => l.level === recruit.level)?.percentage || 0;
            const monthlyProfitShare = monthlyProfitContribution * (profitSharePercentage / 100);
            return {
                id: recruit.id,
                monthly: monthlyProfitShare,
                annual: monthlyProfitShare * 12,
            };
        });
        const totalMonthly = breakdown.reduce((sum, r) => sum + r.monthly, 0);
        const totalAnnual = breakdown.reduce((sum, r) => sum + r.annual, 0);
        return { breakdown, totalMonthly, totalAnnual };
    }, [recruits, companyDollarSplit, profitMargin]);


    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                   <PieChart className="text-accent-secondary" size={48} />
                   Profit Share Calculator
                </h1>
                <p className="text-lg text-text-secondary mt-1">Estimate your passive income potential by building your downline.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <h2 className="text-2xl font-bold mb-4">General Downline Calculator</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="avgProfit" className="block text-sm font-medium text-text-secondary mb-1">Avg. Monthly Profit per Agent</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                                        <input
                                            id="avgProfit"
                                            type="number"
                                            value={avgProfit}
                                            onChange={(e) => setAvgProfit(e.target.value)}
                                            className="w-full bg-input border border-border rounded-md py-2 text-text-primary pl-7"
                                        />
                                    </div>
                                    <p className="text-xs text-text-secondary mt-1">Estimate of profit an agent contributes to the Market Center monthly.</p>
                                </div>
                            </div>
                            <div className="mt-6">
                                <h3 className="text-lg font-bold mb-3">Your Downline Structure</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                    {agentsPerLevel.map((numAgents, index) => (
                                        <div key={index}>
                                            <label htmlFor={`level-${index}`} className="block text-sm font-medium text-text-secondary mb-1 text-center">Level {index + 1}</label>
                                            <input
                                                id={`level-${index}`}
                                                type="number"
                                                value={numAgents > 0 ? numAgents : ''}
                                                onChange={(e) => handleAgentsChange(index, e.target.value)}
                                                className="w-full bg-input border border-border rounded-md py-2 text-text-primary text-center"
                                                min="0"
                                                placeholder="0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><TrendingUp /> Estimated Earnings (General)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                                <div className="bg-background/50 p-6 rounded-lg">
                                    <p className="text-sm font-semibold text-text-secondary uppercase">Monthly Profit Share</p>
                                    <p className="text-5xl font-black text-primary my-2">{formatCurrency(generalResults.monthlyTotal)}</p>
                                </div>
                                <div className="bg-background/50 p-6 rounded-lg">
                                    <p className="text-sm font-semibold text-text-secondary uppercase">Annual Profit Share</p>
                                    <p className="text-5xl font-black text-accent-secondary my-2">{formatCurrency(generalResults.annualTotal)}</p>
                                </div>
                            </div>
                            <div className="mt-6">
                                <h3 className="text-lg font-bold mb-3">Breakdown by Level (Monthly)</h3>
                                <div className="space-y-2">
                                    {generalResults.breakdown.map((value, index) => (
                                        <div key={index} className="flex items-center gap-4">
                                            <div className="w-20 text-sm font-semibold text-text-secondary">Level {index + 1}</div>
                                            <div className="flex-1 bg-background rounded-full h-6">
                                                <div
                                                    className={`${LEVEL_DEFINITIONS[index].color} h-6 rounded-full flex items-center justify-end px-2 text-white text-xs font-bold transition-all duration-500`}
                                                    style={{ width: `${(value / generalResults.maxLevelValue) * 100}%`, minWidth: value > 0 ? '4rem' : '0' }}
                                                >
                                                    {formatCurrency(value)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card>
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Info /> How It Works</h2>
                            <p className="text-sm text-text-secondary mb-4">This calculator provides an estimate based on the Keller Williams Profit Share model. Your actual earnings will vary based on Market Center profitability and your downline's production.</p>
                            <div className="space-y-3">
                                {LEVEL_DEFINITIONS.map(({ level, percentage }) => (
                                    <div key={level} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                                        <span className="font-bold text-text-primary">Level {level}</span>
                                        <span className="font-bold text-lg text-primary">{percentage}%</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-text-secondary mt-4">The percentage shown is applied to the profit contributed by each agent in that respective level of your downline.</p>
                        </Card>
                    </div>
                </div>

                {/* --- Key Recruit Analyzer --- */}
                <Card>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <UserSearch /> Key Recruit Potential Analyzer
                    </h2>
                    <p className="text-sm text-text-secondary mb-6">
                        Analyze the potential profit share from specific high-value recruits you are targeting.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-background/50 rounded-lg border border-border">
                        <div>
                            <label htmlFor="companyDollarSplit" className="block text-sm font-medium text-text-secondary mb-1">Company Dollar Split %</label>
                            <input type="number" id="companyDollarSplit" value={companyDollarSplit} onChange={e => setCompanyDollarSplit(parseInt(e.target.value, 10) || 0)} className="w-full bg-input border border-border rounded-md p-2" />
                            <p className="text-xs text-text-secondary mt-1">The portion of GCI the Market Center receives before splits.</p>
                        </div>
                        <div>
                            <label htmlFor="profitMargin" className="block text-sm font-medium text-text-secondary mb-1">Market Center Profit Margin %</label>
                            <input type="number" id="profitMargin" value={profitMargin} onChange={e => setProfitMargin(parseInt(e.target.value, 10) || 0)} className="w-full bg-input border border-border rounded-md p-2" />
                            <p className="text-xs text-text-secondary mt-1">The MC's profit margin on its Company Dollar.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {recruits.map(recruit => {
                            const result = recruitResults.breakdown.find(r => r.id === recruit.id);
                            return (
                                <div key={recruit.id} className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end p-3 border border-border rounded-lg bg-background/50">
                                    <div className="col-span-2 md:col-span-2">
                                        <label className="text-xs font-semibold">Recruit Name</label>
                                        <input type="text" value={recruit.name} onChange={e => updateRecruit(recruit.id, 'name', e.target.value)} placeholder="e.g., Jane Doe" className="w-full bg-input border border-border rounded-md p-2 text-sm" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-xs font-semibold">Annual GCI</label>
                                        <input type="number" value={recruit.gci} onChange={e => updateRecruit(recruit.id, 'gci', e.target.value)} placeholder="100000" className="w-full bg-input border border-border rounded-md p-2 text-sm" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-xs font-semibold">Level</label>
                                        <select value={recruit.level} onChange={e => updateRecruit(recruit.id, 'level', parseInt(e.target.value, 10))} className="w-full bg-input border border-border rounded-md p-2 text-sm">
                                            {LEVEL_DEFINITIONS.map(l => <option key={l.level} value={l.level}>{l.level}</option>)}
                                        </select>
                                    </div>
                                    <div className="text-center md:text-left">
                                        <p className="text-xs font-semibold text-text-secondary">Monthly</p>
                                        <p className="font-bold text-primary">{formatCurrency(result?.monthly || 0)}</p>
                                    </div>
                                    <div className="col-span-2 md:col-span-1 flex items-center justify-between">
                                        <div className="text-center md:text-left">
                                            <p className="text-xs font-semibold text-text-secondary">Annual</p>
                                            <p className="font-bold text-accent-secondary">{formatCurrency(result?.annual || 0)}</p>
                                        </div>
                                        <button onClick={() => removeRecruit(recruit.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <button onClick={addRecruit} className="mt-4 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded-lg text-sm text-text-secondary hover:border-primary hover:text-primary">
                        + Add Recruit
                    </button>

                    {recruits.length > 0 && (
                         <div className="mt-8 pt-6 border-t border-border">
                            <h3 className="text-xl font-bold">Total Potential from Key Recruits</h3>
                            <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                                <div className="bg-background/50 p-4 rounded-lg">
                                    <p className="text-sm font-semibold text-text-secondary uppercase">Additional Monthly</p>
                                    <p className="text-3xl font-bold text-primary">{formatCurrency(recruitResults.totalMonthly)}</p>
                                </div>
                                <div className="bg-background/50 p-4 rounded-lg">
                                    <p className="text-sm font-semibold text-text-secondary uppercase">Additional Annual</p>
                                    <p className="text-3xl font-bold text-accent-secondary">{formatCurrency(recruitResults.totalAnnual)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ProfitShareCalculatorPage;