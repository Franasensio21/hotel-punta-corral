import os
import json
import requests
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
]

BASE_DIR = Path(__file__).resolve().parent
TOKEN_FILE       = BASE_DIR / "token.json"
CREDENTIALS_FILE = BASE_DIR / "credentials.json"

RAILWAY_TOKEN    = os.getenv("RAILWAY_API_TOKEN")
RAILWAY_SERVICE_ID = os.getenv("RAILWAY_SERVICE_ID")
RAILWAY_ENV_ID   = os.getenv("RAILWAY_ENVIRONMENT_ID")


def update_railway_env(new_token_json: str):
    """Actualiza GMAIL_TOKEN_JSON en Railway automáticamente."""
    if not RAILWAY_TOKEN or not RAILWAY_SERVICE_ID or not RAILWAY_ENV_ID:
        print("  [auth] Variables de Railway no configuradas, no se actualizó el token en Railway")
        return
    try:
        query = """
        mutation($serviceId: String!, $environmentId: String!, $input: [VariableUpsertInput!]!) {
            variableCollectionUpsert(serviceId: $serviceId, environmentId: $environmentId, variables: $input)
        }
        """
        resp = requests.post(
            "https://backboard.railway.app/graphql/v2",
            headers={"Authorization": f"Bearer {RAILWAY_TOKEN}", "Content-Type": "application/json"},
            json={
                "query": query,
                "variables": {
                    "serviceId": RAILWAY_SERVICE_ID,
                    "environmentId": RAILWAY_ENV_ID,
                    "input": [{"name": "GMAIL_TOKEN_JSON", "value": new_token_json}]
                }
            },
            timeout=10
        )
        if resp.ok:
            print("  [auth] Token de Gmail actualizado en Railway")
        else:
            print(f"  [auth] Error actualizando Railway: {resp.text}")
    except Exception as e:
        print(f"  [auth] Error actualizando Railway: {e}")


def get_gmail_service():
    creds = None

    token_env = os.getenv("GMAIL_TOKEN_JSON")

    if token_env:
        creds = Credentials.from_authorized_user_info(json.loads(token_env), SCOPES)
    elif TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("  [auth] Token expirado, renovando...")
            creds.refresh(Request())
            # Guardar token renovado
            new_token = creds.to_json()
            # Actualizar en Railway automáticamente
            update_railway_env(new_token)
            # También guardar localmente por si acaso
            TOKEN_FILE.write_text(new_token)
            print("  [auth] Token renovado correctamente")
        else:
            raise RuntimeError(
                "Token inválido y no tiene refresh_token. "
                "Regenerá el token localmente y actualizá GMAIL_TOKEN_JSON."
            )

    return build("gmail", "v1", credentials=creds)
