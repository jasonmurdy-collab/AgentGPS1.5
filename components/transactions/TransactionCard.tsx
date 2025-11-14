import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProcessedTransaction } from '../../types';
import { Card } from '../ui/Card';
import { MoreVertical, Edit, Trash2, Calendar, MapPin, Tag } from 'lucide-react';

interface TransactionCardProps {
    transaction: ProcessedTransaction;
    onEdit: () => void;
    onDelete: () => void;
}

const Stat: React.FC<{ label: string; value: string; color?: string }> = React.memo(({ label, value, color = 'text-primary' }) => (
    <div>
        <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
));

const DateDisplay: React.FC<{ label: string; dateString: string | undefined; }> = React.memo(({ label, dateString }) => {
    if (!dateString) return null;
    const formattedDate = new Date(dateString).toLocaleDateString('en-CA', { timeZone: 'UTC' });
    return (
        <div>
            <p className="text-xs text-text-secondary">{label} Date</p>
            <p className="text-sm font-semibold text-text-primary">{formattedDate}</p>
        </div>
    );
});


export const TransactionCard: React.FC<TransactionCardProps> = React.memo(({ transaction, onEdit, onDelete }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);
    
    const formattedAcceptanceDate = new Date(transaction.acceptanceDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' // Use UTC to avoid timezone shifts from date string
    });

    const handleEditClick = useCallback(() => {
        onEdit();
        setIsMenuOpen(false);
    }, [onEdit]);

    const handleDeleteClick = useCallback(() => {
        onDelete();
        setIsMenuOpen(false);
    }, [onDelete]);

    return (
        <Card className="p-4">
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-2">
                    <h3 className="text-lg font-bold text-text-primary truncate" title={transaction.address}>{transaction.address}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary mt-1">
                        <span className="flex items-center gap-1"><Calendar size={12} /> Accepted: {formattedAcceptanceDate}</span>
                        <span className="flex items-center gap-1"><Tag size={12} /> {transaction.type}</span>
                    </div>
                </div>
                 <div className="relative flex-shrink-0" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-1 rounded-full hover:bg-primary/20">
                        <MoreVertical size={16} />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-36 bg-surface border border-border rounded-lg shadow-xl z-10">
                            <button onClick={handleEditClick} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-primary/10 rounded-t-lg">
                                <Edit size={14} /> Edit
                            </button>
                            <button onClick={handleDeleteClick} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-b-lg">
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t border-border pt-4">
                <Stat label="GCI" value={`$${transaction.gci.toLocaleString(undefined, {minimumFractionDigits: 2})}`} />
                <Stat label="Net Commission" value={`$${transaction.netCommission.toLocaleString(undefined, {minimumFractionDigits: 2})}`} color="text-success" />
                <Stat label="Company $" value={`$${transaction.companyDollarPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}`} color="text-destructive" />
                <Stat label="Royalty" value={`$${transaction.royaltyPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}`} color="text-destructive" />
            </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left border-t border-border pt-3 mt-3">
                <DateDisplay label="Conditions" dateString={transaction.conditionsDate} />
                <DateDisplay label="Closing" dateString={transaction.closeDate} />
                <DateDisplay label="Expiry" dateString={transaction.expiryDate} />
             </div>
             <p className="text-right text-xs text-text-secondary mt-3">HST on GCI: ${transaction.hstOnGci.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </Card>
    );
});