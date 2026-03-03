"""
bridge_utils.py — Livello 3: Esecuzione
Bridge Python per interfacciarsi con C-Suite OS (Firebase/Firestore/Cloud Functions).

Uso:
    from execution.bridge_utils import firestore_read, firestore_write, call_cloud_function

Prerequisiti:
    pip install firebase-admin google-auth requests python-dotenv
    Credenziali: .env (SERVICE_ACCOUNT_PATH, FIREBASE_PROJECT_ID, FUNCTIONS_BASE_URL)
"""

import os
import json
import logging
import requests
from pathlib import Path
from typing import Any, Optional
from datetime import datetime

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Carica .env dalla root del progetto (due livelli sopra execution/)
_ROOT = Path(__file__).parent.parent
_ENV_PATH = _ROOT / ".env"

def _load_env() -> None:
    """Carica variabili d'ambiente da .env se non già presenti."""
    if not _ENV_PATH.exists():
        logger.warning(f".env non trovato in {_ROOT}. Assicurati che esista.")
        return
    with open(_ENV_PATH) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

_load_env()

# ---------------------------------------------------------------------------
# Firebase Admin — inizializzazione lazy (singleton)
# ---------------------------------------------------------------------------

_firebase_app = None

def _get_firebase_app():
    """Restituisce l'app Firebase Admin (inizializza al primo utilizzo)."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        raise RuntimeError(
            "firebase-admin non installato. Esegui: pip install firebase-admin"
        )

    sa_path = os.environ.get("SERVICE_ACCOUNT_PATH", str(_ROOT / "credentials.json"))
    project_id = os.environ.get("FIREBASE_PROJECT_ID", "quinta-os-manager")

    if not Path(sa_path).exists():
        raise FileNotFoundError(
            f"Service Account non trovato: {sa_path}\n"
            "Scaricalo da Firebase Console → Impostazioni progetto → Account di servizio\n"
            "e salvalo come credentials.json nella root del progetto."
        )

    cred = credentials.Certificate(sa_path)
    _firebase_app = firebase_admin.initialize_app(cred, {"projectId": project_id})
    logger.info(f"Firebase Admin inizializzato — progetto: {project_id}")
    return _firebase_app


def _get_db():
    """Restituisce il client Firestore."""
    _get_firebase_app()
    from firebase_admin import firestore
    return firestore.client()

# ---------------------------------------------------------------------------
# Firestore — CRUD
# ---------------------------------------------------------------------------

def firestore_read(
    collection_path: str,
    document_id: Optional[str] = None,
    filters: Optional[list[tuple]] = None,
    limit: int = 100,
) -> list[dict] | dict | None:
    """
    Legge da Firestore.

    Args:
        collection_path: Percorso collezione, es. "missions/ID/okrs"
                         Supporta anche un documento diretto: "users/UID"
        document_id:     Se fornito, legge il singolo documento.
        filters:         Lista di tuple (campo, operatore, valore)
                         es. [("status", "==", "active"), ("priority", ">=", 2)]
        limit:           Max documenti da restituire (default 100).

    Returns:
        dict se document_id specificato, list[dict] altrimenti, None se non trovato.
    """
    db = _get_db()
    parts = collection_path.strip("/").split("/")

    # Singolo documento (percorso pari = documento)
    if len(parts) % 2 == 0 and document_id is None:
        ref = db
        for i, part in enumerate(parts):
            if i % 2 == 0:
                ref = ref.collection(part)
            else:
                ref = ref.document(part)
        doc = ref.get()
        if not doc.exists:
            logger.warning(f"Documento non trovato: {collection_path}")
            return None
        return {"id": doc.id, **doc.to_dict()}

    # Collezione
    ref = db
    for i, part in enumerate(parts):
        if i % 2 == 0:
            ref = ref.collection(part)
        else:
            ref = ref.document(part)

    if document_id:
        doc = ref.document(document_id).get()
        if not doc.exists:
            logger.warning(f"Documento non trovato: {collection_path}/{document_id}")
            return None
        return {"id": doc.id, **doc.to_dict()}

    # Query su collezione
    query = ref
    if filters:
        for field, op, value in filters:
            query = query.where(field, op, value)
    query = query.limit(limit)

    docs = query.stream()
    results = [{"id": d.id, **d.to_dict()} for d in docs]
    logger.info(f"Letti {len(results)} documenti da {collection_path}")
    return results


def firestore_write(
    collection_path: str,
    data: dict,
    document_id: Optional[str] = None,
    merge: bool = True,
) -> str:
    """
    Scrive su Firestore.

    ATTENZIONE: rispetta sempre la gerarchia RBAC prima di chiamare questa funzione.
    Non usare per operazioni che bypassano i controlli di ruolo dell'applicazione.

    Args:
        collection_path: Percorso collezione, es. "missions/ID/signals"
        data:            Dati da scrivere (dict).
        document_id:     ID del documento. Se None, ne viene generato uno nuovo.
        merge:           Se True, fa merge; se False, sovrascrive l'intero documento.

    Returns:
        ID del documento scritto.
    """
    db = _get_db()
    parts = collection_path.strip("/").split("/")

    ref = db
    for i, part in enumerate(parts):
        if i % 2 == 0:
            ref = ref.collection(part)
        else:
            ref = ref.document(part)

    # Aggiunge metadati di sistema
    data = {
        **data,
        "_updatedAt": datetime.utcnow().isoformat() + "Z",
        "_updatedBy": "bridge_utils/python",
    }

    if document_id:
        doc_ref = ref.document(document_id)
        doc_ref.set(data, merge=merge)
        logger.info(f"Scritto documento: {collection_path}/{document_id}")
        return document_id
    else:
        _, doc_ref = ref.add(data)
        logger.info(f"Creato documento: {collection_path}/{doc_ref.id}")
        return doc_ref.id


def firestore_delete(collection_path: str, document_id: str) -> bool:
    """
    Elimina un documento da Firestore.

    ATTENZIONE: operazione irreversibile. Chiedi sempre conferma all'utente
    prima di chiamare questa funzione in un workflow automatico.

    Returns:
        True se eliminato con successo.
    """
    db = _get_db()
    parts = collection_path.strip("/").split("/")

    ref = db
    for i, part in enumerate(parts):
        if i % 2 == 0:
            ref = ref.collection(part)
        else:
            ref = ref.document(part)

    ref.document(document_id).delete()
    logger.info(f"Eliminato documento: {collection_path}/{document_id}")
    return True

# ---------------------------------------------------------------------------
# Cloud Functions — HTTP callable
# ---------------------------------------------------------------------------

def call_cloud_function(
    function_name: str,
    payload: dict,
    id_token: Optional[str] = None,
    region: str = "us-central1",
) -> dict:
    """
    Chiama una Firebase Cloud Function HTTPS callable.

    Args:
        function_name: Nome della funzione, es. "askShadowCoS", "executeToolSecure"
        payload:       Dati da passare alla funzione (dict).
        id_token:      Firebase ID token dell'utente. Se None, usa la base_url da .env.
                       Per chiamate autenticate da script, genera un token custom con
                       get_custom_id_token().
        region:        Regione Cloud Functions (default: us-central1).

    Returns:
        Risposta JSON della funzione (dict).

    Raises:
        RuntimeError: Se la funzione risponde con un errore HTTP.
    """
    project_id = os.environ.get("FIREBASE_PROJECT_ID", "quinta-os-manager")
    base_url = os.environ.get(
        "FUNCTIONS_BASE_URL",
        f"https://{region}-{project_id}.cloudfunctions.net"
    )
    url = f"{base_url}/{function_name}"

    headers = {"Content-Type": "application/json"}
    if id_token:
        headers["Authorization"] = f"Bearer {id_token}"

    # Firebase callable format: { data: payload }
    body = {"data": payload}

    logger.info(f"Chiamata Cloud Function: {function_name}")
    response = requests.post(url, headers=headers, json=body, timeout=60)

    if not response.ok:
        logger.error(f"Cloud Function error {response.status_code}: {response.text}")
        raise RuntimeError(
            f"Cloud Function '{function_name}' ha restituito {response.status_code}:\n"
            f"{response.text}"
        )

    result = response.json()
    # Firebase callable restituisce { result: ... }
    return result.get("result", result)


def get_custom_id_token(uid: str, additional_claims: Optional[dict] = None) -> str:
    """
    Genera un custom token Firebase per un UID specifico (utile per script admin).

    Questo token può poi essere scambiato per un ID token via REST API.
    Usa questa funzione con cautela — solo per operazioni admin autorizzate.

    Args:
        uid:               Firebase UID dell'utente da impersonare.
        additional_claims: Claims aggiuntivi da includere nel token.

    Returns:
        Custom token (str) — va scambiato per un ID token per usare le CF.
    """
    _get_firebase_app()
    from firebase_admin import auth
    token = auth.create_custom_token(uid, additional_claims or {})
    logger.info(f"Custom token generato per UID: {uid}")
    return token.decode("utf-8") if isinstance(token, bytes) else token

# ---------------------------------------------------------------------------
# Utilità progetto
# ---------------------------------------------------------------------------

def read_source_file(relative_path: str) -> str:
    """
    Legge un file sorgente del progetto (src/, functions/, directives/).

    Args:
        relative_path: Percorso relativo alla root, es. "src/services/missionService.js"

    Returns:
        Contenuto del file come stringa.
    """
    full_path = _ROOT / relative_path
    if not full_path.exists():
        raise FileNotFoundError(f"File non trovato: {full_path}")
    return full_path.read_text(encoding="utf-8")


def write_tmp(filename: str, content: Any, as_json: bool = False) -> Path:
    """
    Scrive un file nella directory .tmp/ (file intermedi, mai committare).

    Args:
        filename: Nome del file, es. "okr_export.json"
        content:  Contenuto (str o qualsiasi oggetto se as_json=True).
        as_json:  Se True, serializza come JSON.

    Returns:
        Path completo del file scritto.
    """
    tmp_dir = _ROOT / ".tmp"
    tmp_dir.mkdir(exist_ok=True)
    path = tmp_dir / filename

    if as_json:
        path.write_text(json.dumps(content, indent=2, ensure_ascii=False), encoding="utf-8")
    else:
        path.write_text(str(content), encoding="utf-8")

    logger.info(f"Scritto file temporaneo: {path}")
    return path


def read_tmp(filename: str, as_json: bool = False) -> Any:
    """
    Legge un file dalla directory .tmp/.

    Args:
        filename: Nome del file, es. "okr_export.json"
        as_json:  Se True, deserializza come JSON.

    Returns:
        Contenuto del file (str o dict/list se as_json=True).
    """
    path = _ROOT / ".tmp" / filename
    if not path.exists():
        raise FileNotFoundError(f"File .tmp non trovato: {path}")
    content = path.read_text(encoding="utf-8")
    return json.loads(content) if as_json else content


def get_project_structure() -> dict:
    """
    Restituisce la struttura del progetto come dict (utile per l'Orchestratore).

    Returns:
        Dict con i percorsi chiave del progetto.
    """
    return {
        "root": str(_ROOT),
        "src": str(_ROOT / "src"),
        "functions": str(_ROOT / "functions"),
        "directives": str(_ROOT / "directives"),
        "execution": str(_ROOT / "execution"),
        "tmp": str(_ROOT / ".tmp"),
        "env": str(_ENV_PATH),
        "services": str(_ROOT / "src" / "services"),
        "pages": str(_ROOT / "src" / "pages"),
        "components": str(_ROOT / "src" / "components"),
        "firebase_project": os.environ.get("FIREBASE_PROJECT_ID", "quinta-os-manager"),
    }

# ---------------------------------------------------------------------------
# Self-test (esegui direttamente per verificare la connessione)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Bridge Utils — Self-test ===\n")
    structure = get_project_structure()
    print("Struttura progetto:")
    for key, value in structure.items():
        print(f"  {key}: {value}")

    print("\nTest scrittura .tmp...")
    path = write_tmp("bridge_test.json", {"test": True, "ts": datetime.utcnow().isoformat()}, as_json=True)
    print(f"  Scritto: {path}")

    content = read_tmp("bridge_test.json", as_json=True)
    print(f"  Riletto: {content}")

    print("\nTest connessione Firebase...")
    try:
        db = _get_db()
        print("  Firebase Admin: OK")
        print("\nTutti i test superati. Bridge pronto.")
    except FileNotFoundError as e:
        print(f"  [ATTENZIONE] {e}")
        print("  Il bridge funziona in modalità locale (senza Firebase).")
    except Exception as e:
        print(f"  [ERRORE] {e}")
