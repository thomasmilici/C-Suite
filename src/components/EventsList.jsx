import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToActiveEvents, createEvent, deleteEvent } from '../services/eventService';
import { Plus, Folder, ArrowRight, Calendar, Users, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
    active: { dot: 'bg-green-500', text: 'text-green-400', label: 'Attivo' },
    completed: { dot: 'bg-indigo-400', text: 'text-indigo-400', label: 'Completato' },
    archived: { dot: 'bg-zinc-600', text: 'text-zinc-500', label: 'Archiviato' },
};

const EventCard = ({ event, onClick, isAdmin, onDelete }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const status = STATUS_COLORS[event.status] || STATUS_COLORS.active;
    const createdDate = event.createdAt?.toDate
        ? event.createdAt.toDate().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        setConfirmDelete(true);
    };

    const handleConfirmDelete = async (e) => {
        e.stopPropagation();
        setDeleting(true);
        try {
            await deleteEvent(event.id);
            if (onDelete) onDelete(event.id);
        } catch (err) {
            console.error('[EventCard] deleteEvent error:', err);
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const handleCancelDelete = (e) => {
        e.stopPropagation();
        setConfirmDelete(false);
    };

    return (
        <div className="flex flex-col mb-1 relative group">
            {/* Elemento Lista Dossier */}
            <div 
                onClick={onClick}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot} ${status.dot === 'bg-green-500' ? 'shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'shadow-[0_0_8px_rgba(255,255,255,0.2)]'}`} />
                    <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
                            {event.title}
                        </h4>
                        <p className="text-xs text-white/40 truncate">
                            Aggiornato {createdDate}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Admin delete button */}
                    {isAdmin && !confirmDelete && (
                        <button
                            onClick={handleDeleteClick}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Elimina dossier"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <span className="opacity-0 group-hover:opacity-100 text-indigo-400 font-bold transition-all transform group-hover:translate-x-1">→</span>
                </div>
            </div>

            {/* Inline delete confirmation */}
            {confirmDelete && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 p-3 bg-black/40 rounded-lg border border-red-500/20 flex items-center justify-between gap-3"
                >
                    <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">
                        Eliminare definitivamente?
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCancelDelete}
                            disabled={deleting}
                            className="px-2.5 py-1 rounded-lg border border-white/10 text-zinc-400 hover:text-white text-[10px] font-mono transition-colors disabled:opacity-50"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            disabled={deleting}
                            className="px-2.5 py-1 rounded-lg bg-red-600/80 hover:bg-red-500/80 text-white text-[10px] font-mono transition-colors disabled:opacity-50"
                        >
                            {deleting ? 'Eliminazione...' : 'Elimina'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const NewEventModal = ({ currentUser, onClose, onCreated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) { setError('Il titolo è obbligatorio.'); return; }
        if (!currentUser?.uid) { setError('Utente non autenticato.'); return; }

        setLoading(true);
        setError('');
        try {
            const id = await createEvent({
                title: title.trim(),
                description: description.trim(),
                createdBy: currentUser.uid,
            });
            toast.success('✓ Dossier aggiunto');
            onCreated(id);
        } catch (err) {
            console.error('[EventsList] createEvent error:', err);
            setError('Errore durante la creazione. Riprova.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-tile rounded-2xl p-6 w-full max-w-md">
                <h2 className="text-base font-mono font-bold text-white mb-5">
                    Nuovo Dossier
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">
                            Titolo Dossier *
                        </label>
                        <input
                            autoFocus
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="es. Operazione Lancio Q3"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/[0.03] transition-colors font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">
                            Sintesi Esecutiva
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Contesto strategico del dossier..."
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/[0.03] transition-colors font-mono resize-none"
                        />
                    </div>
                    {error && (
                        <p className="text-xs text-red-400 font-mono">{error}</p>
                    )}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white text-sm font-mono transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-500/80 disabled:opacity-50 text-white text-sm font-mono transition-colors"
                        >
                            {loading ? 'Creazione...' : 'Crea'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const EventsList = ({ isAdmin, currentUser }) => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const unsub = subscribeToActiveEvents(
            (data) => { setEvents(data); setLoading(false); },
            (err) => { console.error('[EventsList] subscribe error:', err); setLoading(false); }
        );
        return () => unsub();
    }, []);

    const handleCreated = (id) => {
        setShowModal(false);
        navigate(`/progetto/${id}`);
    };

    const handleDeleted = (id) => {
        setEvents(prev => prev.filter(e => e.id !== id));
    };

    return (
        <>
            <section>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
                            Dossier Attivi
                        </h2>
                        <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                            {events.length} {events.length === 1 ? 'dossier attivo' : 'dossier attivi'}
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-mono transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Nuovo Dossier
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="text-xs text-zinc-600 font-mono animate-pulse py-8 text-center">
                        RECUPERO DOSSIER IN CORSO...
                    </div>
                ) : events.length === 0 ? (
                    <div className="glass-tile rounded-2xl p-8 text-center">
                        <Folder className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500 font-mono">Nessun Dossier attivo. Il sistema è in attesa di nuovi input.</p>
                        {isAdmin && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs font-mono transition-all"
                            >
                                Apri Nuovo Dossier
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {events.map(event => (
                            <EventCard
                                key={event.id}
                                event={event}
                                isAdmin={isAdmin}
                                onClick={() => navigate(`/progetto/${event.id}`)}
                                onDelete={handleDeleted}
                            />
                        ))}
                    </div>
                )}
            </section>

            {showModal && (
                <NewEventModal
                    currentUser={currentUser}
                    onClose={() => setShowModal(false)}
                    onCreated={handleCreated}
                />
            )}
        </>
    );
};
