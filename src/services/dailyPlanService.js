/**
 * dailyPlanService.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Service layer for the `daily_plans` Firestore collection.
 *
 * Document ID: ISO date string → `YYYY-MM-DD`
 * One document per day, per organization (single-tenant app).
 *
 * Data model:
 * @typedef {Object} DailyPlan
 * @property {string}   date       - ISO date "YYYY-MM-DD" (= document ID)
 * @property {string}   status     - "open" | "finalized" | "closed"
 * @property {FocusItem[]}         focus                  - max 3
 * @property {string[]}            dossier_ids            - hot eventIds for this day
 * @property {DecisionItem[]}      decisions_to_orchestrate
 * @property {StakeholderAction[]} stakeholder_actions
 * @property {RiskIssue[]}         risks_issues
 * @property {Followup[]}          followups
 * @property {string}              reflection             - end-of-day reflection
 * @property {string}              createdBy              - uid
 * @property {Timestamp}           createdAt
 * @property {Timestamp}           updatedAt
 *
 * @typedef {Object} FocusItem
 * @property {string}  id
 * @property {string}  text
 * @property {boolean} completed
 *
 * @typedef {Object} DecisionItem
 * @property {string} id
 * @property {string} decision
 * @property {string} owner           - sponsor/owner name
 * @property {string} deadline        - ISO date string
 * @property {string} political_steps - passaggi politici/alleanze
 *
 * @typedef {Object} StakeholderAction
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {string} goal
 *
 * @typedef {Object} RiskIssue
 * @property {string} id
 * @property {string} issue
 * @property {string} impact   - "High" | "Medium" | "Low"
 * @property {string} involve  - who to engage
 *
 * @typedef {Object} Followup
 * @property {string} id
 * @property {string} action
 * @property {string} to      - delegate name/role
 * @property {string} by      - ISO date deadline
 */

import {
    doc, getDoc, setDoc, updateDoc, onSnapshot,
    serverTimestamp, collection, query, orderBy, limit, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns today's date as ISO string "YYYY-MM-DD" */
export function todayId() {
    return new Date().toISOString().split('T')[0];
}

/** Parse any Date / string / Timestamp → "YYYY-MM-DD" */
export function toDateId(date) {
    if (!date) return todayId();
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toISOString().split('T')[0];
}

/** Format "YYYY-MM-DD" → display label (e.g. "Lunedì 19 Feb") */
export function formatDateId(dateId, locale = 'it-IT') {
    const d = new Date(dateId + 'T12:00:00'); // noon to avoid TZ edge cases
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
}

/** Navigate a dateId by N days (+1 = tomorrow, -1 = yesterday) */
export function shiftDateId(dateId, days) {
    const d = new Date(dateId + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

/** Generate a simple ID for embedded objects */
function itemId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Empty templates ────────────────────────────────────────────────────────────

export function emptyFocusItem(text = '') {
    return { id: itemId(), text, completed: false };
}

export function emptyDecisionItem() {
    return { id: itemId(), decision: '', owner: '', deadline: '', political_steps: '' };
}

export function emptyStakeholderAction() {
    return { id: itemId(), name: '', role: '', goal: '' };
}

export function emptyRiskIssue() {
    return { id: itemId(), issue: '', impact: 'Medium', involve: '' };
}

export function emptyFollowup() {
    return { id: itemId(), action: '', to: '', by: '' };
}

/** Returns an empty DailyPlan shell for `dateId` */
export function emptyDailyPlan(dateId, uid) {
    return {
        date: dateId,
        status: 'open',
        focus: [],
        dossier_ids: [],
        decisions_to_orchestrate: [],
        stakeholder_actions: [],
        risks_issues: [],
        followups: [],
        reflection: '',
        createdBy: uid || null,
    };
}

// ── Core API ───────────────────────────────────────────────────────────────────

/**
 * Get a daily plan document.
 * Returns null if not found.
 */
export async function getDailyPlan(dateId) {
    const ref = doc(db, 'daily_plans', dateId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Get or create today's (or any date's) daily plan.
 * On first access it seeds the document from any existing `daily_pulse` data
 * for backward compatibility.
 */
export async function getOrCreateDailyPlan(dateId, uid) {
    const ref = doc(db, 'daily_plans', dateId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
    }

    // ── Migration: seed from legacy daily_pulse if present ──────────────────
    let seedFocus = [];
    try {
        const legacyRef = doc(db, 'daily_pulse', dateId);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
            const items = legacySnap.data().focus_items || [];
            seedFocus = items.map(item => ({
                id: item.id ? String(item.id) : itemId(),
                text: item.text || '',
                completed: item.completed || false,
            }));
        }
    } catch (_) { /* daily_pulse may not exist, that's fine */ }

    const newPlan = {
        ...emptyDailyPlan(dateId, uid),
        focus: seedFocus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    await setDoc(ref, newPlan);
    return { id: dateId, ...newPlan };
}

/**
 * Save the entire daily plan document.
 * Use for full updates (e.g. AI draft apply).
 */
export async function saveDailyPlan(dateId, plan, uid) {
    const ref = doc(db, 'daily_plans', dateId);
    const snap = await getDoc(ref);
    const now = serverTimestamp();
    if (snap.exists()) {
        await updateDoc(ref, { ...plan, updatedAt: now, updatedBy: uid });
    } else {
        await setDoc(ref, { ...plan, date: dateId, createdBy: uid, createdAt: now, updatedAt: now });
    }
}

/**
 * Patch a single top-level field of the daily plan.
 * Ideal for real-time auto-save of individual sections.
 *
 * @param {string} dateId
 * @param {Record<string, any>} patch - e.g. { focus: [...] } or { reflection: '...' }
 * @param {string} uid
 */
export async function patchDailyPlan(dateId, patch, uid) {
    const ref = doc(db, 'daily_plans', dateId);
    const snap = await getDoc(ref);
    const now = serverTimestamp();
    if (snap.exists()) {
        await updateDoc(ref, { ...patch, updatedAt: now, updatedBy: uid });
    } else {
        // Auto-create if patching a non-existing day (e.g. AI writes an old day)
        await setDoc(ref, {
            ...emptyDailyPlan(dateId, uid),
            ...patch,
            createdAt: now,
            updatedAt: now,
        });
    }
}

/**
 * Finalize a daily plan (end-of-day action).
 * Sets status → 'finalized', records reflection.
 */
export async function finalizeDailyPlan(dateId, reflection, uid) {
    await patchDailyPlan(dateId, { status: 'finalized', reflection }, uid);
}

/**
 * Real-time subscription to a daily plan.
 * @param {string} dateId
 * @param {function} callback - called with (DailyPlan | null)
 * @returns unsubscribe function
 */
export function subscribeDailyPlan(dateId, callback) {
    const ref = doc(db, 'daily_plans', dateId);
    return onSnapshot(ref, snap => {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
}

/**
 * Fetch the N most recent daily plans (for history / cockpit widget).
 * @param {number} n - number of docs to fetch (default 7)
 */
export async function getRecentDailyPlans(n = 7) {
    const q = query(
        collection(db, 'daily_plans'),
        orderBy('date', 'desc'),
        limit(n)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
