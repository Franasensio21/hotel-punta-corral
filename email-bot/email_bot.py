"""
email_bot.py
Bot de respuestas automáticas para Hotel Punta Corral.
Maneja reservas particulares por Gmail (NO grupos, NO Booking).

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
from datetime import datetime, date, timedelta
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

# Labels de Gmail
LABEL_PROCESADO   = "HotelBot/Procesado"
LABEL_CONSULTA    = "HotelBot/Consulta"
LABEL_PAGO        = "HotelBot/Pago"
LABEL_CANCELACION = "HotelBot/Cancelacion"
LABEL_GRUPO       = "HotelBot/Grupo"
LABEL_BOOKING     = "HotelBot/Booking"

TIPO_LABEL    = {"double": "Doble", "triple": "Triple", "quad": "Cuádruple", "quintuple": "Quíntuple", "familiar": "Familiar"}
SUBTIPO_LABEL = {"matrimonial": "matrimonial", "twin": "twin (camas separadas)", "familiar": "familiar"}

# Remitentes conocidos de Booking.com
BOOKING_SENDERS = ["booking.com", "noreply@booking.com", "guest@booking.com", "partner@booking.com"]


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
    fecha_limite = (date.today() - timedelta(days=5)).strftime("%Y/%m/%d")
    query = (
        f"-label:{LABEL_PROCESADO} "
        f"in:inbox "
        f"-category:promotions "
        f"-category:social "
        f"-category:updates "
        f"-category:forums "
        f"is:unread "
        f"after:{fecha_limite}"
    )
    result = service.users().messages().list(userId="me", q=query, maxResults=max_results).execute()
    return result.get("messages", [])


def get_email_content(service, msg_id):
    """Obtiene el contenido completo de un email incluyendo threadId."""
    msg = service.users().messages().get(userId="me", id=msg_id, format="full").execute()
    headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
    subject    = headers.get("Subject", "(sin asunto)")
    sender     = headers.get("From", "")
    message_id = headers.get("Message-ID", "")
    thread_id  = msg.get("threadId", "")

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

    return {
        "id":         msg_id,
        "thread_id":  thread_id,
        "message_id": message_id,
        "subject":    subject,
        "sender":     sender,
        "body":       body[:3000],
        "snippet":    msg.get("snippet", ""),
    }


def get_thread_context(service, thread_id, max_messages=5):
    """
    Obtiene los últimos mensajes del hilo para dar contexto al bot.
    Limita a max_messages para no gastar tokens en exceso.
    """
    try:
        thread = service.users().threads().get(userId="me", id=thread_id, format="full").execute()
        messages = thread.get("messages", [])
        # Tomar solo los últimos N mensajes
        messages = messages[-max_messages:]

        context_parts = []
        for msg in messages:
            headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
            sender  = headers.get("From", "")
            date_str = headers.get("Date", "")

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

            body = extract_body(msg["payload"])[:1000]  # Limitar por mensaje para ahorrar tokens
            context_parts.append(f"[{date_str}] De: {sender}\n{body}")

        return "\n\n---\n\n".join(context_parts)
    except Exception as e:
        print(f"  Error obteniendo contexto del hilo: {e}")
        return ""


def is_booking_sender(sender):
    """Detecta si el remitente es de Booking.com."""
    sender_lower = sender.lower()
    return any(b in sender_lower for b in BOOKING_SENDERS)


def analyze_thread(client, email, thread_context):
    """
    Analiza el email y el contexto del hilo para determinar:
    - Si es un grupo (más de 12 personas o negociación grupal)
    - Si es de Booking
    - La etapa de la conversación
    - Qué tipo de respuesta generar
    """
    prompt = f"""Analizá este email y el historial de conversación de un hotel llamado "{HOTEL_NOMBRE}".

EMAIL ACTUAL:
Asunto: {email['subject']}
De: {email['sender']}
Cuerpo: {email['body']}

HISTORIAL DE CONVERSACIÓN (últimos mensajes del hilo):
{thread_context if thread_context else "No hay historial previo - es el primer mensaje."}

