import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFirestoreInstance } from '../firebaseConfig';

interface CreateNotificationPayload {
    userId: string; // recipient
    message: string;
    link?: string;
    triggeredByUserId?: string;
    triggeredByUserName?: string;
}

export const createNotification = async (payload: CreateNotificationPayload) => {
    try {
        const db = getFirestoreInstance();
        if (!db) {
            console.warn("Cannot create notification: Firebase is not configured.");
            return;
        }
        await addDoc(collection(db, 'notifications'), {
            ...payload,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};
