"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { LogIn, Plus, Search, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { authFetch } from "@/lib/auth"

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1"
const HOTEL_ID = (typeof window !== "undefined" ? getUser()?.hotel_id : null) ?? 1

const TIPO_LABELS: Record<string, string> = {
  double: "Doble", triple: "Triple", quad: "Cuádruple",
  quintuple: "Quíntuple", familiar: "Familiar",
}

const SUBTIPO_LABELS: Record<string, string> = {
  matrimonial: "Matrimonial", twin: "Twin", familiar: "Familiar",
}

interface Reserva {
  room_id:   number
  numero:    string
  tipo:      string
  subtipo:   string | null
  capacidad: number
  huesped:   string | null
  grupo:     string | null
  origen:    string | null
}

interface HabDisponible {
  room_id:   number
  numero:    string
  tipo:      string
  subtipo:   string | null
  capacidad: number
}

interface Cliente {
  id:     number
  nombre: string
  apellido: string
}

export default function RecepcionistaPage() {
  const [ingresos, setIngresos]   = useState<Reserva[]>([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Form nueva reserva
  const [clientes, setClientes]         = useState<Cliente[]>([])
  const [habitaciones, setHabitaciones] = useState<HabDisponible[]>([])
  const [clienteId, setClienteId]       = useState("")
  const [nuevoNombre, setNuevoNombre]   = useState("")
  const [habId, setHabId]               = useState("")
  const [checkout, setCheckout]         = useState("")
  const [buscandoCliente, setBuscando]  = useState(false)
  const [guardando, setGuardando]       = useState(false)

  const hoy = new Date()
  const hoyStr = format(hoy, "yyyy-MM-dd")

  useEffect(() => { fetchIngresos() }, [])

  async function fetchIngresos() {
    setLoading(true)
    try {
      const res = await authFetch(`${API}/disponibilidad?fecha=${hoyStr}&hotel_id=${HOTEL_ID}`)
      const data = await res.json()
      const ocupadas = data.habitaciones.filter((h: any) => h.estado === "ocupada")
      setIngresos(ocupadas)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function abrirModal() {
    setModalOpen(true)
    // Cargar habitaciones libres hoy y clientes
    try {
      const [resHab, resClientes] = await Promise.all([
        authFetch(`${API}/disponibilidad?fecha=${hoyStr}&hotel_id=${HOTEL_ID}`).then(r => r.json()),
        authFetch(`${API}/clientes?hotel_id=${HOTEL_ID}`).then(r => r.json()),
      ])
      setHabitaciones(resHab.habitaciones.filter((h: any) => h.estado === "libre"))
      setClientes(resClientes.map((c: any) => ({
        id: c.id,
        nombre: c.name.split(" ")[0] || c.name,
        apellido: c.name.split(" ").slice(1).join(" ") || "",
      })))
    } catch (e) {
      console.error(e)
    }
  }

  async function handleGuardar() {
    if (!habId || !checkout) {
      toast.error("Completá habitación y fecha de salida")
      return
    }
    if (!clienteId && !nuevoNombre.trim()) {
      toast.error("Ingresá un cliente o un nombre")
      return
    }
    setGuardando(true)
    try {
      let guestId = clienteId ? parseInt(clienteId) : null

      // Si es nuevo cliente, crearlo
      if (!clienteId && nuevoNombre.trim()) {
        const res = await authFetch(`${API}/clientes?hotel_id=${HOTEL_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nuevoNombre.trim(), email: null, phone: null }),
        })
        const nuevo = await res.json()
        guestId = nuevo.id
      }

      await authFetch(`${API}/reservar?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id:    parseInt(habId),
          guest_id:   guestId,
          channel_id: 2,
          check_in:   hoyStr,
          check_out:  checkout,
        }),
      })

      toast.success("Reserva creada correctamente")
      setModalOpen(false)
      setClienteId(""); setNuevoNombre(""); setHabId(""); setCheckout("")
      fetchIngresos()
    } catch (e: any) {
      toast.error(e.message || "Error al crear la reserva")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recepción</h2>
          <p className="text-muted-foreground capitalize">
            {format(hoy, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <Button onClick={abrirModal} className="gap-2">
          <Plus className="size-4" />
          Walk-in
        </Button>
      </div>

      {/* Habitaciones ocupadas hoy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LogIn className="size-5 text-green-500" />
            <span>Ocupadas hoy</span>
            <Badge style={{ backgroundColor: "#22c55e", color: "#fff" }}>{ingresos.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : ingresos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay habitaciones ocupadas hoy</p>
          ) : (
            ingresos.map(h => (
              <div key={h.room_id} style={{
                display: "flex", alignItems: "center", gap: "16px",
                padding: "14px 16px", borderRadius: "10px",
                backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
              }}>
                <div style={{
                  width: "52px", height: "52px", borderRadius: "10px", flexShrink: 0,
                  backgroundColor: "#22c55e",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "#fff", fontSize: "20px", fontWeight: "900" }}>{h.numero}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {TIPO_LABELS[h.tipo] || h.tipo} {SUBTIPO_LABELS[h.subtipo || ""] || ""}
                    </span>
                    <Badge variant="outline" className="text-xs">{h.capacidad} pers.</Badge>
                    {h.origen && <Badge variant="outline" className="text-xs capitalize">{h.origen}</Badge>}
                  </div>
                  {h.huesped && <span className="text-sm text-muted-foreground">{h.huesped}</span>}
                  {h.grupo && <span className="text-sm text-muted-foreground">Grupo: {h.grupo}</span>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Modal nueva reserva walk-in */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva reserva — Walk-in</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={v => { setClienteId(v); setNuevoNombre("") }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nombre} {c.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">o</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Input
                placeholder="Nombre del cliente (nuevo)"
                value={nuevoNombre}
                onChange={e => { setNuevoNombre(e.target.value); setClienteId("") }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Habitación disponible</Label>
              <Select value={habId} onValueChange={setHabId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná..." />
                </SelectTrigger>
                <SelectContent>
                  {habitaciones.map(h => (
                    <SelectItem key={h.room_id} value={h.room_id.toString()}>
                      {h.numero} — {TIPO_LABELS[h.tipo]} {SUBTIPO_LABELS[h.subtipo || ""] || ""} ({h.capacidad} pers.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Check-out</Label>
              <Input
                type="date"
                value={checkout}
                min={hoyStr}
                onChange={e => setCheckout(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Confirmar reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}