"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import type { Cliente, ClienteForm as ClienteFormData, OrigenCliente } from "@/lib/types"

interface ClientFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente?: Cliente | null
  onSubmit: (data: ClienteFormData) => Promise<void>
}

export function ClientForm({ open, onOpenChange, cliente, onSubmit }: ClientFormProps) {
  const isEditing = !!cliente
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ClienteFormData>({
    nombre: "",
    apellido: "",
    dni: "",
    telefono: "",
    email: "",
    origen: "nacional",
    direccion: "",
    fecha_nacimiento: "",
  })

  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        dni: cliente.dni,
        telefono: cliente.telefono || "",
        email: cliente.email || "",
        origen: cliente.origen,
        direccion: cliente.direccion || "",
        fecha_nacimiento: cliente.fecha_nacimiento || "",
      })
    } else {
      setFormData({
        nombre: "",
        apellido: "",
        dni: "",
        telefono: "",
        email: "",
        origen: "nacional",
        direccion: "",
        fecha_nacimiento: "",
      })
    }
  }, [cliente, open])

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

  const updateField = <K extends keyof ClienteFormData>(
    field: K,
    value: ClienteFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del cliente"
              : "Completa los datos para registrar un nuevo cliente"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Nombre</FieldLabel>
                <Input
                  placeholder="Juan"
                  value={formData.nombre}
                  onChange={(e) => updateField("nombre", e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Apellido</FieldLabel>
                <Input
                  placeholder="Pérez"
                  value={formData.apellido}
                  onChange={(e) => updateField("apellido", e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>DNI/Documento</FieldLabel>
                <Input
                  placeholder="12345678"
                  value={formData.dni}
                  onChange={(e) => updateField("dni", e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Origen</FieldLabel>
                <Select
                  value={formData.origen}
                  onValueChange={(v) => updateField("origen", v as OrigenCliente)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="extranjero">Extranjero</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Teléfono</FieldLabel>
                <Input
                  type="tel"
                  placeholder="+54 11 1234-5678"
                  value={formData.telefono || ""}
                  onChange={(e) => updateField("telefono", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Dirección</FieldLabel>
              <Input
                placeholder="Av. Corrientes 1234, CABA"
                value={formData.direccion || ""}
                onChange={(e) => updateField("direccion", e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel>Fecha de Nacimiento</FieldLabel>
              <Input
                type="date"
                value={formData.fecha_nacimiento || ""}
                onChange={(e) => updateField("fecha_nacimiento", e.target.value)}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2" />}
              {isEditing ? "Guardar Cambios" : "Registrar Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
