"use client"

import type { TipoHabitacion } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface RoomFiltersProps {
  tipoFilter: TipoHabitacion | "todos"
  onTipoChange: (value: TipoHabitacion | "todos") => void
  onClearFilters: () => void
}

export function RoomFilters({ tipoFilter, onTipoChange, onClearFilters }: RoomFiltersProps) {
  const hasFilters = tipoFilter !== "todos"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={tipoFilter} onValueChange={(v) => onTipoChange(v as TipoHabitacion | "todos")}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tipo de habitación" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los tipos</SelectItem>
          <SelectItem value="double">Doble (2 personas)</SelectItem>
          <SelectItem value="triple">Triple (3 personas)</SelectItem>
          <SelectItem value="quad">Cuádruple (4 personas)</SelectItem>
          <SelectItem value="quintuple">Quíntuple (5 personas)</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="size-4 mr-1" />
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}