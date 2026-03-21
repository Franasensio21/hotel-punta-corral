"use client"

import { useEffect, useState } from "react"
import { logout, getUser } from "@/lib/auth"
import type { User } from "@/lib/auth"
import { Building2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function RecepcionistaLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          <div>
            <span className="font-semibold text-sm">Hotel Punta Corral</span>
            {user && <span className="text-xs text-muted-foreground ml-2">— {user.name}</span>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-muted-foreground">
          <LogOut className="size-4" />
          Salir
        </Button>
      </header>
      <main className="p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}