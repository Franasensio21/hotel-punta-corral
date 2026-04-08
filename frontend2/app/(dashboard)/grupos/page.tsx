"use client"

import { useState, useEffect } from "react"
import { format, eachDayOfInterval, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Users, BedDouble, X, ChevronRight, AlertTriangle, Trash2, UtensilsCrossed, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { authFetch, getUser } from "@/lib/auth"

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1"
const HOTEL_ID = (typeof window !== "undefined" ? getUser()?.hotel_id : null) ?? 1

const TIPO_LABELS: Record<string, string> = {
  single: "Single", double: "Doble", triple: "Triple", quad: "Cuádruple",
  quintuple: "Quíntuple", familiar: "Familiar",
}
const SUBTIPO_LABELS: Record<string, string> = {
  matrimonial: "Matrim.", twin: "Twin", familiar: "Familiar",
}
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  confirmado: { label: "Confirmado", color: "#22c55e" },
  pendiente:  { label: "Pendiente",  color: "#f59e0b" },
  cancelado:  { label: "Cancelado",  color: "#ef4444" },
}

interface Grupo {
  id:                       number
  name:                     string
  contact_name:             string | null
  contact_email:            string | null
  contact_phone:            string | null
  arrival_date:             string
  departure_date:           string
  personas:                 number | null
  notes:                    string | null
  status:                   string
  habitaciones_asignadas:   number
  incluye_cena:             boolean
  precio_cena_por_persona:  number | null
}

interface HabGrupo {
  reserva_id: number
  room_id:    number
  numero:     string
  tipo:       string
  subtipo:    string | null
  capacidad:  number
}

interface Hab {
  room_id:    number
  numero:     string
  tipo:       string
  subtipo:    string | null
  capacidad:  number
  estado:     string
  huesped:    string | null
  reserva_id: number | null
}

interface Cena {
  id:                 number
  group_id:           number
  fecha:              string
  pasajeros:          number
  precio_por_persona: number
  total:              number
}

const emptyForm = {
  name: "", contact_name: "", contact_email: "", contact_phone: "",
  arrival_date: "", departure_date: "", personas: "", notes: "", status: "confirmado",
  incluye_cena: false, precio_cena_por_persona: "",
}

