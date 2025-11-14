import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { ChevronDown, Layers, Database, MessageCircle, PhoneForwarded, Megaphone, Cog, TrendingUp, BookOpen, Clock, Users, Target, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AccordionItemProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, icon: Icon, children, isOpen, onToggle }) => {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 text-left"
      >
        <div className="flex items-center gap-4">
          <Icon className="text-primary" size={24} />
          <h2 className="text-xl font-bold text-text-primary">{title}</h2>
        </div>
        <ChevronDown
          size={24}
          className={`text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-6 pt-2 border-t border-border">
          {children}
        </div>
      </div>
    </Card>
  );
};


const touchPlanData = [
    { category: 'Automated Value', tactic: 'Neighborhood Nurture Email', frequency: 'Monthly', touches: 12, purpose: 'Provides hyper-local, relevant market data. Positions agent as the local expert.' },
    { category: 'Direct Outreach', tactic: 'Quarterly Check-in Call', frequency: 'Quarterly', touches: 4, purpose: 'Builds personal connection, uncovers immediate needs, asks for referrals.' },
    { category: 'Physical Mail', tactic: 'Postcards / Items of Value', frequency: '4-12x/yr', touches: '4-12', purpose: 'Maintains a physical presence in the home; tangible marketing.' },
    { category: 'High-Value Digital', tactic: 'Educational Email/Video', frequency: 'Monthly', touches: '(Included)', purpose: 'Delivers expertise and value beyond property analysis.' },
    { category: 'Personal Touch', tactic: 'Birthday / Home Anniversary', frequency: 'Annually', touches: 2, purpose: 'Acknowledges personal milestones, deepens the relationship.' },
    { category: 'Community Building', tactic: 'Client Events / Pop-Bys', frequency: '2x/yr', touches: 2, purpose: 'Creates community, generates goodwill, provides face-to-face interaction.' },
];

const TouchPlanTable: React.FC = () => (
    <div className="overflow-x-auto my-4 rounded-lg border border-border">
        <table className="w-full text-sm text-left">
            <thead className="bg-background/50">
                <tr>
                    {['Category', 'Tactic', 'Frequency', 'Touches', 'Strategic Purpose'].map(header => (
                        <th key={header} className="p-3 font-semibold text-text-primary">{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {touchPlanData.map(row => (
                    <tr key={row.category} className="border-t border-border">
                        <td className="p-3 font-semibold">{row.category}</td>
                        <td className="p-3">{row.tactic}</td>
                        <td className="p-3">{row.frequency}</td>
                        <td className="p-3">{row.touches}</td>
                        <td className="p-3 text-text-secondary">{row.purpose}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const timeBlockData = [
    { time: '5:00 AM - 7:30 AM', activity: 'Personal Time / Prep', description: 'Wake up, exercise, meditate, plan the day. Set a positive tone for peak performance.' },
    { time: '7:30 AM - 9:00 AM', activity: 'Prepare for Battle', description: 'Arrive at office, review MLS for new/expired listings, role-play scripts, handle urgent administrative tasks.' },
    { time: '9:00 AM - 12:00 PM', activity: 'LEAD GENERATION (PROTECTED)', description: 'Time on Task Over Time. Execute daily prospecting goals. This time is sacrosanct—no emails, no social media, no distractions.' },
    { time: '12:00 PM - 1:00 PM', activity: 'Lunch', description: 'Recharge. Use this time strategically to network with a client, vendor, or allied resource.' },
    { time: '1:00 PM - 2:00 PM', activity: 'Lead Follow-Up & Admin', description: 'Return calls generated from the morning\'s prospecting, pre-qualify appointments.' },
    { time: '2:00 PM - 5:00 PM', activity: 'Appointments & Business Ops', description: 'Conduct listing presentations and buyer consultations, show properties, negotiate contracts, and manage transactions.' },
    { time: '5:00 PM - 6:00 PM', activity: 'End of Day Wrap-up', description: 'Finalize notes in the CRM, confirm the next day\'s appointments, and plan tomorrow\'s lead generation activities.' },
];

const TimeBlockTable: React.FC = () => (
    <div className="overflow-x-auto my-4 rounded-lg border border-border">
        <table className="w-full text-sm text-left">
            <thead className="bg-background/50">
                <tr>
                    <th className="p-3 font-semibold text-text-primary">Time Block</th>
                    <th className="p-3 font-semibold text-text-primary">Activity</th>
                    <th className="p-3 font-semibold text-text-primary">Description / Source</th>
                </tr>
            </thead>
            <tbody>
                {timeBlockData.map(row => (
                     <tr key={row.time} className="border-t border-border">
                        <td className="p-3 font-semibold">{row.time}</td>
                        <td className="p-3">{row.activity}</td>
                        <td className="p-3 text-text-secondary">{row.description}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Section: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
        <div className="text-text-secondary space-y-3 pl-4 border-l-2 border-accent/30">{children}</div>
    </div>
);


const playbookData = [
  {
    title: 'Part I: The Foundational Blueprint',
    icon: Layers,
    content: (
      <>
        <p className="mb-4 text-text-secondary">Success is not the result of luck, but the predictable outcome of following proven, scalable business models. This philosophy, articulated in Gary Keller's "The Millionaire Real Estate Agent" (MREA), forms the bedrock of sustainable growth.</p>
        <Section title="The Four Foundational Models">
          <p><strong>1. The Economic Model:</strong> Know your numbers. This model links your desired annual income to the specific number of appointments, listings, and closings required to achieve it. It provides mathematical clarity to your goals.</p>
          <p><strong>2. The Lead Generation Model:</strong> The engine of your business. MREA emphasizes that your primary job is lead generation. It's about systematically prospecting and marketing to a targeted database.</p>
          <p><strong>3. The Budget Model:</strong> Track every dollar. This model ensures profitability by allocating a percentage of your Gross Commission Income (GCI) to cost of sales and operating expenses, safeguarding your net income.</p>
          <p><strong>4. The Organizational Model:</strong> Plan your growth. This model outlines the path from a solo agent to a team with administrative and sales leverage, defining when and who to hire based on production milestones.</p>
        </Section>
      </>
    ),
  },
  {
    title: 'Part II: The Three L\'s - Leads, Listings, and Leverage',
    icon: TrendingUp,
    content: (
        <>
            <p className="mb-4 text-text-secondary">These three pillars are the core of a high-achieving real estate career. Mastering them is non-negotiable.</p>
            <Section title="Leads: The Lifeblood">
                <p>Lead generation is the single most important activity. Your business grows to the extent that you lead generate. The MREA model is clear: "Your database is your business."</p>
            </Section>
            <Section title="Listings: The Opportunity">
                <p>Seller listings provide inventory, market presence, and generate buyer leads. Focusing on becoming a listing agent creates leverage; you can serve more clients in less time compared to working exclusively with buyers.</p>
            </Section>
            <Section title="Leverage: The Multiplier">
                <p>Leverage is the key to scaling beyond what you can do alone. It comes in three forms: <strong>People</strong> (hiring talent), <strong>Systems</strong> (standardizing processes), and <strong>Tools</strong> (implementing technology).</p>
            </Section>
        </>
    )
  },
  {
    title: 'Part III: The Economic and Budget Models',
    icon: Cog,
    content: (
        <>
            <p className="mb-4 text-text-secondary">Treat your business like a business. It starts with a deep understanding of your financials.</p>
            <Section title="The Economic Model: From Goal to Reality">
                 <p>Work backward from your annual GCI goal:</p>
                <ul className="list-decimal list-inside space-y-2 mt-2">
                    <li><strong>Determine GCI Goal:</strong> Example: $150,000</li>
                    <li><strong>Calculate Average Commission:</strong> Example: $7,500</li>
                    <li><strong>Find Required Closings:</strong> $150,000 / $7,500 = 20 closings</li>
                    <li><strong>Factor in Conversion Rates (Listing & Buyer):</strong> If your listing conversion is 75%, you need ~14 listing appointments to get 10 listings. If buyer conversion is 50%, you need 20 buyer appointments to get 10 buyer clients.</li>
                    <li><strong>This defines your annual appointment goal.</strong> Break it down quarterly, monthly, and weekly.</li>
                </ul>
            </Section>
             <Section title="The Budget Model: The 30/30/40 Rule">
                <p>A simple yet powerful guide for allocating your GCI:</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                    <li><strong>30% for Cost of Sales (COS):</strong> Includes splits, referral fees, etc.</li>
                    <li><strong>30% for Operating Expenses:</strong> Marketing, salaries, technology, office fees, etc.</li>
                    <li><strong>40% for Net Income:</strong> Your profit before taxes.</li>
                </ul>
                <p className="mt-2">This model ensures you remain profitable as you grow.</p>
            </Section>
        </>
    )
  },
   {
    title: 'Part IV: The Organizational Model',
    icon: Users,
    content: (
        <>
            <p className="mb-4 text-text-secondary">Growth requires leverage. This model provides a clear path for when and who to hire to avoid hitting a ceiling.</p>
            <Section title="The Four Stages of Growth">
                <p><strong>1. Solopreneur:</strong> You do everything.</p>
                <p><strong>2. Administrative Leverage:</strong> Your first hire should almost always be an administrative assistant. This frees you up to focus on your "dollar-productive" activities: lead generation, appointments, and negotiations.</p>
                <p><strong>3. Sales Leverage:</strong> Once your lead flow exceeds your capacity, you hire a buyer's agent. This allows you to focus on securing more listings.</p>
                <p><strong>4. Leadership Leverage:</strong> As the team grows, you may hire a lead listing specialist or an operations manager, transitioning you into the role of CEO.</p>
            </Section>
        </>
    )
  },
  {
    title: 'Part V: The Lead Generation Model',
    icon: Database,
    content: (
        <>
            <p className="mb-4 text-text-secondary">This is the engine of your business. The model is built on two core principles: Prospecting and Marketing, both aimed at systematically nurturing your database.</p>
            <Section title="Prospecting vs. Marketing">
                <p><strong>Prospecting is "Seeking" Business:</strong> It's direct, active, and immediate. Think phone calls (FSBOs, Expireds, Sphere), door-knocking, and networking. It's time-intensive but low-cost.</p>
                <p><strong>Marketing is "Attracting" Business:</strong> It's indirect, passive, and long-term. Think branding, direct mail, social media, and advertising. It's money-intensive but less time-consuming once set up.</p>
                <p>A balanced business needs both. Top agents dedicate a significant portion of their day to prospecting-based, marketing-enhanced lead generation.</p>
            </Section>
             <Section title="The Database: Your Business's Gold Mine">
                <p>Your database is your single most valuable asset. The goal is to build a "moat" around your relationships.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                    <li><strong>Segment Your Database:</strong> Not all contacts are equal. Categorize them (e.g., A+ Clients, Sphere of Influence, Leads, Vendors) to tailor your communication.</li>
                    <li><strong>Feed It Daily:</strong> Add new contacts every single day from your prospecting and marketing activities.</li>
                    <li><strong>Communicate Systematically:</strong> Use a touch plan to deliver consistent value and stay top-of-mind.</li>
                </ul>
            </Section>
            <Section title="The 36-Touch Plan: A Sample Framework">
                <p>The goal is to provide consistent, valuable communication to your database to earn mindshare and referrals. Here is a sample plan totaling 26+ touches annually.</p>
                <TouchPlanTable/>
            </Section>
        </>
    ),
  },
  {
    title: 'Part VI: The Execution Framework',
    icon: Clock,
    content: (
        <>
            <p className="mb-4 text-text-secondary">Models and systems are useless without execution. This framework ensures you consistently perform the activities that lead to results.</p>
            <Section title="Time Blocking: The Billionaire's Secret">
                <p>Time blocking is the practice of dedicating specific, non-negotiable blocks of time in your calendar for your most important activities. The most critical time block for a real estate agent is Lead Generation.</p>
                <p className="font-bold my-2">The MREA "Perfect Day" Schedule:</p>
                <TimeBlockTable />
            </Section>
            <Section title="The 4-1-1: Connecting Goals to Actions">
                <p>The 4-1-1 is a powerful planning tool that connects your annual goals to your weekly actions. It stands for:</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                    <li><strong>4 Weeks:</strong> What are my non-negotiable goals for the next four weeks?</li>
                    <li><strong>1 Month:</strong> How do these weekly goals align with my goals for this month?</li>
                    <li><strong>1 Year:</strong> How does this month's plan get me closer to my annual goals?</li>
                </ul>
                <p className="mt-2">This tool, available in your AgentGPS, provides extreme clarity and focus on what needs to be done right now.</p>
            </Section>
        </>
    )
  },
  {
    title: 'Part VII: Tactical Execution & Lead Source Deep Dive',
    icon: Target,
    content: (
        <>
            <p className="mb-4 text-text-secondary">Strategy without tactics is the slowest route to victory. Tactics without strategy is the noise before defeat. This section provides actionable tactics for the most common and effective lead sources.</p>
            <Section title="Mastering the Open House">
                <p>An open house is not just about selling one property; it's a lead generation event. Success is in the system:</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                    <li><strong>Pre-Event Blitz:</strong> Promote the open house for 3-5 days. Use social media posts, targeted ads to the local area, door-knock the 50-100 closest homes, and place at least 10-15 signs.</li>
                    <li><strong>The Experience:</strong> Create a welcoming atmosphere. Use a digital sign-in (e.g., a simple QR code to a Google Form). Have property flyers and a local market stats sheet available. Ask probing questions: "What brought you in today?" "What did you like about this home compared to others you've seen?"</li>
                    <li><strong>Aggressive Follow-Up:</strong> The fortune is in the follow-up. Contact every single visitor within 24 hours. A simple "Thank you for coming" call or text can open the door to a longer conversation about their real estate needs.</li>
                </ul>
            </Section>
            <Section title="Geographic Farming">
                <p>Become the go-to agent for a specific neighborhood. The key is consistency and value.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                    <li><strong>Choose Your Farm:</strong> Select a neighborhood of 250-500 homes with a healthy turnover rate (5-7% annually). Ensure it's an area you genuinely like and want to be an expert in.</li>
                    <li><strong>12-Direct Marketing:</strong> Plan 12 marketing touches per year. This could be a mix of postcards with market stats, newsletters, community event sponsorships, and seasonal pop-by gifts.</li>
                    <li><strong>Digital Dominance:</strong> Create a Facebook group for the neighborhood. Run targeted ads. Consistently post content that is of value to the residents, not just real estate listings.</li>
                </ul>
            </Section>
            <Section title="For Sale By Owners (FSBOs) & Expireds">
                <p>These sellers have raised their hands and said they want to move. Your job is to show them you provide a service that's worth more than the commission they'd save or the value their last agent failed to provide.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                    <li><strong>Lead with Value:</strong> Don't call asking for the listing. Call to help. Offer a free FSBO kit, a net sheet, or a list of trusted vendors. For expireds, offer a comparative analysis of why their home may not have sold.</li>
                    <li><strong>Sample Dialogue (FSBO):</strong> "Hi, I'm [Your Name] with [Brokerage]. I saw your home for sale on [Platform] and I'm not calling to ask for your listing, I actually specialize in helping FSBOs and I have a free guide that could help you navigate the process. Would you be open to me sending that over?"</li>
                    <li><strong>Sample Dialogue (Expired):</strong> "Hi, this is [Your Name]. I noticed your home recently came off the market and I can only imagine that must be frustrating. I specialize in marketing properties like yours and I'm confident I can show you a different approach. Are you still considering selling if you could get the right price?"</li>
                </ul>
            </Section>
             <Section title="Digital & Social Media Prospecting">
                <p>Leverage online platforms to build relationships and generate inbound leads.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                    <li><strong>Provide Value, Don't Sell:</strong> Use the 80/20 rule. 80% of your content should be valuable, educational, or entertaining for your local community. 20% can be direct real estate promotion.</li>
                    <li><strong>Engage, Don't Broadcast:</strong> Join local community Facebook groups. Answer questions, be a helpful resource. Don't just post your listings. Become a known, trusted local expert.</li>
                    <li><strong>Video is King:</strong> Short-form video (Reels, TikToks, Shorts) is the most powerful tool for reach. Create simple videos: neighborhood tours, market updates, tips for buyers/sellers.</li>
                </ul>
            </Section>
        </>
    )
  },
];

const MreaPlaybookPage: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <Link to="/resource-library" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4">
                    <ArrowLeft size={16}/> Back to Library
                </Link>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                    <Layers className="text-accent-secondary" size={48} />
                    MREA Playbook
                </h1>
                <p className="text-lg text-text-secondary mt-1">A deep dive into the foundational models of The Millionaire Real Estate Agent.</p>
            </header>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-4">
                {playbookData.map((item, index) => (
                    <AccordionItem
                        key={item.title}
                        title={item.title}
                        icon={item.icon}
                        isOpen={openIndex === index}
                        onToggle={() => handleToggle(index)}
                    >
                        {item.content}
                    </AccordionItem>
                ))}
            </div>
        </div>
    );
};

export default MreaPlaybookPage;
