"""
email_bot.py
Uso:
    python email_bot.py           # procesa emails nuevos
    python email_bot.py --test    # muestra sin crear borradores
"""

import os
import base64
import json
import argparse
import requests
import time
from datetime import datetime, date
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from google import genai
from dotenv import load_dotenv
from auth import get_gmail_service

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HOTEL_NOMBRE   = os.getenv("HOTEL_NOMBRE", "El Hotel")
HOTEL_ID       = os.getenv("HOTEL_ID", "1")
BACKEND_URL    = os.getenv("BACKEND_URL", "http://localhost:8000")

LABEL_PROCESADO   = "HotelBot/Procesado"
LABEL_CONSULTA    = "HotelBot/Consulta"
LABEL_PAGO        = "HotelBot/Pago"
LABEL_CANCELACION = "HotelBot/Cancelacion"

TIPO_LABEL   = {"double": "Doble", "triple": "Triple", "quad": "Cuádruple", "quintuple": "Quíntuple", "familiar": "Familiar"}
SUBTIPO_LABEL = {"matrimonial": "matrimonial", "twin": "twin (camas separadas)", "familiar": "familiar"}


def setup_gemini():
    return genai.Client(api_key=GEMINI_API_KEY)


def get_or_create_label(service, label_name):
    labels = service.users().labels().list(userId="me").execute()
    for label in labels.get("labels", []):
        if label["name"] == label_name:
            return label["id"]
    created = service.users().labels().create(
        userId="me",
        body={"name": label_name, "labelListVisibility": "labelShow", "messageListVisibility": "show"}
    ).execute()
    return created["id"]


def get_unprocessed_emails(service, max_results=20):
    query = (
        f"-label:{LABEL_PROCESADO} "
        f"in:inbox "
        f"-category:promotions "
        f"-category:social "
        f"-category:updates "
        f"-category:forums "
        f"is:unread"
    )
    result = service.users().messages().list(userId="me", q=query, maxResults=max_results).execute()
    return result.get("messages", [])


def get_email_content(service, msg_id):
    msg = service.users().messages().get(userId="me", id=msg_id, format="full").execute()
    headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
    subject = headers.get("Subject", "(sin asunto)")
    sender  = headers.get("From", "")

    def extract_body(part):
        if part.get("mimeType") == "text/plain":
            data = part.get("body", {}).get("data", "")
            if data:
                return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
        if "parts" in part:
            for p in part["parts"]:
                result = extract_body(p)
                if result:
                    return result
        return ""

    body = extract_body(msg["payload"])
    if not body:
        data = msg["payload"].get("body", {}).get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

    return {"id": msg_id, "subject": subject, "sender": sender, "body": body[:3000], "snippet": msg.get("snippet", "")}


def classify_email(client, email):
    prompt = f"""Analizá este email recibido por un hotel llamado "{HOTEL_NOMBRE}".

Asunto: {email['subject']}
De: {email['sender']}
Cuerpo: {email['body']}

Clasificá el email en UNA de estas categorías y respondé SOLO con un JSON:
- "consulta_disponibilidad": pregunta por habitaciones, quiere reservar, pregunta precios o fechas
- "cancelacion": quiere cancelar una reserva existente
- "pago": envía comprobante de pago o transferencia
- "reserva_booking": notificación automática de Booking.com
- "irrelevante": spam, publicidad, facturas, newsletters

Para tipo_habitacion usá: double, triple, quad, quintuple, familiar — o null si no se especifica.

Respondé SOLO con este JSON sin texto adicional:
{{"categoria": "consulta_disponibilidad", "confianza": "alta", "resumen": "descripcion breve", "fechas_detectadas": {{"desde": "2026-04-15", "hasta": "2026-04-20"}}, "personas": 2, "tipo_habitacion": null}}

Si no detectás fechas ponés null. Si no detectás personas ponés null.
IMPORTANTE: Hoy es {date.today().strftime('%d/%m/%Y')}. Si el email menciona fechas sin año, asumir que son del año en curso o futuro, nunca del pasado."""

    try:
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        print(f"  Error clasificando: {e}")
        return {"categoria": "irrelevante", "confianza": "baja", "resumen": "Error al clasificar"}


