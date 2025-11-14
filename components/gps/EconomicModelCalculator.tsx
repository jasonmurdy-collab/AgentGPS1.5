import React, { useMemo, FC, useCallback } from 'react';
import { Card } from '../ui/Card';
import { ArrowDown, Hash, Users, BarChart } from 'lucide-react';
import type { EconomicModelData } from '../../pages/BusinessGpsPage';

// --- HELPER & UI COMPONENTS ---
interface InputProps {
  label: string;
  value: number;
  onUpdate: (value: number) => void;
  isCurrency?: boolean;
  isPercentage?: boolean;
  helpText?: string;
}

const Input: FC<InputProps> = React.memo(({ label, value, onUpdate, isCurrency, isPercentage, helpText }) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <div className="relative">
            {isCurrency && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>}
            <input
                type="number"
                value={value}
                onChange={(e) => onUpdate(parseFloat(e.target.value) || 0)}
                className={`w-full bg-input border border-border rounded-md py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary ${isCurrency ? 'pl-7' : 'pl-3'} ${isPercentage ? 'pr-8' : ''}`}
            />
            {isPercentage && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">%</span>}
        </div>
        {helpText && <p className="text-xs text-text-secondary mt-1">{helpText}</p>}
    </div>
));

interface BreakdownRowProps {
    label: string;
    value: string;
    isSubtle?: boolean;
}

const BreakdownRow: FC<BreakdownRowProps> = React.memo(({ label, value, isSubtle }) => (
    <div className={`flex justify-between items-center py-2 ${isSubtle ? 'text-sm' : ''}`}>
        <span className={isSubtle ? 'text-text-secondary' : 'font-semibold text-text-primary'}>{label}</span>
        <span className={`font-bold ${isSubtle ? 'text-text-secondary' : 'text-text-primary'}`}>{value}</span>
    </div>
));

// --- MAIN COMPONENT ---
interface EconomicModelCalculatorProps {
    data: EconomicModelData;
    onDataChange: React.Dispatch<React.SetStateAction<EconomicModelData>>;
    calculations: any;
}

