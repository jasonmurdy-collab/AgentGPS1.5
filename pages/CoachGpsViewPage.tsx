import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { TeamMember, DiscoveryGuideData } from '../types';
import type { EconomicModelData } from './BusinessGpsPage';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Compass, BarChart, Users, Hash, ArrowDown, AlertTriangle } from 'lucide-react';
import { getFirestoreInstance } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';


const GpsDisplay: React.FC<{ data: DiscoveryGuideData }> = ({ data }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-xl font-semibold text-primary mb-2">Goal (The Destination)</h3>
            <p><strong>Focus Area:</strong> {data?.gpsGoal?.focusArea || 'Not set'}</p>
            <p><strong>Target Goal:</strong> {data?.gpsGoal?.targetGoal || 'Not set'}</p>
        </div>
        <div>
            <h3 className="text-xl font-semibold text-primary mb-2">Priorities (The Top 3 Stops)</h3>
            {data?.gpsPriorities?.map((p) => (
                <div key={p.id} className="mb-2 pl-4 border-l-2 border-primary/30">
                    <p><strong>{p.id}:</strong> {p.what || 'Not set'}</p>
                    <p className="text-sm text-text-secondary"><strong>Measured by:</strong> {p.how || 'Not set'}</p>
                </div>
            ))}
        </div>
         <div>
            <h3 className="text-xl font-semibold text-primary mb-2">Strategies (The Directions)</h3>
            {data?.gpsStrategies?.map((s) => (
                <div key={s.id} className="mb-3">
                    <strong className="text-text-secondary">{s.priority} Strategies</strong>
                    <ul className="list-disc list-inside ml-4 text-text-secondary">
                       <li>{s.strategy1 || 'Not set'}</li>
                       <li>{s.strategy2 || 'Not set'}</li>
                       <li>{s.strategy3 || 'Not set'}</li>
                    </ul>
                </div>
            ))}
        </div>
    </div>
);

const ReadOnlyStat: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="font-bold text-text-primary text-md">{value}</p>
    </div>
);

const ReadOnlyEconomicModel: React.FC<{ data: EconomicModelData; calculations: any; }> = ({ data, calculations }) => {
    return (
        <Card>
            <h3 className="text-2xl font-bold mb-4 text-primary">Economic Model Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {/* Inputs Column */}
                <div className="space-y-4">
                    <h4 className="font-bold border-b border-border pb-1 mb-2">Financial Inputs</h4>
                    <ReadOnlyStat label="Annual Net Income Goal" value={`$${data.netIncome.toLocaleString()}`} />
                    <ReadOnlyStat label="Operating Expenses" value={`$${data.operatingExpenses.toLocaleString()}`} />
                    <ReadOnlyStat label="Cost of Sale" value={`$${data.costOfSale.toLocaleString()}`} />
                </div>
                {/* Assumptions Column */}
                <div className="space-y-4">
                     <h4 className="font-bold border-b border-border pb-1 mb-2">Business Assumptions</h4>
                     <ReadOnlyStat label="Average Commission" value={`$${data.avgCommission.toLocaleString()}`} />
                     <ReadOnlyStat label="Business Mix" value={`${data.sellerUnitPercentage}% Listings / ${calculations.buyerUnitPercentage}% Buyers`} />
                     <h4 className="font-bold border-b border-border pb-1 mb-2 mt-4">Conversion Rates</h4>
                     <ReadOnlyStat label="Seller Appointment Met Rate" value={`${data.sellerAppointmentConversionRate}%`} />
                     <ReadOnlyStat label="Seller Sold Rate" value={`${data.sellerSoldConversionRate}%`} />
                     <ReadOnlyStat label="Buyer Appointment Met Rate" value={`${data.buyerAppointmentConversionRate}%`} />
                     <ReadOnlyStat label="Buyer Sold Rate" value={`${data.buyerSoldConversionRate}%`} />
                </div>
                {/* Results Column */}
                <div className="bg-accent-secondary/10 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                    <BarChart size={24} className="text-accent-secondary mb-2"/>
                    <h4 className="text-lg font-bold">Annual Appointment Goal</h4>
                    <p className="text-5xl font-black text-accent-secondary my-2">{Math.ceil(calculations.totalAppointmentsNeeded)}</p>
                    <p className="text-sm"><strong>{calculations.appointmentsPerWeek.toFixed(2)}</strong> per week / <strong>{calculations.appointmentsPerDay.toFixed(2)}</strong> per day</p>
                </div>
            </div>
        </Card>
    );
};


