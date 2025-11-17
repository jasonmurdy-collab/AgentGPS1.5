import React, { FC, useMemo } from 'react';
import type { Candidate } from '../../../types';
import { Card } from '../../ui/Card';
import { Users, UserCheck, TrendingUp, UserPlus } from 'lucide-react';

const StatCard: FC<{ title: string; value: string | number; icon: FC<any> }> = React.memo(({ title, value, icon: Icon }) => (
    <Card className="p-4">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
                <Icon size={24} className="text-primary" />
            </div>
            <div>
                <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold text-text-primary">{value}</p>
            </div>
        </div>
    </Card>
));

export const RecruitmentStats: FC<{ candidates: Candidate[] }> = React.memo(({ candidates }) => {
    const stats = useMemo(() => {
        const totalPipeline = candidates.filter(c => c.stage !== 'Signed' && c.stage !== 'Not a Fit').length;
        
        const contactedOrLaterStages = ['Contacted', 'Appointment Set', 'Appointment Held', 'Active Recruit', 'Signed'];
        const apptOrLaterStages = ['Appointment Set', 'Appointment Held', 'Active Recruit', 'Signed'];
        
        const contactedOrLaterCount = candidates.filter(c => contactedOrLaterStages.includes(c.stage)).length;
        const apptOrLaterCount = candidates.filter(c => apptOrLaterStages.includes(c.stage)).length;

        const appointmentsSet = apptOrLaterCount;

        const conversionRate = contactedOrLaterCount > 0 ? (apptOrLaterCount / contactedOrLaterCount) * 100 : 0;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentlySigned = candidates.filter(c => c.stage === 'Signed' && new Date(c.lastContacted) >= thirtyDaysAgo).length;

        return {
            totalPipeline,
            appointmentsSet,
            conversionRate: `${conversionRate.toFixed(1)}%`,
            recentlySigned,
        };
    }, [candidates]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard title="Active Pipeline" value={stats.totalPipeline} icon={Users} />
            <StatCard title="Appointments Set" value={stats.appointmentsSet} icon={UserCheck} />
            <StatCard title="Conversion Rate" value={stats.conversionRate} icon={TrendingUp} />
            <StatCard title="Signed (Last 30d)" value={stats.recentlySigned} icon={UserPlus} />
        </div>
    );
});