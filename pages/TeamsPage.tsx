

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Users, UserPlus, LogOut, ClipboardCopy, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import type { TeamMember, Team } from '../types';
import { getFirestoreInstance } from '../firebaseConfig';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { processTeamDoc, processUserDoc } from '../lib/firestoreUtils';

const TeamMemberCard: React.FC<{ member: TeamMember, isCurrentUser: boolean }> = ({ member, isCurrentUser }) => {
  const formatRole = (role: TeamMember['role']) => {
    if (role === 'team_leader') return 'Team Leader';
    if (role === 'productivity_coach') return 'Coach';
    if (role === 'recruiter') return 'Recruiter';
    return 'Agent';
  };

  return (
    <Card>
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-on-accent font-bold text-2xl">
          {(member.name || ' ').charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-lg font-bold text-text-primary truncate">{member.name} {isCurrentUser && '(You)'}</h3>
          <p className="text-sm text-text-secondary">{formatRole(member.role)}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2 text-center border-t border-border pt-4">
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wider">GCI</p>
          <p className="text-xl font-bold text-text-primary">${(member.gci || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wider">Listings</p>
          <p className="text-xl font-bold text-text-primary">{(member.listings || 0).toLocaleString()}</p>
        </div>
      </div>
    </Card>
  );
};

const TeamsPage: React.FC = () => {
  const { user, userData, createTeam, leaveTeam } = useAuth();
  const [loadingAction, setLoadingAction] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');


  const fetchTeamData = useCallback(async () => {
    if (userData?.teamId) {
        setLoadingTeam(true);
        try {
            const db = getFirestoreInstance();
            // Fetch team doc
            const teamDocRef = doc(db, 'teams', userData.teamId);
            const teamDocSnap = await getDoc(teamDocRef);
            setTeam(teamDocSnap.exists() ? processTeamDoc(teamDocSnap) : null);

            // Fetch members
            const membersQuery = query(collection(db, 'users'), where('teamId', '==', userData.teamId));
            const membersSnapshot = await getDocs(membersQuery);
            const membersData = membersSnapshot.docs.map(processUserDoc);
            setTeamMembers(membersData);

        } catch (error) {
            console.error("Error fetching team data:", error);
            setTeam(null);
            setTeamMembers([]);
        } finally {
            setLoadingTeam(false);
        }
    } else {
        setTeam(null);
        setTeamMembers([]);
        setLoadingTeam(false);
    }
  }, [userData?.teamId]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);


  const handleCreateTeam = async () => {
    const teamName = window.prompt("Please enter your desired team name:");

    if (teamName && teamName.trim() !== '') {
        if (window.confirm(`Are you sure you want to create the team "${teamName.trim()}" and become a Team Leader? This will change your role.`)) {
            setLoadingAction(true);
            try {
                await createTeam(teamName.trim());
            } catch (error) {
                console.error("Failed to create team:", error);
                alert("There was an error creating your team. Please try again.");
            } finally {
                setLoadingAction(false);
            }
        }
    } else if (teamName !== null) { // User clicked OK but left it empty
        alert("Team name cannot be empty.");
    }
  };
  
  const handleLeaveTeam = async () => {
    if (window.confirm("Are you sure you want to leave your team?")) {
        setLoadingAction(true);
        try {
            const result = await leaveTeam();
            if (!result.success) {
                alert(result.message);
            }
        } catch (error) {
            console.error("Failed to leave team:", error);
            alert("There was an error leaving your team. Please try again.");
        } finally {
            setLoadingAction(false);
        }
    }
  };

  const sortedTeamMembers = useMemo(() => {
    return [...teamMembers]
      .sort((a, b) => {
          if (a.id === user?.uid) return -1;
          if (b.id === user?.uid) return 1;
          if (a.role === 'team_leader' && b.role !== 'team_leader') return -1;
          if (b.role === 'team_leader' && a.role !== 'team_leader') return 1;
          return (a.name || '').localeCompare(b.name || '');
      });
  }, [teamMembers, user?.uid]);
  
  const handleCopyCode = () => {
    if (!team?.teamCode) return;
    navigator.clipboard.writeText(team.teamCode).then(() => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };


  const renderContent = () => {
    if (loadingTeam) {
        return <div className="flex justify-center items-center py-8"><Spinner/></div>;
    }

    if (userData?.teamId && team) {
        return (
            <div>
                <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">{team.name}</h2>
                        <button onClick={fetchTeamData} disabled={loadingTeam} className="p-2 text-text-secondary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50">
                            <RefreshCw size={16} className={loadingTeam ? 'animate-spin' : ''}/>
                        </button>
                    </div>
                    {userData.role !== 'team_leader' && (
                        <button
                            onClick={handleLeaveTeam}
                            disabled={loadingAction}
                            className="flex items-center justify-center bg-destructive text-on-destructive font-semibold py-2 px-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                        >
                            {loadingAction ? <Spinner className="w-4 h-4" /> : <><LogOut size={16} className="mr-2" />Leave Team</>}
                        </button>
                    )}
                </div>

                {userData.role === 'team_leader' && (
                    <Card className="mb-6 bg-primary/5 border-primary/20">
                        <h3 className="text-lg font-bold text-text-primary">Team Invite Code</h3>
                        <p className="text-sm text-text-secondary mb-3">Share this code with agents so they can join your team from their profile page.</p>
                        <div className="flex items-center gap-2 bg-input p-2 rounded-lg">
                            <p className="flex-1 font-mono text-center text-lg tracking-widest text-text-primary">
                                {team.teamCode}
                            </p>
                            <button 
                                onClick={handleCopyCode} 
                                className="p-2 rounded-md text-text-secondary hover:bg-accent/20 hover:text-text-primary disabled:cursor-not-allowed transition-colors"
                                aria-label="Copy code"
                            >
                                {copyStatus === 'copied' ? (
                                    <span className="text-xs font-semibold text-accent">Copied!</span>
                                ) : (
                                    <ClipboardCopy size={20} />
                                )}
                            </button>
                        </div>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedTeamMembers.map((member) => (
                       <TeamMemberCard key={member.id} member={member} isCurrentUser={member.id === user?.uid} />
                    ))}
                </div>
            </div>
        );
    }
    
    if (userData?.role === 'agent' && !userData.teamId) {
        return (
            <div className="text-center py-8">
                <Users size={48} className="mx-auto text-accent-secondary mb-4" />
                <h2 className="text-2xl font-bold">Join or Create a Team</h2>
                <p className="text-text-secondary mt-2 max-w-md mx-auto">
                    To join a team, go to your Profile page and enter your team's code. To start your own team and become a Team Leader, click the 'Create Team' button.
                </p>
            </div>
        );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Team Hub</h1>
              <p className="text-lg text-text-secondary mt-1">Collaborate, compete, and conquer your goals together.</p>
          </div>
          {userData?.role === 'agent' && !userData.teamId && (
              <button onClick={handleCreateTeam} disabled={loadingAction} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50">
                  {loadingAction ? <Spinner /> : <UserPlus className="mr-2" size={20} />}
                  Create Team
              </button>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:p-8 pb-8">
        <Card>
          {renderContent()}
        </Card>
      </div>
    </div>
  );
};

export default TeamsPage;
