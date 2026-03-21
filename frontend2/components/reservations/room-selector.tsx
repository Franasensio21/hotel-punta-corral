"use client"

import { BedDouble, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HabitacionDisponible, TipoHabitacion, GeneroHabitacion } from "@/lib/types"

interface RoomSelectorProps {
  habitaciones: HabitacionDisponible[]
  selectedRoom: HabitacionDisponible | null
  onSelect: (habitacion: HabitacionDisponible) => void
}

const tipoLabels: Record<TipoHabitacion, string> = {
  individual: "Individual",
  doble: "Doble",
  triple: "Triple",
  grupal: "Grupal",
}

const generoLabels: Record<GeneroHabitacion, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
  mixto: "Mixto",
}

export function RoomSelector({ habitaciones, selectedRoom, onSelect }: RoomSelectorProps) {
  const disponibles = habitaciones.filter((h) => h.disponible)

  if (disponibles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg">
        <BedDouble className="size-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No hay habitaciones disponibles para las fechas seleccionadas
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {disponibles.map((habitacion) => {
        const isSelected = selectedRoom?.id === habitacion.id

        return (
          <button
            key={habitacion.id}
            type="button"
            onClick={() => onSelect(habitacion)}
            className={cn(
              "relative flex flex-col items-start rounded-lg border p-4 text-left transition-all hover:border-primary",
              isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
            )}
          >
            {isSelected && (
              <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <BedDouble className="size-5 text-primary" />
              <span className="text-lg font-semibold">Hab. {habitacion.numero}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <span className="ml-1 font-medium">{tipoLabels[habitacion.tipo]}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Capacidad:</span>
                <span className="ml-1 font-medium">{habitacion.capacidad}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Género:</span>
                <span className="ml-1 font-medium">{generoLabels[habitacion.genero]}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Piso:</span>
                <span className="ml-1 font-medium">{habitacion.piso}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t w-full">
              <span className="text-lg font-bold text-primary">
                ${habitacion.precio_por_noche}
              </span>
              <span className="text-sm text-muted-foreground"> /noche</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