def get_availability(fecha_desde, personas=None, tipo_solicitado=None):
    try:
        url = f"{BACKEND_URL}/api/v1/disponibilidad?fecha={fecha_desde}&hotel_id={HOTEL_ID}"
        resp = requests.get(url, timeout=10)
        if not resp.ok:
            return None
        habitaciones = resp.json().get("habitaciones", [])
        libres   = [h for h in habitaciones if h["estado"] == "libre"]
        ocupadas = [h for h in habitaciones if h["estado"] == "ocupada"]

        # Filtrar por capacidad
        if personas:
            libres = [h for h in libres if h["capacidad"] >= personas]

        # Filtrar por tipo solicitado
        if tipo_solicitado:
            libres_filtrado = [h for h in libres if h["tipo"] == tipo_solicitado]
            if libres_filtrado:
                libres = libres_filtrado

        # Agrupar por tipo + subtipo
        tipos = {}
        for h in libres:
            key = f"{h['tipo']}_{h.get('subtipo', '')}"
            if key not in tipos:
                tipos[key] = {"tipo": h["tipo"], "subtipo": h.get("subtipo"), "cantidad": 0, "capacidad": h["capacidad"]}
            tipos[key]["cantidad"] += 1

        # Buscar precios
        precios = {}
        for key, info in tipos.items():
            pr = requests.get(
                f"{BACKEND_URL}/api/v1/precios/consulta?fecha={fecha_desde}&tipo={info['tipo']}&hotel_id={HOTEL_ID}",
                timeout=5
            )
            if pr.ok:
                p = pr.json().get("precio")
                if p:
                    precios[key] = p

        return {
            "fecha":    fecha_desde,
            "total":    len(habitaciones),
            "libres":   len(libres),
            "ocupadas": len(ocupadas),
            "tipos":    tipos,
            "precios":  precios,
        }
    except Exception as e:
        print(f"  Error consultando backend: {e}")
    return None


def generate_response(client, email, clasificacion, availability):
    avail_text = ""
    if availability:
        lineas = []
        for key, info in availability["tipos"].items():
            precio = availability["precios"].get(key)
            label  = f"{TIPO_LABEL.get(info['tipo'], info['tipo'])} {SUBTIPO_LABEL.get(info['subtipo'], '')}".strip()
            if precio:
                lineas.append(f"- {label}: {info['cantidad']} disponible(s) a ${int(precio):,} por noche")
            else:
                lineas.append(f"- {label}: {info['cantidad']} disponible(s) (precio a consultar)")
        avail_text = f"\nDisponibilidad para {availability['fecha']}:\n" + "\n".join(lineas)

    categoria = clasificacion.get("categoria")

    if categoria == "consulta_disponibilidad":
        fechas_pasadas = clasificacion.get("fechas_pasadas", False)
        fechas   = clasificacion.get("fechas_detectadas")
        personas = clasificacion.get("personas")
        es_grupo = personas and personas > 4

        if not fechas or not fechas.get("desde"):
            situacion = "El cliente no especificó fechas. Preguntale amablemente para qué fechas necesita."
        elif fechas_pasadas:
            situacion = f"Las fechas consultadas ({fechas.get('desde')}) ya pasaron. Pedile amablemente las fechas correctas."
        elif not availability or availability["libres"] == 0:
            situacion = "No hay habitaciones disponibles para esas fechas. Sugerile otras fechas."
        else:
            hay_precios = bool(availability.get("precios"))
            if hay_precios:
                situacion = f"Hay disponibilidad:{avail_text}"
            else:
                tipos_disp = ", ".join([
                    f"{TIPO_LABEL.get(info['tipo'], info['tipo'])} {SUBTIPO_LABEL.get(info['subtipo'], '')}".strip()
                    for info in availability["tipos"].values()
                ])
                situacion = f"Hay disponibilidad para esas fechas: {tipos_disp}. No hay precios cargados en el sistema para ese período. Indicale que le enviarás los precios por este mismo correo a la brevedad."

        cena_texto = "- Preguntale si desean incluir la cena en el paquete." if es_grupo else ""

        prompt = f"""Redactá una respuesta como si fueras Lorena, encargada del Hotel Punta Corral.

Ejemplo de tono real:
"Buenos días Daiana, te paso el valor de la habitación doble In 22/03 Out 27/03, 5 noches, $55.000 por noche, incluye desayuno, baño privado, servicio de mucama, wifi, tv por cable, y estacionamiento. Si deseas realizar la reserva, te pasamos un CBU para transferir una seña del 30%, con eso confirmás la reserva, el resto lo abonás al llegar al hotel. Saludos, Lorena."

Consulta recibida: {clasificacion.get('resumen', '')}
Situación: {situacion}
{cena_texto}

Instrucciones:
- Usá el nombre del cliente si aparece
- NO menciones WhatsApp, todo se maneja por email
- Firmá como Lorena
- Si hay disponibilidad con precios, mencioná tipos, precios e incluye: desayuno, baño privado, servicio de mucama, wifi, tv por cable y estacionamiento
- NUNCA uses nombres técnicos como quad_twin, siempre nombres legibles como "cuádruple twin"
- Si pedís fechas o info, sé concisa
- Máximo 120 palabras, solo español

Respondé SOLO con el cuerpo del email."""

    elif categoria == "cancelacion":
        prompt = f"""Respuesta de recepción de cancelación para Hotel Punta Corral.
Resumen: {clasificacion.get('resumen', '')}
- Confirmá recepción, indicá que procesarán y confirmarán
- Firmá como Lorena, tono comprensivo, máximo 80 palabras
Respondé SOLO con el cuerpo del email."""

    else:
        return None

    try:
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return response.text.strip()
    except Exception as e:
        print(f"  Error generando respuesta: {e}")
        return None


