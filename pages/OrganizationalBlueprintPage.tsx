

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { getFirestoreInstance } from '../firebaseConfig'; // Fix: Import getFirestoreInstance
import { doc, onSnapshot, setDoc, getDocs } from 'firebase/firestore';
import { collection, query, where } from 'firebase/firestore';
import type { OrgBlueprint, OrgChartNode, Transaction } from '../types';
import { Network, DollarSign, BarChart2, Sparkles, ClipboardSignature, FileCheck, Search, Home, Briefcase, Trash2, ShieldCheck, PhoneCall, MapPin, Settings2, Globe, ChevronDown } from 'lucide-react';

const ROLE_CATEGORIES = {
  Administrative: [
    { name: 'Administrative Assistant', icon: ClipboardSignature, description: 'Handles administrative tasks to free you up for lead generation and client appointments.' },
    { name: 'Transaction Coordinator', icon: FileCheck, description: 'Manages deals from contract to close, ensuring compliance and smooth closings.' },
    { name: 'Executive Assistant', icon: ShieldCheck, description: 'Provides high-level administrative, personal, and strategic support directly to the team lead.' },
  ],
  Sales: [
    { name: 'Buyer\'s Agent', icon: Search, description: 'Works with buyer leads, shows properties, and writes offers, leveraging your lead generation.' },
    { name: 'Listing Specialist', icon: Home, description: 'Focuses exclusively on seller clients, from prospecting to listing contract.' },
    { name: 'Inside Sales Agent (ISA)', icon: PhoneCall, description: 'Focuses on lead generation, qualification, and setting appointments for sales agents.' },
    { name: 'Outside Sales Agent (OSA)', icon: MapPin, description: 'A field-heavy role focused on showing properties and client-facing activities.' },
  ],
  Leadership: [
    { name: 'Director of Operations', icon: Settings2, description: 'Manages all systems for sellers, buyers, marketing, and administration. Leads the administrative team.' },
    { name: 'Expansion Director', icon: Globe, description: 'Leads the launch and growth of the business in new markets or locations.' },
    { name: 'CEO / General Manager', icon: Briefcase, description: 'Manages the day-to-day operations of the team, allowing you to focus on vision and growth.' },
  ]
};

const ALL_ROLES = Object.values(ROLE_CATEGORIES).flat();

const KPI_TRANSACTION_THRESHOLD = 6; // 6 deals in the last 3 months

const GrowthRecommendations: React.FC<{
  blueprint: OrgBlueprint;
  kpis: { gci: number; transactions: number };
  recentTransactions: number;
}> = ({ blueprint, kpis, recentTransactions }) => {
  const recommendations: { title: string; recommendation: string; potential: string }[] = [];
  const nodes = blueprint.nodes;
  const activeNodes = nodes.filter(n => n.status === 'active');
  const hasActiveAdmin = activeNodes.some(n => ROLE_CATEGORIES.Administrative.some(r => r.name === n.role));
  const activeSalesAgents = activeNodes.filter(n => ROLE_CATEGORIES.Sales.some(r => r.name === n.role)).length;

  // Recommendation 1: First Hire (Admin)
  if (activeNodes.length === 0 && recentTransactions >= KPI_TRANSACTION_THRESHOLD) {
    recommendations.push({
      title: "It's Time for Your First Hire",
      recommendation: "Hire an Administrative Assistant or Transaction Coordinator.",
      potential: "This is the most crucial step to leverage your time. Offloading administrative tasks will free you up to focus on what you do best: lead generation and appointments. This hire can easily give you back 10-20 hours per week, allowing you to double your production without working more hours."
    });
  }

  // Recommendation 2: First Sales Leverage (Buyer's Agent or ISA)
  if (hasActiveAdmin && activeSalesAgents === 0 && kpis.transactions > 24) {
    recommendations.push({
      title: "You Have Too Many Leads to Handle Alone",
      recommendation: "Hire a Buyer's Agent or an Inside Sales Agent (ISA).",
      potential: "With your administrative side handled, the next bottleneck is your own time with clients. A Buyer's Agent can service buyer leads you're too busy for. An ISA can qualify leads and set appointments, massively increasing your leverage and ensuring no lead is wasted."
    });
  }

  // Recommendation 3: Add more sales agents
  if (hasActiveAdmin && activeSalesAgents > 0 && (recentTransactions / (activeSalesAgents + 1)) >= 5) { // Assuming team lead is also a producer
    recommendations.push({
        title: "Time to Grow Your Sales Team",
        recommendation: "Hire another Buyer's Agent or a Listing Specialist.",
        potential: "Your lead flow and transaction volume are strong enough to support another sales agent. Adding another producer will prevent lead leakage, provide better client service, and significantly increase your team's total GCI without overwhelming your current agents."
    });
  }

  // Recommendation 4: Leadership Leverage (Director of Operations)
  if (hasActiveAdmin && activeSalesAgents >= 3 && kpis.transactions > 75) {
    recommendations.push({
      title: "Your Team Needs a Leader",
      recommendation: "Hire a Director of Operations.",
      potential: "At this stage, you are managing multiple people and complex systems. A DOO will take over the day-to-day management of the team and operations, allowing you to transition from being a manager to a true business owner, focusing on vision, growth, and high-level strategy."
    });
  }
  
  // Recommendation 5: Expansion
  if (activeNodes.some(n => n.role === 'Director of Operations') && kpis.gci > 1000000) {
     recommendations.push({
      title: "Ready for the Next Market?",
      recommendation: "Consider hiring an Expansion Director.",
      potential: "Your primary location is running smoothly under a DOO. It's time to replicate your success. An Expansion Director will be responsible for launching and managing your model in a new geographic market, leading to exponential growth."
    });
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="bg-accent/10 border-accent/20 mb-6 animate-fade-in">
       {recommendations.map((rec, index) => (
         <div key={index} className={`flex items-start gap-4 ${index > 0 ? 'mt-4 pt-4 border-t border-accent/20' : ''}`}>
          <div className="p-2 bg-accent/20 rounded-full mt-1 flex-shrink-0">
            <Sparkles className="text-accent" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-accent">{rec.title}</h3>
            <p className="font-semibold mt-2">Next Step: <span className="font-normal">{rec.recommendation}</span></p>
            <p className="font-semibold mt-1">The Potential: <span className="font-normal text-sm">{rec.potential}</span></p>
          </div>
        </div>
       ))}
    </Card>
  );
};

