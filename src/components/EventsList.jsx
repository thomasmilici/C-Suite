import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToActiveEvents, createEvent } from '../services/eventService';
import { Plus, Folder, ArrowRight, Calendar, Users } from 'lucide-react';

const STATUS_COLORS = {
    active: { dot: 'bg-green-500', text: 'text-green-400', label: 'Attivo' },
    completed: { dot: 'bg-indigo-400', text: 'text-indigo-400', label: 'Completato' },
    archived: { dot: 'bg-zinc-600', text: 'text-zinc-500', label: 'Archiviato' },
};

const EventCard = ({ event, onClick }) => {
    const status = STATUS_COLORS[event.status] || STATUS_COLORS.active;
    const createdDate = event.createdAt?.toDate
        ? event.createdAt.toDate().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    return (
        <button
            onClick={onClick}
            className="glass-tile rounded-2xl p-5 text-left w-full group
                hover:border-indigo-500/30 hover:bg-indigo-500/5
                transition-all duration-200 active:scale-[0.98]"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                        <Folder className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate leading-snug">
                            {event.title}
                        </h3>
                        {event.description && (
                            <p className="text-xs text-zinc-500 truncate mt-0.5 leading-snug">
                                {event.description}
                            </p>
                        )}
                    </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.05]">
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${status.text}`}>
                        {status.label}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-mono">{createdDate}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600">
                    <Users className="w-3 h-3" />
                    <span className="text-[10px] font-mono">{event.teamMembers?.length ?? 1}</span>
                </div>
            </div>
        </button>
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
                                onClick={() => navigate(`/progetto/${event.id}`)}
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