def create_draft(service, original_email, response_text):
    sender   = original_email["sender"]
    reply_to = sender.split("<")[1].rstrip(">") if "<" in sender else sender
    subject  = original_email["subject"]
    if not subject.startswith("Re: "):
        subject = "Re: " + subject
    msg = MIMEMultipart()
    msg["To"]      = reply_to
    msg["Subject"] = subject
    msg.attach(MIMEText(response_text, "plain", "utf-8"))
    raw   = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
    draft = service.users().drafts().create(userId="me", body={"message": {"raw": raw}}).execute()
    return draft["id"]


def add_label(service, msg_id, label_id):
    service.users().messages().modify(userId="me", id=msg_id, body={"addLabelIds": [label_id]}).execute()


def process_emails(test_mode=False):
    print(f"\n{'='*50}")
    print(f"Hotel Bot - {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"Modo: {'TEST (sin borradores)' if test_mode else 'PRODUCCION'}")
    print(f"{'='*50}\n")

    print("Conectando con Gmail...")
    service = get_gmail_service()

    print("Inicializando Gemini...")
    client = setup_gemini()

    label_procesado   = get_or_create_label(service, LABEL_PROCESADO)
    label_consulta    = get_or_create_label(service, LABEL_CONSULTA)
    label_pago        = get_or_create_label(service, LABEL_PAGO)
    label_cancelacion = get_or_create_label(service, LABEL_CANCELACION)

    print("Buscando emails nuevos...")
    messages = get_unprocessed_emails(service, max_results=20)

    if not messages:
        print("No hay emails nuevos para procesar.")
        return

    print(f"Encontrados {len(messages)} emails nuevos.\n")
    stats = {"consulta": 0, "cancelacion": 0, "pago": 0, "booking": 0, "irrelevante": 0, "error": 0}

    for i, msg_ref in enumerate(messages, 1):
        try:
            email         = get_email_content(service, msg_ref["id"])
            print(f"[{i}/{len(messages)}] {email['subject'][:60]}")
            print(f"          De: {email['sender'][:50]}")

            clasificacion = classify_email(client, email)
            categoria     = clasificacion.get("categoria", "irrelevante")
            print(f"          Categoria: {categoria} ({clasificacion.get('confianza', '?')})")
            print(f"          Resumen: {clasificacion.get('resumen', '')[:80]}")

            if categoria == "consulta_disponibilidad":
                stats["consulta"] += 1
                fechas         = clasificacion.get("fechas_detectadas")
                availability   = None
                fechas_pasadas = False

                if fechas and fechas.get("desde"):
                    try:
                        fecha_desde = date.fromisoformat(fechas["desde"])
                        if fecha_desde < date.today():
                            fechas_pasadas = True
                        else:
                            availability = get_availability(
                                fechas["desde"],
                                personas=clasificacion.get("personas"),
                                tipo_solicitado=clasificacion.get("tipo_habitacion")
                            )
                    except Exception:
                        pass

                clasificacion["fechas_pasadas"] = fechas_pasadas

                response_text = generate_response(client, email, clasificacion, availability)
                if response_text and not test_mode:
                    draft_id = create_draft(service, email, response_text)
                    print(f"          Borrador creado ({draft_id[:20]}...)")
                elif response_text:
                    print(f"          [TEST] Respuesta:\n{'-'*40}\n{response_text[:500]}\n{'-'*40}")
                add_label(service, msg_ref["id"], label_consulta)

            elif categoria == "cancelacion":
                stats["cancelacion"] += 1
                response_text = generate_response(client, email, clasificacion, None)
                if response_text and not test_mode:
                    create_draft(service, email, response_text)
                    print(f"          Borrador de cancelacion creado")
                add_label(service, msg_ref["id"], label_cancelacion)

            elif categoria == "pago":
                stats["pago"] += 1
                print(f"          Etiquetado como pago")
                add_label(service, msg_ref["id"], label_pago)

            elif categoria == "reserva_booking":
                stats["booking"] += 1
                print(f"          Notificacion de Booking, ignorada")

            else:
                stats["irrelevante"] += 1
                print(f"          Irrelevante, ignorado")

            add_label(service, msg_ref["id"], label_procesado)
            time.sleep(5)
            print()

        except Exception as e:
            stats["error"] += 1
            print(f"          Error: {e}\n")

    print(f"\n{'='*50}")
    print("Resumen:")
    print(f"  Consultas:    {stats['consulta']}")
    print(f"  Cancelaciones:{stats['cancelacion']}")
    print(f"  Pagos:        {stats['pago']}")
    print(f"  Booking:      {stats['booking']}")
    print(f"  Irrelevantes: {stats['irrelevante']}")
    print(f"  Errores:      {stats['error']}")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hotel Email Bot")
    parser.add_argument("--test", action="store_true", help="Modo test: no crea borradores")
    args = parser.parse_args()

    INTERVALO = int(os.getenv("INTERVALO_MINUTOS", "15")) * 60

    while True:
        try:
            process_emails(test_mode=args.test)
        except Exception as e:
            print(f"Error en el ciclo principal: {e}")
        print(f"Esperando {INTERVALO // 60} minutos...\n")
        time.sleep(INTERVALO)