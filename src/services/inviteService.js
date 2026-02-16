import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export const InviteService = {
    async generateInvite() {
        // Generate a random 6-character alphanumeric token
        const token = Math.random().toString(36).substring(2, 8).toUpperCase();
        const expiration = new Date();
        expiration.setHours(expiration.getHours() + 24); // 24 hour expiry

        await addDoc(collection(db, "invites"), {
            token: token,
            createdAt: serverTimestamp(),
            expiresAt: expiration,
            status: 'active',
            usedBy: null
        });

        return token;
    },

    async validateInvite(token) {
        const q = query(collection(db, "invites"), where("token", "==", token), where("status", "==", "active"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return { valid: false, reason: "Invalid Token" };

        const inviteData = snapshot.docs[0].data();
        const now = new Date();

        // Firestore Timestamp to Date conversion if needed
        const expiresAt = inviteData.expiresAt.toDate ? inviteData.expiresAt.toDate() : new Date(inviteData.expiresAt);

        if (now > expiresAt) {
            return { valid: false, reason: "Token Expired" };
        }

        return { valid: true, docId: snapshot.docs[0].id };
    },

    async consumeInvite(token, userId) {
        const validation = await this.validateInvite(token);
        if (!validation.valid) throw new Error(validation.reason);

        const inviteRef = doc(db, "invites", validation.docId);
        await updateDoc(inviteRef, {
            status: 'used',
            usedBy: userId,
            usedAt: serverTimestamp()
        });
    }
};
