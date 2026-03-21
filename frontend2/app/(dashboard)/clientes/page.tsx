"use client"

import { useState, useEffect } from "react"
import { Plus, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ClientTable } from "@/components/clients/client-table"
import { ClientForm } from "@/components/clients/client-form"
import { api } from "@/lib/api"
import type { Cliente, ClienteForm, OrigenCliente } from "@/lib/types"
import { toast } from "sonner"

// Datos mock para desarrollo
const mockClientes: Cliente[] = [
  { id: 1, nombre: "Juan", apellido: "Pérez", dni: "12345678", telefono: "+54 11 1234-5678", email: "juan@email.com", origen: "nacional", created_at: "", updated_at: "" },
  { id: 2, nombre: "María", apellido: "García", dni: "87654321", telefono: "+54 11 8765-4321", email: "maria@email.com", origen: "nacional", created_at: "", updated_at: "" },
  { id: 3, nombre: "Carlos", apellido: "López", dni: "AA123456", telefono: "+1 555 123 4567", email: "carlos@email.com", origen: "extranjero", created_at: "", updated_at: "" },
  { id: 4, nombre: "Ana", apellido: "Martínez", dni: "11223344", telefono: "+54 11 2233-4455", email: "ana@email.com", origen: "nacional", created_at: "", updated_at: "" },
  { id: 5, nombre: "Roberto", apellido: "Silva", dni: "BR987654", telefono: "+55 11 9876-5432", email: "roberto@email.com", origen: "extranjero", created_at: "", updated_at: "" },
]

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [origenFilter, setOrigenFilter] = useState<OrigenCliente | "todos">("todos")
  
  // Modal states
  const [formOpen, setFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Cliente | null>(null)
  const [deleteClient, setDeleteClient] = useState<Cliente | null>(null)

  useEffect(() => {
    fetchClientes()
  }, [])

  async function fetchClientes() {
    setLoading(true)
    try {
      const data = await api.getClientes()
      setClientes(data)
    } catch {
      setClientes(mockClientes)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar clientes
  const filteredClientes = clientes.filter((cliente) => {
    const searchLower = search.toLowerCase()
    const matchesSearch = 
      cliente.nombre.toLowerCase().includes(searchLower) ||
      cliente.apellido.toLowerCase().includes(searchLower) ||
      cliente.dni.toLowerCase().includes(searchLower)
    
    if (!matchesSearch) return false
    if (origenFilter !== "todos" && cliente.origen !== origenFilter) return false
    return true
  })

  const handleCreate = async (data: ClienteForm) => {
    try {
      await api.createCliente(data)
      toast.success("Cliente registrado exitosamente")
      fetchClientes()
    } catch (error) {
      toast.error("Error al registrar el cliente")
      throw error
    }
  }

  const handleEdit = async (data: ClienteForm) => {
    if (!editingClient) return
    try {
      await api.updateCliente(editingClient.id, data)
      toast.success("Cliente actualizado exitosamente")
      fetchClientes()
      setEditingClient(null)
    } catch (error) {
      toast.error("Error al actualizar el cliente")
      throw error
    }
  }

  const handleDelete = async () => {
    if (!deleteClient) return
    try {
      await api.deleteCliente(deleteClient.id)
      toast.success("Cliente eliminado exitosamente")
      fetchClientes()
    } catch {
      toast.error("Error al eliminar el cliente")
    } finally {
      setDeleteClient(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">
            Administra los clientes del hotel
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o DNI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={origenFilter} onValueChange={(v) => setOrigenFilter(v as OrigenCliente | "todos")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los orígenes</SelectItem>
                <SelectItem value="nacional">Nacional</SelectItem>
                <SelectItem value="extranjero">Extranjero</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ClientTable
              clientes={filteredClientes}
              onEdit={(cliente) => {
                setEditingClient(cliente)
                setFormOpen(true)
              }}
              onDelete={setDeleteClient}
            />
          )}
        </CardContent>
      </Card>

      {/* Formulario crear/editar */}
      <ClientForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingClient(null)
        }}
        cliente={editingClient}
        onSubmit={editingClient ? handleEdit : handleCreate}
      />

      {/* Dialogo de confirmación eliminar */}
      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar a {deleteClient?.nombre} {deleteClient?.apellido}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
