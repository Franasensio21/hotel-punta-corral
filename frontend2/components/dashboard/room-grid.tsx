"use client"

import { useState } from "react"
import type { HabitacionDisponible } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface RoomGridProps {
  habitaciones: HabitacionDisponible[]
  onRoomClick?: (habitacion: HabitacionDisponible) => void
}

const TIPO_LABELS: Record<string, string> = {
  double: "Doble", triple: "Triple", quad: "Cuádruple", quintuple: "Quíntuple", familiar: "Familiar",
}

const SUBTIPO_LABELS: Record<string, string> = {
  matrimonial: "Matrim.", twin: "Twin", familiar: "Familiar",
}

const ORIGEN_CONFIG: Record<string, { color: string; label: string; textColor: string }> = {
  libre:   { color: "#22c55e", label: "Libre",   textColor: "#ffffff" },
  booking: { color: "#3b82f6", label: "Booking", textColor: "#ffffff" },
  direct:  { color: "#fb923c", label: "Directa", textColor: "#ffffff" },
  email:   { color: "#a855f7", label: "Gmail",   textColor: "#ffffff" },
  group:   { color: "#facc15", label: "Grupo",   textColor: "#1a1a1a" },
  other:   { color: "#9ca3af", label: "Otro",    textColor: "#ffffff" },
}

function getConfig(hab: HabitacionDisponible) {
  if (hab.disponible) return ORIGEN_CONFIG.libre
  return ORIGEN_CONFIG[hab.origen || "other"] || ORIGEN_CONFIG.other
}

export function RoomGrid({ habitaciones, onRoomClick }: RoomGridProps) {
  const [selectedRoom, setSelectedRoom] = useState<HabitacionDisponible | null>(null)

  // Ordenar por número
  const sorted = [...habitaciones].sort((a, b) => parseInt(a.numero) - parseInt(b.numero))

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {sorted.map((hab) => {
          const config = getConfig(hab)
          return (
            <button key={hab.id} onClick={() => { setSelectedRoom(hab); onRoomClick?.(hab) }}
              style={{
                backgroundColor: config.color,
                color: config.textColor,
                border: `2px solid ${config.color}cc`,
                borderRadius: "10px", aspectRatio: "1",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: "8px", cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.25)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "none" }}
            >
              <span style={{ fontSize: "18px", fontWeight: "900", lineHeight: 1 }}>{hab.numero}</span>
              <span style={{ fontSize: "10px", fontWeight: "600", marginTop: "3px", opacity: 0.9 }}>
                {TIPO_LABELS[hab.tipo] || hab.tipo}
              </span>
              {hab.subtipo && (
                <span style={{ fontSize: "9px", marginTop: "2px", opacity: 0.85 }}>
                  {SUBTIPO_LABELS[hab.subtipo] || hab.subtipo}
                </span>
              )}
              <span style={{ fontSize: "9px", fontWeight: "700", marginTop: "4px", padding: "1px 5px", borderRadius: "999px", backgroundColor: "rgba(0,0,0,0.2)" }}>
                {config.label}
              </span>
              {hab.huesped && (
                <span style={{ fontSize: "9px", marginTop: "2px", opacity: 0.85, maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hab.huesped.split(" ")[0]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Habitación {selectedRoom?.numero}</DialogTitle>
            <DialogDescription>Detalles de la habitación</DialogDescription>
          </DialogHeader>
          {selectedRoom && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Tipo</p><p className="font-semibold">{TIPO_LABELS[selectedRoom.tipo] || selectedRoom.tipo}</p></div>
                <div><p className="text-muted-foreground">Subtipo</p><p className="font-semibold capitalize">{selectedRoom.subtipo || "—"}</p></div>
                <div><p className="text-muted-foreground">Capacidad</p><p className="font-semibold">{selectedRoom.capacidad} personas</p></div>
                <div><p className="text-muted-foreground">Estado</p><Badge variant={selectedRoom.disponible ? "default" : "destructive"}>{selectedRoom.disponible ? "Libre" : "Ocupada"}</Badge></div>
                {selectedRoom.origen && <div><p className="text-muted-foreground">Canal</p><p className="font-semibold capitalize">{selectedRoom.origen}</p></div>}
              </div>
              {selectedRoom.huesped && <div><p className="text-sm text-muted-foreground">Huésped</p><p className="font-semibold">{selectedRoom.huesped}</p></div>}
              {selectedRoom.grupo && <div><p className="text-sm text-muted-foreground">Grupo</p><p className="font-semibold">{selectedRoom.grupo}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}