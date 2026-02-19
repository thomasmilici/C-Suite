/**
 * weeklyPlanService.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Service layer for the `weekly_plans` Firestore collection.
 *
 * Document ID: ISO week string → `YYYY-Www` (e.g. "2024-W42")
 * One document per ISO week, per organization (single-tenant app).
 *
 * Data model:
 * @typedef {Object} WeeklyPlan
 * @property {string}   weekId     - ISO week "YYYY-Www" (= document ID)
 * @property {string}   status     - "open" | "finalized" | "closed"
 * @property {string[]} outcomes   - strategic outcomes, max 3
 * @property {string[]} dossier_focus_ids  - hot eventIds this week
 * @property {KeyMoment[]}       key_moments
 * @property {StakeholderMove[]} stakeholder_moves
 * @property {RiskSignal[]}      risks_signals
 * @property {Narrative}         narrative  - STRUCTURAL component, not a note
 * @property {string}            debrief    - end-of-week reflection
 * @property {string}            createdBy  - uid
 * @property {Timestamp}         createdAt
 * @property {Timestamp}         updatedAt
 *
 * @typedef {Object} KeyMoment
 * @property {string} id
 * @property {string} day       - "Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun"
 * @property {string} event     - nome dell'evento/momento
 * @property {string} goal      - scopo strategico
 *
 * @typedef {Object} StakeholderMove
 * @property {string} id
 * @property {string} stakeholder  - nome o ruolo
 * @property {string} why_now      - perché questa settimana
 * @property {string} concrete_move - mossa concreta
 *
 * @typedef {Object} RiskSignal
 * @property {string} id
 * @property {string} signal       - descrizione del segnale debole/rischio
 * @property {string} impact_area  - area di impatto
 *
 * @typedef {Object} Narrative
 * @property {string}   key_message  - messaggio chiave della settimana
 * @property {string[]} channels     - canali di comunicazione (es. All-hands, Newsletter CEO)
 * @property {string}   audience     - a chi è indirizzato (es. Board + Leadership)
 * @property {string}   tone         - "urgency" | "reassurance" | "alignment"
 */

import {
    doc, getDoc, setDoc, updateDoc, onSnapshot,
    serverTimestamp, collection, query, orderBy, limit, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

// ── ISO Week Utilities ─────────────────────────────────────────────────────────

/**
 * Compute the ISO week number and year for a given date.
 * ISO 8601: weeks start on Monday, week 1 = week containing the first Thursday.
 * @param {Date} date
 * @returns {{ year: number, week: number }}
 */
function getISOWeek(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number (Mon=1, Sun=7)
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNum };
}

/**
 * Returns current ISO week as "YYYY-Www" string (e.g. "2024-W42").
 */
export function currentWeekId() {
    const { year, week } = getISOWeek();
    return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Convert a date (or ISO date string) to a weekId.
 */
export function dateToWeekId(date) {
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
    const { year, week } = getISOWeek(d);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Navigate a weekId by N weeks (+1 = next, -1 = prev).
 */
export function shiftWeekId(weekId, weeks) {
    const [year, w] = weekId.split('-W').map(Number);
    // Get a date from that week (Wednesday = stable mid-week)
    const jan4 = new Date(Date.UTC(year, 0, 4)); // Jan 4 is always in week 1
    const week1Mon = new Date(jan4);
    week1Mon.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1);
    const targetMon = new Date(week1Mon);
    targetMon.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7 + weeks * 7);
    return dateToWeekId(targetMon);
}

/**
 * Format a weekId for display (e.g. "Settimana 42 · 14–18 Ott 2024").
 */
export function formatWeekId(weekId, locale = 'it-IT') {
    const [year, w] = weekId.split('-W').map(Number);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const week1Mon = new Date(jan4);
    week1Mon.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1);
    const mon = new Date(week1Mon);
    mon.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7);
    const fri = new Date(mon);
    fri.setUTCDate(mon.getUTCDate() + 4);

    const monStr = mon.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const friStr = fri.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return `W${w} · ${monStr}–${friStr} ${year}`;
}

/**
 * Get the Monday ISO date of a weekId (useful for display and log queries).
 * Returns "YYYY-MM-DD".
 */
