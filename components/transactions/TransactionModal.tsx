import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';
import { Transaction } from '../../types';
import { Spinner } from '../ui/Spinner';

type TransactionFormData = Omit<Transaction, 'id' | 'userId'>;

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  transactionToEdit?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSubmit, transactionToEdit }) => {
    const [formData, setFormData] = useState<TransactionFormData>({
        teamId: null,
        marketCenterId: null,
        acceptanceDate: new Date().toISOString().split('T')[0],
        address: '',
        type: 'Listing Sale',
        salePrice: 0,
        commissionRate: 2.5,
        conditionsDate: '',
        closeDate: '',
        expiryDate: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const toInputDate = (dateString: string | undefined) => dateString ? new Date(dateString).toISOString().split('T')[0] : '';
        
        if (isOpen) {
            setLoading(false);
            if (transactionToEdit) {
                setFormData({
                    teamId: transactionToEdit.teamId,
                    marketCenterId: transactionToEdit.marketCenterId,
                    acceptanceDate: toInputDate(transactionToEdit.acceptanceDate),
                    address: transactionToEdit.address,
                    type: transactionToEdit.type,
                    salePrice: transactionToEdit.salePrice,
                    commissionRate: transactionToEdit.commissionRate,
                    conditionsDate: toInputDate(transactionToEdit.conditionsDate),
                    closeDate: toInputDate(transactionToEdit.closeDate),
                    expiryDate: toInputDate(transactionToEdit.expiryDate),
                });
            } else {
                 setFormData({
                    teamId: null,
                    marketCenterId: null,
                    acceptanceDate: new Date().toISOString().split('T')[0],
                    address: '',
                    type: 'Listing Sale',
                    salePrice: 0,
                    commissionRate: 2.5,
                    conditionsDate: '',
                    closeDate: '',
                    expiryDate: '',
                });
            }
        }
    }, [isOpen, transactionToEdit]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'number' ? parseFloat(value) || 0 : value 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.address || formData.salePrice <= 0 || formData.commissionRate <= 0) {
            alert('Please fill out address, sale price, and commission rate with valid values.');
            return;
        }
        setLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error("Failed to save transaction:", error);
            alert("There was an error saving the transaction.");
            setLoading(false);
        }
    };
    
    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-text-primary">{transactionToEdit ? 'Edit Transaction' : 'Log New Transaction'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-text-primary/5"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="address" className={labelClasses}>Property Address</label>
                        <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} className={inputClasses} placeholder="123 Main St" required />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="salePrice" className={labelClasses}>Sale Price</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">$</span>
                                <input type="number" id="salePrice" name="salePrice" value={formData.salePrice || ''} onChange={handleChange} className={`${inputClasses} pl-7`} placeholder="500000" required />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="commissionRate" className={labelClasses}>Commission Rate</label>
                            <div className="relative">
                                <input type="number" step="0.01" id="commissionRate" name="commissionRate" value={formData.commissionRate || ''} onChange={handleChange} className={`${inputClasses} pr-7`} placeholder="2.5" required />
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="type" className={labelClasses}>Transaction Type</label>
                            <select id="type" name="type" value={formData.type} onChange={handleChange} className={inputClasses}>
                                <option value="Listing Sale">Listing Sale</option>
                                <option value="Buyer Sale">Buyer Sale</option>
                                <option value="Lease">Lease</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <p className="text-sm font-medium text-text-secondary mb-2">Key Dates</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="acceptanceDate" className={labelClasses}>Acceptance Date</label>
                                <input type="date" id="acceptanceDate" name="acceptanceDate" value={formData.acceptanceDate} onChange={handleChange} className={inputClasses} required />
                            </div>
                             <div>
                                <label htmlFor="conditionsDate" className={labelClasses}>Conditions Date <span className="text-xs">(Optional)</span></label>
                                <input type="date" id="conditionsDate" name="conditionsDate" value={formData.conditionsDate || ''} onChange={handleChange} className={inputClasses} />
                            </div>
                            <div>
                                <label htmlFor="closeDate" className={labelClasses}>Close Date <span className="text-xs">(Optional)</span></label>
                                <input type="date" id="closeDate" name="closeDate" value={formData.closeDate || ''} onChange={handleChange} className={inputClasses} />
                            </div>
                            <div>
                                <label htmlFor="expiryDate" className={labelClasses}>Expiry Date <span className="text-xs">(Optional)</span></label>
                                <input type="date" id="expiryDate" name="expiryDate" value={formData.expiryDate || ''} onChange={handleChange} className={inputClasses} />
                            </div>
                        </div>
                    </div>


                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-text-primary/5">Cancel</button>
                        <button type="submit" disabled={loading} className="min-w-[120px] flex justify-center items-center py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold hover:bg-opacity-90 disabled:bg-opacity-50">
                            {loading ? <Spinner /> : (transactionToEdit ? 'Save Changes' : 'Log Transaction')}
                        </button>
                    </div>
                </form>
            </Card>
        </div>,
        document.body
    );
};