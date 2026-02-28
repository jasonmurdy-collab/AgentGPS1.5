import React, { useState } from 'react';
import { X, Calendar, Clock, Users, Video, Send, Globe } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import type { LiveSession, TeamMember } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getFirestoreInstance } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (session: LiveSession) => void;
}

export const ScheduleSessionModal: React.FC<ScheduleSessionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sessionType, setSessionType] = useState<'client-consult' | 'mc-training'>('client-consult');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [platform, setPlatform] = useState<'google-meet' | 'zoom'>('google-meet');
  
  // For client-consult
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  
  // For mc-training
  const [targetRoles, setTargetRoles] = useState<TeamMember['role'][]>([]);

  if (!isOpen) return null;

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;

    setLoading(true);
    try {
      // In a real app, this would call a Cloud Function to generate the meeting link
      // For this implementation, we'll simulate the link generation
      // The architectural explanation will cover the backend logic
      const simulatedMeetingUrl = platform === 'google-meet' 
        ? `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`
        : `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}`;

      const sessionData: Omit<LiveSession, 'id'> = {
        title,
        description,
        startTime: new Date(`${date}T${startTime}`).toISOString(),
        endTime: new Date(`${date}T${endTime}`).toISOString(),
        sessionType,
        platform,
        meetingUrl: simulatedMeetingUrl,
        hostId: user.uid,
        hostName: userData.name,
        marketCenterId: userData.marketCenterId,
        teamId: userData.teamId,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        distribution: {
          emailSent: true, // Simulated
          notificationSent: true, // Simulated
          sentAt: new Date().toISOString()
        }
      };

      if (sessionType === 'client-consult') {
        sessionData.clientName = clientName;
        sessionData.clientEmail = clientEmail;
      } else {
        sessionData.targetAudience = {
          roles: targetRoles
        };
      }

      const db = getFirestoreInstance();
      const docRef = await addDoc(collection(db, 'liveSessions'), {
        ...sessionData,
        createdAt: serverTimestamp()
      });

      if (onSuccess) {
        onSuccess({ id: docRef.id, ...sessionData });
      }
      onClose();
    } catch (error) {
      console.error("Error scheduling session:", error);
      alert("Failed to schedule session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-black tracking-tighter text-text-primary uppercase">Schedule Live Session</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSchedule} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Session Type Toggle */}
          <div className="flex p-1 bg-surface-hover rounded-xl">
            <button
              type="button"
              onClick={() => setSessionType('client-consult')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${sessionType === 'client-consult' ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              1-on-1 Consultation
            </button>
            <button
              type="button"
              onClick={() => setSessionType('mc-training')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${sessionType === 'mc-training' ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              MC Live Training
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-text-secondary uppercase tracking-widest mb-1">Session Topic</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Listing Presentation Review"
                  className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-text-secondary uppercase tracking-widest mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will be covered?"
                  className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-24 resize-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-text-secondary uppercase tracking-widest mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-input border border-border rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-text-secondary uppercase tracking-widest mb-1">Start</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                      required
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-input border border-border rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-secondary uppercase tracking-widest mb-1">End</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                      required
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-input border border-border rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <label className="block text-xs font-black text-text-secondary uppercase tracking-widest mb-3 text-center">Select Platform</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPlatform('google-meet')}
                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${platform === 'google-meet' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-text-secondary text-text-secondary'}`}
              >
                <Video size={24} />
                <span className="font-bold">Google Meet</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform('zoom')}
                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${platform === 'zoom' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-text-secondary text-text-secondary'}`}
              >
                <Video size={24} />
                <span className="font-bold">Zoom</span>
              </button>
            </div>
          </div>

          {sessionType === 'client-consult' ? (
            <div className="bg-surface-hover p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Users size={20} />
                <h3 className="font-bold">Client Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client Full Name"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
                <input
                  required
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Client Email Address"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <p className="text-xs text-text-secondary italic">
                The client will receive an automated invitation with the meeting link once scheduled.
              </p>
            </div>
          ) : (
            <div className="bg-surface-hover p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Globe size={20} />
                <h3 className="font-bold">Audience Targeting</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['agent', 'team_leader', 'productivity_coach'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      if (targetRoles.includes(role as any)) {
                        setTargetRoles(targetRoles.filter(r => r !== role));
                      } else {
                        setTargetRoles([...targetRoles, role as any]);
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${targetRoles.includes(role as any) ? 'bg-primary border-primary text-on-accent' : 'border-border text-text-secondary hover:border-text-secondary'}`}
                  >
                    {role.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-secondary italic">
                This session will appear on the LMS dashboard for all users with the selected roles in your Market Center.
              </p>
            </div>
          )}

          <div className="pt-4">
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-primary text-on-accent font-black py-4 rounded-2xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <Send size={20} />
                  GENERATE & DISTRIBUTE SESSION
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