const getGrowthStage = (nodes: OrgChartNode[]) => {
    const activeNodes = nodes.filter(n => n.status === 'active');
    const adminCount = activeNodes.filter(n => ROLE_CATEGORIES.Administrative.some(r => r.name === n.role)).length;
    const salesCount = activeNodes.filter(n => ROLE_CATEGORIES.Sales.some(r => r.name === n.role)).length;
    const leadershipCount = activeNodes.filter(n => ROLE_CATEGORIES.Leadership.some(r => r.name === n.role)).length;

    if (leadershipCount >= 2 && salesCount >= 5) {
        return { stage: 5, name: 'Expansion Enterprise', description: 'Running a fully leveraged business with leadership in place, focused on market expansion.' };
    }
    if (leadershipCount >= 1 && salesCount >= 3) {
        return { stage: 4, name: 'The 7th Level', description: 'You are becoming the CEO. Your team is managed by leadership, freeing you to focus on high-level strategy.' };
    }
    if (adminCount > 0 && salesCount >= 1) {
        return { stage: 3, name: 'The Small Team', description: 'Leveraging both administrative and sales talent to multiply your efforts.' };
    }
    if (adminCount > 0) {
        return { stage: 2, name: 'The Assistant', description: 'You\'ve hired administrative support to handle non-income producing tasks.' };
    }
    return { stage: 1, name: 'Solopreneur', description: 'You are handling all aspects of the business.' };
};

