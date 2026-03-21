"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, UserX, UserCheck, DollarSign } from "lucide-react"
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
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { authFetch } from "@/lib/auth"

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1"
const HOTEL_ID = 1

const CATEGORIAS = ["recepcionista", "mucama", "mozo", "mantenimiento", "administrador", "otro"]
const ROLES = [{ value: "admin", label: "Administrador" }, { value: "employee", label: "Empleado" }]

interface Empleado {
  id:            number
  name:          string
  email:         string
  phone:         string | null
  role:          string
  categoria:     string | null
  fecha_ingreso: string | null
  active:        boolean
}

interface Sueldo {
  id:              number
  user_id:         number
  sueldo_fijo:     number
  sueldo_por_hora: number
}

const emptyForm = { name: "", email: "", password: "", phone: "", role: "employee", categoria: "", fecha_ingreso: "" }
const emptySueldo = { sueldo_fijo: "", sueldo_por_hora: "" }

export default function EmpleadosPage() {
  const [empleados, setEmpleados]     = useState<Empleado[]>([])
  const [sueldos, setSueldos]         = useState<Sueldo[]>([])
  const [loading, setLoading]         = useState(true)
  const [modalOpen, setModalOpen]     = useState(false)
  const [sueldoOpen, setSueldoOpen]   = useState(false)
  const [editando, setEditando]       = useState<Empleado | null>(null)
  const [empleadoSueldo, setEmpleadoSueldo] = useState<Empleado | null>(null)
  const [form, setForm]               = useState(emptyForm)
  const [formSueldo, setFormSueldo]   = useState(emptySueldo)
  const [guardando, setGuardando]     = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [empData, sueldoData] = await Promise.all([
        authFetch(`${API}/usuarios?hotel_id=${HOTEL_ID}`).then(r => r.json()),
        authFetch(`${API}/sueldos?hotel_id=${HOTEL_ID}`).then(r => r.json()),
      ])
      setEmpleados(empData)
      setSueldos(sueldoData)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function abrirCrear() {
    setEditando(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function abrirEditar(emp: Empleado) {
    setEditando(emp)
    setForm({
      name:          emp.name,
      email:         emp.email,
      password:      "",
      phone:         emp.phone || "",
      role:          emp.role,
      categoria:     emp.categoria || "",
      fecha_ingreso: emp.fecha_ingreso ? emp.fecha_ingreso.slice(0, 10) : "",
    })
    setModalOpen(true)
  }

  function abrirSueldo(emp: Empleado) {
    setEmpleadoSueldo(emp)
    const s = sueldos.find(s => s.user_id === emp.id)
    setFormSueldo({
      sueldo_fijo:     s ? s.sueldo_fijo.toString() : "0",
      sueldo_por_hora: s ? s.sueldo_por_hora.toString() : "0",
    })
    setSueldoOpen(true)
  }

  async function handleGuardar() {
    if (!form.name || !form.email) {
      toast.error("Nombre y email son obligatorios")
      return
    }
    if (!editando && !form.password) {
      toast.error("La contraseña es obligatoria para nuevos empleados")
      return
    }
    setGuardando(true)
    try {
      const body: any = {
        name:          form.name,
        email:         form.email,
        phone:         form.phone || null,
        role:          form.role,
        categoria:     form.categoria || null,
        fecha_ingreso: form.fecha_ingreso || null,
      }
      if (form.password) body.password = form.password

      if (editando) {
        await authFetch(`${API}/usuarios/${editando.id}?hotel_id=${HOTEL_ID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        toast.success("Empleado actualizado")
      } else {
        await authFetch(`${API}/usuarios?hotel_id=${HOTEL_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        toast.success("Empleado creado")
      }
      setModalOpen(false)
      fetchData()
    } catch (e) {
      toast.error("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  async function handleToggleActivo(emp: Empleado) {
    await authFetch(`${API}/usuarios/${emp.id}?hotel_id=${HOTEL_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !emp.active }),
    })
    toast.success(emp.active ? "Empleado desactivado" : "Empleado activado")
    fetchData()
  }

  async function handleGuardarSueldo() {
    if (!empleadoSueldo) return
    setGuardando(true)
    try {
      await authFetch(`${API}/sueldos?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:         empleadoSueldo.id,
          sueldo_fijo:     parseFloat(formSueldo.sueldo_fijo) || 0,
          sueldo_por_hora: parseFloat(formSueldo.sueldo_por_hora) || 0,
        }),
      })
      toast.success("Sueldo guardado")
      setSueldoOpen(false)
      fetchData()
    } catch (e) {
      toast.error("Error al guardar sueldo")
    } finally {
      setGuardando(false)
    }
  }

  const campo = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Empleados</h2>
          <p className="text-muted-foreground">Gestión del personal del hotel</p>
        </div>
        <Button onClick={abrirCrear} className="gap-2">
          <Plus className="size-4" />
          Nuevo empleado
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : empleados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No hay empleados cargados todavía</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead>Sueldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleados.map(emp => {
                  const sueldo = sueldos.find(s => s.user_id === emp.id)
                  return (
                    <TableRow key={emp.id} style={{ opacity: emp.active ? 1 : 0.5 }}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                      <TableCell className="text-sm">{emp.phone || "—"}</TableCell>
                      <TableCell>
                        {emp.categoria
                          ? <Badge variant="outline" className="capitalize">{emp.categoria}</Badge>
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={emp.role === "admin" ? "default" : "secondary"}>
                          {emp.role === "admin" ? "Admin" : "Empleado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {emp.fecha_ingreso
                          ? format(new Date(emp.fecha_ingreso + "T12:00:00"), "dd/MM/yyyy", { locale: es })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {sueldo ? (
                          <div className="flex flex-col">
                            {sueldo.sueldo_fijo > 0 && <span>${sueldo.sueldo_fijo.toLocaleString("es-AR")} fijo</span>}
                            {sueldo.sueldo_por_hora > 0 && <span>${sueldo.sueldo_por_hora.toLocaleString("es-AR")}/hr</span>}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: emp.active ? "#22c55e" : "#9ca3af", color: "#fff" }}>
                          {emp.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => abrirEditar(emp)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => abrirSueldo(emp)}>
                            <DollarSign className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActivo(emp)}>
                            {emp.active
                              ? <UserX className="size-4 text-destructive" />
                              : <UserCheck className="size-4 text-green-500" />}
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

      {/* Modal crear/editar empleado */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Nombre completo *</Label>
              <Input value={form.name} onChange={e => campo("name", e.target.value)} placeholder="Ej: María García" />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => campo("email", e.target.value)} placeholder="empleado@hotel.com" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{editando ? "Nueva contraseña (opcional)" : "Contraseña *"}</Label>
              <Input type="password" value={form.password} onChange={e => campo("password", e.target.value)} placeholder="••••••••" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => campo("phone", e.target.value)} placeholder="Ej: 2214567890" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Categoría</Label>
              <Select value={form.categoria} onValueChange={v => campo("categoria", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccioná..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Rol del sistema</Label>
              <Select value={form.role} onValueChange={v => campo("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Fecha de ingreso</Label>
              <Input type="date" value={form.fecha_ingreso} onChange={e => campo("fecha_ingreso", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear empleado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal sueldo */}
      <Dialog open={sueldoOpen} onOpenChange={setSueldoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sueldo — {empleadoSueldo?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Sueldo fijo mensual ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formSueldo.sueldo_fijo}
                onChange={e => setFormSueldo(f => ({ ...f, sueldo_fijo: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Sueldo por hora ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formSueldo.sueldo_por_hora}
                onChange={e => setFormSueldo(f => ({ ...f, sueldo_por_hora: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Podés cargar fijo, por hora, o ambos. Las horas se calculan automáticamente con los fichajes.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSueldoOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardarSueldo} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar sueldo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}