export default function GruposPage() {
  const [grupos, setGrupos]               = useState<Grupo[]>([])
  const [loading, setLoading]             = useState(true)
  const [modalOpen, setModalOpen]         = useState(false)
  const [gestionOpen, setGestionOpen]     = useState(false)
  const [cenasOpen, setCenasOpen]         = useState(false)
  const [reasignarOpen, setReasignarOpen] = useState(false)
  const [grupoActivo, setGrupoActivo]     = useState<Grupo | null>(null)
  const [habsGrupo, setHabsGrupo]         = useState<HabGrupo[]>([])
  const [todasHabs, setTodasHabs]         = useState<Hab[]>([])
  const [habOcupada, setHabOcupada]       = useState<Hab | null>(null)
  const [editando, setEditando]           = useState<Grupo | null>(null)
  const [form, setForm]                   = useState(emptyForm)
  const [guardando, setGuardando]         = useState(false)
  const [borrarGrupo, setBorrarGrupo]     = useState<Grupo | null>(null)

  // Cenas
  const [cenas, setCenas]                 = useState<Cena[]>([])
  const [loadingCenas, setLoadingCenas]   = useState(false)
  const [editandoCena, setEditandoCena]   = useState<Cena | null>(null)
  const [modalCena, setModalCena]         = useState(false)
  const [formCena, setFormCena]           = useState({ fecha: "", pasajeros: "", precio_por_persona: "" })

  useEffect(() => { fetchGrupos() }, [])

  async function fetchGrupos() {
    setLoading(true)
    try {
      const data = await authFetch(`${API}/grupos?hotel_id=${HOTEL_ID}`).then(r => r.json())
      setGrupos(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function abrirGestion(grupo: Grupo) {
    setGrupoActivo(grupo)
    setGestionOpen(true)
    await fetchHabsGrupo(grupo)
  }

  async function abrirCenas(grupo: Grupo) {
    setGrupoActivo(grupo)
    setCenasOpen(true)
    await fetchCenas(grupo.id)
  }

  async function fetchCenas(grupoId: number) {
    setLoadingCenas(true)
    try {
      const data = await authFetch(`${API}/grupos/${grupoId}/cenas?hotel_id=${HOTEL_ID}`).then(r => r.json())
      setCenas(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoadingCenas(false) }
  }

  async function fetchHabsGrupo(grupo: Grupo) {
    try {
      const [habsData, rangoData, reservasData] = await Promise.all([
        authFetch(`${API}/grupos/${grupo.id}/habitaciones?hotel_id=${HOTEL_ID}`).then(r => r.json()),
        authFetch(`${API}/disponibilidad/rango?check_in=${grupo.arrival_date}&check_out=${grupo.departure_date}&hotel_id=${HOTEL_ID}`).then(r => r.json()),
        authFetch(`${API}/reservas?hotel_id=${HOTEL_ID}`).then(r => r.json()),
      ])
      setHabsGrupo(Array.isArray(habsData) ? habsData : [])
      const libresIds = new Set((rangoData?.habitaciones || []).map((h: any) => h.id))
      const todasRes = await authFetch(`${API}/habitaciones?hotel_id=${HOTEL_ID}`).then(r => r.json())
      const habs: Hab[] = todasRes.map((h: any) => {
        const libre = libresIds.has(h.id)
        const reservaActiva = !libre ? reservasData.find((r: any) =>
          r.room_id === h.id &&
          (r.status === "confirmed" || r.status === "pending") &&
          r.check_in < grupo.departure_date &&
          r.check_out > grupo.arrival_date
        ) : null
        return {
          room_id: h.id, numero: h.number, tipo: h.type,
          subtipo: h.subtipo, capacidad: h.capacity,
          estado: libre ? "libre" : "ocupada",
          huesped: reservaActiva?.guest_name || null,
          reserva_id: reservaActiva?.id || null,
        }
      })
      setTodasHabs(habs)
    } catch (e) { console.error(e) }
  }

  function abrirCrear() {
    setEditando(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function abrirEditar(grupo: Grupo) {
    setEditando(grupo)
    setForm({
      name:                    grupo.name,
      contact_name:            grupo.contact_name  || "",
      contact_email:           grupo.contact_email || "",
      contact_phone:           grupo.contact_phone || "",
      arrival_date:            grupo.arrival_date,
      departure_date:          grupo.departure_date,
      personas:                grupo.personas?.toString() || "",
      notes:                   grupo.notes || "",
      status:                  grupo.status,
      incluye_cena:            grupo.incluye_cena || false,
      precio_cena_por_persona: grupo.precio_cena_por_persona?.toString() || "",
    })
    setModalOpen(true)
  }

  async function handleGuardar() {
    if (!form.name || !form.arrival_date || !form.departure_date) {
      toast.error("Nombre y fechas son obligatorios")
      return
    }
    setGuardando(true)
    try {
      const body = {
        name:                    form.name,
        contact_name:            form.contact_name  || null,
        contact_email:           form.contact_email || null,
        contact_phone:           form.contact_phone || null,
        arrival_date:            form.arrival_date,
        departure_date:          form.departure_date,
        personas:                form.personas ? parseInt(form.personas) : null,
        notes:                   form.notes || null,
        status:                  form.status,
        incluye_cena:            form.incluye_cena,
        precio_cena_por_persona: form.precio_cena_por_persona ? parseFloat(form.precio_cena_por_persona) : null,
      }
      if (editando) {
        await authFetch(`${API}/grupos/${editando.id}?hotel_id=${HOTEL_ID}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
        toast.success("Grupo actualizado")
      } else {
        await authFetch(`${API}/grupos?hotel_id=${HOTEL_ID}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
        toast.success("Grupo creado")
      }
      setModalOpen(false)
      fetchGrupos()
    } catch { toast.error("Error al guardar") }
    finally { setGuardando(false) }
  }

  async function handleGuardarCena() {
    if (!formCena.fecha || !formCena.pasajeros || !formCena.precio_por_persona) {
      toast.error("Completá todos los campos")
      return
    }
    setGuardando(true)
    try {
      if (editandoCena) {
        await authFetch(`${API}/grupos/${grupoActivo!.id}/cenas/${editandoCena.id}?hotel_id=${HOTEL_ID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pasajeros: parseInt(formCena.pasajeros),
            precio_por_persona: parseFloat(formCena.precio_por_persona),
          }),
        })
        toast.success("Cena actualizada")
      } else {
        await authFetch(`${API}/grupos/${grupoActivo!.id}/cenas?hotel_id=${HOTEL_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fecha: formCena.fecha,
            pasajeros: parseInt(formCena.pasajeros),
            precio_por_persona: parseFloat(formCena.precio_por_persona),
          }),
        })
        toast.success("Cena registrada")
      }
      setModalCena(false)
      setEditandoCena(null)
      fetchCenas(grupoActivo!.id)
    } catch { toast.error("Error al guardar") }
    finally { setGuardando(false) }
  }

  async function handleEliminarCena(cenaId: number) {
    await authFetch(`${API}/grupos/${grupoActivo!.id}/cenas/${cenaId}?hotel_id=${HOTEL_ID}`, { method: "DELETE" })
    toast.success("Cena eliminada")
    fetchCenas(grupoActivo!.id)
  }

  const capacidadAsignada = habsGrupo.reduce((sum, h) => sum + h.capacidad, 0)
  const personasGrupo     = grupoActivo?.personas || 0
  const limiteAlcanzado   = personasGrupo > 0 && capacidadAsignada >= personasGrupo

  async function handleAsignarHab(roomId: number) {
    if (!grupoActivo) return
    if (limiteAlcanzado) { toast.error(`Ya cubrís las ${personasGrupo} personas del grupo`); return }
    try {
      const res = await authFetch(`${API}/grupos/${grupoActivo.id}/habitaciones?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId }),
      })
      if (!res.ok) { const err = await res.json(); toast.error(err.detail || "Error al asignar"); return }
      toast.success("Habitación asignada")
      await fetchHabsGrupo(grupoActivo)
      fetchGrupos()
    } catch { toast.error("Error al asignar") }
  }

  async function handleDesasignarHab(reservaId: number) {
    if (!grupoActivo) return
    try {
      await authFetch(`${API}/grupos/${grupoActivo.id}/habitaciones/${reservaId}?hotel_id=${HOTEL_ID}`, { method: "DELETE" })
      toast.success("Habitación removida")
      await fetchHabsGrupo(grupoActivo)
      fetchGrupos()
    } catch { toast.error("Error al remover") }
  }

  async function handleMoverYAsignar(roomIdDestino: number) {
    if (!habOcupada || !grupoActivo) return
    try {
      const res = await authFetch(`${API}/reservas/${habOcupada.reserva_id}/mover?hotel_id=${HOTEL_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id_destino: roomIdDestino }),
      })
      if (!res.ok) { const err = await res.json(); toast.error(err.detail || "Error al mover la reserva"); return }
      await handleAsignarHab(habOcupada.room_id)
      setReasignarOpen(false)
      setHabOcupada(null)
      toast.success("Reserva movida y habitación asignada al grupo")
    } catch { toast.error("Error al mover la reserva") }
  }

  async function handleBorrarGrupo() {
    if (!borrarGrupo) return
    try {
      await authFetch(`${API}/grupos/${borrarGrupo.id}?hotel_id=${HOTEL_ID}`, { method: "DELETE" })
      toast.success("Grupo eliminado")
      setBorrarGrupo(null)
      fetchGrupos()
    } catch { toast.error("Error al eliminar el grupo") }
  }

  const campo = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const idsAsignados      = new Set(habsGrupo.map(h => h.room_id))
  const habsNoAsignadas   = todasHabs.filter(h => !idsAsignados.has(h.room_id))
  const habsLibresDestino = todasHabs.filter(h => h.estado === "libre" && !idsAsignados.has(h.room_id) && h.room_id !== habOcupada?.room_id)

  const noches = grupoActivo
    ? Math.round((new Date(grupoActivo.departure_date).getTime() - new Date(grupoActivo.arrival_date).getTime()) / 86400000)
    : 0

  // Generar días del grupo para las cenas
  const diasGrupo = grupoActivo && grupoActivo.arrival_date && grupoActivo.departure_date
    ? eachDayOfInterval({
        start: parseISO(grupoActivo.arrival_date),
        end:   new Date(new Date(grupoActivo.departure_date).getTime() - 86400000)
      })
    : []

  const totalCenas = cenas.reduce((sum, c) => sum + Number(c.total), 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Grupos</h2>
          <p className="text-muted-foreground">Gestión de reservas grupales</p>
        </div>
        <Button onClick={abrirCrear} className="gap-2">
          <Plus className="size-4" />
          Nuevo grupo
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : grupos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="size-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay grupos cargados todavía</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Llegada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Personas</TableHead>
                  <TableHead>Habitaciones</TableHead>
                  <TableHead>Cena</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[160px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map(g => {
                  const sc = STATUS_CONFIG[g.status] || STATUS_CONFIG.confirmado
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-semibold">{g.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {g.contact_name || "—"}
                        {g.contact_phone && <div className="text-xs">{g.contact_phone}</div>}
                      </TableCell>
                      <TableCell>{format(new Date(g.arrival_date + "T12:00:00"), "dd/MM/yyyy", { locale: es })}</TableCell>
                      <TableCell>{format(new Date(g.departure_date + "T12:00:00"), "dd/MM/yyyy", { locale: es })}</TableCell>
                      <TableCell>{g.personas || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BedDouble className="size-4 text-muted-foreground" />
                          <span className="font-semibold">{g.habitaciones_asignadas}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {g.incluye_cena ? (
                          <Badge style={{ backgroundColor: "#8b5cf6", color: "#fff" }} className="gap-1">
                            <UtensilsCrossed className="size-3" />
                            ${Number(g.precio_cena_por_persona || 0).toLocaleString("es-AR")}/pp
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: sc.color, color: "#fff" }}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => abrirGestion(g)} className="gap-1">
                            <BedDouble className="size-3" />
                            Habs
                          </Button>
                          {g.incluye_cena && (
                            <Button variant="outline" size="sm" onClick={() => abrirCenas(g)} className="gap-1"
                              style={{ borderColor: "#8b5cf6", color: "#8b5cf6" }}>
                              <UtensilsCrossed className="size-3" />
                              Cenas
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => abrirEditar(g)}>Editar</Button>
                          <Button variant="ghost" size="sm" onClick={() => setBorrarGrupo(g)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal crear/editar grupo */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar grupo" : "Nuevo grupo"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Nombre del grupo *</Label>
              <Input value={form.name} onChange={e => campo("name", e.target.value)} placeholder="Ej: Familia García, Club Atlético..." />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Nombre de contacto</Label>
              <Input value={form.contact_name} onChange={e => campo("contact_name", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Teléfono</Label>
              <Input value={form.contact_phone} onChange={e => campo("contact_phone", e.target.value)} />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Email</Label>
              <Input type="email" value={form.contact_email} onChange={e => campo("contact_email", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Llegada *</Label>
              <Input type="date" value={form.arrival_date} onChange={e => campo("arrival_date", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Salida *</Label>
              <Input type="date" value={form.departure_date} onChange={e => campo("departure_date", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Cantidad de personas</Label>
              <Input type="number" value={form.personas} onChange={e => campo("personas", e.target.value)} placeholder="Ej: 20" min="1" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => campo("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={e => campo("notes", e.target.value)} placeholder="Observaciones..." />
            </div>

            <Separator className="col-span-2" />

            {/* Sección cenas */}
            <div className="col-span-2 flex items-center justify-between">
              <div>
                <Label>¿Incluye cena?</Label>
                <p className="text-xs text-muted-foreground">El hotel ofrece cenas cobradas por separado</p>
              </div>
              <button
                type="button"
                onClick={() => campo("incluye_cena", !form.incluye_cena)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.incluye_cena ? "bg-violet-600" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.incluye_cena ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {form.incluye_cena && (
              <div className="col-span-2 flex flex-col gap-2">
                <Label>Precio por persona por noche ($)</Label>
                <Input
                  type="number"
                  value={form.precio_cena_por_persona}
                  onChange={e => campo("precio_cena_por_persona", e.target.value)}
                  placeholder="Ej: 15000"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal cenas del grupo */}
      <Dialog open={cenasOpen} onOpenChange={setCenasOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="size-5 text-violet-600" />
              Cenas — {grupoActivo?.name}
              {grupoActivo?.precio_cena_por_persona && (
                <span className="text-sm font-normal text-muted-foreground">
                  (${Number(grupoActivo.precio_cena_por_persona).toLocaleString("es-AR")}/persona)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-y-auto flex-1 py-2">
            {/* Tabla de noches */}
            {loadingCenas ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Noche</TableHead>
                      <TableHead>Pasajeros que cenan</TableHead>
                      <TableHead>Precio/persona</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diasGrupo.map(dia => {
                      const fechaStr = format(dia, "yyyy-MM-dd")
                      const cena = cenas.find(c => c.fecha === fechaStr)
                      return (
                        <TableRow key={fechaStr}>
                          <TableCell className="font-medium">
                            {format(dia, "dd/MM/yyyy", { locale: es })}
                          </TableCell>
                          <TableCell>
                            {cena ? (
                              <span className="font-semibold">{cena.pasajeros} pasajeros</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Sin cargar</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {cena ? `$${Number(cena.precio_por_persona).toLocaleString("es-AR")}` : "—"}
                          </TableCell>
                          <TableCell className="font-semibold text-violet-600">
                            {cena ? `$${Number(cena.total).toLocaleString("es-AR")}` : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditandoCena(cena || null)
                                setFormCena({
                                  fecha: fechaStr,
                                  pasajeros: cena?.pasajeros.toString() || grupoActivo?.personas?.toString() || "",
                                  precio_por_persona: cena?.precio_por_persona.toString() || grupoActivo?.precio_cena_por_persona?.toString() || "",
                                })
                                setModalCena(true)
                              }}>
                                {cena ? <Pencil className="size-4" /> : <Plus className="size-4 text-green-500" />}
                              </Button>
                              {cena && (
                                <Button variant="ghost" size="sm" onClick={() => handleEliminarCena(cena.id)}>
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {cenas.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="font-bold text-right">Total cenas</TableCell>
                        <TableCell className="font-bold text-violet-600">
                          ${totalCenas.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCenasOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal cargar/editar cena */}
      <Dialog open={modalCena} onOpenChange={setModalCena}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editandoCena ? "Editar cena" : "Cargar cena"} —{" "}
              {formCena.fecha ? format(parseISO(formCena.fecha), "dd/MM/yyyy", { locale: es }) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Pasajeros que cenan *</Label>
              <Input type="number" value={formCena.pasajeros}
                onChange={e => setFormCena(f => ({ ...f, pasajeros: e.target.value }))}
                placeholder="Ej: 20" min="0" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Precio por persona ($) *</Label>
              <Input type="number" value={formCena.precio_por_persona}
                onChange={e => setFormCena(f => ({ ...f, precio_por_persona: e.target.value }))}
                placeholder="Ej: 15000" />
            </div>
            {formCena.pasajeros && formCena.precio_por_persona && (
              <p className="text-sm font-semibold text-violet-600">
                Total: ${(parseInt(formCena.pasajeros) * parseFloat(formCena.precio_por_persona)).toLocaleString("es-AR")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCena(false)}>Cancelar</Button>
            <Button onClick={handleGuardarCena} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal gestión habitaciones */}
      <Dialog open={gestionOpen} onOpenChange={setGestionOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Habitaciones — {grupoActivo?.name}
              {grupoActivo && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {format(new Date(grupoActivo.arrival_date + "T12:00:00"), "dd/MM/yyyy")} →{" "}
                  {format(new Date(grupoActivo.departure_date + "T12:00:00"), "dd/MM/yyyy")} ({noches} noches)
                  {grupoActivo.personas && ` · ${grupoActivo.personas} personas`}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {personasGrupo > 0 && (
            <div className="flex items-center gap-3 px-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {capacidadAsignada} / {personasGrupo} personas cubiertas
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div style={{
                  width: `${Math.min(100, (capacidadAsignada / personasGrupo) * 100)}%`,
                  height: "100%",
                  backgroundColor: limiteAlcanzado ? "#22c55e" : "#3b82f6",
                  transition: "width 0.3s",
                }} />
              </div>
              {limiteAlcanzado && <Badge style={{ backgroundColor: "#22c55e", color: "#fff" }}>Completo</Badge>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 py-2 overflow-y-auto flex-1">
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <BedDouble className="size-4" />
                Asignadas ({habsGrupo.length})
              </h3>
              {habsGrupo.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">Sin habitaciones asignadas</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {habsGrupo.map(h => (
                    <div key={h.reserva_id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", borderRadius: "8px",
                      backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
                    }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#fff", fontSize: "14px", fontWeight: "900" }}>{h.numero}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold">{TIPO_LABELS[h.tipo] || h.tipo} {SUBTIPO_LABELS[h.subtipo || ""] || ""}</span>
                          <div className="text-xs text-muted-foreground">{h.capacidad} personas</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDesasignarHab(h.reserva_id)}>
                        <X className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Plus className="size-4" />
                Disponibles ({habsNoAsignadas.length})
                {limiteAlcanzado && <span className="text-xs text-muted-foreground">(límite alcanzado)</span>}
              </h3>
              {habsNoAsignadas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">No hay habitaciones disponibles</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                  {habsNoAsignadas.map(h => {
                    const ocupada = h.estado === "ocupada"
                    const deshabilitada = limiteAlcanzado && !ocupada
                    return (
                      <div key={h.room_id}
                        onClick={() => {
                          if (deshabilitada) return
                          if (ocupada) {
                            if (!h.reserva_id) { toast.error("No se encontró la reserva activa"); return }
                            setHabOcupada(h); setReasignarOpen(true)
                          } else { handleAsignarHab(h.room_id) }
                        }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 12px", borderRadius: "8px",
                          backgroundColor: deshabilitada ? "#f1f5f9" : ocupada ? "#fef2f2" : "#f8fafc",
                          border: `1px solid ${deshabilitada ? "#e2e8f0" : ocupada ? "#fecaca" : "#e2e8f0"}`,
                          cursor: deshabilitada ? "not-allowed" : "pointer",
                          opacity: deshabilitada ? 0.5 : 1,
                        }}>
                        <div className="flex items-center gap-3">
                          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: deshabilitada ? "#cbd5e1" : ocupada ? "#ef4444" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#fff", fontSize: "14px", fontWeight: "900" }}>{h.numero}</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold">{TIPO_LABELS[h.tipo] || h.tipo} {SUBTIPO_LABELS[h.subtipo || ""] || ""}</span>
                            <div className="text-xs" style={{ color: ocupada ? "#ef4444" : "#64748b" }}>
                              {ocupada ? `Ocupada${h.huesped ? ` — ${h.huesped}` : ""} · Click para reasignar` : `${h.capacidad} personas`}
                            </div>
                          </div>
                        </div>
                        {ocupada ? <AlertTriangle className="size-4 text-red-400" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGestionOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal reasignar */}
      <Dialog open={reasignarOpen} onOpenChange={v => { setReasignarOpen(v); if (!v) setHabOcupada(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reasignar habitación {habOcupada?.numero}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta habitación tiene una reserva activa{habOcupada?.huesped && ` de ${habOcupada.huesped}`}.
            Elegí una habitación libre para mover esa reserva y liberar esta para el grupo.
          </p>
          {habsLibresDestino.length === 0 ? (
            <p className="text-sm text-destructive text-center py-4">No hay habitaciones libres disponibles.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {habsLibresDestino.map(h => (
                <div key={h.room_id} onClick={() => handleMoverYAsignar(h.room_id)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "8px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", cursor: "pointer" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: "14px", fontWeight: "900" }}>{h.numero}</span>
                    </div>
                    <div>
                      <span className="text-sm font-semibold">{TIPO_LABELS[h.tipo] || h.tipo} {SUBTIPO_LABELS[h.subtipo || ""] || ""}</span>
                      <div className="text-xs text-muted-foreground">{h.capacidad} personas</div>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReasignarOpen(false); setHabOcupada(null) }}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!borrarGrupo} onOpenChange={() => setBorrarGrupo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar grupo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar el grupo {borrarGrupo?.name}? Se cancelarán todas sus reservas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBorrarGrupo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}