export function weekIdToMonday(weekId) {
    const [year, w] = weekId.split('-W').map(Number);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const week1Mon = new Date(jan4);
    week1Mon.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1);
    const mon = new Date(week1Mon);
    mon.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7);
    return mon.toISOString().split('T')[0];
}

// ── Empty templates ────────────────────────────────────────────────────────────

function itemId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyKeyMoment() {
    return { id: itemId(), day: 'Mon', event: '', goal: '' };
}

export function emptyStakeholderMove() {
    return { id: itemId(), stakeholder: '', why_now: '', concrete_move: '' };
}

export function emptyRiskSignal() {
    return { id: itemId(), signal: '', impact_area: '' };
}

/**
 * Empty narrative block — treated as a STRUCTURAL component.
 * Must always be rendered as a dedicated card in the UI.
 */
export function emptyNarrative() {
    return {
        key_message: '',
        channels: [],
        audience: '',
        tone: 'alignment', // "urgency" | "reassurance" | "alignment"
    };
}

/** Returns a full empty WeeklyPlan shell for `weekId` */
export function emptyWeeklyPlan(weekId, uid) {
    return {
        weekId,
        status: 'open',
        outcomes: [],          // max 3 strings
        dossier_focus_ids: [],
        key_moments: [],
        stakeholder_moves: [],
        risks_signals: [],
        narrative: emptyNarrative(),
        debrief: '',
        createdBy: uid || null,
    };
}

// ── Core API ───────────────────────────────────────────────────────────────────

/**
 * Get a weekly plan document.
 * Returns null if not found.
 */
export async function getWeeklyPlan(weekId) {
    const ref = doc(db, 'weekly_plans', weekId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Get or create a weekly plan.
 * Auto-creates the empty document on first access.
 */
export async function getOrCreateWeeklyPlan(weekId, uid) {
    const ref = doc(db, 'weekly_plans', weekId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
    }

    const newPlan = {
        ...emptyWeeklyPlan(weekId, uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    await setDoc(ref, newPlan);
    return { id: weekId, ...newPlan };
}

/**
 * Save the entire weekly plan document (full update).
 */
export async function saveWeeklyPlan(weekId, plan, uid) {
    const ref = doc(db, 'weekly_plans', weekId);
    const snap = await getDoc(ref);
    const now = serverTimestamp();
    if (snap.exists()) {
        await updateDoc(ref, { ...plan, updatedAt: now, updatedBy: uid });
    } else {
        await setDoc(ref, { ...plan, weekId, createdBy: uid, createdAt: now, updatedAt: now });
    }
}

/**
 * Patch one or more top-level fields of a weekly plan.
 * Ideal for real-time auto-save of individual sections.
 *
 * @param {string} weekId
 * @param {Record<string, any>} patch - e.g. { outcomes: [...] } or { narrative: {...} }
 * @param {string} uid
 */
export async function patchWeeklyPlan(weekId, patch, uid) {
    const ref = doc(db, 'weekly_plans', weekId);
    const snap = await getDoc(ref);
    const now = serverTimestamp();
    if (snap.exists()) {
        await updateDoc(ref, { ...patch, updatedAt: now, updatedBy: uid });
    } else {
        await setDoc(ref, {
            ...emptyWeeklyPlan(weekId, uid),
            ...patch,
            createdAt: now,
            updatedAt: now,
        });
    }
}

/**
 * Finalize a weekly plan (Friday debrief action).
 * Sets status → 'finalized', records debrief text.
 */
export async function finalizeWeeklyPlan(weekId, debrief, uid) {
    await patchWeeklyPlan(weekId, { status: 'finalized', debrief }, uid);
}

/**
 * Real-time subscription to a weekly plan.
 * @param {string} weekId
 * @param {function} callback - called with (WeeklyPlan | null)
 * @returns unsubscribe function
 */
export function subscribeWeeklyPlan(weekId, callback) {
    const ref = doc(db, 'weekly_plans', weekId);
    return onSnapshot(ref, snap => {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
}

/**
 * Fetch the N most recent weekly plans (for history / cockpit widget).
 * @param {number} n - default 8 (two months of weeks)
 */
export async function getRecentWeeklyPlans(n = 8) {
    const q = query(
        collection(db, 'weekly_plans'),
        orderBy('weekId', 'desc'),
        limit(n)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
