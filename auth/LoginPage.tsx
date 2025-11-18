import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import { logoUrl } from '../assets';
import { Link, useLocation } from 'react-router-dom';
import type { TeamMember } from '../types';

const LoginPage: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('agent');
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { signInWithEmail, signUpWithEmail } = useAuth();
    const location = useLocation();
    const [signupParams, setSignupParams] = useState<{ role?: string, teamId?: string, mcId?: string }>({});

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const role = params.get('role');
        const teamId = params.get('teamId');
        const mcId = params.get('mcId');
        if (role || teamId || mcId) {
            setIsSignUp(true); // Force sign up view if params are present
            setSignupParams({ role: role || undefined, teamId: teamId || undefined, mcId: mcId || undefined });
            if (role) setSelectedRole(role);
        }
    }, [location.search]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            if (isSignUp) {
                if (!name) {
                    setError('Please enter your name.');
                    setLoading(false);
                    return;
                }
                if (!agreed) {
                    setError('You must agree to the terms and privacy policy.');
                    setLoading(false);
                    return;
                }
                await signUpWithEmail(email, password, name, {
                    role: (signupParams.role || selectedRole) as TeamMember['role'],
                    teamId: signupParams.teamId,
                    marketCenterId: signupParams.mcId
                });
            } else {
                await signInWithEmail(email, password);
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors";
    const buttonClasses = "w-full flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors duration-200 disabled:bg-opacity-50 disabled:cursor-not-allowed";

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-8">
                    <img src={logoUrl} alt="AgentGPS Logo" className="mx-auto h-20 w-auto mb-3 logo-img" />
                    <h1 className="text-4xl font-black text-text-primary tracking-tighter">AgentGPS</h1>
                    <p className="text-text-secondary mt-1">Navigate Your Path to Success</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-center text-text-primary mb-6">
                        {isSignUp ? 'Create Your Account' : 'Welcome Back'}
                    </h2>
                    
                    {error && (
                        <p className="bg-destructive-surface text-destructive text-sm text-center p-3 rounded-md mb-4">
                            {error}
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <>
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={inputClasses}
                                        placeholder="e.g., Alex Rider"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="role" className="block text-sm font-medium text-text-secondary mb-1">I am a...</label>
                                    <select
                                        id="role"
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className={inputClasses}
                                        disabled={!!signupParams.role}
                                    >
                                        <option value="agent">Real Estate Agent</option>
                                        <option value="team_leader">Team Leader</option>
                                        <option value="productivity_coach">Productivity Coach</option>
                                        <option value="recruiter">Recruiter</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={inputClasses}
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={inputClasses}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {isSignUp && (
                             <div className="flex items-start pt-2">
                                <div className="flex items-center h-5">
                                    <input
                                        id="terms"
                                        name="terms"
                                        type="checkbox"
                                        checked={agreed}
                                        onChange={(e) => setAgreed(e.target.checked)}
                                        className="focus:ring-primary h-4 w-4 text-primary border-border rounded"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="terms" className="text-text-secondary">
                                        I agree to the <Link to="/terms" className="font-medium text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                             <button type="submit" disabled={loading || (isSignUp && !agreed)} className={buttonClasses}>
                                {loading ? <Spinner /> : (isSignUp ? 'Sign Up' : 'Sign In')}
                            </button>
                        </div>
                    </form>

                    <p className="text-center text-sm text-text-secondary mt-6">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError('');
                            }}
                            className="font-semibold text-primary hover:underline ml-1"
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;