"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { authFetch } from "@/lib/auth"

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1"
const HOTEL_ID = 1

const TIPO_LABELS: Record<string, string> = {
  single:    "Single",
  double:    "Doble",
  triple:    "Triple",
  quad:      "Cuádruple",
  quintuple: "Quíntuple",
  familiar:  "Familiar",
}

interface Precio {
  id: number
  tipo: string
  fecha_desde: string
  fecha_hasta: string
  precio_noche: number
  precio_grupo: number | null
}

export default function PreciosPage() {
  const [precios, setPrecios]       = useState<Precio[]>([])
  const [loading, setLoading]       = useState(true)
  const [guardando, setGuardando]   = useState(false)
  const [eliminar, setEliminar]     = useState<Precio | null>(null)

  const [form, setForm] = useState({
  tipo: "", fecha_desde: "", fecha_hasta: "", precio_noche: "", precio_grupo: ""
})

  useEffect(() => { fetchPrecios() }, [])

  async function fetchPrecios() {
    setLoading(true)
    try {
      const res = await authFetch(`${API}/precios?hotel_id=${HOTEL_ID}`)
      const data = await res.json()
      setPrecios(data)
    } catch {
      toast.error("Error al cargar los precios")
    } finally {
      setLoading(false)
    }
  }

  async function handleGuardar() {
    if (!form.tipo || !form.fecha_desde || !form.fecha_hasta || !form.precio_noche) {
      toast.error("Completá todos los campos")
      return
    }
    if (form.fecha_hasta < form.fecha_desde) {
      toast.error("La fecha hasta debe ser posterior a la fecha desde")
      return
    }
    setGuardando(true)
    try {
      const res = await authFetch(`${API}/precios?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo:         form.tipo,
          fecha_desde:  form.fecha_desde,
          fecha_hasta:  form.fecha_hasta,
          precio_noche: parseFloat(form.precio_noche),
          precio_grupo: form.precio_grupo ? parseFloat(form.precio_grupo) : null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Precio guardado correctamente")
      setForm({ tipo: "", fecha_desde: "", fecha_hasta: "", precio_noche: "",precio_grupo: "" })
      fetchPrecios()
    } catch {
      toast.error("Error al guardar el precio")
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar() {
    if (!eliminar) return
    try {
      await authFetch(`${API}/precios/${eliminar.id}?hotel_id=${HOTEL_ID}`, { method: "DELETE" })
      toast.success("Precio eliminado")
      fetchPrecios()
    } catch {
      toast.error("Error al eliminar")
    } finally {
      setEliminar(null)
    }
  }

  const campo = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Precios</h2>
        <p className="text-muted-foreground">
          Cargá los precios por tipo de habitación y período. El desayuno siempre está incluido.
        </p>
      </div>

      {/* Formulario nuevo precio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agregar precio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label>Tipo de habitación *</Label>
              <Select value={form.tipo} onValueChange={v => campo("tipo", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Fecha desde *</Label>
              <Input type="date" value={form.fecha_desde} onChange={e => campo("fecha_desde", e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Fecha hasta *</Label>
              <Input type="date" value={form.fecha_hasta} onChange={e => campo("fecha_hasta", e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
  <Label>Precio individual / noche ($) *</Label>
  <Input
    type="number"
    placeholder="Ej: 55000"
    value={form.precio_noche}
    onChange={e => campo("precio_noche", e.target.value)}
  />
  </div>
<div className="flex flex-col gap-2">
  <Label>Precio grupo / noche ($)</Label>
  <Input
    type="number"
    placeholder="Ej: 45000"
    value={form.precio_grupo}
    onChange={e => campo("precio_grupo", e.target.value)}
  />
</div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleGuardar} disabled={guardando}>
              <Plus className="mr-2 size-4" />
              {guardando ? "Guardando..." : "Guardar precio"}
            </Button>
            <p className="text-xs text-muted-foreground">
              El desayuno está siempre incluido en el precio.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de precios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Precios cargados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : precios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No hay precios cargados todavía</p>
              <p className="text-sm text-muted-foreground mt-1">Usá el formulario de arriba para agregar el primer precio</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Precio / noche</TableHead>
                  <TableHead>Incluye</TableHead>
                  <TableHead>Precio grupo / noche</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {precios.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{TIPO_LABELS[p.tipo] || p.tipo}</TableCell>
                    <TableCell>{format(new Date(p.fecha_desde + "T12:00:00"), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell>{format(new Date(p.fecha_hasta + "T12:00:00"), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell className="font-bold text-lg">
                      ${p.precio_noche.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Desayuno incluido</TableCell>
                    <TableCell>
                     {p.precio_grupo 
                      ? `$${Number(p.precio_grupo).toLocaleString("es-AR")}`
                      : <span className="text-muted-foreground text-sm">No configurado</span>
                     }
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setEliminar(p)}>
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

      <AlertDialog open={!!eliminar} onOpenChange={() => setEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar precio</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar el precio de {eliminar ? TIPO_LABELS[eliminar.tipo] : ""} del período {eliminar ? format(new Date(eliminar.fecha_desde + "T12:00:00"), "dd/MM/yyyy") : ""} al {eliminar ? format(new Date(eliminar.fecha_hasta + "T12:00:00"), "dd/MM/yyyy") : ""}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}