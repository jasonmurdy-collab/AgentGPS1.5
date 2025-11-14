
import React from 'react';
import { Card } from '../components/ui/Card';
import { Shield } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
    
    const Section: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
        <div className="mb-6">
            <h2 className="text-2xl font-bold border-b border-border pb-2 mb-3">{title}</h2>
            <div className="space-y-3 text-text-secondary">{children}</div>
        </div>
    );
    
    const SubSection: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
        <div className="pl-4 border-l-2 border-primary/20">
            <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
            <div className="space-y-2">{children}</div>
        </div>
    );

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
          <Shield className="text-accent-secondary" size={48} />
          Privacy Policy
        </h1>
        <p className="text-lg text-text-secondary mt-1">Your privacy is important to us. Here's how we collect, use, and protect your information.</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card>
            <Section title="1. Introduction & Effective Date">
                <p>This Privacy Policy outlines the data protection practices for AgentGPS Inc. ("we," "us," or "our") and our Software-as-a-Service (SaaS) platform, AgentGPS (the "Service"). This policy is designed to be compliant with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA).</p>
                <p><strong>Effective Date:</strong> October 25, 2025</p>
            </Section>
            
            <Section title="2. Types of Personal Data We Collect">
                <SubSection title="Data Provided Directly by You">
                    <p>When you register for and use our Service, we collect information you provide, such as your name, email address, brokerage information, billing details, and user-generated content like business goals and performance metrics.</p>
                </SubSection>
                <SubSection title="Data Collected Automatically">
                    <p>We automatically collect technical information when you use our Service, including your IP address, device information, and usage analytics (e.g., features used, time spent in the app). This is done through cookies and similar tracking technologies.</p>
                </SubSection>
                 <SubSection title="Data from Third Parties">
                    <p>If you choose to integrate AgentGPS with third-party platforms (e.g., CRMs, MLS systems), we may receive information from those services as authorized by you during the integration process.</p>
                </SubSection>
            </Section>
            
            <Section title="3. Purpose of Data Collection (The 'Why')">
                <p>We collect your data for specific, legitimate purposes, and we are committed to being transparent about why. At every point of collection (e.g., goal setting), we strive to explain the purpose. Key purposes include:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>To deliver, maintain, and improve our coaching services.</li>
                    <li>To process your subscription payments.</li>
                    <li>To personalize your user experience.</li>
                    <li>To generate personalized coaching insights and track progress against goals.</li>
                    <li>To understand user behavior for product improvement and development.</li>
                    <li>To communicate with you about your account and service updates.</li>
                    <li>With your explicit consent, to send you marketing communications.</li>
                </ul>
            </Section>
            
            <Section title="4. Data Sharing and Third Parties">
                <p>We do not sell your personal data. We may share your information with trusted third-party service providers who help us operate our business, such as:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>Cloud Hosting Providers:</strong> (e.g., Google Cloud) to store your data securely.</li>
                    <li><strong>Payment Processors:</strong> (e.g., Stripe) to handle subscription payments.</li>
                    <li><strong>Analytics Tools:</strong> (e.g., Mixpanel, Google Analytics) to help us understand service usage.</li>
                </ul>
                <p>We ensure these third parties are contractually obligated to protect your data and use it only for the purposes we specify.</p>
            </Section>

            <Section title="5. Data Retention and Deletion">
                <p>We retain your personal information only as long as necessary to fulfill the purposes for which it was collected, or as required by law. Generally, your account data is retained for as long as your account is active.</p>
                <p>Following the termination of your account, your personal data will be permanently deleted from our systems within <strong>90 days</strong>.</p>
            </Section>
            
            <Section title="6. Your Rights Under PIPEDA">
                <p>As a user in Canada, you have rights regarding your personal information:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>Right to Access:</strong> You can request a copy of the personal information we hold about you.</li>
                    <li><strong>Right to Correction:</strong> You can request to correct any inaccurate or incomplete information.</li>
                    <li><strong>Right to Withdraw Consent:</strong> You can withdraw your consent for non-essential data processing (like marketing) at any time.</li>
                </ul>
                <p>To exercise these rights, please visit the "Privacy & Data" section of your Profile page or contact our Privacy Officer directly.</p>
            </Section>
            
             <Section title="7. Data Security Measures">
                <p>We take the security of your data seriously. We implement a combination of technical, administrative, and physical safeguards to protect your information, including:</p>
                 <ul className="list-disc list-inside space-y-1">
                    <li>Encryption of data in transit (using SSL/TLS) and at rest.</li>
                    <li>Strict access controls to ensure only authorized personnel can access your data.</li>
                    <li>Regular security audits and staff training on data protection.</li>
                </ul>
            </Section>
            
            <Section title="8. International Data Transfers">
                <p>Our servers may be located outside of Canada. By using our Service, you consent to the transfer of your information to countries where data protection laws may differ from those in Canada. We will ensure that any such transfers are protected by appropriate safeguards.</p>
            </Section>

            <Section title="9. Contact Information">
                <p>For any questions, concerns, or requests related to this Privacy Policy or your personal information, please contact our designated Privacy Officer:</p>
                <p className="mt-2 p-3 bg-background/50 rounded-lg">
                    <strong>Email:</strong> <a href="mailto:privacy@agentgps.com" className="text-primary hover:underline">privacy@agentgps.com</a>
                </p>
            </Section>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
