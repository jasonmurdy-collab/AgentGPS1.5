
import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Compass, Target, DollarSign, Network, ArrowRight, UserCheck } from 'lucide-react';
import { GpsSummaryCard } from '../components/dashboard/GpsSummaryCard';
import { useAuth } from '../contexts/AuthContext';

const HubCard: React.FC<{
    title: string;
    description: string;
    icon: React.ElementType;
    path: string;
    buttonText: string;
    color: string;
}> = ({ title, description, icon: Icon, path, buttonText, color }) => (
    <Card className="hover:shadow-xl transition-all border-l-4 group" style={{ borderLeftColor: color }}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl bg-opacity-10`} style={{ backgroundColor: color }}>
                <Icon size={28} style={{ color }} />
            </div>
            <Link 
                to={path} 
                className="text-sm font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color }}
            >
                Enter {buttonText} <ArrowRight size={14} />
            </Link>
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-text-secondary mb-6">{description}</p>
        <Link 
            to={path} 
            className="block w-full text-center py-2.5 rounded-xl font-bold transition-colors text-white"
            style={{ backgroundColor: color }}
        >
            {buttonText}
        </Link>
    </Card>
);

const BusinessHubPage: React.FC = () => {
    const { userData } = useAuth();

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Business Strategy</h1>
                <p className="text-lg text-text-secondary mt-1">High-level strategic tools to plan and analyze your growth.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-1">
                        <GpsSummaryCard />
                    </div>
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <HubCard 
                            title="Goals & Milestones"
                            description="Track your annual, quarterly, and weekly production targets in real-time."
                            icon={Target}
                            path="/goals"
                            buttonText="Goals"
                            color="#3B82F6"
                        />
                        <HubCard 
                            title="Economic Model"
                            description="Deep-dive into your unit requirements and appointment conversion math."
                            icon={Compass}
                            path="/business-gps"
                            buttonText="Business GPS"
                            color="#10B981"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <HubCard 
                        title="Financial Tracking"
                        description="Monitor GCI, Cost of Sales, and Operating Expenses against MREA benchmarks."
                        icon={DollarSign}
                        path="/financials"
                        buttonText="Financials"
                        color="#F59E0B"
                    />
                    <HubCard 
                        title="Team Architect"
                        description="Visualize your organizational chart and plan your next key hire."
                        icon={Network}
                        path="/growth-architect"
                        buttonText="Org Chart"
                        color="#8B5CF6"
                    />
                    <HubCard 
                        title="Performance Logs"
                        description="Review session history, attendance, and coach feedback in one place."
                        icon={UserCheck}
                        path="/my-performance"
                        buttonText="Performance"
                        color="#EF4444"
                    />
                </div>
            </div>
        </div>
    );
};

export default BusinessHubPage;
