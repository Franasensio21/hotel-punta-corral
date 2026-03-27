"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { LogIn, LogOut, BedDouble } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { authFetch } from "@/lib/auth"

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1"
const HOTEL_ID = getUser()?.hotel_id ?? 1

const TIPO_LABELS: Record<string, string> = {
  double: "Doble", triple: "Triple", quad: "Cuádruple",
  quintuple: "Quíntuple", familiar: "Familiar",
}

const SUBTIPO_LABELS: Record<string, string> = {
  matrimonial: "Matrimonial", twin: "Twin", familiar: "Familiar",
}

interface Habitacion {
  room_id:   number
  numero:    string
  tipo:      string
  subtipo:   string | null
  capacidad: number
  estado:    string
  huesped:   string | null
  grupo:     string | null
}

export default function MucamaPage() {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [loading, setLoading] = useState(true)
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Traemos disponibilidad de hoy y mañana para detectar movimientos
        const [resAyer, resHoy] = await Promise.all([
  authFetch(`${API}/disponibilidad?fecha=${format(ayer, "yyyy-MM-dd")}&hotel_id=${HOTEL_ID}`).then(r => r.json()),
  authFetch(`${API}/disponibilidad?fecha=${format(hoy, "yyyy-MM-dd")}&hotel_id=${HOTEL_ID}`).then(r => r.json()),
])

const habAyer = resAyer.habitaciones as Habitacion[]
const habHoy2 = resHoy.habitaciones  as Habitacion[]

const ayerMap: Record<number, Habitacion> = {}
habAyer.forEach(h => ayerMap[h.room_id] = h)

const checkouts = habHoy2.filter(h => h.estado === "libre"   && ayerMap[h.room_id]?.estado === "ocupada")
const checkins  = habHoy2.filter(h => h.estado === "ocupada" && ayerMap[h.room_id]?.estado === "libre")
        setHabitaciones([
          ...checkouts.map(h => ({ ...h, _tipo: "checkout" })),
          ...checkins.map(h => ({ ...h, _tipo: "checkin" })),
        ] as any)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const checkouts = (habitaciones as any[]).filter(h => h._tipo === "checkout")
  const checkins  = (habitaciones as any[]).filter(h => h._tipo === "checkin")

  const HabCard = ({ hab, tipo }: { hab: any; tipo: "checkin" | "checkout" }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: "16px",
      padding: "14px 16px", borderRadius: "10px",
      backgroundColor: tipo === "checkout" ? "#fef2f2" : "#f0fdf4",
      border: `1px solid ${tipo === "checkout" ? "#fecaca" : "#bbf7d0"}`,
    }}>
      <div style={{
        width: "52px", height: "52px", borderRadius: "10px", flexShrink: 0,
        backgroundColor: tipo === "checkout" ? "#ef4444" : "#22c55e",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ color: "#fff", fontSize: "20px", fontWeight: "900" }}>{hab.numero}</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {TIPO_LABELS[hab.tipo] || hab.tipo} {SUBTIPO_LABELS[hab.subtipo] || ""}
          </span>
          <Badge variant="outline" className="text-xs">{hab.capacidad} pers.</Badge>
        </div>
        {hab.huesped && <span className="text-sm text-muted-foreground">{hab.huesped}</span>}
        {hab.grupo && <span className="text-sm text-muted-foreground">Grupo: {hab.grupo}</span>}
        <span className="text-xs font-medium" style={{ color: tipo === "checkout" ? "#ef4444" : "#22c55e" }}>
          {tipo === "checkout" ? "Sale hoy — limpiar y preparar" : "Entra hoy — preparar habitación"}
        </span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tareas del día</h2>
        <p className="text-muted-foreground capitalize">
          {format(hoy, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : (
        <>
          {/* Check-outs */}
          <Card style={{ borderColor: "#fecaca" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LogOut className="size-5 text-red-500" />
                <span>Egresos de hoy</span>
                <Badge style={{ backgroundColor: "#ef4444", color: "#fff" }}>{checkouts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {checkouts.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-4">No hay egresos hoy</p>
                : checkouts.map(h => <HabCard key={h.room_id} hab={h} tipo="checkout" />)
              }
            </CardContent>
          </Card>

          {/* Check-ins */}
          <Card style={{ borderColor: "#bbf7d0" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LogIn className="size-5 text-green-500" />
                <span>Ingresos de hoy</span>
                <Badge style={{ backgroundColor: "#22c55e", color: "#fff" }}>{checkins.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {checkins.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-4">No hay ingresos hoy</p>
                : checkins.map(h => <HabCard key={h.room_id} hab={h} tipo="checkin" />)
              }
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}