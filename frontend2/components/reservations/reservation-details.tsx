"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Reserva, EstadoReserva } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ReservationDetailsProps {
  reserva: Reserva | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const estadoConfig: Record<EstadoReserva, { label: string; className: string }> = {
  activa: {
    label: "Activa",
    className: "bg-[oklch(0.723_0.191_142.5)] text-[oklch(0.985_0_0)] hover:bg-[oklch(0.723_0.191_142.5)]/90",
  },
  completada: {
    label: "Completada",
    className: "bg-primary text-primary-foreground",
  },
  cancelada: {
    label: "Cancelada",
    className: "",
  },
}

export function ReservationDetails({ reserva, open, onOpenChange }: ReservationDetailsProps) {
  if (!reserva) return null

  const noches = Math.ceil(
    (new Date(reserva.fecha_checkout).getTime() - new Date(reserva.fecha_checkin).getTime()) /
    (1000 * 60 * 60 * 24)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Reserva #{reserva.id}
            <Badge
              variant={reserva.estado === "cancelada" ? "destructive" : "default"}
              className={cn(estadoConfig[reserva.estado].className)}
            >
              {estadoConfig[reserva.estado].label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Detalles completos de la reserva
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Cliente */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Cliente</h4>
            <div className="rounded-lg border p-4">
              {reserva.cliente ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nombre:</span>
                    <p className="font-medium">{reserva.cliente.nombre} {reserva.cliente.apellido}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">DNI:</span>
                    <p className="font-medium">{reserva.cliente.dni}</p>
                  </div>
                  {reserva.cliente.telefono && (
                    <div>
                      <span className="text-muted-foreground">Teléfono:</span>
                      <p className="font-medium">{reserva.cliente.telefono}</p>
                    </div>
                  )}
                  {reserva.cliente.email && (
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{reserva.cliente.email}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Cliente #{reserva.cliente_id}</p>
              )}
            </div>
          </div>

          {/* Habitación */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Habitación</h4>
            <div className="rounded-lg border p-4">
              {reserva.habitacion ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Número:</span>
                    <p className="font-medium">{reserva.habitacion.numero}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Piso:</span>
                    <p className="font-medium">{reserva.habitacion.piso}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium capitalize">{reserva.habitacion.tipo}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Precio/noche:</span>
                    <p className="font-medium">${reserva.habitacion.precio_por_noche}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Habitación #{reserva.habitacion_id}</p>
              )}
            </div>
          </div>

          {/* Fechas y total */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Estadía</h4>
            <div className="rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Check-in:</span>
                  <p className="font-medium">
                    {format(new Date(reserva.fecha_checkin), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Check-out:</span>
                  <p className="font-medium">
                    {format(new Date(reserva.fecha_checkout), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{noches} noche(s)</span>
                <span className="text-xl font-bold">${reserva.precio_total}</span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {reserva.notas && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Notas</h4>
              <div className="rounded-lg border p-4">
                <p className="text-sm">{reserva.notas}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
