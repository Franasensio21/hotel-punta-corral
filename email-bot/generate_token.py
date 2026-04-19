"""
generate_token.py
Genera el token de Gmail para el bot.
Ejecutar una sola vez localmente para obtener el token inicial.
"""

import os
import json
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
]

BASE_DIR         = Path(__file__).resolve().parent
TOKEN_FILE       = BASE_DIR / "token.json"
CREDENTIALS_FILE = BASE_DIR / "credentials.json"


def main():
    creds = None

    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Intentando renovar token existente...")
            creds.refresh(Request())
        else:
            print("Abriendo navegador para autenticación...")
            if not CREDENTIALS_FILE.exists():
                print(f"ERROR: No se encontró {CREDENTIALS_FILE}")
                print("Descargá el credentials.json desde Google Cloud Console")
                return
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)

    TOKEN_FILE.write_text(creds.to_json())
    print(f"\nToken guardado en: {TOKEN_FILE}")
    print("\nContenido para copiar en Railway (GMAIL_TOKEN_JSON):")
    print("=" * 60)
    print(creds.to_json())
    print("=" * 60)


if __name__ == "__main__":
    main()
