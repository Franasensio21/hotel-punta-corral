import os
import json
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


def get_gmail_service():
    creds = None

    # Intentar leer token desde variable de entorno primero
    token_env = os.getenv("GMAIL_TOKEN_JSON")
    credentials_env = os.getenv("GMAIL_CREDENTIALS_JSON")

    if token_env:
        creds = Credentials.from_authorized_user_info(json.loads(token_env), SCOPES)
    elif TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            raise RuntimeError(
                "Token inválido o expirado y no se puede renovar. "
                "Regenerá el token localmente y actualizá GMAIL_TOKEN_JSON."
            )

    service = build("gmail", "v1", credentials=creds)
    return service
