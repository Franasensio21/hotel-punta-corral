"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ReservationTable } from "@/components/reservations/reservation-table"
import { api } from "@/lib/api"
import type { Reserva, EstadoReserva, Cliente, HabitacionDisponible } from "@/lib/types"
import { toast } from "sonner"
import { authFetch, getUser } from "@/lib/auth"

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [clientes, setClientes] = useState<Record<number, Cliente>>({})
  const [habitaciones, setHabitaciones] = useState<Record<number, HabitacionDisponible>>({})
  const [loading, setLoading] = useState(true)
  const [estadoFilter, setEstadoFilter] = useState<EstadoReserva | "todos">("activa")
  const [nombreFilter, setNombreFilter] = useState("")
  const [fechaFilter, setFechaFilter] = useState("")
  const [cancelReserva, setCancelReserva] = useState<Reserva | null>(null)
  const [borrarReserva, setBorrarReserva] = useState<Reserva | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [reservasData, clientesData, habitacionesData] = await Promise.all([
        api.getReservas(),
        api.getClientes(),
        api.getHabitaciones(),
      ])
      setReservas(reservasData)
      setClientes(clientesData.reduce((acc, c) => { acc[c.id] = c; return acc }, {} as Record<number, Cliente>))
      setHabitaciones(habitacionesData.reduce((acc, h) => { acc[h.id] = h; return acc }, {} as Record<number, HabitacionDisponible>))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtradas = reservas.filter((r) => {
    // Filtro por estado
    if (estadoFilter !== "todos" && r.estado !== estadoFilter) return false

    // Filtro por nombre de cliente
    if (nombreFilter.trim()) {
      const cliente = clientes[r.cliente_id]
      const nombre = cliente ? `${cliente.nombre} ${cliente.apellido}`.toLowerCase() : ""
      if (!nombre.includes(nombreFilter.toLowerCase())) return false
    }

    // Filtro por fecha (checkin o checkout que incluya la fecha seleccionada)
    if (fechaFilter) {
      const checkin  = r.fecha_checkin
      const checkout = r.fecha_checkout
      if (fechaFilter < checkin || fechaFilter > checkout) return false
    }

    return true
  })

  const handleCancel = async () => {
    if (!cancelReserva) return
    try {
      await api.cancelarReserva(cancelReserva.id)
      toast.success("Reserva cancelada correctamente")
      fetchData()
    } catch {
      toast.error("Error al cancelar la reserva")
    } finally {
      setCancelReserva(null)
    }
  }

  const handleBorrar = async () => {
    if (!borrarReserva) return
    try {
      await authFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/reservas/${borrarReserva.id}/borrar?hotel_id=${getUser()?.hotel_id ?? 1}`, {
        method: "DELETE"
      })
      toast.success("Reserva eliminada correctamente")
      fetchData()
    } catch {
      toast.error("Error al eliminar la reserva")
    } finally {
      setBorrarReserva(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reservas</h2>
          <p className="text-muted-foreground">Listado de todas las reservas</p>
        </div>
        <Button asChild>
          <Link href="/reservas/nueva">
            <Plus className="mr-2 size-4" />
            Nueva reserva
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v as EstadoReserva | "todos")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activa">Activas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={nombreFilter}
                onChange={e => setNombreFilter(e.target.value)}
                className="pl-9"
              />
            </div>

            <Input
              type="date"
              value={fechaFilter}
              onChange={e => setFechaFilter(e.target.value)}
              className="w-[180px]"
            />

            {(nombreFilter || fechaFilter || estadoFilter !== "activa") && (
              <Button variant="ghost" size="sm" onClick={() => {
                setNombreFilter("")
                setFechaFilter("")
                setEstadoFilter("activa")
              }}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ReservationTable
              reservas={filtradas}
              clientes={clientes}
              habitaciones={habitaciones}
              onCancel={setCancelReserva}
              onBorrar={setBorrarReserva}
              onRefresh={fetchData}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!cancelReserva} onOpenChange={() => setCancelReserva(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de cancelar la reserva #{cancelReserva?.id}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!borrarReserva} onOpenChange={() => setBorrarReserva(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar reserva</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar permanentemente la reserva #{borrarReserva?.id}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleBorrar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}