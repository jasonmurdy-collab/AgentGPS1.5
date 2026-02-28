
import React from 'react';
import { Card } from '../components/ui/Card';
import { FileText } from 'lucide-react';

const Section: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
    <div className="mb-6">
        <h2 className="text-2xl font-bold border-b border-border pb-2 mb-3">{title}</h2>
        <div className="space-y-3 text-text-secondary">{children}</div>
    </div>
);

const TermsOfServicePage: React.FC = () => {
    
  return (
    <div className="h-full flex flex-col">
      <header className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
          <FileText className="text-accent-secondary" size={48} />
          Terms of Service
        </h1>
        <p className="text-lg text-text-secondary mt-1">Please read these terms carefully before using our service.</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card>
            <Section title="1. Acceptance of Terms">
                <p>By creating an account and using the AgentGPS platform ("Service"), you are agreeing to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
            </Section>
            
            <Section title="2. Description of Service">
                <p>AgentGPS provides a robust accountability and goal-tracking platform for real estate professionals. Features include but are not limited to goal setting, progress tracking, team collaboration, and performance analytics.</p>
            </Section>
            
            <Section title="3. User Responsibilities">
                 <p>You are responsible for maintaining the confidentiality of your account and password. You are also responsible for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
                 <p>You agree not to use the service for any illegal or unauthorized purpose.</p>
            </Section>

            <Section title="4. Subscription and Payment">
                <p>Access to the Service requires a paid subscription. Fees are billed on a recurring basis as specified at the time of purchase. You agree to provide current, complete, and accurate purchase and account information.</p>
            </Section>

            <Section title="5. Intellectual Property">
                <p>The Service and its original content, features, and functionality are and will remain the exclusive property of AgentGPS Inc. and its licensors. Our trademarks may not be used in connection with any product or service without our prior written consent.</p>
            </Section>

            <Section title="6. Termination">
                <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
            </Section>

             <Section title="7. Limitation of Liability">
                <p>In no event shall AgentGPS Inc., nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
            </Section>
            
            <Section title="8. Governing Law">
                <p>These Terms shall be governed and construed in accordance with the laws of the province of Ontario, Canada, without regard to its conflict of law provisions.</p>
            </Section>
            
            <Section title="9. Changes to Terms">
                 <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>
                 <p><strong>Last Updated:</strong> October 25, 2025</p>
            </Section>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
