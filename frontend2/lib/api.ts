//// Cliente API conectado al backend FastAPI
import type {
  HabitacionDisponible,
  Cliente,
  ClienteForm,
  Reserva,
  ReservaForm,
  FiltrosReserva,
} from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://http://localhost:8000"
const HOTEL_ID = 1

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  // Obtener token del localStorage
  const token = typeof window !== "undefined" ? localStorage.getItem("hotel_token") : null
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de conexión" }))
    throw new Error(error.detail || `Error ${response.status}`)
  }
  return response.json()
}

  // ==================== DISPONIBILIDAD ====================

  async getDisponibilidadPorFecha(fecha: string): Promise<HabitacionDisponible[]> {
    const data = await this.request<{
      fecha: string
      hotel_id: number
      habitaciones: Array<{
        room_id: number
        numero: string
        tipo: string
        subtipo: string | null
        capacidad: number
        estado: string
        origen: string | null
        huesped: string | null
        grupo: string | null
      }>
    }>(`/api/v1/disponibilidad?fecha=${fecha}&hotel_id=${HOTEL_ID}`)

    // Transformar respuesta del backend al formato del frontend
    return data.habitaciones.map((h) => ({
      id: h.room_id,
      numero: h.numero,
      piso: Math.floor(parseInt(h.numero) / 100),
      tipo: h.tipo as any,
      capacidad: h.capacidad,
      genero: "mixto" as any,
      precio_por_noche: 0,
      estado: h.estado === "ocupada" ? "ocupada" : "libre",
      subtipo: h.subtipo || null,
      disponible: h.estado === "libre",
      origen: h.origen,
      huesped: h.huesped,
      grupo: h.grupo,
      created_at: "",
      updated_at: "",
    }))
  }

  async getHabitaciones(): Promise<HabitacionDisponible[]> {
    const data = await this.request<Array<{
      id: number
      number: string
      type: string
      capacity: number
      floor: number | null
      active: boolean
    }>>(`/api/v1/habitaciones?hotel_id=${HOTEL_ID}`)

    return data.map((h) => ({
      id: h.id,
      numero: h.number,
      piso: h.floor ?? 0,
      tipo: h.type as any,
      capacidad: h.capacity,
      genero: "mixto" as any,
      precio_por_noche: 0,
      estado: "libre" as any,
      disponible: true,
      origen: null,
      huesped: null,
      grupo: null,
      created_at: "",
      updated_at: "",
    }))
  }

  // ==================== CLIENTES ====================

  async getClientes(busqueda?: string): Promise<Cliente[]> {
    const params = busqueda ? `?search=${encodeURIComponent(busqueda)}&hotel_id=${HOTEL_ID}` : `?hotel_id=${HOTEL_ID}`
    const data = await this.request<Array<{
      id: number
      name: string
      email: string | null
      phone: string | null
      nationality: string | null
      created_at: string
    }>>(`/api/v1/clientes${params}`)

    return data.map((c) => ({
      id: c.id,
      nombre: c.name.split(" ")[0] || c.name,
      apellido: c.name.split(" ").slice(1).join(" ") || "",
      dni: "",
      telefono: c.phone || undefined,
      email: c.email || undefined,
      origen: "nacional" as any,
      created_at: c.created_at,
      updated_at: c.created_at,
    }))
  }

  async createCliente(data: ClienteForm): Promise<Cliente> {
    const body = {
      name: `${data.nombre} ${data.apellido}`.trim(),
      email: data.email || null,
      phone: data.telefono || null,
      nationality: null,
    }
    const res = await this.request<{ id: number; name: string; email: string | null; phone: string | null; created_at: string }>(
      `/api/v1/clientes?hotel_id=${HOTEL_ID}`,
      { method: "POST", body: JSON.stringify(body) }
    )
    return {
      id: res.id,
      nombre: res.name.split(" ")[0] || res.name,
      apellido: res.name.split(" ").slice(1).join(" ") || "",
      dni: "",
      email: res.email || undefined,
      telefono: res.phone || undefined,
      origen: "nacional" as any,
      created_at: res.created_at,
      updated_at: res.created_at,
    }
  }

  async updateCliente(id: number, data: ClienteForm): Promise<void> {
  await this.request(
    `/api/v1/clientes/${id}?hotel_id=${HOTEL_ID}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        name: `${data.nombre} ${data.apellido}`.trim(),
        email: data.email || null,
        phone: data.telefono || null,
      }),
    }
  )
}

async deleteCliente(id: number): Promise<void> {
  await this.request(
    `/api/v1/clientes/${id}?hotel_id=${HOTEL_ID}`,
    { method: "DELETE" }
  )
}

  // ==================== RESERVAS ====================

  async getReservas(filtros?: FiltrosReserva): Promise<Reserva[]> {
    const params = new URLSearchParams({ hotel_id: HOTEL_ID.toString() })
    if (filtros?.estado) params.append("status", filtros.estado)
    if (filtros?.fecha_desde) params.append("desde", filtros.fecha_desde)
    if (filtros?.fecha_hasta) params.append("hasta", filtros.fecha_hasta)

    const data = await this.request<Array<{
      id: number
      room_id: number
      guest_id: number | null
      channel_id: number
      check_in: string
      check_out: string
      status: string
      notes: string | null
      created_at: string
    }>>(`/api/v1/reservas?${params}`)

    return data.map((r) => ({
      id: r.id,
      cliente_id: r.guest_id || 0,
      habitacion_id: r.room_id,
      fecha_checkin: r.check_in,
      fecha_checkout: r.check_out,
      precio_total: 0,
      estado: r.status === "confirmed" ? "activa" : r.status === "cancelled" ? "cancelada" : "completada",
      notas: r.notes || undefined,
      created_at: r.created_at,
      updated_at: r.created_at,
    }))
  }

  async createReserva(data: ReservaForm): Promise<Reserva> {
    const body = {
      room_id: data.habitacion_id,
      guest_id: data.cliente_id || null,
      channel_id: 2, // directa por defecto
      check_in: data.fecha_checkin,
      check_out: data.fecha_checkout,
      notes: data.notas || null,
    }
    const res = await this.request<{
      id: number
      room_id: number
      guest_id: number | null
      check_in: string
      check_out: string
      status: string
      created_at: string
    }>(`/api/v1/reservar?hotel_id=${HOTEL_ID}`, {
      method: "POST",
      body: JSON.stringify(body),
    })

    return {
      id: res.id,
      cliente_id: res.guest_id || 0,
      habitacion_id: res.room_id,
      fecha_checkin: res.check_in,
      fecha_checkout: res.check_out,
      precio_total: 0,
      estado: "activa",
      created_at: res.created_at,
      updated_at: res.created_at,
    }
  }

  async cancelarReserva(id: number): Promise<Reserva> {
    const res = await this.request<{ id: number; status: string }>(
      `/api/v1/reservas/${id}?hotel_id=${HOTEL_ID}`,
      { method: "DELETE" }
    )
    return {
      id: res.id,
      cliente_id: 0,
      habitacion_id: 0,
      fecha_checkin: "",
      fecha_checkout: "",
      precio_total: 0,
      estado: "cancelada",
      created_at: "",
      updated_at: "",
    }
  }
}

export const api = new ApiClient()