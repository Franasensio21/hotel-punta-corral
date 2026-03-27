"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Building2, Plus, Pencil, Power, DollarSign,
  ChevronDown, ChevronUp, CheckCircle, XCircle, LogOut
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { getToken, logout } from "@/lib/auth"

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1"

function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken()
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
}

interface Hotel {
  id: number
  name: string
  slug: string
  city: string
  email: string
  phone: string | null
  active: boolean
  precio_mensual: number | null
  sena_inicial: number | null
  sena_pagada: boolean
  fecha_inicio: string | null
  notas_internas: string | null
  created_at: string
  total_usuarios: number
  total_reservas: number
}

interface Pago {
  id: number
  hotel_id: number
  tipo: string
  monto: number
  fecha: string
  pagado: boolean
  fecha_pago: string | null
  notas: string | null
}

const emptyHotel = {
  hotel_nombre: "", ciudad: "", email: "", password: "",
  nombre_contacto: "", telefono: "", precio_mensual: "",
  sena_inicial: "", fecha_inicio: "",
}

const emptyPago = {
  tipo: "mensualidad", monto: "", fecha: format(new Date(), "yyyy-MM-dd"),
  pagado: false, fecha_pago: "", notas: "",
}

export default function SuperAdminPage() {
  const [hoteles, setHoteles] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<number | null>(null)
  const [pagos, setPagos] = useState<Record<number, Pago[]>>({})
  const [loadingPagos, setLoadingPagos] = useState<number | null>(null)

  const [modalHotel, setModalHotel] = useState(false)
  const [modalPago, setModalPago] = useState(false)
  const [modalEditarHotel, setModalEditarHotel] = useState(false)
  const [modalEditarPago, setModalEditarPago] = useState(false)

  const [hotelEditando, setHotelEditando] = useState<Hotel | null>(null)
  const [pagoEditando, setPagoEditando] = useState<Pago | null>(null)
  const [hotelParaPago, setHotelParaPago] = useState<Hotel | null>(null)

  const [formHotel, setFormHotel] = useState(emptyHotel)
  const [formPago, setFormPago] = useState(emptyPago)
  const [formEditarHotel, setFormEditarHotel] = useState<Partial<Hotel>>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { fetchHoteles() }, [])

  async function fetchHoteles() {
    setLoading(true)
    try {
      const data = await authFetch(`${API}/superadmin/hoteles`).then(r => r.json())
      setHoteles(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function fetchPagos(hotelId: number) {
    setLoadingPagos(hotelId)
    try {
      const data = await authFetch(`${API}/superadmin/hoteles/${hotelId}/pagos`).then(r => r.json())
      setPagos(prev => ({ ...prev, [hotelId]: Array.isArray(data) ? data : [] }))
    } catch (e) { console.error(e) }
    finally { setLoadingPagos(null) }
  }

  function toggleExpandir(hotelId: number) {
    if (expandido === hotelId) {
      setExpandido(null)
    } else {
      setExpandido(hotelId)
      if (!pagos[hotelId]) fetchPagos(hotelId)
    }
  }

  async function handleCrearHotel() {
    if (!formHotel.hotel_nombre || !formHotel.email || !formHotel.password) {
      toast.error("Nombre, email y contraseña son obligatorios")
      return
    }
    setGuardando(true)
    try {
      const res = await authFetch(`${API}/superadmin/hoteles`, {
        method: "POST",
        body: JSON.stringify({
          ...formHotel,
          precio_mensual: formHotel.precio_mensual ? parseFloat(formHotel.precio_mensual) : null,
          sena_inicial: formHotel.sena_inicial ? parseFloat(formHotel.sena_inicial) : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail)
      }
      toast.success("Hotel creado correctamente")
      setModalHotel(false)
      setFormHotel(emptyHotel)
      fetchHoteles()
    } catch (e: any) {
      toast.error(e.message || "Error al crear hotel")
    } finally {
      setGuardando(false)
    }
  }

  async function handleEditarHotel() {
    if (!hotelEditando) return
    setGuardando(true)
    try {
      await authFetch(`${API}/superadmin/hoteles/${hotelEditando.id}`, {
        method: "PATCH",
        body: JSON.stringify(formEditarHotel),
      })
      toast.success("Hotel actualizado")
      setModalEditarHotel(false)
      fetchHoteles()
    } catch (e) {
      toast.error("Error al actualizar")
    } finally {
      setGuardando(false)
    }
  }

  async function handleToggleActivo(hotel: Hotel) {
    await authFetch(`${API}/superadmin/hoteles/${hotel.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !hotel.active }),
    })
    toast.success(hotel.active ? "Hotel desactivado" : "Hotel activado")
    fetchHoteles()
  }

  async function handleCrearPago() {
    if (!hotelParaPago || !formPago.monto) {
      toast.error("Monto es obligatorio")
      return
    }
    setGuardando(true)
    try {
      await authFetch(`${API}/superadmin/hoteles/${hotelParaPago.id}/pagos`, {
        method: "POST",
        body: JSON.stringify({
          ...formPago,
          monto: parseFloat(formPago.monto),
          fecha_pago: formPago.fecha_pago || null,
        }),
      })
      toast.success("Pago registrado")
      setModalPago(false)
      setFormPago(emptyPago)
      fetchPagos(hotelParaPago.id)
    } catch (e) {
      toast.error("Error al registrar pago")
    } finally {
      setGuardando(false)
    }
  }

  async function handleEditarPago() {
    if (!pagoEditando) return
    setGuardando(true)
    try {
      await authFetch(`${API}/superadmin/pagos/${pagoEditando.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...formPago,
          monto: parseFloat(formPago.monto),
          fecha_pago: formPago.fecha_pago || null,
        }),
      })
      toast.success("Pago actualizado")
      setModalEditarPago(false)
      fetchPagos(pagoEditando.hotel_id)
    } catch (e) {
      toast.error("Error al actualizar pago")
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminarPago(pago: Pago) {
    await authFetch(`${API}/superadmin/pagos/${pago.id}`, { method: "DELETE" })
    toast.success("Pago eliminado")
    fetchPagos(pago.hotel_id)
  }

  const totalMensual = hoteles.filter(h => h.active).reduce((sum, h) => sum + (h.precio_mensual || 0), 0)
  const totalDeuda = hoteles.filter(h => h.active && !h.sena_pagada).reduce((sum, h) => sum + (h.sena_inicial || 0), 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Building2 className="size-4" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Panel de Control</h1>
            <p className="text-xs text-slate-400">Sistema de gestión de hoteles</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-white">
          <LogOut className="size-4 mr-2" />
          Salir
        </Button>
      </div>

      <div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto">

        {/* Stats globales */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400">Hoteles activos</p>
              <p className="text-3xl font-bold text-white">{hoteles.filter(h => h.active).length}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400">Ingreso mensual estimado</p>
              <p className="text-3xl font-bold text-green-400">${totalMensual.toLocaleString("es-AR")}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400">Señas pendientes</p>
              <p className="text-3xl font-bold text-yellow-400">${totalDeuda.toLocaleString("es-AR")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de hoteles */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Hoteles</h2>
          <Button onClick={() => setModalHotel(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
            <Plus className="size-4" />
            Nuevo hotel
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full bg-slate-800" />)}
          </div>
        ) : hoteles.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12 text-center text-slate-400">
              No hay hoteles registrados todavía
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {hoteles.map(hotel => (
              <Card key={hotel.id} className="bg-slate-900 border-slate-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-2 rounded-full ${hotel.active ? "bg-green-400" : "bg-slate-500"}`} />
                      <div>
                        <p className="font-semibold text-white">{hotel.name}</p>
                        <p className="text-xs text-slate-400">{hotel.city} · {hotel.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Mensual</p>
                        <p className="font-semibold text-green-400">
                          {hotel.precio_mensual ? `$${hotel.precio_mensual.toLocaleString("es-AR")}` : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Seña</p>
                        <div className="flex items-center gap-1">
                          {hotel.sena_pagada
                            ? <CheckCircle className="size-4 text-green-400" />
                            : <XCircle className="size-4 text-yellow-400" />}
                          <p className="text-xs">
                            {hotel.sena_inicial ? `$${hotel.sena_inicial.toLocaleString("es-AR")}` : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setHotelEditando(hotel)
                          setFormEditarHotel({
                            name: hotel.name, city: hotel.city, email: hotel.email,
                            phone: hotel.phone || "", precio_mensual: hotel.precio_mensual || undefined,
                            sena_inicial: hotel.sena_inicial || undefined, sena_pagada: hotel.sena_pagada,
                            fecha_inicio: hotel.fecha_inicio || "", notas_internas: hotel.notas_internas || "",
                          })
                          setModalEditarHotel(true)
                        }}>
                          <Pencil className="size-4 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setHotelParaPago(hotel)
                          setModalPago(true)
                        }}>
                          <DollarSign className="size-4 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActivo(hotel)}>
                          <Power className={`size-4 ${hotel.active ? "text-green-400" : "text-slate-500"}`} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleExpandir(hotel.id)}>
                          {expandido === hotel.id
                            ? <ChevronUp className="size-4 text-slate-400" />
                            : <ChevronDown className="size-4 text-slate-400" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Stats del hotel */}
                  <div className="flex gap-4 mt-3">
                    <span className="text-xs text-slate-400">{hotel.total_usuarios} usuarios</span>
                    <span className="text-xs text-slate-400">{hotel.total_reservas} reservas totales</span>
                    {hotel.fecha_inicio && (
                      <span className="text-xs text-slate-400">
                        Desde {format(new Date(hotel.fecha_inicio + "T12:00:00"), "dd/MM/yyyy", { locale: es })}
                      </span>
                    )}
                  </div>

                  {/* Notas internas */}
                  {hotel.notas_internas && (
                    <p className="text-xs text-slate-500 mt-2 italic">{hotel.notas_internas}</p>
                  )}

                  {/* Pagos expandidos */}
                  {expandido === hotel.id && (
                    <div className="mt-4 border-t border-slate-800 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-300">Historial de pagos</p>
                      </div>
                      {loadingPagos === hotel.id ? (
                        <Skeleton className="h-20 w-full bg-slate-800" />
                      ) : !pagos[hotel.id] || pagos[hotel.id].length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">No hay pagos registrados</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-800">
                              <TableHead className="text-slate-400">Tipo</TableHead>
                              <TableHead className="text-slate-400">Monto</TableHead>
                              <TableHead className="text-slate-400">Fecha</TableHead>
                              <TableHead className="text-slate-400">Estado</TableHead>
                              <TableHead className="text-slate-400">Notas</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pagos[hotel.id].map(pago => (
                              <TableRow key={pago.id} className="border-slate-800">
                                <TableCell className="text-slate-300 capitalize">{pago.tipo}</TableCell>
                                <TableCell className="text-white font-semibold">
                                  ${Number(pago.monto).toLocaleString("es-AR")}
                                </TableCell>
                                <TableCell className="text-slate-400 text-xs">
                                  {format(new Date(pago.fecha + "T12:00:00"), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                  {pago.pagado
                                    ? <Badge className="bg-green-900 text-green-300 text-xs">Pagado</Badge>
                                    : <Badge className="bg-yellow-900 text-yellow-300 text-xs">Pendiente</Badge>}
                                </TableCell>
                                <TableCell className="text-slate-400 text-xs">{pago.notas || "—"}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => {
                                      setPagoEditando(pago)
                                      setFormPago({
                                        tipo: pago.tipo,
                                        monto: pago.monto.toString(),
                                        fecha: pago.fecha,
                                        pagado: pago.pagado,
                                        fecha_pago: pago.fecha_pago || "",
                                        notas: pago.notas || "",
                                      })
                                      setModalEditarPago(true)
                                    }}>
                                      <Pencil className="size-3 text-slate-400" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleEliminarPago(pago)}>
                                      <XCircle className="size-3 text-red-400" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal nuevo hotel */}
      <Dialog open={modalHotel} onOpenChange={setModalHotel}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Nuevo hotel</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Nombre del hotel *</Label>
                <Input value={formHotel.hotel_nombre} onChange={e => setFormHotel(f => ({ ...f, hotel_nombre: e.target.value }))} placeholder="Ej: Hotel Mar Azul" className="bg-slate-800 border-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Ciudad</Label>
                <Input value={formHotel.ciudad} onChange={e => setFormHotel(f => ({ ...f, ciudad: e.target.value }))} placeholder="Mar del Plata" className="bg-slate-800 border-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Teléfono</Label>
                <Input value={formHotel.telefono} onChange={e => setFormHotel(f => ({ ...f, telefono: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Nombre del contacto</Label>
                <Input value={formHotel.nombre_contacto} onChange={e => setFormHotel(f => ({ ...f, nombre_contacto: e.target.value }))} placeholder="Nombre del dueño/admin" className="bg-slate-800 border-slate-700" />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Email (usuario de login) *</Label>
                <Input type="email" value={formHotel.email} onChange={e => setFormHotel(f => ({ ...f, email: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Contraseña *</Label>
                <Input type="password" value={formHotel.password} onChange={e => setFormHotel(f => ({ ...f, password: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Precio mensual ($)</Label>
                <Input type="number" value={formHotel.precio_mensual} onChange={e => setFormHotel(f => ({ ...f, precio_mensual: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Seña inicial ($)</Label>
                <Input type="number" value={formHotel.sena_inicial} onChange={e => setFormHotel(f => ({ ...f, sena_inicial: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Fecha de inicio</Label>
                <Input type="date" value={formHotel.fecha_inicio} onChange={e => setFormHotel(f => ({ ...f, fecha_inicio: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalHotel(false)} className="border-slate-700">Cancelar</Button>
            <Button onClick={handleCrearHotel} disabled={guardando} className="bg-violet-600 hover:bg-violet-700">
              {guardando ? "Creando..." : "Crear hotel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal editar hotel */}
      <Dialog open={modalEditarHotel} onOpenChange={setModalEditarHotel}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Editar — {hotelEditando?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Nombre</Label>
                <Input value={formEditarHotel.name || ""} onChange={e => setFormEditarHotel(f => ({ ...f, name: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Ciudad</Label>
                <Input value={formEditarHotel.city || ""} onChange={e => setFormEditarHotel(f => ({ ...f, city: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Teléfono</Label>
                <Input value={formEditarHotel.phone || ""} onChange={e => setFormEditarHotel(f => ({ ...f, phone: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Email</Label>
                <Input value={formEditarHotel.email || ""} onChange={e => setFormEditarHotel(f => ({ ...f, email: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Precio mensual ($)</Label>
                <Input type="number" value={formEditarHotel.precio_mensual || ""} onChange={e => setFormEditarHotel(f => ({ ...f, precio_mensual: parseFloat(e.target.value) }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Seña inicial ($)</Label>
                <Input type="number" value={formEditarHotel.sena_inicial || ""} onChange={e => setFormEditarHotel(f => ({ ...f, sena_inicial: parseFloat(e.target.value) }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Seña pagada</Label>
                <select
                  value={formEditarHotel.sena_pagada ? "true" : "false"}
                  onChange={e => setFormEditarHotel(f => ({ ...f, sena_pagada: e.target.value === "true" }))}
                  className="h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                >
                  <option value="false">Pendiente</option>
                  <option value="true">Pagada</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Fecha inicio</Label>
                <Input type="date" value={formEditarHotel.fecha_inicio || ""} onChange={e => setFormEditarHotel(f => ({ ...f, fecha_inicio: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label>Notas internas</Label>
                <Textarea value={formEditarHotel.notas_internas || ""} onChange={e => setFormEditarHotel(f => ({ ...f, notas_internas: e.target.value }))} className="bg-slate-800 border-slate-700" rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEditarHotel(false)} className="border-slate-700">Cancelar</Button>
            <Button onClick={handleEditarHotel} disabled={guardando} className="bg-violet-600 hover:bg-violet-700">
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal nuevo pago */}
      <Dialog open={modalPago} onOpenChange={setModalPago}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Registrar pago — {hotelParaPago?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <Label>Tipo</Label>
              <select value={formPago.tipo} onChange={e => setFormPago(f => ({ ...f, tipo: e.target.value }))} className="h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100">
                <option value="mensualidad">Mensualidad</option>
                <option value="sena">Seña inicial</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Monto ($) *</Label>
              <Input type="number" value={formPago.monto} onChange={e => setFormPago(f => ({ ...f, monto: e.target.value }))} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Fecha</Label>
              <Input type="date" value={formPago.fecha} onChange={e => setFormPago(f => ({ ...f, fecha: e.target.value }))} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Estado</Label>
              <select value={formPago.pagado ? "true" : "false"} onChange={e => setFormPago(f => ({ ...f, pagado: e.target.value === "true" }))} className="h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100">
                <option value="false">Pendiente</option>
                <option value="true">Pagado</option>
              </select>
            </div>
            {formPago.pagado && (
              <div className="flex flex-col gap-1">
                <Label>Fecha de pago</Label>
                <Input type="date" value={formPago.fecha_pago} onChange={e => setFormPago(f => ({ ...f, fecha_pago: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Label>Notas</Label>
              <Input value={formPago.notas} onChange={e => setFormPago(f => ({ ...f, notas: e.target.value }))} className="bg-slate-800 border-slate-700" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalPago(false)} className="border-slate-700">Cancelar</Button>
            <Button onClick={handleCrearPago} disabled={guardando} className="bg-violet-600 hover:bg-violet-700">
              {guardando ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal editar pago */}
      <Dialog open={modalEditarPago} onOpenChange={setModalEditarPago}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Editar pago</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <Label>Tipo</Label>
              <select value={formPago.tipo} onChange={e => setFormPago(f => ({ ...f, tipo: e.target.value }))} className="h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100">
                <option value="mensualidad">Mensualidad</option>
                <option value="sena">Seña inicial</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Monto ($) *</Label>
              <Input type="number" value={formPago.monto} onChange={e => setFormPago(f => ({ ...f, monto: e.target.value }))} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Fecha</Label>
              <Input type="date" value={formPago.fecha} onChange={e => setFormPago(f => ({ ...f, fecha: e.target.value }))} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Estado</Label>
              <select value={formPago.pagado ? "true" : "false"} onChange={e => setFormPago(f => ({ ...f, pagado: e.target.value === "true" }))} className="h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100">
                <option value="false">Pendiente</option>
                <option value="true">Pagado</option>
              </select>
            </div>
            {formPago.pagado && (
              <div className="flex flex-col gap-1">
                <Label>Fecha de pago</Label>
                <Input type="date" value={formPago.fecha_pago} onChange={e => setFormPago(f => ({ ...f, fecha_pago: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Label>Notas</Label>
              <Input value={formPago.notas} onChange={e => setFormPago(f => ({ ...f, notas: e.target.value }))} className="bg-slate-800 border-slate-700" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEditarPago(false)} className="border-slate-700">Cancelar</Button>
            <Button onClick={handleEditarPago} disabled={guardando} className="bg-violet-600 hover:bg-violet-700">
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}