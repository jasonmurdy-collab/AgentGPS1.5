import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { PlusCircle, PhoneForwarded, Megaphone, Users, MapPin, ArrowLeft } from 'lucide-react';
import { GoalModal } from '../components/goals/AddGoalModal';
import { useGoals } from '../contexts/GoalContext';
import { Goal, GoalType } from '../types';
import { Link } from 'react-router-dom';

const leadGenIdeasData = [
  {
    category: 'Direct Prospecting',
    icon: PhoneForwarded,
    ideas: [
      {
        title: 'Call For Sale By Owners (FSBOs)',
        description: 'Contact homeowners selling their property without an agent. Offer value, like a free market analysis or marketing tips, to build rapport.',
        goal: { title: 'Call 50 FSBOs this week', metric: 'FSBO Calls', type: GoalType.Weekly, targetValue: 50 },
      },
      {
        title: 'Engage Expired Listings',
        description: 'Reach out to homeowners whose listings have expired. Offer a new marketing strategy and a clear value proposition to win their business.',
        goal: { title: 'Contact 25 Expired Listings', metric: 'Expired Listing Contacts', type: GoalType.Weekly, targetValue: 25 },
      },
      {
        title: 'Geographic Farming: Door Knocking',
        description: 'Select a neighborhood and consistently connect with residents by door knocking with valuable market information or event invitations.',
        goal: { title: 'Door Knock 100 Homes', metric: 'Doors Knocked', type: GoalType.Weekly, targetValue: 100 },
      },
    ],
  },
  {
    category: 'Marketing & Branding',
    icon: Megaphone,
    ideas: [
      {
        title: 'Host a Mega Open House',
        description: 'Go beyond the standard open house. Promote heavily online, door knock the neighborhood, and use a system to capture every lead.',
        goal: { title: 'Add 20 contacts from an Open House', metric: 'Open House Leads', type: GoalType.Weekly, targetValue: 20 },
      },
      {
        title: 'Run a Targeted Social Media Ad',
        description: 'Create a compelling ad for a specific audience (e.g., first-time homebuyers) offering a valuable piece of content like a guide.',
        goal: { title: 'Generate 15 leads from a social ad', metric: 'Social Media Leads', type: GoalType.Weekly, targetValue: 15 },
      },
      {
        title: 'Send a Monthly "Item of Value" Mailer',
        description: 'Mail a high-quality, non-salesy item to your geographic farm or sphere, such as a local market report or a seasonal checklist.',
        goal: { title: 'Send 200 mailers this month', metric: 'Mailers Sent', type: GoalType.Quarterly, targetValue: 200 },
      },
    ],
  },
  {
    category: 'Sphere of Influence (SOI)',
    icon: Users,
    ideas: [
      {
        title: 'Make Quarterly Care Calls',
        description: 'Systematically call through your database each quarter. Don\'t ask for business; ask about them, listen, and offer help. The business will follow.',
        goal: { title: 'Make 50 SOI Care Calls', metric: 'SOI Calls', type: GoalType.Weekly, targetValue: 50 },
      },
      {
        title: 'Host a Client Appreciation Event',
        description: 'Plan a fun event (e.g., movie night, pie giveaway) to thank your past clients and sphere. It deepens relationships and generates goodwill.',
        goal: { title: 'Host a client event with 30 attendees', metric: 'Event Attendees', type: GoalType.Quarterly, targetValue: 30 },
      },
      {
        title: 'Implement a "Pop-By" Strategy',
        description: 'Visit 5-10 of your top clients or advocates each month with a small, thoughtful gift. This keeps you top-of-mind for referrals.',
        goal: { title: 'Complete 10 Pop-Bys this month', metric: 'Pop-Bys Completed', type: GoalType.Quarterly, targetValue: 10 },
      },
    ],
  },
  {
    category: 'Community & Niche Domination',
    icon: MapPin,
    ideas: [
      {
        title: 'Host a Home Buyer/Seller Workshop',
        description: 'Position yourself as the expert by hosting a free educational workshop (online or in-person) on topics like "The Path to Homeownership" or "Secrets to Selling for Top Dollar." Capture leads from attendees.',
        goal: { title: 'Host workshop with 10+ attendees', metric: 'Workshop Attendees', type: GoalType.Quarterly, targetValue: 10 },
      },
      {
        title: 'Launch a Local Community Spotlight',
        description: 'Start a video series or blog where you interview local business owners or feature neighborhood hidden gems. This builds immense goodwill and a massive referral network.',
        goal: { title: 'Film 4 Community Spotlight videos', metric: 'Spotlight Videos Created', type: GoalType.Quarterly, targetValue: 4 },
      },
      {
        title: 'Partner with Divorce Attorneys/Financial Planners',
        description: 'Build referral relationships with professionals who serve clients experiencing major life events (divorce, inheritance). These situations often necessitate a real estate transaction. Provide them with value first.',
        goal: { title: 'Meet with 5 potential referral partners', metric: 'Partner Meetings', type: GoalType.Quarterly, targetValue: 5 },
      },
    ],
  },
];

const LeadGenPage: React.FC = () => {
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
                <Link to="/resource-library" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4">
                    <ArrowLeft size={16}/> Back to Library
                </Link>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">
                    Lead Generation Playbook
                </h1>
                <p className="text-lg text-text-secondary mt-1">Actionable ideas to fuel your pipeline. Click any idea to create a goal.</p>
            </header>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
                {leadGenIdeasData.map((category) => (
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
                title="Create a New Goal"
                submitButtonText="Add Goal"
                initialGoalData={modalInitialData}
            />
        </div>
    );
};

export default LeadGenPage;