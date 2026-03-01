import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

// ─── TYPE DEFINITIONS (JSDoc) ─────────────────────────────────────────────────

/**
 * @typedef {'active' | 'completed' | 'archived'} EventStatus
 */

/**
 * @typedef {Object} CosEvent
 * @property {string}      id            - Firestore document ID
 * @property {string}      title         - Nome dell'evento/progetto
 * @property {string}      [description] - Descrizione opzionale
 * @property {EventStatus} status        - Stato del ciclo di vita
 * @property {string}      createdBy     - UID dell'utente creante
 * @property {string[]}    teamMembers   - Array di UID degli utenti assegnati
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * @typedef {Object} CreateEventPayload
 * @property {string}   title         - Obbligatorio
 * @property {string}   [description]
 * @property {string}   createdBy     - Obbligatorio: uid dell'utente corrente
 * @property {string[]} [teamMembers] - Default: [createdBy]
 */

/**
 * @typedef {Object} UpdateEventPayload
 * @property {string}      [title]
 * @property {string}      [description]
 * @property {EventStatus} [status]
 * @property {string[]}    [teamMembers]
 */

// ─── COLLECTION PATH GENERATORS ───────────────────────────────────────────────

const getEventsCol = (missionId) => {
  if (!missionId) throw new Error('[eventService] missionId is required');
  return collection(db, 'missions', missionId, 'events');
};

const getEventDoc = (missionId, eventId) => {
  if (!missionId) throw new Error('[eventService] missionId is required');
  return doc(db, 'missions', missionId, 'events', eventId);
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Crea un nuovo evento in Firestore.
 * @param {string} missionId
 * @param {CreateEventPayload} payload
 * @returns {Promise<string>} ID del documento creato
 */
export async function createEvent(missionId, payload) {
  const { title, description = '', createdBy, teamMembers } = payload;
  const members = teamMembers && teamMembers.length > 0 ? teamMembers : [createdBy];

  const docRef = await addDoc(getEventsCol(missionId), {
    title: title.trim(),
    description: description.trim(),
    status: 'active',
    createdBy,
    teamMembers: members,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Aggiorna campi di un evento esistente. Aggiorna sempre updatedAt.
 * @param {string}             missionId
 * @param {string}             eventId
 * @param {UpdateEventPayload} updates
 * @returns {Promise<void>}
 */
export async function updateEvent(missionId, eventId, updates) {
  const eventRef = getEventDoc(missionId, eventId);
  await updateDoc(eventRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Archivia un evento (soft-delete). Preferire questo rispetto a deleteEvent
 * per preservare l'integrità dei documenti collegati (signals, decisions, okrs).
 * @param {string} missionId
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function archiveEvent(missionId, eventId) {
  await updateEvent(missionId, eventId, { status: 'archived' });
}

/**
 * Elimina definitivamente un evento. NON fa cascade sui documenti collegati.
 * Usare solo in scenari di admin cleanup.
 * @param {string} missionId
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function deleteEvent(missionId, eventId) {
  await deleteDoc(getEventDoc(missionId, eventId));
}

// ─── READS ────────────────────────────────────────────────────────────────────

/**
 * Legge un singolo evento (one-time, non real-time).
 * Ritorna null se il documento non esiste.
 * @param {string} missionId
 * @param {string} eventId
 * @returns {Promise<CosEvent | null>}
 */
export async function getEvent(missionId, eventId) {
  const snap = await getDoc(getEventDoc(missionId, eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Legge tutti gli eventi non archiviati (one-time, non real-time).
 * Ordinati per createdAt decrescente.
 * Nota: richiede indice composito su (status ASC, createdAt DESC).
 * @param {string} missionId
 * @returns {Promise<CosEvent[]>}
 */
export async function getActiveEvents(missionId) {
  const q = query(
    getEventsCol(missionId),
    where('status', '!=', 'archived'),
    orderBy('status'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── REAL-TIME SUBSCRIPTIONS ──────────────────────────────────────────────────

/**
 * Sottoscrizione real-time a tutti gli eventi non archiviati.
 * Segue lo stesso pattern onSnapshot + cleanup usato nei tile esistenti.
 *
 * Uso (dentro useEffect):
 *   const unsub = subscribeToActiveEvents(setEvents);
 *   return () => unsub();
 *
 * Nota: richiede indice composito su (status ASC, createdAt DESC).
 * Firestore mostrerà in console un link per auto-creare l'indice al primo uso.
 *
 * @param {string} missionId
 * @param {function(CosEvent[]): void} onUpdate
 * @param {function(Error): void}      [onError]
 * @returns {function} Funzione di unsubscribe
 */
export function subscribeToActiveEvents(missionId, onUpdate, onError) {
  if (!missionId) {
    console.warn('[eventService] subscribeToActiveEvents: missionId is null');
    return () => { };
  }
  const q = query(
    getEventsCol(missionId),
    where('status', '!=', 'archived'),
    orderBy('status'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    onError || ((err) => console.error('[eventService] subscribeToActiveEvents:', err))
  );
}

/**
 * Sottoscrizione real-time agli eventi di cui un utente è membro.
 * Usato nella Fase 2 per mostrare solo gli eventi dell'utente corrente.
 *
 * Nota: richiede indice composito su (teamMembers ARRAY, status ASC, createdAt DESC).
 *
 * @param {string}                     missionId
 * @param {string}                     userId
 * @param {function(CosEvent[]): void} onUpdate
 * @param {function(Error): void}      [onError]
 * @returns {function} Funzione di unsubscribe
 */
export function subscribeToUserEvents(missionId, userId, onUpdate, onError) {
  if (!missionId) {
    console.warn('[eventService] subscribeToUserEvents: missionId is null');
    return () => { };
  }
  const q = query(
    getEventsCol(missionId),
    where('teamMembers', 'array-contains', userId),
    where('status', '!=', 'archived'),
    orderBy('status'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    onError || ((err) => console.error('[eventService] subscribeToUserEvents:', err))
  );
}

// ─── MEMBER MANAGEMENT ───────────────────────────────────────────────────────

/**
 * Aggiunge un utente all'array teamMembers di un evento (idempotente).
 * @param {string} missionId
 * @param {string} eventId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function addMemberToEvent(missionId, eventId, userId) {
  await updateDoc(getEventDoc(missionId, eventId), {
    teamMembers: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Rimuove un utente dall'array teamMembers di un evento.
 * @param {string} missionId
 * @param {string} eventId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function removeMemberFromEvent(missionId, eventId, userId) {
  await updateDoc(getEventDoc(missionId, eventId), {
    teamMembers: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
}
