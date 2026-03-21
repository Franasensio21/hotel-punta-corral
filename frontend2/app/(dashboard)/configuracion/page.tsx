"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { authFetch } from "@/lib/auth"

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1"
const HOTEL_ID = 1

const TIPO_LABELS: Record<string, string> = {
  single: "single",double: "Doble", triple: "Triple", quad: "Cuádruple",
  quintuple: "Quíntuple", familiar: "Familiar",
}

const SUBTIPO_LABELS: Record<string, string> = {
  matrimonial: "Matrimonial", twin: "Twin", familiar: "Familiar",
}

interface Override {
  id:                number
  room_id:           number
  numero:            string
  fecha_desde:       string
  fecha_hasta:       string
  tipo_override:     string | null
  subtipo_override:  string | null
  capacidad_override: number | null
  notas:             string | null
}

interface Habitacion {
  id:     number
  number: string
  type:   string
}

export default function ConfiguracionPage() {
  const [umbralGrupo, setUmbralGrupo]   = useState("15")
  const [umbralEdit, setUmbralEdit]     = useState("15")
  const [overrides, setOverrides]       = useState<Override[]>([])
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [loading, setLoading]           = useState(true)
  const [modalOpen, setModalOpen]       = useState(false)
  const [guardando, setGuardando]       = useState(false)

  const [form, setForm] = useState({
    room_id:           "",
    fecha_desde:       "",
    fecha_hasta:       "",
    tipo_override:     "",
    subtipo_override:  "",
    capacidad_override: "",
    notas:             "",
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [configData, overridesData, habData] = await Promise.all([
        authFetch(`${API}/configuracion?hotel_id=${HOTEL_ID}`).then(r => r.json()),
        authFetch(`${API}/habitaciones/overrides?hotel_id=${HOTEL_ID}`).then(r => r.json()),
        authFetch(`${API}/habitaciones?hotel_id=${HOTEL_ID}`).then(r => r.json()),
      ])
      const umbral = configData.find((c: any) => c.clave === "umbral_grupo")
      if (umbral) { setUmbralGrupo(umbral.valor); setUmbralEdit(umbral.valor) }
      setOverrides(overridesData)
      setHabitaciones(habData)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleGuardarUmbral() {
    try {
      await authFetch(`${API}/configuracion/umbral_grupo?hotel_id=${HOTEL_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor: umbralEdit }),
      })
      setUmbralGrupo(umbralEdit)
      toast.success("Umbral de grupo actualizado")
    } catch {
      toast.error("Error al guardar")
    }
  }

  async function handleGuardarOverride() {
    if (!form.room_id || !form.fecha_desde || !form.fecha_hasta) {
      toast.error("Completá habitación y fechas")
      return
    }
    setGuardando(true)
    try {
      await authFetch(`${API}/habitaciones/overrides?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id:           parseInt(form.room_id),
          fecha_desde:       form.fecha_desde,
          fecha_hasta:       form.fecha_hasta,
          tipo_override:     form.tipo_override     || null,
          subtipo_override:  form.subtipo_override  || null,
          capacidad_override: form.capacidad_override ? parseInt(form.capacidad_override) : null,
          notas:             form.notas             || null,
        }),
      })
      toast.success("Override guardado")
      setModalOpen(false)
      setForm({ room_id: "", fecha_desde: "", fecha_hasta: "", tipo_override: "", subtipo_override: "", capacidad_override: "", notas: "" })
      fetchData()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminarOverride(id: number) {
    await authFetch(`${API}/habitaciones/overrides/${id}?hotel_id=${HOTEL_ID}`, { method: "DELETE" })
    toast.success("Override eliminado")
    fetchData()
  }

  const campo = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">Ajustes generales del hotel</p>
      </div>

      {/* Umbral de grupo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="size-4" />
            Umbral de grupo
          </CardTitle>
          <CardDescription>
            Cantidad mínima de personas para considerar una reserva como grupo y aplicar precios grupales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 max-w-xs">
            <div className="flex flex-col gap-2 flex-1">
              <Label>Personas mínimas para grupo</Label>
              <Input
                type="number"
                value={umbralEdit}
                onChange={e => setUmbralEdit(e.target.value)}
                min="2"
              />
            </div>
            <Button onClick={handleGuardarUmbral} disabled={umbralEdit === umbralGrupo}>
              Guardar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Actualmente: reservas de {umbralGrupo} o más personas se consideran grupo.
          </p>
        </CardContent>
      </Card>

      {/* Overrides de habitaciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Cambios temporales de habitaciones</CardTitle>
            <CardDescription className="mt-1">
              Modificá el tipo, subtipo o capacidad de una habitación para un período específico.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Agregar cambio
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay cambios temporales configurados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Habitación</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Tipo temporal</TableHead>
                  <TableHead>Subtipo temporal</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-bold">{o.numero}</TableCell>
                    <TableCell>{format(new Date(o.fecha_desde + "T12:00:00"), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell>{format(new Date(o.fecha_hasta + "T12:00:00"), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell>{o.tipo_override ? (TIPO_LABELS[o.tipo_override] || o.tipo_override) : "—"}</TableCell>
                    <TableCell>{o.subtipo_override ? (SUBTIPO_LABELS[o.subtipo_override] || o.subtipo_override) : "—"}</TableCell>
                    <TableCell>{o.capacidad_override || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.notas || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEliminarOverride(o.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal override */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambio temporal de habitación</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Habitación *</Label>
              <Select value={form.room_id} onValueChange={v => campo("room_id", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccioná..." /></SelectTrigger>
                <SelectContent>
                  {habitaciones
                    .sort((a, b) => parseInt(a.number) - parseInt(b.number))
                    .map(h => (
                      <SelectItem key={h.id} value={h.id.toString()}>
                        {h.number} — {TIPO_LABELS[h.type] || h.type}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Fecha desde *</Label>
                <Input type="date" value={form.fecha_desde} onChange={e => campo("fecha_desde", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Fecha hasta *</Label>
                <Input type="date" value={form.fecha_hasta} onChange={e => campo("fecha_hasta", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Tipo temporal</Label>
                <Select value={form.tipo_override} onValueChange={v => campo("tipo_override", v)}>
                  <SelectTrigger><SelectValue placeholder="Sin cambio" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Subtipo temporal</Label>
                <Select value={form.subtipo_override} onValueChange={v => campo("subtipo_override", v)}>
                  <SelectTrigger><SelectValue placeholder="Sin cambio" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUBTIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Capacidad temporal</Label>
              <Input
                type="number"
                placeholder="Ej: 3"
                value={form.capacidad_override}
                onChange={e => campo("capacidad_override", e.target.value)}
                min="1" max="6"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Notas</Label>
              <Input
                value={form.notas}
                onChange={e => campo("notas", e.target.value)}
                placeholder="Ej: Adaptada para grupo familiar"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardarOverride} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}