const CoachGpsViewPage: React.FC = () => {
    const { managedAgents: agents, loadingAgents } = useAuth();
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [agentGpsData, setAgentGpsData] = useState<DiscoveryGuideData | null>(null);
    const [agentEconomicData, setAgentEconomicData] = useState<EconomicModelData | null>(null);
    const [loadingGps, setLoadingGps] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGpsData = async () => {
            if (selectedAgentId) {
                setLoadingGps(true);
                setError(null);
                setAgentGpsData(null);
                setAgentEconomicData(null);
                try {
                    const docRef = doc(getFirestoreInstance(), 'businessGps', selectedAgentId);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const fetchedData = docSnap.data() as any;
                        // Handle strategic GPS data (new and old formats)
                        if (fetchedData.gpsData) {
                            setAgentGpsData(fetchedData.gpsData);
                        } else if (fetchedData.gpsGoal) { 
                            setAgentGpsData(fetchedData as DiscoveryGuideData);
                        }
                        // Handle economic model data
                        if (fetchedData.economicModelData) {
                            setAgentEconomicData(fetchedData.economicModelData);
                        }
                    }
                } catch (error: any) {
                    console.error("Failed to fetch GPS data:", error);
                    if (error.code === 'permission-denied') {
                        // This is an expected error for non-existent documents a coach tries to access.
                        // We handle it gracefully by simply showing that no data exists.
                        setAgentGpsData(null);
                        setAgentEconomicData(null);
                    } else {
                        setError("An unexpected error occurred while fetching GPS data.");
                    }
                } finally {
                    setLoadingGps(false);
                }
            } else {
                setAgentGpsData(null);
                setAgentEconomicData(null);
            }
        };

        fetchGpsData();
    }, [selectedAgentId]);
    
     const calculations = useMemo(() => {
        if (!agentEconomicData) return null;

        const {
            netIncome, operatingExpenses, costOfSale, avgCommission,
            sellerUnitPercentage, sellerSoldConversionRate, sellerAppointmentConversionRate,
            buyerSoldConversionRate, buyerAppointmentConversionRate
        } = agentEconomicData;

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

        return {
            totalGCI, totalUnitsSold, buyerUnitPercentage,
            sellerUnitsSold, sellerAppointmentsNeeded, sellerAppointmentsFromSold,
            buyerUnitsSold, buyerAppointmentsNeeded, buyerAppointmentsFromSold,
            totalAppointmentsNeeded, appointmentsPerWeek, appointmentsPerDay
        };
    }, [agentEconomicData]);


    const selectedAgentName = agents.find(a => a.id === selectedAgentId)?.name || '';

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Agent GPS Viewer</h1>
                <p className="text-lg text-text-secondary mt-1">Review the strategic business plans of your agents.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:p-8 pb-8 space-y-6">
                <Card>
                    <div className="mb-4">
                        <label htmlFor="agent-select" className="block text-sm font-medium text-text-secondary mb-1">Select an Agent</label>
                        <select
                            id="agent-select"
                            value={selectedAgentId}
                            onChange={e => setSelectedAgentId(e.target.value)}
                            className="w-full max-w-sm bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={loadingAgents}
                        >
                            <option value="">{loadingAgents ? 'Loading agents...' : '-- Select an Agent --'}</option>
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>{agent.name}</option>
                            ))}
                        </select>
                    </div>
                </Card>

                    {loadingGps && (
                        <div className="flex justify-center items-center py-10"><Spinner /></div>
                    )}
                    
                    {!loadingGps && selectedAgentId && (
                        error ? (
                            <Card className="bg-destructive-surface text-destructive border-destructive text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <AlertTriangle className="w-12 h-12 mb-4" />
                                    <p className="font-bold text-lg">Error Fetching GPS Data</p>
                                    <p className="mt-2 max-w-md">{error}</p>
                                </div>
                            </Card>
                        ) : (
                            <>
                                <Card>
                                     <h2 className="text-2xl font-bold mb-4 text-text-primary">Strategic GPS for <span className="text-primary">{selectedAgentName}</span></h2>
                                    {agentGpsData ? (
                                        <GpsDisplay data={agentGpsData} />
                                    ) : (
                                        <p className="text-text-secondary text-center py-8">This agent has not completed their Strategic GPS yet.</p>
                                    )}
                                </Card>
                                {agentEconomicData && calculations ? (
                                    <ReadOnlyEconomicModel data={agentEconomicData} calculations={calculations} />
                                ) : (
                                     <Card>
                                        <h3 className="text-2xl font-bold mb-4 text-primary">Economic Model Summary</h3>
                                        <p className="text-text-secondary text-center py-8">Economic Model data not available for this agent.</p>
                                     </Card>
                                )}
                            </>
                        )
                    )}

                    {!selectedAgentId && agents.length > 0 && (
                        <Card className="text-center py-10">
                            <Compass size={48} className="mx-auto text-text-secondary" />
                            <p className="mt-4 text-text-secondary">Please select an agent to view their Business GPS.</p>
                        </Card>
                    )}

                    {!loadingAgents && agents.length === 0 && (
                         <Card className="text-center py-10">
                            <p className="text-text-secondary">No agents have joined your program yet.</p>
                        </Card>
                    )}
            </div>
        </div>
    );
};

export default CoachGpsViewPage;