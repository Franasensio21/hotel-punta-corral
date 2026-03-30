"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { authFetch, getUser } from "@/lib/auth";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1";
const HOTEL_ID = (typeof window !== "undefined" ? getUser()?.hotel_id : null) ?? 1;

interface Fichaje {
  id: number;
  user_id: number;
  name: string;
  categoria: string | null;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  notas: string | null;
}

interface Empleado {
  id: number;
  name: string;
  categoria: string | null;
  active: boolean;
}

interface Turno {
  hora_entrada: string;
  hora_salida: string;
  notas: string;
}

function calcHoras(entrada: string | null, salida: string | null): string {
  if (!entrada || !salida) return "—";
  const [hE, mE] = entrada.split(":").map(Number);
  const [hS, mS] = salida.split(":").map(Number);
  const minutos = (hS * 60 + mS - (hE * 60 + mE) + 24 * 60) % (24 * 60);
  if (minutos <= 0) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function FichajesPage() {
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [fecha, setFecha] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Fichaje | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Para crear: selección de empleado + múltiples turnos
  const [selectedUserId, setSelectedUserId] = useState("");
  const [turnos, setTurnos] = useState<Turno[]>([{ hora_entrada: "", hora_salida: "", notas: "" }]);

  // Para editar: un solo turno
  const [formEditar, setFormEditar] = useState({ hora_entrada: "", hora_salida: "", notas: "" });

  useEffect(() => { fetchData() }, [fecha]);

  async function fetchData() {
    setLoading(true);
    try {
      const fechaStr = format(fecha, "yyyy-MM-dd");
      const [fichajesData, empData] = await Promise.all([
        authFetch(`${API}/fichajes?fecha=${fechaStr}&hotel_id=${HOTEL_ID}`).then(r => r.json()),
        authFetch(`${API}/usuarios?hotel_id=${HOTEL_ID}`).then(r => r.json()),
      ]);
      setFichajes(fichajesData);
      setEmpleados(empData.filter((e: Empleado) => e.active));
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function abrirNuevo(userId?: string) {
    setEditando(null);
    setSelectedUserId(userId || "");
    setTurnos([{ hora_entrada: "", hora_salida: "", notas: "" }]);
    setModalOpen(true);
  }

  function abrirEditar(f: Fichaje) {
    setEditando(f);
    setFormEditar({
      hora_entrada: f.hora_entrada?.slice(0, 5) || "",
      hora_salida: f.hora_salida?.slice(0, 5) || "",
      notas: f.notas || "",
    });
    setModalOpen(true);
  }

  function agregarTurno() {
    setTurnos(prev => [...prev, { hora_entrada: "", hora_salida: "", notas: "" }]);
  }

  function eliminarTurno(idx: number) {
    setTurnos(prev => prev.filter((_, i) => i !== idx));
  }

  function updateTurno(idx: number, field: keyof Turno, value: string) {
    setTurnos(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  }

  async function handleGuardar() {
    if (editando) {
      setGuardando(true);
      try {
        await authFetch(`${API}/fichajes/${editando.id}?hotel_id=${HOTEL_ID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hora_entrada: formEditar.hora_entrada || null,
            hora_salida: formEditar.hora_salida || null,
            notas: formEditar.notas || null,
          }),
        });
        toast.success("Fichaje actualizado");
        setModalOpen(false);
        fetchData();
      } catch (e) {
        toast.error("Error al guardar");
      } finally {
        setGuardando(false);
      }
      return;
    }

    // Crear múltiples turnos
    if (!selectedUserId) {
      toast.error("Seleccioná un empleado");
      return;
    }
    const turnosValidos = turnos.filter(t => t.hora_entrada || t.hora_salida);
    if (turnosValidos.length === 0) {
      toast.error("Cargá al menos un turno");
      return;
    }

    setGuardando(true);
    try {
      const fechaStr = format(fecha, "yyyy-MM-dd");
      await Promise.all(
        turnosValidos.map(t =>
          authFetch(`${API}/fichajes?hotel_id=${HOTEL_ID}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: parseInt(selectedUserId),
              fecha: fechaStr,
              hora_entrada: t.hora_entrada || null,
              hora_salida: t.hora_salida || null,
              notas: t.notas || null,
            }),
          })
        )
      );
      toast.success(`${turnosValidos.length} turno${turnosValidos.length > 1 ? "s" : ""} cargado${turnosValidos.length > 1 ? "s" : ""}`)
      setModalOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id: number) {
    await authFetch(`${API}/fichajes/${id}?hotel_id=${HOTEL_ID}`, { method: "DELETE" });
    toast.success("Fichaje eliminado");
    fetchData();
  }

  const idsConFichaje = new Set(fichajes.map(f => f.user_id));
  const sinFichaje = empleados.filter(e => !idsConFichaje.has(e.id));

  const totalHoras = fichajes.reduce((sum, f) => {
    if (!f.hora_entrada || !f.hora_salida) return sum;
    const [hE, mE] = f.hora_entrada.split(":").map(Number);
    const [hS, mS] = f.hora_salida.split(":").map(Number);
    const mins = (hS * 60 + mS - (hE * 60 + mE) + 24 * 60) % (24 * 60);
    return sum + mins;
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fichajes</h2>
          <p className="text-muted-foreground capitalize">
            {format(fecha, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 size-4" />
                {format(fecha, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={fecha} onSelect={d => d && setFecha(d)} initialFocus />
            </PopoverContent>
          </Popover>
          <Button onClick={() => abrirNuevo()} className="gap-2">
            <Plus className="size-4" />
            Cargar fichaje
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Con fichaje</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{new Set(fichajes.map(f => f.user_id)).size}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Sin fichaje</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-destructive">{sinFichaje.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total horas</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalHoras > 0 ? `${Math.floor(totalHoras / 60)}h ${totalHoras % 60}m` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla fichajes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Registro del día</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : fichajes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay fichajes cargados para este día</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fichajes.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>
                      {f.categoria ? <Badge variant="outline" className="capitalize">{f.categoria}</Badge> : "—"}
                    </TableCell>
                    <TableCell>
                      {f.hora_entrada
                        ? <span className="flex items-center gap-1"><Clock className="size-3 text-green-500" />{f.hora_entrada.slice(0, 5)}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {f.hora_salida
                        ? <span className="flex items-center gap-1"><Clock className="size-3 text-red-500" />{f.hora_salida.slice(0, 5)}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-semibold">{calcHoras(f.hora_entrada, f.hora_salida)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.notas || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => abrirEditar(f)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEliminar(f.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Empleados sin fichaje */}
      {sinFichaje.length > 0 && (
        <Card style={{ borderColor: "#fecaca" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">Sin fichaje hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sinFichaje.map(e => (
                <Badge key={e.id} variant="outline" className="gap-1 cursor-pointer hover:bg-muted"
                  onClick={() => abrirNuevo(e.id.toString())}>
                  {e.name}
                  {e.categoria && <span className="text-muted-foreground capitalize">· {e.categoria}</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando ? `Editar fichaje — ${editando.name}` : "Cargar fichaje"}
            </DialogTitle>
          </DialogHeader>

          {editando ? (
            // Modo editar — un solo turno
            <div className="flex flex-col gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Hora entrada</Label>
                  <Input type="time" value={formEditar.hora_entrada}
                    onChange={e => setFormEditar(f => ({ ...f, hora_entrada: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Hora salida</Label>
                  <Input type="time" value={formEditar.hora_salida}
                    onChange={e => setFormEditar(f => ({ ...f, hora_salida: e.target.value }))} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Notas</Label>
                <Input value={formEditar.notas}
                  onChange={e => setFormEditar(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Observaciones..." />
              </div>
            </div>
          ) : (
            // Modo crear — empleado + múltiples turnos
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label>Empleado *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger><SelectValue placeholder="Seleccioná..." /></SelectTrigger>
                  <SelectContent>
                    {empleados.map(e => (
                      <SelectItem key={e.id} value={e.id.toString()}>
                        {e.name} {e.categoria && `(${e.categoria})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                {turnos.map((turno, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    {idx > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium">Turno {idx + 1}</p>
                        <Button variant="ghost" size="sm" onClick={() => eliminarTurno(idx)}>
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                    {idx === 0 && <p className="text-xs text-muted-foreground font-medium">Turno 1</p>}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Entrada</Label>
                        <Input type="time" value={turno.hora_entrada}
                          onChange={e => updateTurno(idx, "hora_entrada", e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Salida</Label>
                        <Input type="time" value={turno.hora_salida}
                          onChange={e => updateTurno(idx, "hora_salida", e.target.value)} />
                      </div>
                    </div>
                    <Input value={turno.notas} onChange={e => updateTurno(idx, "notas", e.target.value)}
                      placeholder="Notas del turno (opcional)" className="text-sm" />
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={agregarTurno} className="gap-2 w-full">
                <Plus className="size-3" />
                Añadir turno
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}