Determiná:
1. Si es una reserva de GRUPO (más de 12 personas, o la conversación muestra negociación de grupo, o menciona "grupo", "empresa", "evento", "conferencia", etc.)
2. Si es de Booking.com (notificación automática)
3. La etapa de la conversación particular (si no es grupo ni Booking)
4. Qué acción tomar

Respondé SOLO con este JSON:
{{
  "es_grupo": false,
  "es_booking": false,
  "categoria": "consulta_disponibilidad",
  "etapa": "primera_consulta",
  "confianza": "alta",
  "resumen": "descripcion breve del email",
  "fechas_detectadas": {{"desde": "2026-04-15", "hasta": "2026-04-20"}},
  "personas": 2,
  "tipo_habitacion": null,
  "razon_cancelacion": null
}}

Categorías posibles: "consulta_disponibilidad", "seguimiento_reserva", "pago", "cancelacion", "irrelevante"
Etapas posibles: "primera_consulta", "seguimiento", "confirmacion_pago", "cancelacion_inicial", "cancelacion_motivo"

IMPORTANTE:
- Si en el historial hay menciones de grupos grandes, eventos o negociaciones grupales → es_grupo: true
- Si el remitente es booking.com o similar → es_booking: true  
- Hoy es {date.today().strftime('%d/%m/%Y')}
- Si no detectás fechas ponés null
- Si no detectás personas ponés null"""

    try:
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        print(f"  Error analizando hilo: {e}")
        return {
            "es_grupo": False, "es_booking": False,
            "categoria": "irrelevante", "confianza": "baja",
            "resumen": "Error al analizar"
        }


def get_availability_rango(fecha_desde, fecha_hasta, personas=None, tipo_solicitado=None):
    """Obtiene disponibilidad para un rango de fechas."""
    try:
        # Disponibilidad por rango
        url = f"{BACKEND_URL}/api/v1/disponibilidad/rango?check_in={fecha_desde}&check_out={fecha_hasta}&hotel_id={HOTEL_ID}"
        resp = requests.get(url, timeout=10)
        if not resp.ok:
            return None

        habitaciones = resp.json().get("habitaciones", [])

        # Filtrar por capacidad
        if personas:
            habitaciones = [h for h in habitaciones if h["capacidad"] >= personas]

        # Filtrar por tipo solicitado
        if tipo_solicitado:
            filtradas = [h for h in habitaciones if h["tipo"] == tipo_solicitado]
            if filtradas:
                habitaciones = filtradas

        # Agrupar por tipo + subtipo
        tipos = {}
        for h in habitaciones:
            key = f"{h['tipo']}_{h.get('subtipo', '') or ''}"
            if key not in tipos:
                tipos[key] = {"tipo": h["tipo"], "subtipo": h.get("subtipo"), "cantidad": 0, "capacidad": h["capacidad"]}
            tipos[key]["cantidad"] += 1

        # Buscar precios para la fecha de inicio
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
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta,
            "disponibles": len(habitaciones),
            "tipos":       tipos,
            "precios":     precios,
        }
    except Exception as e:
        print(f"  Error consultando disponibilidad: {e}")
    return None


def generate_response(client, email, analisis, availability, thread_context):
    """Genera la respuesta apropiada según la etapa de la conversación."""

    categoria = analisis.get("categoria")
    etapa     = analisis.get("etapa", "primera_consulta")
    fechas    = analisis.get("fechas_detectadas")
    personas  = analisis.get("personas")

    # Construir texto de disponibilidad
    avail_text = ""
    if availability and availability["disponibles"] > 0:
        lineas = []
        for key, info in availability["tipos"].items():
            precio = availability["precios"].get(key)
            label  = f"{TIPO_LABEL.get(info['tipo'], info['tipo'])} {SUBTIPO_LABEL.get(info.get('subtipo') or '', '')}".strip()
            if precio:
                lineas.append(f"- {label}: {info['cantidad']} disponible(s) a ${int(precio):,} por noche")
            else:
                lineas.append(f"- {label}: {info['cantidad']} disponible(s) (precio a consultar)")
        fechas_str = ""
        if fechas:
            fechas_str = f" ({fechas.get('desde', '')} al {fechas.get('hasta', '')})"
        avail_text = f"\nDisponibilidad{fechas_str}:\n" + "\n".join(lineas)

    # ── CONSULTA DE DISPONIBILIDAD ──────────────────────────────────────────
    if categoria == "consulta_disponibilidad":
        if not fechas or not fechas.get("desde"):
            situacion = "El cliente no especificó fechas. Preguntale amablemente para qué fechas y cuántas personas."
        elif not availability or availability["disponibles"] == 0:
            situacion = f"No hay habitaciones disponibles para esas fechas ({fechas.get('desde')} al {fechas.get('hasta', '')}). Sugerile fechas alternativas o consultale si tiene flexibilidad."
        else:
            hay_precios = bool(availability.get("precios"))
            if hay_precios:
                situacion = f"Hay disponibilidad:{avail_text}\nIndicale que para confirmar la reserva necesita transferir una seña del 30% y pasale el CBU."
            else:
                tipos_disp = ", ".join([
                    f"{TIPO_LABEL.get(info['tipo'], info['tipo'])}".strip()
                    for info in availability["tipos"].values()
                ])
                situacion = f"Hay disponibilidad ({tipos_disp}) pero no hay precios cargados en el sistema. Indicale que le enviás los precios a la brevedad."

        contexto_previo = f"\nContexto de la conversación previa:\n{thread_context[:500]}" if thread_context and etapa != "primera_consulta" else ""

        prompt = f"""Redactá una respuesta como si fueras Lorena, encargada del Hotel Punta Corral.

