"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, BedDouble, Users, CalendarPlus,
  ClipboardList, Building2, DollarSign, LogOut, Users2,ClipboardCheck,
  TrendingUp,Settings,LayoutGrid
} from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { logout, getUser, type User } from "@/lib/auth"
import { useState, useEffect } from "react"

const menuItems = [
  { title: "Dashboard",     href: "/",               icon: LayoutDashboard },
  { title: "Habitaciones",  href: "/habitaciones",   icon: BedDouble       },
  { title: "Clientes",      href: "/clientes",       icon: Users           },
  { title: "Nueva Reserva", href: "/reservas/nueva", icon: CalendarPlus    },
  { title: "Reservas",      href: "/reservas",       icon: ClipboardList   },
  { title: "Precios",       href: "/precios",        icon: DollarSign      },
  { title: "Empleados",     href: "/empleados",      icon: Users2          },
  { title: "Fichajes", href: "/fichajes", icon: ClipboardCheck             },
  { title: "Finanzas", href: "/finanzas", icon: TrendingUp                 },
  { title: "Configuración", href: "/configuracion", icon: Settings         },
  { title: "Grupos", href: "/grupos", icon: Users                          },
  { title: "Grilla", href: "/grilla", icon: LayoutGrid                     },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Hotel Punta Corral</span>
            <span className="text-xs text-muted-foreground">Sistema de Gestión</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-3 flex flex-col gap-2">
          {user && (
            <div className="flex flex-col px-1">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
            </div>
          )}
          <Button variant="ghost" size="sm" className="justify-start gap-2 text-muted-foreground" onClick={logout}>
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}