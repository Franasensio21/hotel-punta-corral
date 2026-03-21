"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MoreHorizontal, XCircle, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Reserva, Cliente, HabitacionDisponible } from "@/lib/types"

interface ReservationTableProps {
  reservas:     Reserva[]
  clientes:     Record<number, Cliente>
  habitaciones: Record<number, HabitacionDisponible>
  onCancel:     (reserva: Reserva) => void
  onBorrar:     (reserva: Reserva) => void
}

function getEstado(reserva: Reserva): { label: string; color: string } {
  if (reserva.estado === "cancelada") return { label: "Cancelada", color: "#ef4444" }
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const checkout = new Date(reserva.fecha_checkout + "T12:00:00")
  if (checkout < hoy) return { label: "Completada", color: "#6b7280" }
  return { label: "Activa", color: "#22c55e" }
}

export function ReservationTable({ reservas, clientes, habitaciones, onCancel, onBorrar }: ReservationTableProps) {
  if (reservas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No hay reservas para mostrar</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Habitación</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead>Check-out</TableHead>
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
          const esCancelada = estado.label === "Cancelada"

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
  )
}