"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import type { Cliente, HabitacionDisponible, ReservaForm } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { authFetch } from "@/lib/auth"

const TIPO_LABELS: Record<string, string> = {
  double: "Doble", triple: "Triple", quad: "Cuádruple", quintuple: "Quíntuple",
}

const CANALES = [
  { id: 1, nombre: "Booking.com" },
  { id: 2, nombre: "Reserva directa" },
  { id: 3, nombre: "Gmail / Email" },
  { id: 4, nombre: "Grupo" },
  { id: 5, nombre: "Otro" },
]

export default function NuevaReservaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(false)

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [habitaciones, setHabitaciones] = useState<HabitacionDisponible[]>([])

  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [selectedRoomId, setSelectedRoomId] = useState<string>("")
  const [selectedCanalId, setSelectedCanalId] = useState<string>("2")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })
  const [notas, setNotas] = useState("")
  const [tipoOcupacion, setTipoOcupacion] = useState<string>("individual")

  // Nuevo cliente
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoEmail, setNuevoEmail] = useState("")
  const [modoNuevoCliente, setModoNuevoCliente] = useState(false)

  useEffect(() => {
    api.getClientes().then(setClientes).catch(console.error)
  }, [])

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      setLoadingRooms(true)
      setSelectedRoomId("")
      const fecha = format(dateRange.from, "yyyy-MM-dd")
      api.getDisponibilidadPorFecha(fecha)
        .then(data => setHabitaciones(data.filter(h => h.disponible)))
        .catch(console.error)
        .finally(() => setLoadingRooms(false))
    }
  }, [dateRange])

  const noches = dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) : 0
  const selectedRoom = habitaciones.find(h => h.id.toString() === selectedRoomId)
  const canSubmit = (selectedClientId || nuevoNombre.trim()) && selectedRoomId && dateRange.from && dateRange.to && noches > 0

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Completá todos los campos obligatorios")
      return
    }

    setLoading(true)
    try {
      let clienteId = parseInt(selectedClientId)

      // Si es nuevo cliente, crearlo primero
      if (modoNuevoCliente && nuevoNombre.trim()) {
        const nuevoCliente = await api.createCliente({
          nombre: nuevoNombre.split(" ")[0],
          apellido: nuevoNombre.split(" ").slice(1).join(" "),
          dni: "",
          origen: "nacional",
          email: nuevoEmail || undefined,
        })
        clienteId = nuevoCliente.id
      }

      const reservaData: ReservaForm = {
        cliente_id: clienteId,
        habitacion_id: parseInt(selectedRoomId),
        fecha_checkin: format(dateRange.from!, "yyyy-MM-dd"),
        fecha_checkout: format(dateRange.to!, "yyyy-MM-dd"),
        notas: notas || undefined,
      }

      // Inyectamos el canal seleccionado
      const body = {
        room_id: reservaData.habitacion_id,
        guest_id: clienteId || null,
        channel_id: parseInt(selectedCanalId),
        check_in: reservaData.fecha_checkin,
        check_out: reservaData.fecha_checkout,
        notes: reservaData.notas || null,
        tipo_ocupacion: tipoOcupacion,
      }

      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/reservar?hotel_id=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error al crear la reserva" }))
        throw new Error(err.detail)
      }

      toast.success("Reserva creada correctamente")
      router.push("/reservas")
    } catch (e: any) {
      toast.error(e.message || "Error al crear la reserva")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nueva reserva</h2>
        <p className="text-muted-foreground">Completá los datos para registrar una reserva</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Cliente</CardTitle>
              <CardDescription>Seleccioná un cliente existente o registrá uno nuevo</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Button variant={!modoNuevoCliente ? "default" : "outline"} size="sm" onClick={() => setModoNuevoCliente(false)}>
                  Cliente existente
                </Button>
                <Button variant={modoNuevoCliente ? "default" : "outline"} size="sm" onClick={() => setModoNuevoCliente(true)}>
                  Nuevo cliente
                </Button>
              </div>

              {!modoNuevoCliente ? (
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Buscá un cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.nombre} {c.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Label>Nombre completo *</Label>
                    <Input placeholder="Ej: Ana García" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Email o teléfono</Label>
                    <Input placeholder="Ej: ana@email.com" value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Fechas</CardTitle>
              <CardDescription>Elegí las fechas de entrada y salida</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 size-4" />
                      {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "Check-in"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))} disabled={(date) => date < new Date()} initialFocus />
                  </PopoverContent>
                </Popover>

                <ArrowRight className="size-4 text-muted-foreground" />

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 size-4" />
                      {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Check-out"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateRange.to} onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))} disabled={(date) => !dateRange.from || date <= dateRange.from} initialFocus />
                  </PopoverContent>
                </Popover>

                {noches > 0 && <span className="text-sm text-muted-foreground">{noches} noche{noches > 1 ? "s" : ""}</span>}
              </div>
            </CardContent>
          </Card>

          {/* Habitación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Habitación</CardTitle>
              <CardDescription>
                {dateRange.from && dateRange.to ? "Habitaciones libres para esas fechas" : "Primero elegí las fechas"}
              </CardDescription>
            </CardHeader>
            <CardContent>
  {!dateRange.from || !dateRange.to ? (
    <div className="flex items-center justify-center py-8 border rounded-lg border-dashed">
      <p className="text-sm text-muted-foreground">Seleccioná las fechas para ver disponibilidad</p>
    </div>
  ) : loadingRooms ? (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
    </div>
  ) : habitaciones.length === 0 ? (
    <div className="flex items-center justify-center py-8 border rounded-lg border-dashed">
      <p className="text-sm text-muted-foreground">No hay habitaciones disponibles para esas fechas</p>
    </div>
  ) : (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {habitaciones.map(h => (
          <button key={h.id} onClick={() => {
            setSelectedRoomId(h.id.toString())
            setTipoOcupacion("individual")
          }}
            style={{
              backgroundColor: selectedRoomId === h.id.toString() ? "#1d4ed8" : "#f0fdf4",
              border: `2px solid ${selectedRoomId === h.id.toString() ? "#1d4ed8" : "#22c55e"}`,
              color: selectedRoomId === h.id.toString() ? "#fff" : "#166534",
              borderRadius: "10px", padding: "10px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "16px", fontWeight: "900" }}>{h.numero}</span>
            <span style={{ fontSize: "10px", fontWeight: "600" }}>{TIPO_LABELS[h.tipo] || h.tipo}</span>
            <span style={{ fontSize: "10px" }}>{h.capacidad} pers.</span>
          </button>
        ))}
      </div>
      {selectedRoom && selectedRoom.tipo === "double" && (
        <div className="flex flex-col gap-2">
          <Label>Tipo de ocupación</Label>
          <div className="flex gap-2">
            <Button
              variant={tipoOcupacion === "individual" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoOcupacion("individual")}
            >
              Doble (2 personas)
            </Button>
            <Button
              variant={tipoOcupacion === "single" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoOcupacion("single")}
            >
              Single (1 persona)
            </Button>
          </div>
        </div>
        )}
      </div>
    )}
  </CardContent>
</Card>

          {/* Canal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">4. Canal de reserva</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCanalId} onValueChange={setSelectedCanalId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANALES.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">5. Notas <span className="text-muted-foreground font-normal text-sm">(opcional)</span></CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Pedidos especiales, llegada tarde, etc." value={notas} onChange={e => setNotas(e.target.value)} rows={3} />
            </CardContent>
          </Card>
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium text-right">
                    {modoNuevoCliente ? (nuevoNombre || "—") : (clientes.find(c => c.id.toString() === selectedClientId) ? `${clientes.find(c => c.id.toString() === selectedClientId)!.nombre} ${clientes.find(c => c.id.toString() === selectedClientId)!.apellido}` : "—")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Habitación:</span>
                  <span className="font-medium">{selectedRoom ? selectedRoom.numero : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-in:</span>
                  <span className="font-medium">{dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-out:</span>
                  <span className="font-medium">{dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Noches:</span>
                  <span className="font-medium">{noches || "—"}</span>
                </div>
              </div>

              <Separator />

              <Button size="lg" className="w-full" disabled={!canSubmit || loading} onClick={handleSubmit}>
                {loading ? "Guardando..." : "Confirmar reserva"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}