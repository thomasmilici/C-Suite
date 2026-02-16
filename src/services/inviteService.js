import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc, increment } from 'firebase/firestore';

// inviteType: 'one-shot' | 'periodic' | 'permanent'
// - one-shot:  maxUses=1, expires in 24h
// - periodic:  maxUses=N, expires in N days
// - permanent: maxUses=null (unlimited), no expiry

export const InviteService = {
    async generateInvite(type = 'one-shot', options = {}) {
        const token = Math.random().toString(36).substring(2, 8).toUpperCase();

        let expiresAt = null;
        let maxUses = null;

        if (type === 'one-shot') {
            const exp = new Date();
            exp.setHours(exp.getHours() + 24);
            expiresAt = exp;
            maxUses = 1;
        } else if (type === 'periodic') {
            const days = options.days || 7;
            const uses = options.maxUses || 10;
            const exp = new Date();
            exp.setDate(exp.getDate() + days);
            expiresAt = exp;
            maxUses = uses;
        } else if (type === 'permanent') {
            expiresAt = null;
            maxUses = null;
        }

        await addDoc(collection(db, "invites"), {
            token,
            type,
            createdAt: serverTimestamp(),
            expiresAt,
            maxUses,
            useCount: 0,
            status: 'active',
            label: options.label || null,
        });

        return token;
    },

    async validateInvite(token) {
        const q = query(collection(db, "invites"), where("token", "==", token), where("status", "==", "active"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return { valid: false, reason: "Invalid Token" };

        const inviteData = snapshot.docs[0].data();
        const now = new Date();

        // Check expiry (null = no expiry)
        if (inviteData.expiresAt) {
            const expiresAt = inviteData.expiresAt.toDate ? inviteData.expiresAt.toDate() : new Date(inviteData.expiresAt);
            if (now > expiresAt) {
                return { valid: false, reason: "Token Expired" };
            }
        }

        // Check max uses (null = unlimited)
        if (inviteData.maxUses !== null && inviteData.useCount >= inviteData.maxUses) {
            return { valid: false, reason: "Token already used" };
        }

        return { valid: true, docId: snapshot.docs[0].id, inviteData };
    },

    async consumeInvite(token, userId) {
        const validation = await this.validateInvite(token);
        if (!validation.valid) throw new Error(validation.reason);

        const { docId, inviteData } = validation;
        const inviteRef = doc(db, "invites", docId);

        const newUseCount = (inviteData.useCount || 0) + 1;
        const isExhausted = inviteData.maxUses !== null && newUseCount >= inviteData.maxUses;

        await updateDoc(inviteRef, {
            useCount: increment(1),
            status: isExhausted ? 'used' : 'active',
            lastUsedBy: userId,
            lastUsedAt: serverTimestamp(),
        });
    }
};
