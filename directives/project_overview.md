# Direttiva: Project Overview — C-Suite OS
> **Livello 1 — SOP per l'Orchestratore**
> Leggi questo file per primo, prima di qualsiasi intervento sul codebase.

---

## Cos'è C-Suite OS

C-Suite OS (alias "Quinta OS" / "Shadow CoS") è un executive operating system per leadership
d'impresa. Gestisce OKR, segnali di rischio, briefing giornalieri, decisioni strategiche e
comunicazione AI-mediata tra il C-suite e il Chief of Staff AI.

- **Firebase project**: `quinta-os-manager`
- **Stack**: React 19 + Vite 7 + Tailwind 4 + Firebase (Auth/Firestore/Functions) + Gemini AI
- **Repo**: https://github.com/thomasmilici/C-Suite.git (branch: `main`)
- **Dev server**: porta 5173

---

## Mappa Architetturale per l'Orchestratore

### Come leggere il codice legacy

```
Intenzione Utente
      │
      ▼
src/App.jsx          ← Router principale + ProtectedRoute (RBAC)
      │
      ├── src/pages/           ← Pagine (Dashboard, DailyPage, WeeklyPage…)
      │       └── usano →  src/services/  ← CRUD Firestore (missionService, etc.)
      │
      ├── src/components/layout/AppShell.jsx  ← Shell con AI dual-channel
      │       └── CommandBar.jsx              ← Entry point AI testo
      │       └── hooks/useLiveSession.js     ← AI voce (WebSocket Gemini 2.5)
      │
      └── functions/index.js  ← Backend: Cloud Functions + Gemini 3 Pro + RBAC
```

### Entry Point per interventi programmatici (execution/)

| Operazione | Entry Point JS | Bridge Python |
|---|---|---|
| Leggere Firestore | `src/services/*.js` | `execution/bridge_utils.py → firestore_read()` |
| Scrivere su Firestore | `src/services/*.js` | `execution/bridge_utils.py → firestore_write()` |
| Chiamare AI | `functions/index.js::askShadowCoS` | `execution/bridge_utils.py → call_cloud_function()` |
| Eseguire tool AI | `functions/index.js::executeToolSecure` | `execution/bridge_utils.py → call_cloud_function()` |
| Auth utente | `src/services/authService.js` | Non toccare dall'esterno — solo Firebase Console |

---

## RBAC — Regola Fondamentale

Gerarchia ruoli: `GUEST(0) < STAFF(1) < C_LEVEL(2) < COS(3) < ADMIN(4)`

**Prima di qualsiasi scrittura su Firestore via script:**
1. Verifica il ruolo dell'utente target leggendo `users/{uid}.role`
2. Non fare mai operazioni che bypassino questa gerarchia
3. Usa sempre il Service Account Firebase con privilegi minimi necessari

---

## Come l'Orchestratore deve interagire con il codice legacy

### Regola 1 — Non modificare il codice senza una direttiva specifica
Il codice in `src/` e `functions/` è già in produzione. Non apportare modifiche
senza che esista una direttiva in `directives/` che lo descriva esplicitamente.

### Regola 2 — Usa il bridge Python come interfaccia
Per qualsiasi automazione che legge o scrive dati del progetto, usa `execution/bridge_utils.py`.
Non chiamare l'SDK Firebase direttamente negli script ad-hoc — il bridge centralizza la logica
di connessione e gestione degli errori.

```python
# Esempio di utilizzo corretto
from execution.bridge_utils import firestore_read, firestore_write, call_cloud_function

# Leggere tutti gli OKR di una missione
okrs = firestore_read("missions/MISSION_ID/okrs")

# Aggiornare un segnale di rischio
call_cloud_function("executeToolSecure", {
    "tool": "updateRiskSignal",
    "signalId": "SIGNAL_ID",
    "updates": {"status": "resolved"}
})
```

### Regola 3 — .tmp/ per file intermedi, mai committare
Tutti i file generati durante l'elaborazione (export CSV, dossier temporanei, snapshot JSON)
vanno in `.tmp/`. Questo folder è in `.gitignore`. Non committare mai file da `.tmp/`.

### Regola 4 — Lingua italiana per la UI
Qualsiasi testo che finisce nella UI React deve essere in italiano. Gli script Python
e i log possono essere in inglese.

### Regola 5 — Chiedi prima di modificare le direttive esistenti
Le direttive sono il contratto operativo. Non sovrascriverle senza consenso esplicito.
Puoi aggiornarle con nuove conoscenze (limiti API, casi limite scoperti) in autonomia,
ma le modifiche strutturali richiedono conferma.

---

## Struttura Firestore (documenti chiave)

```
/missions/{missionId}
  ├── /okrs/{okrId}           ← Obiettivi chiave (OKR)
  ├── /signals/{signalId}     ← Segnali di rischio
  ├── /decisions/{decId}      ← Log decisioni
  ├── /dailyPlans/{date}      ← Piano giornaliero
  └── /weeklyPlans/{weekId}   ← Piano settimanale

/users/{uid}
  ├── role: string            ← RBAC role
  └── missionId: string       ← Missione corrente

/pendingActions/{actionId}    ← Azioni AI in attesa di approvazione HITL
/auditLog/{logId}             ← Audit trail di tutte le azioni AI
```

---

## Cloud Functions disponibili (functions/index.js)

| Function | Scopo | Ruolo minimo |
|---|---|---|
| `askShadowCoS` | Query AI con tool calling | STAFF |
| `executeToolSecure` | Esecuzione tool con RBAC | COS / ADMIN (per tool distruttivi) |
| `updateRiskSignal` | Aggiornamento segnale rischio | COS |
| `updateOKR` | Aggiornamento OKR | ADMIN |

Per chiamare le Cloud Functions via script Python, usa:
```
execution/bridge_utils.py → call_cloud_function(name, payload, id_token)
```
L'`id_token` si ottiene autenticando un service account con i permessi appropriati.

---

## Direttive correlate

- `directives/ai_query_flow.md` — Come costruire query per `askShadowCoS`
- `directives/tool_execution.md` — Come usare `executeToolSecure` in sicurezza
- `directives/data_sync.md` — Sincronizzazione dati Firestore via script
- `directives/deployment.md` — Build e deploy Firebase

> Aggiorna questa direttiva quando scopri nuovi pattern o vincoli del progetto legacy.
> Data ultimo aggiornamento: 2026-03-03
