



import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import type { TeamMember } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface ChangeRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newRole: TeamMember['role']) => Promise<void>;
    agent: TeamMember;
}

export const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({ isOpen, onClose, onSave, agent }) => {
    const { userData } = useAuth();
    const isCurrentUserSuperAdmin = userData?.isSuperAdmin;
    const [selectedRole, setSelectedRole] = useState<TeamMember['role']>(agent.role);
    const [loading, setLoading] = useState(false);

    const availableRoles: { value: TeamMember['role']; label: string }[] = [
        { value: 'agent', label: 'Agent' },
        { value: 'team_leader', label: 'Team Leader' },
        { value: 'productivity_coach', label: 'Productivity Coach' },
        { value: 'recruiter', label: 'Recruiter' },
        { value: 'market_center_admin', label: 'MC Admin' },
    ];
    
    // A Super Admin's role cannot be changed.
    // A non-Super Admin cannot change an MC Admin's role.
    if (agent.isSuperAdmin || (!isCurrentUserSuperAdmin && agent.role === 'market_center_admin')) {
        if(isOpen) onClose();
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(selectedRole);
            onClose();
        } catch (error) {
            console.error("Failed to change role:", error);
            alert("An error occurred while changing the role. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Change Role</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-primary/5"><X/></button>
                </div>
                <p className="mb-6 text-text-secondary">Change the role for <span className="font-bold text-text-primary">{agent.name}</span>.</p>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="role-select" className="block text-sm font-medium text-text-secondary mb-1">New Role</label>
                            <select
                                id="role-select"
                                value={selectedRole}
                                onChange={e => setSelectedRole(e.target.value as TeamMember['role'])}
                                className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {availableRoles.map(role => (
                                    // Only Super Admins see the option to make someone an MC Admin
                                    (role.value !== 'market_center_admin' || isCurrentUserSuperAdmin) &&
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-6">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-primary/10">Cancel</button>
                        <button type="submit" disabled={loading || selectedRole === agent.role} className="min-w-[120px] flex justify-center items-center py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold hover:bg-opacity-90 disabled:bg-opacity-50">
                            {loading ? <Spinner /> : 'Save Role'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>,
        document.body
    );
};