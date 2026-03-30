"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MoreHorizontal, XCircle, Trash2, Pencil } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { authFetch, getUser } from "@/lib/auth"
import type { Reserva, Cliente, HabitacionDisponible } from "@/lib/types"

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1"

interface ReservationTableProps {
  reservas:     Reserva[]
  clientes:     Record<number, Cliente>
  habitaciones: Record<number, HabitacionDisponible>
  onCancel:     (reserva: Reserva) => void
  onBorrar:     (reserva: Reserva) => void
  onRefresh:    () => void
}

function getEstado(reserva: Reserva): { label: string; color: string } {
  if (reserva.estado === "cancelada") return { label: "Cancelada", color: "#ef4444" }
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const checkout = new Date(reserva.fecha_checkout + "T12:00:00")
  if (checkout < hoy) return { label: "Completada", color: "#6b7280" }
  return { label: "Activa", color: "#22c55e" }
}

export function ReservationTable({ reservas, clientes, habitaciones, onCancel, onBorrar, onRefresh }: ReservationTableProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [reservaEditando, setReservaEditando] = useState<Reserva | null>(null)
  const [formPago, setFormPago] = useState({ precio_total: "", sena: "" })
  const [guardando, setGuardando] = useState(false)

  function abrirEditar(r: Reserva) {
    setReservaEditando(r)
    setFormPago({
      precio_total: r.precio_total ? r.precio_total.toString() : "",
      sena: r.sena ? r.sena.toString() : "",
    })
    setModalOpen(true)
  }

  async function handleGuardarPago() {
    if (!reservaEditando) return
    setGuardando(true)
    try {
      await authFetch(`${API}/reservas/${reservaEditando.id}?hotel_id=${getUser()?.hotel_id ?? 1}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precio_total: formPago.precio_total ? parseFloat(formPago.precio_total) : null,
          sena: formPago.sena ? parseFloat(formPago.sena) : null,
        }),
      })
      toast.success("Pago actualizado")
      setModalOpen(false)
      onRefresh()
    } catch (e) {
      toast.error("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  if (reservas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No hay reservas para mostrar</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Habitación</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Precio total</TableHead>
            <TableHead>Seña</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservas.map((r) => {
            const cliente    = clientes[r.cliente_id]
            const habitacion = habitaciones[r.habitacion_id]
            const nombreCliente = cliente
              ? `${cliente.nombre} ${cliente.apellido}`.trim()
              : "Sin cliente"
            const numeroHab = habitacion ? habitacion.numero : `${r.habitacion_id}`
            const estado    = getEstado(r)
            const esActiva  = estado.label === "Activa"

            const precioTotal = (r as any).precio_total
            const sena = (r as any).sena
            const senaPagada = sena && precioTotal && sena >= precioTotal * 0.3

            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-muted-foreground">#{r.id}</TableCell>
                <TableCell className="font-medium">{nombreCliente}</TableCell>
                <TableCell className="font-semibold">{numeroHab}</TableCell>
                <TableCell>
                  {format(new Date(r.fecha_checkin + "T12:00:00"), "dd/MM/yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  {format(new Date(r.fecha_checkout + "T12:00:00"), "dd/MM/yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  {precioTotal
                    ? <span className="font-semibold text-green-600">${Number(precioTotal).toLocaleString("es-AR")}</span>
                    : <span className="text-muted-foreground text-xs">Sin cargar</span>}
                </TableCell>
                <TableCell>
                  {sena ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-blue-600">${Number(sena).toLocaleString("es-AR")}</span>
                      <Badge
                        className="text-xs w-fit"
                        style={{
                          backgroundColor: senaPagada ? "#22c55e" : "#f59e0b",
                          color: "#fff",
                        }}
                      >
                        {senaPagada ? "Completa" : "Parcial"}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">Sin seña</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge style={{ backgroundColor: estado.color, color: "#fff" }}>
                    {estado.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => abrirEditar(r)}>
                        <Pencil className="mr-2 size-4" />
                        Editar precio / seña
                      </DropdownMenuItem>
                      {esActiva && (
                        <DropdownMenuItem
                          onClick={() => onCancel(r)}
                          className="text-destructive focus:text-destructive"
                        >
                          <XCircle className="mr-2 size-4" />
                          Cancelar reserva
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onBorrar(r)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Eliminar permanentemente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Modal editar precio/seña */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Precio y seña — Reserva #{reservaEditando?.id}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Precio total ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formPago.precio_total}
                onChange={e => setFormPago(f => ({ ...f, precio_total: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Seña recibida ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formPago.sena}
                onChange={e => setFormPago(f => ({ ...f, sena: e.target.value }))}
              />
            </div>
            {formPago.precio_total && formPago.sena && (
              <p className="text-xs text-muted-foreground">
                Saldo pendiente: ${(parseFloat(formPago.precio_total) - parseFloat(formPago.sena)).toLocaleString("es-AR")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardarPago} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}