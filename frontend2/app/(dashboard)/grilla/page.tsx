"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { format, getDaysInMonth } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { authFetch } from "@/lib/auth"

const API = "http://${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1"
const HOTEL_ID = 1

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

const CANALES: Record<number, { nombre: string; color: string }> = {
  1: { nombre: "Booking",      color: "#7dd3fc" },
  2: { nombre: "Directo",      color: "#86efac" },
  3: { nombre: "Email",        color: "#fca5a5" },
  4: { nombre: "Grupo",        color: "#fde68a" },
  5: { nombre: "Estudiantil",  color: "#bbf7d0" },
}

const COLOR_BORDER = "#e2e8f0"

interface CeldaInfo {
  reserva_id: number | null
  channel_id: number | null
}

interface Habitacion {
  id:       number
  numero:   string
  tipo:     string
  capacidad: number
}

interface Selection {
  roomId:    number
  diaInicio: number
  diaFin:    number
}

export default function GrillaPage() {
  const hoy = new Date()
  const [mes, setMes]     = useState(hoy.getMonth())
  const [anio, setAnio]   = useState(hoy.getFullYear())
  const [canal, setCanal] = useState<number>(2)
  const [loading, setLoading]     = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [grilla, setGrilla] = useState<Record<number, Record<number, CeldaInfo>>>({})
  const [selection, setSelection] = useState<Selection | null>(null)
  const [cancelando, setCancelando] = useState<{ reservaId: number; numero: string; dia: number } | null>(null)
  const [modalSingle, setModalSingle] = useState(false)
  const [pendingSel, setPendingSel]   = useState<Selection | null>(null)

  const isDragging  = useRef(false)
  const dragStart   = useRef<{ roomId: number; dia: number } | null>(null)
  const selectionRef = useRef<Selection | null>(null)
  const grillaRef   = useRef<Record<number, Record<number, CeldaInfo>>>({})
  const canalRef    = useRef<number>(1)
  const habsRef     = useRef<Habitacion[]>([])
  const mesRef      = useRef(hoy.getMonth())
  const anioRef     = useRef(hoy.getFullYear())

  // Mantener refs sincronizados
  useEffect(() => { grillaRef.current = grilla }, [grilla])
  useEffect(() => { canalRef.current = canal }, [canal])
  useEffect(() => { habsRef.current = habitaciones }, [habitaciones])
  useEffect(() => { selectionRef.current = selection }, [selection])
  useEffect(() => { mesRef.current = mes }, [mes])
  useEffect(() => { anioRef.current = anio }, [anio])

  const diasMes = getDaysInMonth(new Date(anio, mes))
  const anios   = Array.from({ length: 3 }, (_, i) => hoy.getFullYear() - 1 + i)

  useEffect(() => { fetchData() }, [mes, anio])

  async function fetchData() {
    setLoading(true)
    try {
      const [habData, reservasData] = await Promise.all([
        authFetch(`${API}/habitaciones?hotel_id=${HOTEL_ID}`).then(r => r.json()),
        authFetch(`${API}/reservas?hotel_id=${HOTEL_ID}`).then(r => r.json()),
      ])

      const habs: Habitacion[] = habData
        .map((h: any) => ({ id: h.id, numero: h.number, tipo: h.type, capacidad: h.capacity }))
        .sort((a: Habitacion, b: Habitacion) => parseInt(a.numero) - parseInt(b.numero))
      setHabitaciones(habs)

      const m = mesRef.current
      const a = anioRef.current
      const dias = getDaysInMonth(new Date(a, m))
      const nuevaGrilla: Record<number, Record<number, CeldaInfo>> = {}
      habs.forEach((h: Habitacion) => { nuevaGrilla[h.id] = {} })

      for (let dia = 1; dia <= dias; dia++) {
        const fecha = format(new Date(a, m, dia), "yyyy-MM-dd")
        habs.forEach((hab: Habitacion) => {
          const reserva = reservasData.find((r: any) =>
            r.room_id === hab.id &&
            r.status !== "cancelled" &&
            r.check_in <= fecha &&
            r.check_out > fecha
          )
          nuevaGrilla[hab.id][dia] = {
            reserva_id: reserva?.id    || null,
            channel_id: reserva?.channel_id || null,
          }
        })
      }
      setGrilla(nuevaGrilla)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const crearReserva = useCallback(async (sel: Selection, tipoOcupacion: string = "individual") => {
    const { roomId, diaInicio, diaFin } = sel
    const g = grillaRef.current
    const m = mesRef.current
    const a = anioRef.current

    for (let d = diaInicio; d <= diaFin; d++) {
      if (g[roomId]?.[d]?.reserva_id) {
        toast.error("Hay celdas ocupadas en el rango seleccionado")
        return
      }
    }

    const checkIn  = format(new Date(a, m, diaInicio),  "yyyy-MM-dd")
    const checkOut = format(new Date(a, m, diaFin + 1), "yyyy-MM-dd")
    const hab      = habsRef.current.find(h => h.id === roomId)

    setGuardando(true)
    try {
      const res = await authFetch(`${API}/reservar?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id:        roomId,
          guest_id:       null,
          channel_id:     canalRef.current,
          check_in:       checkIn,
          check_out:      checkOut,
          notes:          null,
          tipo_ocupacion: tipoOcupacion,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.detail || "Error al crear reserva")
        return
      }
      toast.success(`Reserva creada: Hab. ${hab?.numero} del ${diaInicio}/${m+1} al ${diaFin+1}/${m+1}`)
      await fetchData()
    } catch {
      toast.error("Error al crear reserva")
    } finally {
      setGuardando(false)
    }
  }, [])
  useEffect(() => {
    const handleMouseUp = () => {
  if (!isDragging.current) return
  isDragging.current = false
  const sel = selectionRef.current
  if (sel && sel.diaFin >= sel.diaInicio) {
    // Verificar si la habitación es doble
    const hab = habsRef.current.find(h => h.id === sel.roomId)
    if (hab?.tipo === "double") {
      setPendingSel(sel)
      setModalSingle(true)
    } else {
      crearReserva(sel, "individual")
    }
  }
  setSelection(null)
  dragStart.current = null
}
    window.addEventListener("mouseup", handleMouseUp)
    return () => window.removeEventListener("mouseup", handleMouseUp)
  }, [crearReserva])

  const handleMouseDown = (roomId: number, dia: number) => {
    if (grillaRef.current[roomId]?.[dia]?.reserva_id) return
    isDragging.current  = true
    dragStart.current   = { roomId, dia }
    const sel = { roomId, diaInicio: dia, diaFin: dia }
    setSelection(sel)
    selectionRef.current = sel
  }

  const handleMouseEnter = (roomId: number, dia: number) => {
    if (!isDragging.current || !dragStart.current) return
    if (dragStart.current.roomId !== roomId) return
    const diaInicio = Math.min(dragStart.current.dia, dia)
    const diaFin    = Math.max(dragStart.current.dia, dia)
    const sel = { roomId, diaInicio, diaFin }
    setSelection(sel)
    selectionRef.current = sel
  }

  const handleCancelReserva = async () => {
  if (!cancelando) return
  try {
    await authFetch(`${API}/reservas/${cancelando.reservaId}?hotel_id=${HOTEL_ID}`, { method: "DELETE" })
    toast.success("Reserva cancelada")
    setCancelando(null)
    await fetchData()
  } catch {
    toast.error("Error al cancelar")
  }
}

  const isEnSelection = (roomId: number, dia: number) =>
    selection?.roomId === roomId && dia >= selection.diaInicio && dia <= selection.diaFin

  const getDiaSemana = (dia: number) =>
    ["D","L","M","X","J","V","S"][new Date(anio, mes, dia).getDay()]

  const esFinDeSemana = (dia: number) => {
    const d = new Date(anio, mes, dia).getDay()
    return d === 0 || d === 6
  }

  const esHoy = (dia: number) =>
    anio === hoy.getFullYear() && mes === hoy.getMonth() && dia === hoy.getDate()

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Grilla de reservas</h2>
          <p className="text-muted-foreground">{MESES[mes]} {anio}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={mes.toString()} onValueChange={v => setMes(parseInt(v))}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={anio.toString()} onValueChange={v => setAnio(parseInt(v))}>
            <SelectTrigger className="w-[85px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anios.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={canal.toString()} onValueChange={v => setCanal(parseInt(v))}>
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center gap-2">
                <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: CANALES[canal]?.color, border: "1px solid #ccc", flexShrink: 0 }} />
                <span>{CANALES[canal]?.nombre}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CANALES).map(([id, c]) => (
                <SelectItem key={id} value={id}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.color, border: "1px solid #ccc" }} />
                    {c.nombre}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(CANALES).map(([id, c]) => (
          <div key={id} className="flex items-center gap-1.5">
            <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c.color, border: "1px solid #ccc" }} />
            <span className="text-xs text-muted-foreground">{c.nombre}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: "#e0e7ff", border: "1px solid #a5b4fc" }} />
          <span className="text-xs text-muted-foreground">Selección</span>
        </div>
      </div>

      {/* Grilla */}
      {loading ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : (
        <div style={{ overflowX: "auto", userSelect: "none", cursor: "crosshair" }}>
  <table style={{ borderCollapse: "collapse" }}>
    <thead>
      <tr>
        <th style={{
          width: 55, minWidth: 55, padding: "4px 8px",
          backgroundColor: "#f1f5f9", border: `1px solid ${COLOR_BORDER}`,
          fontSize: 12, fontWeight: 700, textAlign: "left",
          position: "sticky", left: 0, zIndex: 2,
        }}>Día</th>
        {habitaciones.map(hab => (
          <th key={hab.id} style={{
            width: 36, minWidth: 36, padding: "2px 0",
            backgroundColor: "#f8fafc",
            border: `1px solid ${COLOR_BORDER}`,
            fontSize: 11, fontWeight: 700, textAlign: "center",
          }}>
            {hab.numero}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {Array.from({ length: diasMes }, (_, i) => i + 1).map(dia => (
        <tr key={dia}>
          <td style={{
            padding: "2px 8px",
            backgroundColor: esHoy(dia) ? "#dbeafe" : esFinDeSemana(dia) ? "#f0f4ff" : "#f8fafc",
            border: `1px solid ${COLOR_BORDER}`,
            fontSize: 11, fontWeight: 600,
            position: "sticky", left: 0, zIndex: 1,
            whiteSpace: "nowrap",
            color: esHoy(dia) ? "#1d4ed8" : undefined,
          }}>
            {dia} {getDiaSemana(dia)}
          </td>
          {habitaciones.map(hab => {
            const celda     = grilla[hab.id]?.[dia]
            const ocupada   = !!celda?.reserva_id
            const enSel     = isEnSelection(hab.id, dia)
            const canalInfo = celda?.channel_id ? CANALES[celda.channel_id] : null
            return (
              <td
                key={hab.id}
                onMouseDown={() => handleMouseDown(hab.id, dia)}
                onMouseEnter={() => handleMouseEnter(hab.id, dia)}
                onClick={() => {
                    if (ocupada && celda?.reserva_id) {
                    setCancelando({ reservaId: celda.reserva_id, numero: hab.numero, dia })
                    }
                }}

                style={{
                  width: 36, minWidth: 36, height: 26,
                  backgroundColor: enSel
                    ? "#e0e7ff"
                    : ocupada && canalInfo
                      ? canalInfo.color
                      : esFinDeSemana(dia) ? "#fafafa" : "#ffffff",
                  border: enSel
                    ? "1px solid #a5b4fc"
                    : `1px solid ${COLOR_BORDER}`,
                  cursor: ocupada ? "pointer" : "crosshair",
                }}
              />
            )
          })}
        </tr>
      ))}
    </tbody>
  </table>
</div>
      )}

      {guardando && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          backgroundColor: "#1e293b", color: "#fff",
          padding: "8px 16px", borderRadius: 8, fontSize: 13, zIndex: 50,
        }}>
          Guardando reserva...
        </div>
      )}

      <AlertDialog open={!!cancelando} onOpenChange={() => setCancelando(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Cancelar reserva</AlertDialogTitle>
      <AlertDialogDescription>
        ¿Cancelar la reserva en habitación {cancelando?.numero} el día {cancelando?.dia}/{mes+1}?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>No</AlertDialogCancel>
      <AlertDialogAction onClick={handleCancelReserva} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        Cancelar reserva
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
<Dialog open={modalSingle} onOpenChange={setModalSingle}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle>Tipo de ocupación</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-muted-foreground">
      ¿Cómo se va a ocupar esta habitación doble?
    </p>
    <div className="flex flex-col gap-3 py-2">
      <Button onClick={() => {
        setModalSingle(false)
        if (pendingSel) crearReserva(pendingSel, "individual")
        setPendingSel(null)
      }}>
        Doble (2 personas)
      </Button>
      <Button variant="outline" onClick={() => {
        setModalSingle(false)
        if (pendingSel) crearReserva(pendingSel, "single")
        setPendingSel(null)
      }}>
        Single (1 persona)
      </Button>
    </div>
  </DialogContent>
</Dialog>
    </div>
  )
}