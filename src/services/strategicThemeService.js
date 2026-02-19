/**
 * strategicThemeService.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Service layer for the `strategic_themes` Firestore collection.
 *
 * Strategic Themes are the long-horizon C-suite initiatives that act as a
 * "spine" connecting individual dossiers (events), OKRs, and weekly outcomes.
 * Only ADMIN can create / modify themes. All authenticated users can read.
 *
 * Data model:
 * @typedef {Object} StrategicTheme
 * @property {string}   id          - document ID
 * @property {string}   title       - nome del tema (es. "Transformazione digitale")
 * @property {string}   description - descrizione estesa
 * @property {string}   horizon     - "2025" | "2026" | "2027" or custom label
 * @property {string}   status      - "active" | "paused" | "completed" | "archived"
 * @property {string}   owner       - ruolo o nome del C-level sponsor
 * @property {string}   color       - hex color for UI badge (es. "#6366f1")
 * @property {string[]} event_ids   - linked dossier IDs
 * @property {string[]} okr_ids     - linked OKR IDs
 * @property {string}   createdBy   - uid
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 */

import {
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, where, arrayUnion, arrayRemove, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'strategic_themes';

// ── Helpers ────────────────────────────────────────────────────────────────────

export const THEME_COLORS = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#14b8a6', // teal
    '#f59e0b', // amber
    '#ef4444', // red
    '#10b981', // emerald
    '#3b82f6', // blue
    '#f97316', // orange
];

export const THEME_STATUS_OPTIONS = ['active', 'paused', 'completed', 'archived'];

export function emptyTheme(uid) {
    return {
        title: '',
        description: '',
        horizon: new Date().getFullYear().toString(),
        status: 'active',
        owner: '',
        color: THEME_COLORS[0],
        event_ids: [],
        okr_ids: [],
        createdBy: uid || null,
    };
}

// ── Core API ───────────────────────────────────────────────────────────────────

/** Get all strategic themes (ordered by horizon desc, then title) */
export async function getStrategicThemes() {
    const q = query(collection(db, COL), orderBy('horizon', 'desc'), orderBy('title'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Real-time subscription to all strategic themes */
export function subscribeStrategicThemes(callback) {
    const q = query(collection(db, COL), orderBy('horizon', 'desc'), orderBy('title'));
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

/** Real-time subscription to active themes only */
export function subscribeActiveThemes(callback) {
    const q = query(collection(db, COL), where('status', '==', 'active'), orderBy('title'));
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

/** Get a single theme */
export async function getStrategicTheme(themeId) {
    const snap = await getDoc(doc(db, COL, themeId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Create a new strategic theme. Returns the new document ID.
 * Caller role check is enforced by Firestore rules (ADMIN only).
 */
export async function createStrategicTheme(data, uid) {
    const ref = await addDoc(collection(db, COL), {
        ...emptyTheme(uid),
        ...data,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

/** Update fields of an existing theme (full patch) */
export async function updateStrategicTheme(themeId, data, uid) {
    await updateDoc(doc(db, COL, themeId), {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
    });
}

/** Delete a theme (ADMIN only, enforced by rules) */
export async function deleteStrategicTheme(themeId) {
    await deleteDoc(doc(db, COL, themeId));
}

// ── Event / OKR linking ────────────────────────────────────────────────────────

/**
 * Link a dossier (event) to a theme.
 * Also stamps themeIds on the event document for reverse lookup.
 */
export async function linkEventToTheme(themeId, eventId, uid) {
    await updateDoc(doc(db, COL, themeId), {
        event_ids: arrayUnion(eventId),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
    });
    // Reverse: stamp themeIds[] on the event
    try {
        await updateDoc(doc(db, 'events', eventId), {
            themeIds: arrayUnion(themeId),
        });
    } catch (_) { /* event might not support update — gracefully skip */ }
}

/** Unlink a dossier from a theme */
export async function unlinkEventFromTheme(themeId, eventId, uid) {
    await updateDoc(doc(db, COL, themeId), {
        event_ids: arrayRemove(eventId),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
    });
    try {
        await updateDoc(doc(db, 'events', eventId), {
            themeIds: arrayRemove(themeId),
        });
    } catch (_) { }
}

/** Link an OKR to a theme */
export async function linkOKRToTheme(themeId, okrId, uid) {
    await updateDoc(doc(db, COL, themeId), {
        okr_ids: arrayUnion(okrId),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
    });
    try {
        await updateDoc(doc(db, 'okrs', okrId), {
            themeIds: arrayUnion(themeId),
        });
    } catch (_) { }
}

/** Unlink an OKR from a theme */
export async function unlinkOKRFromTheme(themeId, okrId, uid) {
    await updateDoc(doc(db, COL, themeId), {
        okr_ids: arrayRemove(okrId),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
    });
    try {
        await updateDoc(doc(db, 'okrs', okrId), {
            themeIds: arrayRemove(themeId),
        });
    } catch (_) { }
}
