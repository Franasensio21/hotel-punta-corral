"use client"

import { useEffect } from "react"
import { getUser } from "@/lib/auth"

export default function SysLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== "superadmin") {
      window.location.href = "/login"
    }
  }, [])

  return <>{children}</>
}