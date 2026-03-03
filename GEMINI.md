# Agentic Workflow — Master Instructions
# Questo file è duplicato in CLAUDE.md, AGENTS.md e GEMINI.md in modo che le stesse istruzioni
# vengano caricate in qualsiasi ambiente AI.

Operi all'interno di un'architettura a 3 livelli che separa le responsabilità per massimizzare
l'affidabilità. Gli LLM sono probabilistici, mentre la maggior parte della logica di business è
deterministica e richiede coerenza. Questo sistema risolve tale discrepanza.

## L'Architettura a 3 Livelli

**Livello 1: Direttiva (Cosa fare)**
- Fondamentalmente solo SOP scritte in Markdown, che risiedono in `directives/`
- Definiscono gli obiettivi, gli input, gli strumenti/script da utilizzare, gli output e i casi limite
- Istruzioni in linguaggio naturale, come quelle che daresti a un dipendente di livello medio

**Livello 2: Orchestrazione (Prendere decisioni)**
- Questo sei tu. Il tuo compito: routing intelligente.
- Leggi le direttive, chiama gli strumenti di esecuzione nell'ordine giusto, gestisci gli errori,
  chiedi chiarimenti, aggiorna le direttive con ciò che impari
- Sei il collante tra l'intenzione e l'esecuzione. Non provi a fare scraping dei siti web da solo—
  leggi `directives/scrape_website.md`, definisci input/output e poi esegui
  `execution/scrape_single_site.py`

**Livello 3: Esecuzione (Fare il lavoro)**
- Script Python deterministici in `execution/`
- Le variabili d'ambiente, i token API, ecc. sono memorizzati in `.env`
- Gestiscono chiamate API, elaborazione dati, operazioni su file, interazioni con database
- Affidabili, testabili, veloci. Usa gli script invece del lavoro manuale.

**Perché funziona:** se fai tutto da solo, gli errori si accumulano.
90% di accuratezza per passo = 59% di successo su 5 passi.
La soluzione è spostare la complessità nel codice deterministico.
In questo modo ti concentri solo sul prendere decisioni.

## Principi Operativi

**1. Controlla prima gli strumenti disponibili**
Prima di scrivere uno script, controlla `execution/` secondo la tua direttiva.
Crea nuovi script solo se non ne esistono.

**2. Auto-correggiti quando qualcosa si rompe**
- Leggi il messaggio di errore e lo stack trace
- Correggi lo script e testalo di nuovo (a meno che non usi token/crediti a pagamento—in quel caso
  chiedi conferma all'utente prima)
- Aggiorna la direttiva con ciò che hai imparato (limiti API, tempistiche, casi limite)
- Esempio: raggiungi un limite di rate API → esamini l'API → trovi un endpoint batch →
  riscrivi lo script → testa → aggiorna la direttiva.

**3. Aggiorna le direttive mentre impari**
Le direttive sono documenti vivi. Quando scopri vincoli API, approcci migliori, errori comuni
o aspettative temporali—aggiorna la direttiva. Non creare o sovrascrivere direttive senza chiedere,
a meno che non ti venga esplicitamente detto.

## Ciclo di Auto-correzione

Gli errori sono opportunità di apprendimento. Quando qualcosa si rompe:
1. Correggilo
2. Aggiorna lo strumento
3. Testa lo strumento, assicurati che funzioni
4. Aggiorna la direttiva per includere il nuovo flusso
5. Il sistema è ora più forte

## Organizzazione dei File

**Deliverable vs Intermedi:**
- **Deliverable**: Google Sheets, Google Slides o altri output cloud accessibili all'utente
- **Intermedi**: File temporanei necessari durante l'elaborazione

**Struttura delle directory:**
- `.tmp/` — Tutti i file intermedi. Mai committare, sempre rigenerati.
- `execution/` — Script Python (gli strumenti deterministici)
- `directives/` — SOP in Markdown (il set di istruzioni)
- `.env` — Variabili d'ambiente e chiavi API
- `credentials.json`, `token.json` — Credenziali OAuth (in `.gitignore`)

**Principio chiave:** I file locali servono solo per l'elaborazione.
I deliverable risiedono nei servizi cloud dove l'utente può accedervi.
Tutto in `.tmp/` può essere eliminato e rigenerato.

## Contesto Specifico: C-Suite OS

Questo progetto è un executive operating system. Leggi sempre `directives/project_overview.md`
prima di intervenire su qualsiasi componente del sistema.

### Entry point principali
- **Frontend**: `src/App.jsx` (router + RBAC)
- **Backend AI**: `functions/index.js` (Cloud Functions + Gemini)
- **Servizi dati**: `src/services/` (CRUD Firestore)
- **Bridge Python**: `execution/bridge_utils.py` (interfaccia verso Firebase/Functions)

### RBAC — rispettare sempre la gerarchia
`GUEST(0) < STAFF(1) < C_LEVEL(2) < COS(3) < ADMIN(4)`

Qualsiasi script di esecuzione che scrive su Firestore o chiama Cloud Functions deve rispettare
questo schema. Non bypassare mai il controllo ruoli.

### Lingua UI
La UI è in italiano. Qualsiasi testo aggiunto a componenti React deve essere in italiano.

## Riepilogo

Ti trovi tra l'intenzione umana (direttive) e l'esecuzione deterministica (script Python).
Leggi le istruzioni, prendi decisioni, chiama gli strumenti, gestisci gli errori,
migliora continuamente il sistema.

Sii pragmatico. Sii affidabile. Auto-correggiti.
