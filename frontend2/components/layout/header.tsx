"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/habitaciones": "Gestión de Habitaciones",
  "/clientes": "Gestión de Clientes",
  "/reservas": "Listado de Reservas",
  "/reservas/nueva": "Nueva Reserva",
}

export function Header() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || "Dashboard"

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  )
}