const EconomicModelCalculator: React.FC<EconomicModelCalculatorProps> = React.memo(({ data, onDataChange, calculations }) => {
    
    const handleUpdate = useCallback((field: keyof EconomicModelData) => (value: number) => {
        if (isNaN(value) || value < 0) return;
        onDataChange(prev => ({...prev, [field]: value}));
    }, [onDataChange]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* --- Column 1: INPUTS --- */}
            <Card className="lg:col-span-1 space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-primary mb-3">Financial Inputs</h3>
                    <div className="space-y-4">
                        <Input label="Annual Net Income Goal" value={data.netIncome} onUpdate={handleUpdate('netIncome')} isCurrency />
                        <Input label="Operating Expenses" value={data.operatingExpenses} onUpdate={handleUpdate('operatingExpenses')} isCurrency />
                        <Input label="Cost of Sale" value={data.costOfSale} onUpdate={handleUpdate('costOfSale')} isCurrency />
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-bold text-primary mb-3">Business Assumptions</h3>
                     <div className="space-y-4">
                        <Input label="Average Commission per Unit" value={data.avgCommission} onUpdate={handleUpdate('avgCommission')} isCurrency />
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Business Mix (Listings vs. Buyers)</label>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-semibold">Listings</span>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={data.sellerUnitPercentage} 
                                    onChange={(e) => handleUpdate('sellerUnitPercentage')(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-sm font-semibold">Buyers</span>
                            </div>
                            <div className="flex justify-between items-center text-xs mt-1">
                                <span className="font-bold text-primary">{data.sellerUnitPercentage}%</span>
                                <span className="font-bold text-primary">{calculations.buyerUnitPercentage}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-bold text-primary mb-3">Conversion Rates</h3>
                     <div className="space-y-4">
                        <Input label="Seller Appointment Met Rate" value={data.sellerAppointmentConversionRate} onUpdate={handleUpdate('sellerAppointmentConversionRate')} isPercentage helpText="Appointments met / Appointments set" />
                        <Input label="Seller Sold Rate" value={data.sellerSoldConversionRate} onUpdate={handleUpdate('sellerSoldConversionRate')} isPercentage helpText="Listings sold / Appointments met" />
                        <Input label="Buyer Appointment Met Rate" value={data.buyerAppointmentConversionRate} onUpdate={handleUpdate('buyerAppointmentConversionRate')} isPercentage helpText="Appointments met / Appointments set" />
                        <Input label="Buyer Sold Rate" value={data.buyerSoldConversionRate} onUpdate={handleUpdate('buyerSoldConversionRate')} isPercentage helpText="Deals closed / Appointments met" />
                    </div>
                </div>
            </Card>

            {/* --- Column 2: BREAKDOWN --- */}
            <Card className="lg:col-span-1 space-y-4">
                <h3 className="text-xl font-bold text-primary mb-2">The Calculation Flow</h3>
                
                {/* GCI -> Units */}
                <div className="p-3 bg-background/50 rounded-lg">
                    <BreakdownRow label="Total GCI Required" value={`$${calculations.totalGCI.toLocaleString()}`} />
                    <BreakdownRow label="÷ Avg Commission" value={`$${data.avgCommission.toLocaleString()}`} isSubtle/>
                    <div className="border-t border-border my-1"></div>
                    <BreakdownRow label="Total Units to be Sold" value={calculations.totalUnitsSold.toFixed(2)} />
                </div>

                <ArrowDown className="mx-auto text-text-secondary" />
                
                {/* Units -> Appointments */}
                <div className="p-3 bg-background/50 rounded-lg">
                    <div className="flex justify-between items-center text-sm font-semibold text-primary mb-2">
                        <div className="text-center"><Users size={16} className="mx-auto mb-1"/> Sellers</div>
                        <div className="text-center"><Hash size={16} className="mx-auto mb-1"/> Buyers</div>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">{calculations.sellerUnitsSold.toFixed(2)}</span>
                        <span className="font-bold text-lg">{calculations.buyerUnitsSold.toFixed(2)}</span>
                    </div>
                    <p className="text-center text-xs text-text-secondary">Units Needed</p>
                </div>
                
                 <ArrowDown className="mx-auto text-text-secondary" />

                 <div className="p-3 bg-background/50 rounded-lg">
                    <BreakdownRow label="Seller Appts from Sold" value={calculations.sellerAppointmentsFromSold.toFixed(2)} isSubtle/>
                    <BreakdownRow label="÷ Appt Met Rate" value={`${data.sellerAppointmentConversionRate}%`} isSubtle/>
                    <div className="border-t border-border my-1"></div>
                    <BreakdownRow label="Seller Appointments Needed" value={calculations.sellerAppointmentsNeeded.toFixed(2)} />
                </div>
                
                <ArrowDown className="mx-auto text-text-secondary" />

                <div className="p-3 bg-background/50 rounded-lg">
                    <BreakdownRow label="Buyer Appts from Sold" value={calculations.buyerAppointmentsFromSold.toFixed(2)} isSubtle/>
                    <BreakdownRow label="÷ Appt Met Rate" value={`${data.buyerAppointmentConversionRate}%`} isSubtle/>
                    <div className="border-t border-border my-1"></div>
                    <BreakdownRow label="Buyer Appointments Needed" value={calculations.buyerAppointmentsNeeded.toFixed(2)} />
                </div>
            </Card>

            {/* --- Column 3: SUMMARY --- */}
             <div className="lg:col-span-1 bg-accent-secondary/10 p-6 rounded-2xl flex flex-col items-center justify-center text-center sticky top-6">
                <BarChart size={32} className="text-accent-secondary mb-2"/>
                <h2 className="text-2xl font-black text-text-primary tracking-tight">Your Annual Appointment Goal</h2>
                <p className="text-7xl font-black text-accent-secondary my-4">{Math.ceil(calculations.totalAppointmentsNeeded)}</p>
                <p className="text-text-secondary max-w-xs">This is the total number of seller and buyer appointments you need to meet this year to achieve your income goal.</p>
                
                <div className="mt-8 border-t border-accent-secondary/30 w-full pt-6 space-y-4">
                    <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-text-primary">Appointments per Week</span>
                        <span className="font-bold text-lg text-accent-secondary">{calculations.appointmentsPerWeek.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-text-primary">Appointments per Day</span>
                        <span className="font-bold text-lg text-accent-secondary">{calculations.appointmentsPerDay.toFixed(2)}</span>
                    </div>
                </div>
                    <p className="text-xs text-text-secondary mt-6">* Weekly/daily calculations assume 50 working weeks and 5 working days per week.</p>
            </div>
        </div>
    );
});

export default EconomicModelCalculator;