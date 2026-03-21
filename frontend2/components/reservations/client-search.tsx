"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Cliente } from "@/lib/types"

interface ClientSearchProps {
  clientes: Cliente[]
  selectedClient: Cliente | null
  onSelect: (cliente: Cliente | null) => void
  onCreateNew: () => void
}

export function ClientSearch({ clientes, selectedClient, onSelect, onCreateNew }: ClientSearchProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filteredClientes = clientes.filter((cliente) => {
    const searchLower = search.toLowerCase()
    return (
      cliente.nombre.toLowerCase().includes(searchLower) ||
      cliente.apellido.toLowerCase().includes(searchLower) ||
      cliente.dni.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between h-auto min-h-10 py-2"
          >
            {selectedClient ? (
              <div className="flex flex-col items-start">
                <span className="font-medium">
                  {selectedClient.nombre} {selectedClient.apellido}
                </span>
                <span className="text-xs text-muted-foreground">
                  DNI: {selectedClient.dni}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">Seleccionar cliente...</span>
            )}
            <Search className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 size-4 shrink-0 opacity-50" />
              <Input
                placeholder="Buscar por nombre o DNI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No se encontraron clientes
                  </p>
                  <Button size="sm" variant="outline" onClick={() => {
                    setOpen(false)
                    onCreateNew()
                  }}>
                    <Plus className="mr-2 size-4" />
                    Crear nuevo cliente
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredClientes.map((cliente) => (
                  <CommandItem
                    key={cliente.id}
                    value={cliente.id.toString()}
                    onSelect={() => {
                      onSelect(cliente)
                      setOpen(false)
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {cliente.nombre} {cliente.apellido}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        DNI: {cliente.dni}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cliente.origen === "nacional" ? "default" : "secondary"}>
                        {cliente.origen === "nacional" ? "Nacional" : "Extranjero"}
                      </Badge>
                      {selectedClient?.id === cliente.id && (
                        <Check className="size-4" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setOpen(false)
                  onCreateNew()
                }}
              >
                <Plus className="mr-2 size-4" />
                Crear nuevo cliente
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
