

import type { DocumentSnapshot, Timestamp } from 'firebase/firestore';
import type { Goal, Transaction, Notification, DailyTrackerData, ProspectingSession, CommissionProfile, Playbook, TeamMember, Team, LearningPath, Module, Lesson, PerformanceLog, Candidate, CandidateActivity, ClientLead, ClientLeadActivity, TodoItem } from '../types';
import { GoalType } from '../types';

// Helper to serialize Firestore Timestamps to ISO strings for Goals
export const processGoalDoc = (doc: DocumentSnapshot): Goal => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        title: data.title || '',
        type: data.type || GoalType.Weekly,
        metric: data.metric || '',
        targetValue: data.targetValue || 0,
        currentValue: data.currentValue || 0,
        visibility: data.visibility || 'solo',
        userName: data.userName || '',
        userId: data.userId || '',
        teamId: data.teamId || null,
        marketCenterId: data.marketCenterId || null,
        coachId: data.coachId || null,
        createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : data.createdAt || null,
        startDate: (data.startDate as Timestamp)?.toDate ? (data.startDate as Timestamp).toDate().toISOString() : data.startDate || null,
        endDate: (data.endDate as Timestamp)?.toDate ? (data.endDate as Timestamp).toDate().toISOString() : data.endDate || null,
        templateId: data.templateId || '',
        isArchived: data.isArchived || false,
    };
};

// Helper to serialize Firestore Timestamps to ISO strings for Transactions
export const processTransactionDoc = (doc: DocumentSnapshot): Transaction => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        userId: data.userId || '',
        teamId: data.teamId || null,
        marketCenterId: data.marketCenterId || null,
        coachId: data.coachId || null,
        acceptanceDate: (data.acceptanceDate as Timestamp)?.toDate ? (data.acceptanceDate as Timestamp).toDate().toISOString() : data.acceptanceDate || new Date().toISOString(),
        address: data.address || '',
        type: data.type || 'Listing Sale',
        salePrice: data.salePrice || 0,
        commissionRate: data.commissionRate || 0,
        closeDate: (data.closeDate as Timestamp)?.toDate ? (data.closeDate as Timestamp).toDate().toISOString() : data.closeDate || undefined,
        conditionsDate: (data.conditionsDate as Timestamp)?.toDate ? (data.conditionsDate as Timestamp).toDate().toISOString() : data.conditionsDate || undefined,
        expiryDate: (data.expiryDate as Timestamp)?.toDate ? (data.expiryDate as Timestamp).toDate().toISOString() : data.expiryDate || undefined,
    };
};

// Helper to serialize Firestore Timestamps to ISO strings for Notifications
export const processNotificationDoc = (doc: DocumentSnapshot): Notification => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        userId: data.userId || '',
        message: data.message || '',
        link: data.link || '',
        read: data.read || false,
        createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        triggeredByUserId: data.triggeredByUserId || '',
        triggeredByUserName: data.triggeredByUserName || '',
    };
};

export const processCommissionProfileDoc = (doc: DocumentSnapshot): CommissionProfile => {
    const data = doc.data() || {};
    const anniversaryDate = (data.capAnniversaryDate as Timestamp)?.toDate ? (data.capAnniversaryDate as Timestamp).toDate().toISOString() : data.capAnniversaryDate;
    return {
        id: doc.id,
        commissionSplit: data.commissionSplit ?? 0,
        commissionCap: data.commissionCap ?? 0,
        postCapTransactionFee: data.postCapTransactionFee ?? 0,
        royaltyFee: data.royaltyFee ?? 0,
        royaltyFeeCap: data.royaltyFeeCap ?? 0,
        capAnniversaryDate: anniversaryDate || new Date().toISOString(),
        marketCenterId: data.marketCenterId || null,
    };
};

// Helper to serialize Firestore Timestamps to ISO strings for DailyTrackers
export const processDailyTrackerDoc = (doc: DocumentSnapshot): DailyTrackerData => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        userId: data.userId || '',
        date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate().toISOString().split('T')[0] : String(data.date || ''),
        teamId: data.teamId || null,
        marketCenterId: data.marketCenterId || null,
        coachId: data.coachId || null,
        dials: data.dials || 0,
        doorsKnocked: data.doorsKnocked || 0,
        knocksAnswered: data.knocksAnswered || 0,
        pointsActivities: data.pointsActivities || {},
        prospectingSessions: (data.prospectingSessions || [{ startTime: '', endTime: '' }, { startTime: '', endTime: '' }]) as [ProspectingSession, ProspectingSession],
        prospectingTotals: data.prospectingTotals || { contacts: 0, aptsSet: 0, listingAptsSet: 0, buyerAptsSet: 0, lenderAptsSet: 0 },
        notes: data.notes || '',
        schedule: data.schedule || {},
    };
};

