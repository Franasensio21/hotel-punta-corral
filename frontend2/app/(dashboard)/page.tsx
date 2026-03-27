"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, BedDouble, CheckCircle, XCircle, Users, DollarSign } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RoomGrid } from "@/components/dashboard/room-grid"
import { RoomFilters } from "@/components/dashboard/room-filters"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import type { HabitacionDisponible, TipoHabitacion } from "@/lib/types"

const LEYENDA = [
  { color: "#22c55e", label: "Libre"   },
  { color: "#3b82f6", label: "Booking" },
  { color: "#fb923c", label: "Directa" },
  { color: "#a855f7", label: "Gmail"   },
  { color: "#facc15", label: "Grupo"   },
  { color: "#9ca3af", label: "Otro"    },
]

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [habitaciones, setHabitaciones] = useState<HabitacionDisponible[]>([])
  const [precios, setPrecios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tipoFilter, setTipoFilter] = useState<TipoHabitacion | "todos">("todos")

  useEffect(() => {
   async function fetchData() {
  setLoading(true)
  try {
    const fecha = format(selectedDate, "yyyy-MM-dd")
    const [data, preciosData] = await Promise.all([
      api.getDisponibilidadPorFecha(fecha),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/precios?hotel_id=${getUser()?.hotel_id ?? 1}`).then(r => r.json()),
    ])
    setHabitaciones(data)
    setPrecios(Array.isArray(preciosData) ? preciosData : [])
  } catch (e) {
    console.error(e)
  } finally {
    setLoading(false)
  }
}
    fetchData()
  }, [selectedDate])

  const filtradas = habitaciones.filter(h => tipoFilter === "todos" || h.tipo === tipoFilter)

  const stats = {
    total:      habitaciones.length,
    disponibles: habitaciones.filter(h => h.disponible).length,
    ocupadas:   habitaciones.filter(h => !h.disponible).length,
  }

  // Personas en el hotel hoy (capacidad de habitaciones ocupadas)
  const personasHoy = habitaciones
    .filter(h => !h.disponible)
    .reduce((sum, h) => sum + h.capacidad, 0)

  // Facturación estimada del día
  const fecha = format(selectedDate, "yyyy-MM-dd")
  const facturacionHoy = habitaciones
    .filter(h => !h.disponible)
    .reduce((sum, h) => {
      const precio = precios.find((p: any) =>
        p.tipo === h.tipo &&
        p.fecha_desde <= fecha &&
        p.fecha_hasta >= fecha
      )
      return sum + (precio ? parseFloat(precio.precio_noche) : 0)
    }, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Disponibilidad</h2>
          <p className="text-muted-foreground capitalize">
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 size-4" />
              {format(selectedDate, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <BedDouble className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">habitaciones</p>
          </CardContent>
        </Card>

        <Card style={{ borderColor: "#22c55e" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Libres</CardTitle>
            <CheckCircle className="size-4" style={{ color: "#22c55e" }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "#22c55e" }}>{stats.disponibles}</div>
            <p className="text-xs text-muted-foreground mt-1">disponibles hoy</p>
          </CardContent>
        </Card>

        <Card style={{ borderColor: "#ef4444" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ocupadas</CardTitle>
            <XCircle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.ocupadas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.ocupadas / stats.total) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card style={{ borderColor: "#3b82f6" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Personas hoy</CardTitle>
            <Users className="size-4" style={{ color: "#3b82f6" }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "#3b82f6" }}>{personasHoy}</div>
            <p className="text-xs text-muted-foreground mt-1">huéspedes en el hotel</p>
          </CardContent>
        </Card>
      </div>

      {/* Facturación */}
      {facturacionHoy > 0 && (
        <Card style={{ borderColor: "#f59e0b" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Facturación estimada del día</CardTitle>
            <DollarSign className="size-4" style={{ color: "#f59e0b" }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "#f59e0b" }}>
              ${facturacionHoy.toLocaleString("es-AR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">basado en precios cargados</p>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent>
          <RoomFilters tipoFilter={tipoFilter} onTipoChange={setTipoFilter} onClearFilters={() => setTipoFilter("todos")} />
        </CardContent>
      </Card>

      {/* Grilla */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Habitaciones</CardTitle>
            <div className="flex flex-wrap gap-3">
              {LEYENDA.map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "4px", backgroundColor: l.color }} />
                  <span className="text-xs text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {Array.from({ length: 30 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
            </div>
          ) : (
            <RoomGrid habitaciones={filtradas} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}