

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import type { TeamMember, MarketCenter } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updates: { newRole: TeamMember['role'], newMarketCenterId: string | null }) => Promise<void>;
    agent: TeamMember;
    marketCenters: MarketCenter[];
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, onSave, agent, marketCenters }) => {
    const { userData } = useAuth();
    const isCurrentUserSuperAdmin = userData?.isSuperAdmin;
    const [selectedRole, setSelectedRole] = useState<TeamMember['role']>(agent.role);
    const [selectedMarketCenterId, setSelectedMarketCenterId] = useState<string>(agent.marketCenterId || '');
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState('');

    const availableRoles: { value: TeamMember['role']; label: string }[] = [
        { value: 'agent', label: 'Agent' },
        { value: 'team_leader', 'label': 'Team Leader' },
        { value: 'productivity_coach', label: 'Productivity Coach' },
        { value: 'recruiter', label: 'Recruiter' },
        { value: 'market_center_admin', label: 'MC Admin' },
    ];
    
    // A Super Admin's role cannot be changed.
    if (agent.isSuperAdmin) {
        if(isOpen) onClose();
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setLocalError('');

        if (selectedRole === 'market_center_admin' && !selectedMarketCenterId) {
            setLocalError('Market Center must be selected for an MC Admin role.');
            setLoading(false);
            return;
        }

        try {
            await onSave({
                newRole: selectedRole,
                newMarketCenterId: selectedMarketCenterId === '' ? null : selectedMarketCenterId,
            });
            onClose();
        } catch (error) {
            console.error("Failed to update user:", error);
            alert("An error occurred while updating the user. Please try again.");
            setLocalError('Failed to save changes.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
            <Card className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 id="edit-user-title" className="text-xl font-bold">Edit User</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-primary/5" aria-label="Close edit user dialog"><X/></button>
                </div>
                <p className="mb-6 text-text-secondary">Editing user: <span className="font-bold text-text-primary">{agent.name}</span>.</p>
                {localError && (
                    <p className="bg-destructive-surface text-destructive text-sm text-center p-3 rounded-md mb-4">
                        {localError}
                    </p>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="role-select" className="block text-sm font-medium text-text-secondary mb-1">Role</label>
                            <select
                                id="role-select"
                                value={selectedRole}
                                onChange={e => setSelectedRole(e.target.value as TeamMember['role'])}
                                className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {availableRoles.map(role => (
                                    (role.value !== 'market_center_admin' || isCurrentUserSuperAdmin) &&
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="mc-select" className="block text-sm font-medium text-text-secondary mb