export const processPerformanceLogDoc = (doc: DocumentSnapshot): PerformanceLog => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        agentId: data.agentId || '',
        coachId: data.coachId || '',
        teamId: data.teamId || null,
        marketCenterId: data.marketCenterId || null,
        date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate().toISOString() : data.date || new Date().toISOString(),
        type: data.type || 'coaching_session',
        notes: data.notes || '',
        eventName: data.eventName || '',
        attended: data.attended ?? false,
        ratings: data.ratings || null,
        goalProgress: data.goalProgress || [],
        isArchived: data.isArchived || false,
    };
};

export const processUserDoc = (doc: DocumentSnapshot): TeamMember => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        name: data.name || 'Unknown User',
        email: data.email || '',
        bio: data.bio || '',
        gci: data.gci || 0,
        listings: data.listings || 0,
        calls: data.calls || 0,
        appointments: data.appointments || 0,
        goalScore: data.goalScore || 0,
        role: data.role || 'agent',
        teamId: data.teamId || null,
        marketCenterId: data.marketCenterId || null,
        theme: data.theme || 'light',
        isNewAgent: data.isNewAgent ?? false,
        coachId: data.coachId || null,
        contributingAgentIds: data.contributingAgentIds || {},
        isSuperAdmin: data.isSuperAdmin || false,
        playbookProgress: data.playbookProgress || {},
        assignedLearningPathId: data.assignedLearningPathId || null,
        newAgentResources: data.newAgentResources || {},
        onboardingChecklistProgress: data.onboardingChecklistProgress || [],
    };
};

export const processTeamDoc = (doc: DocumentSnapshot): Team => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        name: data.name || 'Unnamed Team',
        creatorId: data.creatorId || '',
        memberIds: data.memberIds || [],
        teamCode: data.teamCode || '',
    };
};

export const processPlaybookDoc = (doc: DocumentSnapshot): Playbook => {
    const data = doc.data() || {};
    const pb: Playbook = {
        id: doc.id,
        creatorId: data.creatorId || '',
        marketCenterId: data.marketCenterId || null,
        teamId: data.teamId || null,
        title: data.title || 'Untitled Playbook',
        description: data.description || '',
        createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        modules: (data.modules || []).map((m: Partial<Module>) => ({
            ...m,
            lessons: (m.lessons || []).sort((a: Lesson, b: Lesson) => (a.order || 0) - (b.order || 0))
        })).sort((a: Module, b: Module) => (a.order || 0) - (b.order || 0)),
    };
    return pb;
};

export const processLearningPathDoc = (doc: DocumentSnapshot): LearningPath => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        creatorId: data.creatorId || '',
        marketCenterId: data.marketCenterId || null,
        teamId: data.teamId || null,
        title: data.title || 'Untitled Path',
        description: data.description || '',
        playbookIds: data.playbookIds || [],
        createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
    };
};

export const processClientLeadDoc = (doc: DocumentSnapshot): ClientLead => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        stage: data.stage || 'New Lead',
        ownerId: data.ownerId || '',
        teamId: data.teamId || null,
        marketCenterId: data.marketCenterId || null,
        createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        lastContacted: (data.lastContacted as Timestamp)?.toDate ? (data.lastContacted as Timestamp).toDate().toISOString() : new Date().toISOString(),
        leadSource: data.leadSource || '',
        budget: data.budget || 0,
        propertyType: data.propertyType || '',
        notes: data.notes || '',
    };
};

export const processClientLeadActivityDoc = (doc: DocumentSnapshot): ClientLeadActivity => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        clientLeadId: data.clientLeadId || '',
        userId: data.userId || '',
        userName: data.userName || '',
        createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        note: data.note || '',
    };
};

// Helper to serialize Firestore Timestamps to ISO strings for TodoItem
export const processTodoItemDoc = (doc: DocumentSnapshot): TodoItem => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        userId: data.userId || '',
        text: data.text || '',
        dueDate: data.dueDate || null, // Already ISO string or null
        isCompleted: data.isCompleted || false,
        createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        priority: data.priority || 'Medium',
    };
};