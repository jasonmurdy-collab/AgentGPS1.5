import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, User, Users, ExternalLink, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import type { LiveSession } from '../../types';

interface LiveSessionCardProps {
  session: LiveSession;
  onEnter?: (session: LiveSession) => void;
}

export const LiveSessionCard: React.FC<LiveSessionCardProps> = ({ session, onEnter }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      
      if (now >= start && now <= end) {
        setIsLive(true);
        setTimeLeft('LIVE NOW');
      } else if (now > end) {
        setIsLive(false);
        setTimeLeft('ENDED');
      } else {
        const diff = start - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
          setTimeLeft(`${Math.floor(hours / 24)}d left`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m left`);
        } else {
          setTimeLeft(`${minutes}m left`);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session.startTime, session.endTime]);

  const handleJoin = () => {
    window.open(session.meetingUrl, '_blank');
    if (onEnter) onEnter(session);
  };

  const isClientConsult = session.sessionType === 'client-consult';

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-xl border-2 ${isLive ? 'border-primary' : 'border-transparent'}`}>
      {isLive && (
        <div className="absolute top-0 right-0 bg-primary text-on-accent px-4 py-1 text-[10px] font-black tracking-widest uppercase rounded-bl-xl animate-pulse">
          Live Session
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">
              {isClientConsult ? (
                <><User size={12} className="text-accent-secondary" /> 1-ON-1 CONSULTATION</>
              ) : (
                <><Users size={12} className="text-accent-primary" /> MC LIVE TRAINING</>
              )}
            </div>
            <h3 className="text-xl font-black tracking-tight text-text-primary leading-tight">
              {session.title}
            </h3>
          </div>
          <div className={`flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-hover border border-border`}>
            <Video size={24} className={isLive ? 'text-primary' : 'text-text-secondary'} />
          </div>
        </div>

        <p className="text-sm text-text-secondary line-clamp-2 min-h-[2.5rem]">
          {session.description}
        </p>

        <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">
              <Calendar size={12} /> DATE
            </div>
            <div className="text-sm font-bold">
              {new Date(session.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">
              <Clock size={12} /> TIME
            </div>
            <div className="text-sm font-bold">
              {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">STATUS</span>
            <span className={`text-xs font-bold ${isLive ? 'text-primary' : 'text-text-primary'}`}>
              {timeLeft}
            </span>
          </div>
          
          <button
            onClick={handleJoin}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${
              isLive 
                ? 'bg-primary text-on-accent hover:scale-105 shadow-lg shadow-primary/20' 
                : 'bg-surface-hover text-text-primary hover:bg-border'
            }`}
          >
            {isLive ? 'ENTER SESSION' : 'SCHEDULED'}
            {isLive ? <ArrowRight size={16} /> : <ExternalLink size={16} />}
          </button>
        </div>

        {isClientConsult && session.clientName && (
          <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-secondary/10 flex items-center justify-center text-accent-secondary font-bold text-xs">
              {session.clientName.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">CLIENT</span>
              <span className="text-xs font-bold">{session.clientName}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
