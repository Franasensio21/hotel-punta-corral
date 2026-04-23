export type TipoHabitacion = "double" | "triple" | "quad" | "quintuple"
export type GeneroHabitacion = "masculino" | "femenino" | "mixto"
export type EstadoHabitacion = "libre" | "ocupada" | "mantenimiento"
export type EstadoReserva = "activa" | "completada" | "cancelada"
export type OrigenCliente = "nacional" | "extranjero"

export interface Habitacion {
  id: number
  numero: string
  piso: number
  tipo: TipoHabitacion
  capacidad: number
  genero: GeneroHabitacion
  precio_por_noche: number
  estado: EstadoHabitacion
  descripcion?: string
  created_at: string
  updated_at: string
}

export interface HabitacionDisponible extends Habitacion {
  disponible: boolean
  subtipo?: string | null
  origen?: string | null
  huesped?: string | null
  grupo?: string | null
}

export interface Cliente {
  id: number
  nombre: string
  apellido: string
  dni: string
  telefono?: string
  email?: string
  origen: OrigenCliente
  direccion?: string
  fecha_nacimiento?: string
  created_at: string
  updated_at: string
}

export interface Reserva {
  id: number
  cliente_id: number
  habitacion_id: number
  fecha_checkin: string
  fecha_checkout: string
  precio_total?: number | null
  sena?: number | null
  estado: EstadoReserva
  notas?: string
  created_at: string
  updated_at: string
  cliente?: Cliente
  habitacion?: Habitacion
}

export interface HabitacionForm {
  numero: string
  piso: number
  tipo: TipoHabitacion
  capacidad: number
  genero: GeneroHabitacion
  precio_por_noche: number
  estado: EstadoHabitacion
  descripcion?: string
}

export interface ClienteForm {
  nombre: string
  apellido: string
  dni: string
  telefono?: string
  email?: string
  origen: OrigenCliente
  direccion?: string
  fecha_nacimiento?: string
}

export interface ReservaForm {
  cliente_id: number
  habitacion_id: number
  fecha_checkin: string
  fecha_checkout: string
  notas?: string
}

export interface FiltrosHabitacion {
  tipo?: TipoHabitacion
  genero?: GeneroHabitacion
  estado?: EstadoHabitacion
  piso?: number
}

export interface FiltrosReserva {
  estado?: EstadoReserva
  fecha_desde?: string
  fecha_hasta?: string
  cliente_id?: number
}