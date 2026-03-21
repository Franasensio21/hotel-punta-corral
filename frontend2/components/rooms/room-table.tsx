"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { HabitacionDisponible } from "@/lib/types"

interface RoomTableProps {
  habitaciones: HabitacionDisponible[]
}

const TIPO_LABELS: Record<string, string> = {
  double:    "Doble",
  triple:    "Triple",
  quad:      "Cuádruple",
  quintuple: "Quíntuple",
}

const PISO_LABELS: Record<number, string> = {
  0: "Planta baja",
}

export function RoomTable({ habitaciones }: RoomTableProps) {
  if (habitaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No hay habitaciones para mostrar</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Número</TableHead>
          <TableHead>Piso</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Capacidad</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Canal</TableHead>
          <TableHead>Huésped</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {habitaciones.map((h) => (
          <TableRow key={h.id}>
            <TableCell className="font-semibold text-base">{h.numero}</TableCell>
            <TableCell className="text-muted-foreground">
              {PISO_LABELS[h.piso] || `Piso ${h.piso}`}
            </TableCell>
            <TableCell>{TIPO_LABELS[h.tipo] || h.tipo}</TableCell>
            <TableCell>{h.capacidad} personas</TableCell>
            <TableCell>
              <Badge variant={h.disponible ? "default" : "destructive"}
                style={h.disponible ? { backgroundColor: "#22c55e", color: "#fff" } : {}}
              >
                {h.disponible ? "Libre" : "Ocupada"}
              </Badge>
            </TableCell>
            <TableCell className="capitalize text-muted-foreground">
              {h.origen || "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {h.huesped || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}