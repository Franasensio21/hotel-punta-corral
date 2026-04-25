🏨 Hotel Management System
Sistema de gestión integral para hoteles, desarrollado como SaaS multi-tenant. Actualmente en producción en Hotel Punta Corral (Tilcara, Argentina).



📋 Descripción
Plataforma web completa para la gestión operativa de hoteles. Cubre desde reservas y disponibilidad hasta finanzas, recursos humanos y stock. Diseñada para ser escalable a múltiples hoteles con aislamiento total de datos por tenant.

✨ Funcionalidades principales
🛏️ Reservas y disponibilidad

Grilla de disponibilidad en tiempo real por fecha
Creación y edición de reservas con historial de cambios
Sistema de señas (depósitos) con seguimiento de pagos
Reservas grupales con gestión de habitaciones y cenas incluidas
Cambios temporales de tipo/capacidad de habitación por período

💰 Finanzas

Dashboard de ingresos y egresos del mes
Gráficos de torta: ingresos por canal (Booking, Gmail, grupos, directo) y egresos por categoría
Secciones configurables de reservas y cenas con detalle de ingresos/egresos
Cálculo automático de ingresos basado en precios por tipo de habitación
Gestión de gastos por categoría con edición

👥 Recursos humanos

Fichajes diarios con múltiples turnos por empleado
Historial mensual por empleado con edición
Cálculo automático de sueldos (fijos y temporales)
Horas extra: modalidad cobrar o acumular como días libres
Banco de días con registro de ausencias
Sistema de ausencias que descuenta del banco o registra deuda de horas

📦 Stock

Control de inventario por categorías (desayuno, cena, limpieza, mantenimiento, servicios, obra)
Búsqueda predictiva al registrar compras
Carga masiva de productos en una sola compra
Compra rápida desde la tabla de stock con botón "+"
Cada compra genera automáticamente un gasto en finanzas

🍽️ Cenas grupales

Configuración de precio de cena por persona en grupos
Registro de pasajeros que cenan por cada noche
Total de ingresos por cenas reflejado en finanzas

🤖 Bot de emails con IA

Respuesta automática a consultas de disponibilidad vía Gmail
Generado con Google Gemini 2.5 Flash
Detecta y clasifica emails: consultas, pagos, cancelaciones, grupos, Booking
Crea borradores de respuesta vinculados al hilo original
Manejo de contexto de conversación completa
Token de Gmail con auto-renovación

🔐 Multi-tenant y seguridad

Arquitectura multi-hotel con aislamiento por hotel_id en JWT
Panel superadmin para gestión de todos los hoteles
Roles: superadmin, admin, employee
Historial de cambios en reservas por usuario


🛠️ Stack tecnológico
CapaTecnologíaFrontendNext.js 14, TypeScript, Tailwind CSS, shadcn/uiBackendFastAPI (Python), SQLAlchemyBase de datosPostgreSQLInfraestructuraRailwayIAGoogle Gemini 2.5 FlashAutenticaciónJWTEmailGmail API (OAuth 2.0)

🏗️ Arquitectura
hotel-system/
├── backend/          # FastAPI — API REST, lógica de negocio
├── frontend2/        # Next.js — interfaz web
├── email-bot/        # Bot Python — respuestas automáticas por email
└── database/         # Backups SQL
El sistema está desplegado en Railway con tres servicios independientes:

API (FastAPI en Python)
Web (Next.js)
Email Bot (Python, corre cada 30 minutos)


📸 Capturas

Próximamente


🔧 Variables de entorno requeridas
Backend
DATABASE_URL=
JWT_SECRET=
DEFAULT_HOTEL_ID=
Frontend
NEXT_PUBLIC_API_URL=
Email Bot
GMAIL_TOKEN_JSON=
GMAIL_CREDENTIALS_JSON=
GEMINI_API_KEY=
BACKEND_URL=
HOTEL_ID=
HOTEL_NOMBRE=
RAILWAY_API_TOKEN=

📈 Estado del proyecto
El sistema está actualmente en producción y en desarrollo activo. Roadmap planificado a 6 meses con los siguientes hitos:

✅ Mes 1-2: Base sólida, reservas, fichajes, finanzas, stock, grupos
🔄 Mes 3: Reportes PDF, gráficos históricos, calendario Gantt, reservas online
📅 Mes 4: Onboarding automatizado, configuración por hotel, separación de BD por tenant
📅 Mes 5: Primer cliente externo piloto
📅 Mes 6: Lanzamiento comercial


👨‍💻 Autor
Francisco Asensio
Desarrollado de forma independiente como producto SaaS para el mercado hotelero argentino.

📄 Licencia
Este proyecto es privado y está protegido por derechos de autor. No se permite su uso, copia o distribución sin autorización expresa del autor.