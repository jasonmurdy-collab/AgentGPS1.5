
import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { X, Send, MessageSquare, AlertCircle } from 'lucide-react';

interface SMSModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipientName: string;
    recipientPhone: string;
    onSend: (message: string) => Promise<void>;
    isConfigured: boolean;
}

export const SMSModal: FC<SMSModalProps> = ({ isOpen, onClose, recipientName, recipientPhone, onSend, isConfigured }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!message.trim() || !isConfigured) return;
        setSending(true);
        setError(null);
        try {
            await onSend(message.trim());
            onClose();
            setMessage('');
        } catch (e: any) {
            setError(e.message || 'Failed to send. Check Twilio SID/Token and verified numbers.');
        } finally {
            setSending(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="text-primary"/> Text {recipientName}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-primary/10"><X/></button>
                </div>
                {!isConfigured ? (
                    <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl text-center">
                        <p className="text-sm font-semibold text-warning">Twilio Not Configured</p>
                        <p className="text-xs text-text-secondary mt-1 mb-3">Please add your Twilio credentials in your Profile settings to send texts.</p>
                        <Link to="/profile" className="text-xs font-bold text-primary hover:underline">Go to Profile &rarr;</Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs text-text-secondary">To: <strong>{recipientPhone}</strong></p>
                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-destructive animate-in fade-in zoom-in-95">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <p className="text-xs font-medium">{error}</p>
                            </div>
                        )}
                        <textarea 
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className="w-full min-h-[120px] bg-input border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Type your message..."
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-text-secondary">Cancel</button>
                            <button 
                                onClick={handleSend}
                                disabled={sending || !message.trim()}
                                className="flex items-center gap-2 bg-primary text-on-accent px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {sending ? <Spinner className="w-4 h-4"/> : <><Send size={16}/> Send SMS</>}
                            </button>
                        </div>
                    </div>
                )}
            </Card>
        </div>,
        document.body
    );
};