Ejemplo de tono real:
"Buenos días Daiana, te paso el valor de la habitación doble In 22/03 Out 27/03, 5 noches, $55.000 por noche, incluye desayuno, baño privado, servicio de mucama, wifi, tv por cable, y estacionamiento. Si deseas realizar la reserva, te pasamos un CBU para transferir una seña del 30%, con eso confirmás la reserva, el resto lo abonás al llegar al hotel. Saludos, Lorena."

Consulta recibida: {analisis.get('resumen', '')}
Situación: {situacion}
{contexto_previo}

Instrucciones:
- Usá el nombre del cliente si aparece en el email o en el historial
- NO menciones WhatsApp, todo se maneja por email
- Firmá como Lorena
- Si hay disponibilidad con precios, mencioná tipos, precios e incluye: desayuno, baño privado, servicio de mucama, wifi, tv por cable y estacionamiento
- NUNCA uses nombres técnicos como quad_twin, siempre nombres legibles
- Si pedís fechas o info, sé concisa y amable
- Máximo 150 palabras, solo español

Respondé SOLO con el cuerpo del email."""

    # ── PAGO / COMPROBANTE ──────────────────────────────────────────────────
    elif categoria == "pago":
        prompt = f"""Redactá una respuesta confirmando recepción del comprobante de pago como si fueras Lorena, encargada del Hotel Punta Corral.

Resumen del email: {analisis.get('resumen', '')}
Contexto previo: {thread_context[:300] if thread_context else 'Sin contexto previo'}

Instrucciones:
- Confirmá que recibiste el comprobante
- Confirmá que la reserva queda confirmada
- Indicá que el resto del pago se abona al llegar
- Deseales una linda estadía
- Firmá como Lorena
- Tono cálido y profesional, máximo 100 palabras

Respondé SOLO con el cuerpo del email."""

    # ── CANCELACIÓN ─────────────────────────────────────────────────────────
    elif categoria == "cancelacion":
        razon = analisis.get("razon_cancelacion")

        if etapa == "cancelacion_motivo" and razon:
            # Ya nos dijo el motivo — ofrecer solución
            if availability and availability["disponibles"] > 0:
                solucion = f"Ofrecele una alternativa basándote en la disponibilidad:{avail_text}"
            else:
                solucion = "No hay disponibilidad alternativa por ahora. Ofrecele guardar la reserva para otra fecha."

            prompt = f"""Redactá una respuesta a la cancelación como si fueras Lorena, encargada del Hotel Punta Corral.

El cliente canceló por: {razon}
{solucion}
Contexto previo: {thread_context[:300] if thread_context else ''}