const OrganizationalBlueprintPage: React.FC = () => {
    const { user, userData } = useAuth();
    const [blueprint, setBlueprint] = useState<OrgBlueprint | null>(null);
    const [kpis, setKpis] = useState({ gci: 0, transactions: 0 });
    const [recentTransactions, setRecentTransactions] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ Administrative: true, Sales: false, Leadership: false });

    useEffect(() => {
        if (!user || !userData) return;
        setLoading(true);
        const blueprintDocRef = doc(getFirestoreInstance(), 'orgBlueprints', user.uid); // Fix: Use getFirestoreInstance()
        const unsubscribe = onSnapshot(blueprintDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setBlueprint(docSnap.data() as OrgBlueprint);
            } else {
                setBlueprint({ userId: user.uid, nodes: [], teamId: userData.teamId, marketCenterId: userData.marketCenterId });
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching organizational blueprint:", error);
            setBlueprint({ userId: user.uid, nodes: [], teamId: userData.teamId, marketCenterId: userData.marketCenterId });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user, userData]);

    const fetchKpis = useCallback(async () => {
        if (!user) return;
        try {
            const q = query(collection(getFirestoreInstance(), 'transactions'), where('userId', '==', user.uid)); // Fix: Use getFirestoreInstance()
            const snapshot = await getDocs(q);
            let totalGci = 0;
            let recentCount = 0;
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            snapshot.forEach(doc => {
                const t = doc.data() as Transaction;
                const acceptanceDate = t.acceptanceDate ? new Date(t.acceptanceDate) : new Date(0);
                totalGci += t.salePrice * (t.commissionRate / 100);
                if (acceptanceDate >= threeMonthsAgo) {
                    recentCount++;
                }
            });
            setKpis({ gci: totalGci, transactions: snapshot.size });
            setRecentTransactions(recentCount);
        } catch (error) {
            console.error("Error fetching transactions for KPIs:", error);
            setKpis({ gci: 0, transactions: 0 });
            setRecentTransactions(0);
        }
    }, [user]);
    
    useEffect(() => {
        fetchKpis();
    }, [fetchKpis]);

    const saveBlueprint = useCallback(async (newBlueprint: OrgBlueprint) => {
        if (!user || !userData) return;
        const blueprintDocRef = doc(getFirestoreInstance(), 'orgBlueprints', user.uid); // Fix: Use getFirestoreInstance()
        const dataToSave = {
            ...newBlueprint,
            userId: user.uid,
            teamId: userData.teamId || null,
            marketCenterId: userData.marketCenterId || null,
        };
        await setDoc(blueprintDocRef, dataToSave);
    }, [user, userData]);
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, roleName: string) => {
        e.dataTransfer.setData("text/plain", roleName);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (!blueprint) return;

        const roleName = e.dataTransfer.getData("text/plain");
        if (roleName) {
            const newNode: OrgChartNode = {
                id: `${roleName.toLowerCase().replace(/ /g, '-')}-${Date.now()}`,
                role: roleName,
                status: 'ghosted',
            };
            const newBlueprint = { ...blueprint, nodes: [...blueprint.nodes, newNode] };
            setBlueprint(newBlueprint);
            saveBlueprint(newBlueprint);
        }
    };
    
    const handleDeleteNode = (nodeId: string) => {
        if (!blueprint) return;
        const newNodes = blueprint.nodes.filter(node => node.id !== nodeId);
        const newBlueprint = { ...blueprint, nodes: newNodes };
        setBlueprint(newBlueprint);
        saveBlueprint(newBlueprint);
    };
    
    const handleToggleNodeStatus = (nodeId: string) => {
        if (!blueprint) return;
        const newNodes = blueprint.nodes.map(node => {
            if (node.id === nodeId) {
                const newStatus: 'ghosted' | 'active' = node.status === 'ghosted' ? 'active' : 'ghosted';
                return { ...node, status: newStatus };
            }
            return node;
        });
        const newBlueprint = { ...blueprint, nodes: newNodes };
        setBlueprint(newBlueprint);
        saveBlueprint(newBlueprint);
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>;
    }

    const growthStage = getGrowthStage(blueprint?.nodes || []);
    const adminNodes = blueprint?.nodes.filter(n => ROLE_CATEGORIES.Administrative.some(r => r.name === n.role)) || [];
    const salesNodes = blueprint?.nodes.filter(n => ROLE_CATEGORIES.Sales.some(r => r.name === n.role)) || [];
    const leadershipNodes = blueprint?.nodes.filter(n => ROLE_CATEGORIES.Leadership.some(r => r.name === n.role)) || [];

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                   <Network className="text-accent-secondary" size={48} />
                   Growth Architect
                </h1>
                <p className="text-lg text-text-secondary mt-1">Visualize, plan, and execute the expansion of your business.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="mb-6">
                    <div className="flex justify-between items-center">
                         <label className="text-sm font-semibold text-text-secondary">Your MREA Growth Stage</label>
                         <span className="text-sm font-bold text-primary">Stage {growthStage.stage}</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">{growthStage.name}: <span className="font-normal text-base text-text-secondary">{growthStage.description}</span></p>
                </div>
                
                {blueprint && <GrowthRecommendations blueprint={blueprint} kpis={kpis} recentTransactions={recentTransactions} />}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <Card>
                            <h2 className="text-xl font-bold mb-4">Available Roles</h2>
                            <div className="space-y-2">
                                {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                                    <div key={category}>
                                        <button onClick={() => toggleCategory(category)} className="w-full flex justify-between items-center p-2 rounded-lg hover:bg-primary/5 transition-colors">
                                        <h3 className="font-semibold text-text-primary">{category}</h3>
                                        <ChevronDown size={16} className={`text-text-secondary transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`} />
                                        </button>
                                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCategories[category] ? 'max-h-[1000px]' : 'max-h-0'}`}>
                                            <div className="pl-3 pt-2 space-y-2 border-l-2 border-border ml-2">
                                                {roles.map(role => (
                                                     <div
                                                        key={role.name}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, role.name)}
                                                        className="p-3 bg-background/50 rounded-lg cursor-grab active:cursor-grabbing border border-border hover:border-primary transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <role.icon className="text-primary" size={20} />
                                                            <span className="font-semibold text-text-primary text-sm">{role.name}</span>
                                                        </div>
                                                        <p className="text-xs text-text-secondary mt-1 pl-8">{role.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Org Chart */}
                    <div className="lg:col-span-3">
                        <div className="flex flex-col items-center">
                            {/* Agent Node */}
                            <div className="inline-block relative">
                                <Card className="p-4 w-72 border-2 border-primary shadow-2xl">
                                    <p className="text-xs font-semibold text-primary">YOU - AGENT / CEO</p>
                                    <h3 className="text-xl font-bold">{user?.displayName || 'Real Estate Agent'}</h3>
                                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-left">
                                        <div className="flex items-center gap-2"><DollarSign size={16} className="text-accent-secondary"/><div><p className="text-xs">GCI</p><p className="font-bold">${kpis.gci.toLocaleString()}</p></div></div>
                                        <div className="flex items-center gap-2"><BarChart2 size={16} className="text-accent-secondary"/><div><p className="text-xs">Transactions</p><p className="font-bold">{kpis.transactions.toLocaleString()}</p></div></div>
                                    </div>
                                </Card>
                                 {blueprint && blueprint.nodes.length > 0 && (
                                     <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-0.5 h-5 bg-border"></div>
                                )}
                            </div>
                            
                            {/* Drop Zone */}
                             <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`w-full mt-10 relative pt-5 min-h-[300px] border-2 border-dashed rounded-2xl transition-colors ${isDraggingOver ? 'border-primary bg-primary/5' : 'border-border'}`}
                            >
                                {blueprint?.nodes.length === 0 ? (
                                     <div className="absolute inset-0 flex flex-col justify-center items-center text-text-secondary">
                                        <p>Drag roles here to build your blueprint</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-border"></div>
                                        <div className="absolute top-5 left-1/2 -translate-x-1/2 h-0.5 bg-border w-4/5"></div>

                                        <div className="grid grid-cols-3 gap-4 px-4 pt-10">
                                            {[
                                                { title: 'Administrative', nodes: adminNodes },
                                                { title: 'Sales', nodes: salesNodes },
                                                { title: 'Leadership', nodes: leadershipNodes }
                                            ].map(category => (
                                                <div key={category.title} className="flex flex-col items-center gap-4 relative">
                                                     {category.nodes.length > 0 && (
                                                         <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-border"></div>
                                                     )}
                                                    <h4 className="font-semibold text-text-secondary uppercase text-xs tracking-wider">{category.title}</h4>
                                                    {category.nodes.map(node => {
                                                        const roleInfo = ALL_ROLES.find(r => r.name === node.role);
                                                        const Icon = roleInfo?.icon || Network;
                                                        return (
                                                            <Card 
                                                                key={node.id}
                                                                className={`w-56 p-0 transition-all group relative ${
                                                                    node.status === 'ghosted' 
                                                                    ? 'border-dashed opacity-80 hover:opacity-100 hover:border-primary' 
                                                                    : 'border-solid border-2 border-success shadow-md'
                                                                }`}
                                                            >
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }} className="absolute -top-2 -right-2 bg-destructive text-on-destructive rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 size={14}/></button>
                                                                <div className="p-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <Icon size={18} className={node.status === 'ghosted' ? 'text-text-secondary' : 'text-success'} />
                                                                        <p className={`text-sm font-bold ${node.status === 'ghosted' ? 'text-text-secondary' : 'text-text-primary'}`}>{node.role}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2 border-t border-border">
                                                                    <button onClick={(e) => { e.stopPropagation(); handleToggleNodeStatus(node.id); }} className="w-full text-xs font-semibold flex items-center justify-center gap-1 p-2 hover:bg-primary/5 rounded-b-xl">
                                                                        Status: <span className={`px-2 py-0.5 rounded-full ${node.status === 'ghosted' ? 'bg-background text-text-secondary' : 'bg-success/20 text-success'}`}>{node.status === 'ghosted' ? 'Planned' : 'Hired'}</span>
                                                                    </button>
                                                                </div>
                                                            </Card>
                                                        )
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationalBlueprintPage;