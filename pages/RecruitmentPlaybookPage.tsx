import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { PlusCircle, Megaphone, Users, PhoneForwarded, Briefcase, UserSearch } from 'lucide-react';
import { GoalModal } from '../components/goals/AddGoalModal';
import { useGoals } from '../contexts/GoalContext';
import { Goal, GoalType } from '../types';

const recruitmentIdeasData = [
  {
    category: 'Digital & Content Strategy',
    icon: Megaphone,
    ideas: [
      {
        title: 'Launch Agent Success Story Campaign',
        description: 'Showcase 2-3 agent success stories with measurable metrics like "GCI boost" or "deals closed before/after". Proof sells systems.',
        goal: { title: 'Publish 3 Agent Success Stories', metric: 'Success Stories Published', type: GoalType.Quarterly, targetValue: 3 },
      },
      {
        title: 'Authoritative Content Creation (SEO)',
        description: 'Publish expert guides on topics agents search for, like "best CRM for recruiting" or "how to navigate market shifts". This builds trust and attracts recruits organically.',
        goal: { title: 'Write 4 SEO-focused recruitment articles', metric: 'Recruitment Articles', type: GoalType.Quarterly, targetValue: 4 },
      },
      {
        title: 'Hyper-Targeted Social Media Ads',
        description: 'Run paid campaigns on Facebook or Instagram targeting agents in your area. Offer a high-value download (e.g., "The Ultimate Guide to Doubling Your GCI") in exchange for their contact info.',
        goal: { title: 'Generate 20 qualified agent leads via social ads', metric: 'Agent Leads (Social)', type: GoalType.Quarterly, targetValue: 20 },
      },
    ],
  },
  {
    category: 'Referral & Network Systems',
    icon: Users,
    ideas: [
      {
        title: 'Establish a Residual Referral Program',
        description: 'Instead of one-time bonuses, offer referring agents a small percentage of a recruit\'s commission for a set period. This incentivizes retention and long-term support.',
        goal: { title: 'Sign up 5 agents for the referral program', metric: 'Referral Program Members', type: GoalType.Quarterly, targetValue: 5 },
      },
      {
        title: 'Offer High-Value Non-Monetary Incentives',
        description: 'For top producers, offer perks like exclusive leads, increased marketing support, or all-expense-paid trips for successful referrals. These often have higher perceived value than cash.',
        goal: { title: 'Award 2 high-value referral incentives', metric: 'Incentives Awarded', type: GoalType.Quarterly, targetValue: 2 },
      },
      {
        title: 'Systematic Network Engagement',
        description: 'Capitalize on the networks of your existing high-performing agents. Actively seek introductions and pre-vetted candidates from your top talent.',
        goal: { title: 'Hold 10 networking meetings with agent referrals', metric: 'Referral Meetings', type: GoalType.Quarterly, targetValue: 10 },
      },
    ],
  },
  {
    category: 'Direct Outreach & Prospecting',
    icon: PhoneForwarded,
    ideas: [
      {
        title: 'Strategic LinkedIn Outreach',
        description: 'Identify strong-fit candidates on LinkedIn and use direct messaging to open conversations. Focus on their accomplishments and how your brokerage can amplify their success.',
        goal: { title: 'Connect with 50 potential recruits on LinkedIn', metric: 'LinkedIn Connections', type: GoalType.Weekly, targetValue: 50 },
      },
      {
        title: 'Attend Real Estate School Career Fairs',
        description: 'Connect with newly licensed agents who are eager for mentorship and lead generation support. Position your brokerage as the best place to launch a successful career.',
        goal: { title: 'Attend 2 career fairs this quarter', metric: 'Career Fairs Attended', type: GoalType.Quarterly, targetValue: 2 },
      },
      {
        title: '"Top Producer" Lunch & Learn',
        description: 'Invite a small group of high-performing agents from other brokerages to an exclusive, high-value lunch and learn event focused on scaling their business (not a direct recruiting pitch).',
        goal: { title: 'Host a lunch & learn with 5 top producers', metric: 'Top Producer Attendees', type: GoalType.Quarterly, targetValue: 5 },
      },
    ],
  },
  {
    category: 'Value Proposition & Nurturing',
    icon: Briefcase,
    ideas: [
      {
        title: 'Host a "Post-NAR Value" Workshop',
        description: 'Run a workshop for local agents on how to articulate their value and justify their commission in the post-NAR-settlement landscape. Showcase the tools and training your brokerage provides.',
        goal: { title: 'Get 15 agent attendees for a value workshop', metric: 'Workshop Attendees', type: GoalType.Quarterly, targetValue: 15 },
      },
      {
        title: 'Implement a "Speed-to-Lead" Workflow',
        description: 'Ensure every recruitment inquiry is responded to in under two minutes. Use automation to signal efficiency and professionalism to top-performing agents who expect promptness.',
        goal: { title: 'Implement a 2-minute response time system', metric: 'System Implementation', type: GoalType.Quarterly, targetValue: 1 },
      },
      {
        title: 'Offer Free Business Planning Sessions',
        description: 'Offer a complimentary, confidential business planning session to agents in your market. Use your expertise to provide genuine value and subtly demonstrate what your brokerage offers.',
        goal: { title: 'Conduct 5 free business planning sessions', metric: 'Planning Sessions Conducted', type: GoalType.Quarterly, targetValue: 5 },
      },
    ],
  },
];


const RecruitmentPlaybookPage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState({});
    const { addGoal } = useGoals();

    const handleCreateGoal = (goalData: any) => {
        setModalInitialData(goalData);
        setIsModalOpen(true);
    };

    const handleSubmitGoal = async (goalData: Omit<Goal, 'id' | 'currentValue' | 'userId' | 'teamId' | 'marketCenterId' | 'createdAt' | 'userName'>) => {
        await addGoal(goalData);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                    <UserSearch className="text-accent-secondary" size={48} />
                    Recruitment Playbook
                </h1>
                <p className="text-lg text-text-secondary mt-1">Proven strategies to attract and retain top talent for your team.</p>
            </header>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
                {recruitmentIdeasData.map((category) => (
                    <div key={category.category}>
                        <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                            <category.icon className="text-accent-secondary" />
                            {category.category}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {category.ideas.map((idea) => (
                                <Card key={idea.title} className="flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary">{idea.title}</h3>
                                        <p className="text-sm text-text-secondary mt-2">{idea.description}</p>
                                    </div>
                                    <button
                                        onClick={() => handleCreateGoal(idea.goal)}
                                        className="mt-4 w-full flex items-center justify-center gap-2 bg-primary/10 text-primary font-semibold py-2 px-3 rounded-lg hover:bg-primary/20 transition-colors"
                                    >
                                        <PlusCircle size={16} />
                                        Create Goal
                                    </button>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <GoalModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmitGoal}
                title="Create a New Recruitment Goal"
                submitButtonText="Add Goal"
                initialGoalData={modalInitialData}
            />
        </div>
    );
};

export default RecruitmentPlaybookPage;