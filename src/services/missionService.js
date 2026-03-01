import { collection, getDocs, doc, setDoc, getDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export async function getMissions() {
    const q = query(collection(db, 'missions'), orderBy('name'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getMission(id) {
    const snap = await getDoc(doc(db, 'missions', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

export function subscribeMissions(callback) {
    const q = query(collection(db, 'missions'), orderBy('name'));
    return onSnapshot(q, snap => {
        callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
}

export function subscribeMission(id, callback) {
    return onSnapshot(doc(db, 'missions', id), snap => {
        if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
}

export async function createMission(id, name, description) {
    await setDoc(doc(db, 'missions', id), {
        name,
        description,
        isSetupComplete: false,
        masterPrompt: '',
        layoutPreferences: [],
        createdAt: new Date()
    });
}

export async function updateMission(id, fields) {
    await updateDoc(doc(db, 'missions', id), {
        ...fields,
        updatedAt: new Date()
    });
}
