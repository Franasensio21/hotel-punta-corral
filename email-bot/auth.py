"""
auth.py
Maneja la autenticación con Gmail usando OAuth2.
La primera vez abre el navegador para que el usuario autorice.
Las siguientes veces usa el token guardado automáticamente.
"""

import os
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Permisos que necesitamos: leer emails y gestionar borradores
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
]

BASE_DIR = Path(__file__).resolve().parent
TOKEN_FILE       = BASE_DIR / "token.json"
CREDENTIALS_FILE = BASE_DIR / "credentials.json"


def get_gmail_service():
    """
    Retorna un cliente autenticado de Gmail.
    Primera vez: abre el navegador para autorizar.
    Siguientes veces: usa el token guardado.
    """
    creds = None

    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.exists():
                raise FileNotFoundError(
                    "No se encontró credentials.json. "
                    "Descargalo desde Google Cloud Console y copialo a la carpeta email-bot."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_FILE), SCOPES
            )
            creds = flow.run_local_server(port=0)

        TOKEN_FILE.write_text(creds.to_json())

    service = build("gmail", "v1", credentials=creds)
    return service


if __name__ == "__main__":
    print("Autenticando con Gmail...")
    service = get_gmail_service()
    profile = service.users().getProfile(userId="me").execute()
    print(f"Autenticado como: {profile['emailAddress']}")
    print("Token guardado correctamente.")
