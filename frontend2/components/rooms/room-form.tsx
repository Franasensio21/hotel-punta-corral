"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import type { Habitacion, HabitacionForm as HabitacionFormData, TipoHabitacion, GeneroHabitacion, EstadoHabitacion } from "@/lib/types"

interface RoomFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  habitacion?: Habitacion | null
  onSubmit: (data: HabitacionFormData) => Promise<void>
}

export function RoomForm({ open, onOpenChange, habitacion, onSubmit }: RoomFormProps) {
  const isEditing = !!habitacion
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<HabitacionFormData>({
    numero: habitacion?.numero || "",
    piso: habitacion?.piso || 1,
    tipo: habitacion?.tipo || "individual",
    capacidad: habitacion?.capacidad || 1,
    genero: habitacion?.genero || "mixto",
    precio_por_noche: habitacion?.precio_por_noche || 50,
    estado: habitacion?.estado || "libre",
    descripcion: habitacion?.descripcion || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const updateField = <K extends keyof HabitacionFormData>(
    field: K,
    value: HabitacionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Habitación" : "Nueva Habitación"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la habitación"
              : "Completa los datos para crear una nueva habitación"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Número</FieldLabel>
                <Input
                  placeholder="101"
                  value={formData.numero}
                  onChange={(e) => updateField("numero", e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Piso</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={formData.piso}
                  onChange={(e) => updateField("piso", parseInt(e.target.value) || 1)}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => updateField("tipo", v as TipoHabitacion)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="doble">Doble</SelectItem>
                    <SelectItem value="triple">Triple</SelectItem>
                    <SelectItem value="grupal">Grupal</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Capacidad</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.capacidad}
                  onChange={(e) => updateField("capacidad", parseInt(e.target.value) || 1)}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Género</FieldLabel>
                <Select
                  value={formData.genero}
                  onValueChange={(v) => updateField("genero", v as GeneroHabitacion)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                    <SelectItem value="mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Precio/noche</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.precio_por_noche}
                  onChange={(e) => updateField("precio_por_noche", parseFloat(e.target.value) || 0)}
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Estado</FieldLabel>
              <Select
                value={formData.estado}
                onValueChange={(v) => updateField("estado", v as EstadoHabitacion)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="libre">Libre</SelectItem>
                  <SelectItem value="ocupada">Ocupada</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Descripción (opcional)</FieldLabel>
              <Textarea
                placeholder="Descripción de la habitación..."
                value={formData.descripcion || ""}
                onChange={(e) => updateField("descripcion", e.target.value)}
                rows={3}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2" />}
              {isEditing ? "Guardar Cambios" : "Crear Habitación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