Instrucciones:
- Mostrá comprensión por la situación
- Intentá ofrecer una solución o alternativa concreta
- Si no hay solución posible, deseale lo mejor amablemente
- Firmá como Lorena
- Máximo 120 palabras, tono empático

Respondé SOLO con el cuerpo del email."""

        else:
            # Primera vez que cancela — preguntar motivo
            prompt = f"""Redactá una respuesta a la cancelación como si fueras Lorena, encargada del Hotel Punta Corral.

Resumen: {analisis.get('resumen', '')}

Instrucciones:
- Confirmá recepción de la cancelación con comprensión
- Preguntale amablemente el motivo de la cancelación
- Indicá que si hay algo que puedas hacer para ayudar, lo harás
- Firmá como Lorena
- Máximo 80 palabras, tono comprensivo

Respondé SOLO con el cuerpo del email."""

    # ── SEGUIMIENTO ─────────────────────────────────────────────────────────
    elif categoria == "seguimiento_reserva":
        prompt = f"""Redactá una respuesta de seguimiento como si fueras Lorena, encargada del Hotel Punta Corral.

Resumen del email: {analisis.get('resumen', '')}
Contexto de la conversación:
{thread_context[:500] if thread_context else 'Sin contexto previo'}

Instrucciones:
- Respondé en el contexto de la conversación previa
- Sé útil y concisa
- Firmá como Lorena
- Máximo 120 palabras

