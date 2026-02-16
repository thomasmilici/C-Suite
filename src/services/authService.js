import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export const AuthService = {
    loginWithGoogle: async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user exists, if not create basic profile
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    role: 'member', // Default role
                    rank_score: 0,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });
            } else {
                await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
            }

            return user;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    },

    logout: async () => {
        await signOut(auth);
    },

    // Invite Logic: Admin Generates Token (Implementation in Component)
    // Invite Logic: Member Joins via Token (Implementation in Component)
};
