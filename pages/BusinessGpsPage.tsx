import React, { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import type { DiscoveryGuideData, Goal, GpsPriority, GpsStrategy, ActionPlanItem } from '../types';
import { GoalType } from '../types';
import { Spinner } from '../components/ui/Spinner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, PlusCircle, Save, Compass, DollarSign, ClipboardList, Target } from 'lucide-react';
import { GoalModal } from '../components/goals/AddGoalModal';
import { useGoals } from '../contexts/GoalContext';
import { getFirestoreInstance } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const EconomicModelCalculator = lazy(() => import('../components/gps/EconomicModelCalculator'));

// --- DATA STRUCTURES & INITIAL STATES ---

const initialGpsData: DiscoveryGuideData = {
    gpsGoal: { focusArea: '', targetGoal: '' },
    gpsPriorities: [
        { id: 'P1', what: '', how: '' },
        { id: 'P2', what: '', how: '' },
        { id: 'P3', what: '', how: '' },
    ],
    gpsStrategies: [
        { id: 'S1', priority: 'P1', strategy1: '', strategy2: '', strategy3: '' },
        { id: 'S2', priority: 'P2', strategy1: '', strategy2: '', strategy3: '' },
        { id: 'S3', priority: 'P3', strategy1: '', strategy2: '', strategy3: '' },
    ],
    actionPlan: [
        { id: 'A1', timeframe: '1 YEAR', focus: '', actions: '' },
        { id: 'A2', timeframe: '1 MONTH', focus: '', actions: '' },
        { id: 'A3', timeframe: '4 WEEKS', focus: '', actions: '' },
    ],
    discoveryAnswers: {},
};

export interface EconomicModelData {
    netIncome: number;
    operatingExpenses: number;
    costOfSale: number;
    avgCommission: number;
    sellerUnitPercentage: number;
    sellerSoldConversionRate: number;
    sellerAppointmentConversionRate: number;
    buyerSoldConversionRate: number;
    buyerAppointmentConversionRate: number;
}

const initialEconomicModelData: EconomicModelData = {
    netIncome: 100000,
    operatingExpenses: 30000,
    costOfSale: 20000,
    avgCommission: 7500,
    sellerUnitPercentage: 50,
    sellerSoldConversionRate: 75,
    sellerAppointmentConversionRate: 50,
    buyerSoldConversionRate: 25,
    buyerAppointmentConversionRate: 50,
};

const discoveryQuestions = {
    "Vision, Purpose, and Energy (The Fuel)": [
        "The \"Why\" Beyond the Dollar: If you hit your annual income goal, what is the first tangible thing you will spend or invest that money in?",
        "The Personal Cost/Reward: What is the one non-negotiable personal activity (fitness, family dinner, hobby) that you must protect, and how will your business plan ensure it remains protected?",
        "The Agent You Admire: Name one agent whose business model you admire. What is the one, high-leverage activity they do that you are not currently doing?",
        "Energy Management: What activity in your current workweek drains 80% of your energy, and how can you automate, delegate, or eliminate it in the next 90 days?",
    ],
    "Strategies and Value Proposition (The Unique Route)": [
        "The Conversation Starter: If a potential client asked you, \"Why you? There are dozens of agents,\" what is the one, specific, proven result you would highlight immediately? (Beyond \"I work hard.\")",
        "Sphere Deepening: Looking at your current database, who are the 20 most important people who could refer you, and what is your specific, personalized, non-sales-related, plan to connect with them this month?",
        "Skill Isolation: What is the one skill (listing presentation, objection handling, financial analysis) that, if mastered this year, would directly double your current conversion rate?",
        "Digital Footprint: When a prospect Googles your name, what are the top three pieces of information, content, or reviews they find? Is this content actively supporting your business goals?",
    ],
    "Leverage and Systemization (The Scaling Mechanism)": [
        "The Freedom Point: If you could magically eliminate one daily task tomorrow, which one would it be, and what system would you put in place to handle it?",
        "The Next Hire: If your budget allowed for one full-time hire today, what single role (Admin, Marketing, Sales Partner) would give you the highest Return on Investment (ROI) and why?",
        "Tracking Clarity: Beyond GCI, what are the two most important leading indicator metrics (appointments set, calls made, leads generated) you should track daily, and where will you track them?",
    ]
};

// --- HELPER & UI COMPONENTS ---

const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-sm";
const textareaClasses = `${inputClasses} min-h-[80px]`;
const labelClasses = "block text-sm font-semibold text-text-secondary mb-1";
const sectionTitleClasses = "text-2xl font-bold mb-4";


const PdfReport: React.FC<{ data: DiscoveryGuideData; userName: string; }> = React.memo(({ data, userName }) => (
    <div id="pdf-export-content" className="p-10 bg-white text-gray-800 w-[827px] font-sans">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[var(--color-accent)]">Business GPS</h1>
            <p className="text-xl text-gray-600 mt-2">Strategic Plan For: <strong>{userName}</strong></p>
        </div>

        <div className="mb-8">
            <h2 className="text-2xl font-bold border-b-2 border-[var(--color-accent)] pb-2 mb-4">The Destination: Your Goal</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
                <p><strong className="text-gray-700">Focus Area:</strong> {data.gpsGoal.focusArea || 'N/A'}</p>
                <p className="mt-2"><strong className="text-gray-700">Target Goal:</strong> {data.gpsGoal.targetGoal || 'N/A'}</p>
            </div>
        </div>
        
        <div className="mb-8">
            <h2 className="text-2xl font-bold border-b-2 border-[var(--color-accent)] pb-2 mb-4">The Top 3 Stops: Priorities</h2>
            {data.gpsPriorities.map((p, i) => (
                <div key={p.id} className={`bg-gray-100 p-4 rounded-lg ${i < data.gpsPriorities.length - 1 ? 'mb-3' : ''}`}>
                    <h3 className="text-lg font-bold text-[var(--color-accent)]">{p.id}</h3>
                    <p className="mt-1"><strong className="text-gray-700">What must be completed?</strong><br/>{p.what || 'N/A'}</p>
                    <p className="mt-2"><strong className="text-gray-700">How will it be measured?</strong><br/>{p.how || 'N/A'}</p>
                </div>
            ))}
        </div>

        <div className="mb-8">
            <h2 className="text-2xl font-bold border-b-2 border-[var(--color-accent)] pb-2 mb-4">The Directions: Strategies</h2>
             {data.gpsStrategies.map((s, i) => (
                <div key={s.id} className={`bg-gray-100 p-4 rounded-lg ${i < data.gpsStrategies.length - 1 ? 'mb-3' : ''}`}>
                    <h3 className="text-lg font-bold text-[var(--color-accent)]">{s.priority}</h3>
                    <p className="mt-1"><strong className="text-gray-700">Strategy 1:</strong><br/>{s.strategy1 || 'N/A'}</p>
                    <p className="mt-2"><strong className="text-gray-700">Strategy 2:</strong><br/>{s.strategy2 || 'N/A'}</p>
                    <p className="mt-2"><strong className="text-gray-700">Strategy 3:</strong><br/>{s.strategy3 || 'N/A'}</p>
                </div>
            ))}
        </div>
    </div>
));

const GpsForm: React.FC<{
    data: DiscoveryGuideData;
    onGoalChange: (field: 'focusArea' | 'targetGoal', value: string) => void;
    onPriorityChange: (index: number, field: 'what' | 'how', value: string) => void;
    onStrategyChange: (index: number, field: keyof Omit<GpsStrategy, 'id' | 'priority'>, value: string) => void;
    onActionPlanChange: (index: number, field: 'focus' | 'actions', value: string) => void;
    onDiscoveryAnswerChange: (question: string, answer: string) => void;
    onCreateGoal: (priority: GpsPriority) => void;
}> = ({ data, onGoalChange, onPriorityChange, onStrategyChange, onActionPlanChange, onDiscoveryAnswerChange, onCreateGoal }) => {
    return (
        <div className="space-y-6">
            <Card>
                <h2 className={sectionTitleClasses}>The Destination: Your Goal</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClasses}>Focus Area</label><input type="text" value={data.gpsGoal.focusArea} onChange={e => onGoalChange('focusArea', e.target.value)} className={inputClasses} placeholder="e.g., Lead Generation"/></div>
                    <div><label className={labelClasses}>Target Goal</label><input type="text" value={data.gpsGoal.targetGoal} onChange={e => onGoalChange('targetGoal', e.target.value)} className={inputClasses} placeholder="e.g., Generate 100 new leads"/></div>
                </div>
            </Card>
             <Card>
                <h2 className={sectionTitleClasses}>The Top 3 Stops: Priorities</h2>
                <div className="space-y-4">
                    {data.gpsPriorities.map((p, i) => (
                        <div key={p.id} className="p-4 bg-background/50 rounded-lg">
                            <h3 className="font-bold text-lg mb-2 text-primary">{p.id}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className={labelClasses}>What must be completed?</label><textarea value={p.what} onChange={e => onPriorityChange(i, 'what', e.target.value)} className={textareaClasses}/></div>
                                <div><label className={labelClasses}>How will it be measured?</label><textarea value={p.how} onChange={e => onPriorityChange(i, 'how', e.target.value)} className={textareaClasses}/></div>
                            </div>
                             <button onClick={() => onCreateGoal(p)} disabled={!p.what || !p.how} className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary disabled:text-text-secondary disabled:cursor-not-allowed hover:underline"><PlusCircle size={16}/> Create Goal from this Priority</button>
                        </div>
                    ))}
                </div>
            </Card>
             <Card>
                <h2 className={sectionTitleClasses}>The Directions: Strategies</h2>
                <div className="space-y-4">
                    {data.gpsStrategies.map((s, i) => (
                        <div key={s.id} className="p-4 bg-background/50 rounded-lg">
                            <h3 className="font-bold text-lg mb-2 text-primary">Strategies for Priority {s.priority}</h3>
                            <div className="space-y-2">
                                <div><label className={labelClasses}>Strategy 1</label><input type="text" value={s.strategy1} onChange={e => onStrategyChange(i, 'strategy1', e.target.value)} className={inputClasses}/></div>
                                <div><label className={labelClasses}>Strategy 2</label><input type="text" value={s.strategy2} onChange={e => onStrategyChange(i, 'strategy2', e.target.value)} className={inputClasses}/></div>
                                <div><label className={labelClasses}>Strategy 3</label><input type="text" value={s.strategy3} onChange={e => onStrategyChange(i, 'strategy3', e.target.value)} className={inputClasses}/></div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
             <Card>
                <h2 className={sectionTitleClasses}>4-1-1 Action Plan</h2>
                <div className="space-y-4">
                    {data.actionPlan.map((a, i) => (
                        <div key={a.id} className="p-4 bg-background/50 rounded-lg">
                            <h3 className="font-bold text-lg mb-2">{a.timeframe}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className={labelClasses}>Focus</label><textarea value={a.focus} onChange={e => onActionPlanChange(i, 'focus', e.target.value)} className={textareaClasses}/></div>
                                <div><label className={labelClasses}>Actions</label><textarea value={a.actions} onChange={e => onActionPlanChange(i, 'actions', e.target.value)} className={textareaClasses}/></div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <Card>
                <h2 className={sectionTitleClasses}>Discovery Guide</h2>
                <div className="space-y-6">
                    {Object.entries(discoveryQuestions).map(([category, questions]) => (
                        <div key={category}>
                            <h3 className="text-xl font-bold mb-3">{category}</h3>
                            <div className="space-y-4">
                                {questions.map(q => (
                                    <div key={q}>
                                        <label className={labelClasses}>{q}</label>
                                        <textarea value={data.discoveryAnswers[q] || ''} onChange={e => onDiscoveryAnswerChange(q, e.target.value)} className={textareaClasses}/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};


const BusinessGpsPage: React.FC = () => {
    const { user, userData } = useAuth();
    const { addGoal } = useGoals();
    const [activeTab, setActiveTab] = useState('economic');
    const [gpsData, setGpsData] = useState<DiscoveryGuideData>(initialGpsData);
    const [economicModelData, setEconomicModelData] = useState<EconomicModelData>(initialEconomicModelData);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isPdfVisible, setIsPdfVisible] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [goalModalInitialData, setGoalModalInitialData] = useState<Partial<Goal>>({});
    const [exportingPdf, setExportingPdf] = useState(false);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const docRef = doc(getFirestoreInstance(), 'businessGps', user.uid);
        getDoc(docRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setGpsData(data.gpsData || initialGpsData);
                setEconomicModelData(data.economicModelData || initialEconomicModelData);
            }
            setLoading(false);
        });
    }, [user]);

    const handleSave = useCallback(async () => {
        if (!user || !userData) return;
        setSaving(true);
        const docRef = doc(getFirestoreInstance(), 'businessGps', user.uid);
        // Add scoping fields so managers can read this doc via rules
        await setDoc(docRef, {
            userId: user.uid,
            gpsData,
            economicModelData,
            teamId: userData.teamId || null,
            marketCenterId: userData.marketCenterId || null,
            coachId: userData.coachId || null,
        }, { merge: true });
        setSaving(false);
    }, [user, userData, gpsData, economicModelData]);

    // --- GPS Form Handlers ---
    const handleGpsGoalChange = useCallback((field: 'focusArea' | 'targetGoal', value: string) => { setGpsData(prev => ({ ...prev, gpsGoal: { ...prev.gpsGoal, [field]: value } })); }, []);
    const handleGpsPriorityChange = useCallback((index: number, field: 'what' | 'how', value: string) => { setGpsData(prev => ({ ...prev, gpsPriorities: prev.gpsPriorities.map((p, i) => i === index ? { ...p, [field]: value } : p) })); }, []);
    const handleGpsStrategyChange = useCallback((index: number, field: keyof Omit<GpsStrategy, 'id' | 'priority'>, value: string) => { setGpsData(prev => ({ ...prev, gpsStrategies: prev.gpsStrategies.map((s, i) => i === index ? { ...s, [field]: value } : s) })); }, []);
    const handleActionPlanChange = useCallback((index: number, field: 'focus' | 'actions', value: string) => { setGpsData(prev => ({ ...prev, actionPlan: prev.actionPlan.map((a, i) => i === index ? { ...a, [field]: value } : a) })); }, []);
    const handleDiscoveryAnswerChange = useCallback((question: string, answer: string) => { setGpsData(prev => ({ ...prev, discoveryAnswers: { ...prev.discoveryAnswers, [question]: answer } })); }, []);
    const handleCreateGoalFromPriority = useCallback((priority: GpsPriority) => {
        setGoalModalInitialData({ title: priority.what, metric: priority.how, type: GoalType.Quarterly });
        setIsGoalModalOpen(true);
    }, []);

    const calculations = useMemo(() => {
        const { netIncome, operatingExpenses, costOfSale, avgCommission, sellerUnitPercentage, sellerSoldConversionRate, sellerAppointmentConversionRate, buyerSoldConversionRate, buyerAppointmentConversionRate } = economicModelData;
        const totalGCI = netIncome + operatingExpenses + costOfSale;
        const totalUnitsSold = avgCommission > 0 ? totalGCI / avgCommission : 0;
        const buyerUnitPercentage = 100 - sellerUnitPercentage;
        const sellerUnitsSold = totalUnitsSold * (sellerUnitPercentage / 100);
        const sellerAppointmentsFromSold = (sellerSoldConversionRate > 0) ? sellerUnitsSold / (sellerSoldConversionRate / 100) : 0;
        const sellerAppointmentsNeeded = (sellerAppointmentConversionRate > 0) ? sellerAppointmentsFromSold / (sellerAppointmentConversionRate / 100) : 0;
        const buyerUnitsSold = totalUnitsSold * (buyerUnitPercentage / 100);
        const buyerAppointmentsFromSold = (buyerSoldConversionRate > 0) ? buyerUnitsSold / (buyerSoldConversionRate / 100) : 0;
        const buyerAppointmentsNeeded = (buyerAppointmentConversionRate > 0) ? buyerAppointmentsFromSold / (buyerAppointmentConversionRate / 100) : 0;
        const totalAppointmentsNeeded = sellerAppointmentsNeeded + buyerAppointmentsNeeded;
        const appointmentsPerWeek = totalAppointmentsNeeded > 0 ? totalAppointmentsNeeded / 50 : 0;
        const appointmentsPerDay = appointmentsPerWeek > 0 ? appointmentsPerWeek / 5 : 0;

        return { totalGCI, totalUnitsSold, buyerUnitPercentage, sellerUnitsSold, sellerAppointmentsNeeded, sellerAppointmentsFromSold, buyerUnitsSold, buyerAppointmentsNeeded, buyerAppointmentsFromSold, totalAppointmentsNeeded, appointmentsPerWeek, appointmentsPerDay };
    }, [economicModelData]);

    const handleSubmitGoal = async (goalData: Omit<Goal, 'id' | 'currentValue' | 'userId' | 'teamId' | 'marketCenterId' | 'createdAt' | 'userName'>) => {
        await addGoal(goalData);
    };

    const handleExport = async () => {
        setExportingPdf(true);
        setIsPdfVisible(true);
        await new Promise(resolve => setTimeout(resolve, 100)); // allow state to update and component to render

        const reportElement = document.getElementById('pdf-export-content');
        if (reportElement) {
            html2canvas(reportElement, { scale: 2 }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'px', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const newHeight = canvas.height * pdfWidth / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, newHeight);
                pdf.save(`BusinessGPS_${userData?.name}.pdf`);
                setIsPdfVisible(false);
                setExportingPdf(false);
            });
        }
    };
    
    const TabButton: React.FC<{ tabId: string, children: React.ReactNode }> = ({ tabId, children }) => (
        <button onClick={() => setActiveTab(tabId)} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === tabId ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:border-border hover:text-text-primary'}`}>{children}</button>
    );

    if (loading) return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>;

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Business GPS</h1>
                        <p className="text-lg text-text-secondary mt-1">Map your path to success with these strategic planning tools.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={handleExport} disabled={exportingPdf} className="flex items-center justify-center bg-accent text-on-accent font-semibold py-2 px-4 rounded-lg"><Download className="mr-2" size={16}/> {exportingPdf ? 'Exporting...' : 'Export PDF'}</button>
                        <button onClick={handleSave} disabled={saving} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg min-w-[120px]"><Save className="mr-2" size={16}/> {saving ? <Spinner/> : 'Save'}</button>
                    </div>
                </div>
            </header>

            <div className="px-4 sm:px-6 lg:px-8"><div className="flex border-b border-border -mx-4 px-4 overflow-x-auto"><TabButton tabId="economic"><DollarSign size={16}/> Economic Model</TabButton><TabButton tabId="gps"><Compass size={16}/> GPS</TabButton></div></div>

            <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'economic' && <Suspense fallback={<Spinner/>}><EconomicModelCalculator data={economicModelData} onDataChange={setEconomicModelData} calculations={calculations} /></Suspense>}
                {activeTab === 'gps' && <GpsForm data={gpsData} onGoalChange={handleGpsGoalChange} onPriorityChange={handleGpsPriorityChange} onStrategyChange={handleGpsStrategyChange} onActionPlanChange={handleActionPlanChange} onDiscoveryAnswerChange={handleDiscoveryAnswerChange} onCreateGoal={handleCreateGoalFromPriority} />}
            </main>
            
            <GoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} onSubmit={handleSubmitGoal} title="Create New Goal from GPS" submitButtonText="Create Goal" initialGoalData={goalModalInitialData} />
            {isPdfVisible && <div className="absolute -left-[9999px] -top-[9999px]"><PdfReport data={gpsData} userName={userData?.name || 'Agent'} /></div>}
        </div>
    );
};

export default BusinessGpsPage;