Respondé SOLO con el cuerpo del email."""

    else:
        return None

    try:
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return response.text.strip()
    except Exception as e:
        print(f"  Error generando respuesta: {e}")
        return None


def create_draft_reply(service, email, response_text):
    """
    Crea un borrador como RESPUESTA al hilo original.
    Así Gmail lo muestra dentro de la conversación completa.
    """
    sender    = email["sender"]
    reply_to  = sender.split("<")[1].rstrip(">") if "<" in sender else sender
    subject   = email["subject"]
    if not subject.startswith("Re: "):
        subject = "Re: " + subject

    msg = MIMEMultipart()
    msg["To"]         = reply_to
    msg["Subject"]    = subject
    msg["In-Reply-To"] = email.get("message_id", "")
    msg["References"]  = email.get("message_id", "")
    msg.attach(MIMEText(response_text, "plain", "utf-8"))

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

    # Vincular el borrador al hilo original usando threadId
    draft = service.users().drafts().create(
        userId="me",
        body={"message": {"raw": raw, "threadId": email["thread_id"]}}
    ).execute()
    return draft["id"]


def add_label(service, msg_id, label_id):
    service.users().messages().modify(
        userId="me", id=msg_id,
        body={"addLabelIds": [label_id]}
    ).execute()


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
    label_grupo       = get_or_create_label(service, LABEL_GRUPO)
    label_booking     = get_or_create_label(service, LABEL_BOOKING)

    print("Buscando emails nuevos...")
    messages = get_unprocessed_emails(service, max_results=20)

    if not messages:
        print("No hay emails nuevos para procesar.")
        return

    print(f"Encontrados {len(messages)} emails nuevos.\n")
    stats = {"consulta": 0, "pago": 0, "cancelacion": 0, "seguimiento": 0,
             "grupo": 0, "booking": 0, "irrelevante": 0, "error": 0}

    for i, msg_ref in enumerate(messages, 1):
        try:
            email = get_email_content(service, msg_ref["id"])
            print(f"[{i}/{len(messages)}] {email['subject'][:60]}")
            print(f"          De: {email['sender'][:50]}")

            # ── Detectar Booking por remitente antes de gastar tokens ──────
            if is_booking_sender(email["sender"]):
                stats["booking"] += 1
                print(f"          Booking.com detectado por remitente, ignorado")
                add_label(service, msg_ref["id"], label_booking)
                add_label(service, msg_ref["id"], label_procesado)
                time.sleep(1)
                print()
                continue

            # ── Obtener contexto del hilo ──────────────────────────────────
            thread_context = ""
            if email["thread_id"]:
                thread_context = get_thread_context(service, email["thread_id"], max_messages=4)

            # ── Analizar email + contexto del hilo ────────────────────────
            analisis  = analyze_thread(client, email, thread_context)
            categoria = analisis.get("categoria", "irrelevante")

            print(f"          Es grupo: {analisis.get('es_grupo', False)}")
            print(f"          Categoria: {categoria} | Etapa: {analisis.get('etapa', '?')}")
            print(f"          Resumen: {analisis.get('resumen', '')[:80]}")

            # ── Ignorar grupos ─────────────────────────────────────────────
            if analisis.get("es_grupo") or analisis.get("es_booking"):
                tipo = "grupo" if analisis.get("es_grupo") else "booking"
                stats[tipo] += 1
                print(f"          {tipo.capitalize()} detectado, ignorado")
                lbl = label_grupo if tipo == "grupo" else label_booking
                add_label(service, msg_ref["id"], lbl)
                add_label(service, msg_ref["id"], label_procesado)
                time.sleep(1)
                print()
                continue

            # ── Procesar según categoría ───────────────────────────────────
            availability = None
            fechas = analisis.get("fechas_detectadas")

            if categoria in ("consulta_disponibilidad", "cancelacion", "seguimiento_reserva"):
                if fechas and fechas.get("desde"):
                    try:
                        fecha_desde = date.fromisoformat(fechas["desde"])
                        fecha_hasta = date.fromisoformat(fechas.get("hasta", fechas["desde"]))
                        if fecha_desde >= date.today():
                            availability = get_availability_rango(
                                fechas["desde"],
                                fechas.get("hasta", fechas["desde"]),
                                personas=analisis.get("personas"),
                                tipo_solicitado=analisis.get("tipo_habitacion")
                            )
                        else:
                            analisis["fechas_pasadas"] = True
                    except Exception:
                        pass

            if categoria == "consulta_disponibilidad":
                stats["consulta"] += 1
                response_text = generate_response(client, email, analisis, availability, thread_context)
                if response_text and not test_mode:
                    draft_id = create_draft_reply(service, email, response_text)
                    print(f"          Borrador creado en hilo ({draft_id[:20]}...)")
                elif response_text:
                    print(f"          [TEST] Respuesta:\n{'-'*40}\n{response_text[:500]}\n{'-'*40}")
                add_label(service, msg_ref["id"], label_consulta)

            elif categoria == "pago":
                stats["pago"] += 1
                response_text = generate_response(client, email, analisis, None, thread_context)
                if response_text and not test_mode:
                    draft_id = create_draft_reply(service, email, response_text)
                    print(f"          Borrador de confirmación de pago creado ({draft_id[:20]}...)")
                elif response_text:
                    print(f"          [TEST] Respuesta:\n{'-'*40}\n{response_text[:500]}\n{'-'*40}")
                add_label(service, msg_ref["id"], label_pago)

            elif categoria == "cancelacion":
                stats["cancelacion"] += 1
                response_text = generate_response(client, email, analisis, availability, thread_context)
                if response_text and not test_mode:
                    draft_id = create_draft_reply(service, email, response_text)
                    print(f"          Borrador de cancelación creado ({draft_id[:20]}...)")
                elif response_text:
                    print(f"          [TEST] Respuesta:\n{'-'*40}\n{response_text[:500]}\n{'-'*40}")
                add_label(service, msg_ref["id"], label_cancelacion)

            elif categoria == "seguimiento_reserva":
                stats["seguimiento"] += 1
                response_text = generate_response(client, email, analisis, availability, thread_context)
                if response_text and not test_mode:
                    draft_id = create_draft_reply(service, email, response_text)
                    print(f"          Borrador de seguimiento creado ({draft_id[:20]}...)")
                elif response_text:
                    print(f"          [TEST] Respuesta:\n{'-'*40}\n{response_text[:500]}\n{'-'*40}")
                add_label(service, msg_ref["id"], label_consulta)

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
    print(f"  Consultas:     {stats['consulta']}")
    print(f"  Pagos:         {stats['pago']}")
    print(f"  Cancelaciones: {stats['cancelacion']}")
    print(f"  Seguimientos:  {stats['seguimiento']}")
    print(f"  Grupos:        {stats['grupo']}")
    print(f"  Booking:       {stats['booking']}")
    print(f"  Irrelevantes:  {stats['irrelevante']}")
    print(f"  Errores:       {stats['error']}")
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