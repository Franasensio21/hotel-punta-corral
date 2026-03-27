"use client"

import { useState, useEffect } from "react"
import { Search, Pencil, Power } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { authFetch, getUser } from "@/lib/auth"

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1"
const HOTEL_ID = (typeof window !== "undefined" ? getUser()?.hotel_id : null) ?? 1

const TIPO_LABELS: Record<string, string> = {
  double:    "Doble",
  triple:    "Triple",
  quad:      "Cuádruple",
  quintuple: "Quíntuple",
  familiar:  "Familiar",
}

const SUBTIPO_LABELS: Record<string, string> = {
  matrimonial: "Matrimonial",
  twin:        "Twin",
  familiar:    "Familiar",
}

interface Habitacion {
  id:       number
  number:   string
  type:     string
  subtipo:  string | null
  capacity: number
  active:   boolean
}

export default function HabitacionesPage() {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState("")
  const [tipoFilter, setTipoFilter]     = useState("todos")
  const [editando, setEditando]         = useState<Habitacion | null>(null)
  const [guardando, setGuardando]       = useState(false)

  const [form, setForm] = useState({
    type:     "",
    subtipo:  "",
    capacity: "",
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const data = await authFetch(`${API}/habitaciones?hotel_id=${HOTEL_ID}`).then(r => r.json())
      const sorted = data.sort((a: Habitacion, b: Habitacion) =>
        parseInt(a.number) - parseInt(b.number)
      )
      setHabitaciones(sorted)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function abrirEditar(hab: Habitacion) {
    setEditando(hab)
    setForm({
      type:     hab.type,
      subtipo:  hab.subtipo || "",
      capacity: hab.capacity.toString(),
    })
  }

  async function handleGuardar() {
    if (!editando) return
    setGuardando(true)
    try {
      await authFetch(`${API}/habitaciones/${editando.id}?hotel_id=${HOTEL_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:     form.type,
          subtipo:  form.subtipo || null,
          capacity: parseInt(form.capacity),
        }),
      })
      toast.success(`Habitación ${editando.number} actualizada`)
      setEditando(null)
      fetchData()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  async function handleToggleActivo(hab: Habitacion) {
    try {
      await authFetch(`${API}/habitaciones/${hab.id}?hotel_id=${HOTEL_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !hab.active }),
      })
      toast.success(hab.active ? `Habitación ${hab.number} desactivada` : `Habitación ${hab.number} activada`)
      fetchData()
    } catch {
      toast.error("Error al cambiar estado")
    }
  }

  const filtradas = habitaciones.filter(h => {
    if (search && !h.number.includes(search)) return false
    if (tipoFilter !== "todos" && h.type !== tipoFilter) return false
    return true
  })

  const campo = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Habitaciones</h2>
        <p className="text-muted-foreground">Gestión de habitaciones del hotel</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Subtipo</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map(hab => (
                  <TableRow key={hab.id} style={{ opacity: hab.active ? 1 : 0.5 }}>
                    <TableCell className="font-bold">{hab.number}</TableCell>
                    <TableCell>{TIPO_LABELS[hab.type] || hab.type}</TableCell>
                    <TableCell>{SUBTIPO_LABELS[hab.subtipo || ""] || "—"}</TableCell>
                    <TableCell>{hab.capacity} pers.</TableCell>
                    <TableCell>
                      <Badge style={{
                        backgroundColor: hab.active ? "#22c55e" : "#9ca3af",
                        color: "#fff"
                      }}>
                        {hab.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => abrirEditar(hab)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActivo(hab)}
                          title={hab.active ? "Desactivar" : "Activar"}
                        >
                          <Power className={`size-4 ${hab.active ? "text-destructive" : "text-green-500"}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal editar */}
      <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar habitación {editando?.number}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => campo("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Subtipo</Label>
              <Select value={form.subtipo} onValueChange={v => campo("subtipo", v)}>
                <SelectTrigger><SelectValue placeholder="Sin subtipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="matrimonial">Matrimonial</SelectItem>
                  <SelectItem value="twin">Twin</SelectItem>
                  <SelectItem value="familiar">Familiar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Capacidad (personas)</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={e => campo("capacity", e.target.value)}
                min="1" max="10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}