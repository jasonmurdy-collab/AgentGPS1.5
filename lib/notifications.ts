

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
        await addDoc(collection(getFirestoreInstance(), 'notifications'), {
            ...payload,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};
