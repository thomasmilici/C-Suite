/**
 * meetingService.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Service layer for stakeholder management: `stakeholders` and `meetings` collections.
 *
 * @typedef {Object} Stakeholder
 * @property {string}   id
 * @property {string}   name
 * @property {string}   role         - job title / function
 * @property {string}   organization - company / division
 * @property {string}   influence    - "High" | "Medium" | "Low"
 * @property {string}   alignment    - "Ally" | "Neutral" | "Critical" | "Unknown"
 * @property {string}   email
 * @property {string}   notes        - relationship notes / context
 * @property {string[]} event_ids    - related dossier IDs
 * @property {string}   createdBy
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 *
 * @typedef {Object} Meeting
 * @property {string}   id
 * @property {string}   title
 * @property {string}   date         - ISO "YYYY-MM-DD"
 * @property {string}   time         - "HH:MM"
 * @property {string[]} participants - stakeholder IDs or free-text names
 * @property {string}   objective    - scopo strategico dell'incontro
 * @property {string}   agenda       - agenda items (markdown)
 * @property {string}   notes        - meeting notes
 * @property {string}   outcome      - outcome / decisione presa
 * @property {string}   status       - "scheduled" | "completed" | "cancelled"
 * @property {string}   event_id     - linked dossier
 * @property {string}   createdBy
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 */

import {
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, where, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export const INFLUENCE_OPTIONS = ['High', 'Medium', 'Low'];
export const ALIGNMENT_OPTIONS = ['Ally', 'Neutral', 'Critical', 'Unknown'];
export const MEETING_STATUS = ['scheduled', 'completed', 'cancelled'];

export const ALIGNMENT_STYLE = {
    Ally: 'border-emerald-800/60 bg-emerald-950/20 text-emerald-400',
    Neutral: 'border-zinc-700 bg-zinc-900/40 text-zinc-400',
    Critical: 'border-red-900/60 bg-red-950/20 text-red-400',
    Unknown: 'border-zinc-800 bg-zinc-900/20 text-zinc-600',
};

export function emptyStakeholder(uid) {
    return { name: '', role: '', organization: '', influence: 'Medium', alignment: 'Unknown', email: '', notes: '', event_ids: [], createdBy: uid || null };
}

export function emptyMeeting(uid) {
    return { title: '', date: '', time: '', participants: [], objective: '', agenda: '', notes: '', outcome: '', status: 'scheduled', event_id: '', createdBy: uid || null };
}

// ── Stakeholders ───────────────────────────────────────────────────────────────

export function subscribeStakeholders(callback) {
    const q = query(collection(db, 'stakeholders'), orderBy('name'));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function createStakeholder(data, uid) {
    const ref = await addDoc(collection(db, 'stakeholders'), {
        ...emptyStakeholder(uid), ...data, createdBy: uid,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateStakeholder(id, data, uid) {
    await updateDoc(doc(db, 'stakeholders', id), { ...data, updatedAt: serverTimestamp(), updatedBy: uid });
}

export async function deleteStakeholder(id) {
    await deleteDoc(doc(db, 'stakeholders', id));
}

// ── Meetings ───────────────────────────────────────────────────────────────────

export function subscribeMeetings(callback) {
    const q = query(collection(db, 'meetings'), orderBy('date', 'desc'));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function createMeeting(data, uid) {
    const ref = await addDoc(collection(db, 'meetings'), {
        ...emptyMeeting(uid), ...data, createdBy: uid,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateMeeting(id, data, uid) {
    await updateDoc(doc(db, 'meetings', id), { ...data, updatedAt: serverTimestamp(), updatedBy: uid });
}

export async function deleteMeeting(id) {
    await deleteDoc(doc(db, 'meetings', id));
}
