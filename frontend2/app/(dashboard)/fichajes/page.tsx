"use client";

import { useState, useEffect } from "react";
import { format, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock, Plus, Pencil, Trash2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { authFetch, getUser } from "@/lib/auth";

const API =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1";
const HOTEL_ID =
  (typeof window !== "undefined" ? getUser()?.hotel_id : null) ?? 1;

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

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

function calcMins(entrada: string | null, salida: string | null): number {
  if (!entrada || !salida) return 0;
  const [hE, mE] = entrada.split(":").map(Number);
  const [hS, mS] = salida.split(":").map(Number);
  return (hS * 60 + mS - (hE * 60 + mE) + 24 * 60) % (24 * 60);
}

function formatMins(mins: number): string {
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calcHoras(entrada: string | null, salida: string | null): string {
  return formatMins(calcMins(entrada, salida));
}

export default function FichajesPage() {
  const hoy = new Date();

  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [fecha, setFecha] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Fichaje | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [turnos, setTurnos] = useState<Turno[]>([
    { hora_entrada: "", hora_salida: "", notas: "" },
  ]);
  const [formEditar, setFormEditar] = useState({
    hora_entrada: "",
    hora_salida: "",
    notas: "",
  });

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>("");
  const [mesSel, setMesSel] = useState(hoy.getMonth());
  const [anioSel, setAnioSel] = useState(hoy.getFullYear());
  const [fichajesMes, setFichajesMes] = useState<Fichaje[]>([]);
  const [loadingMes, setLoadingMes] = useState(false);
  const [modalDia, setModalDia] = useState(false);
  const [fichajesDia, setFichajesDia] = useState<Fichaje[]>([]);
  const [fechaDia, setFechaDia] = useState<string>("");
  const [guardandoDia, setGuardandoDia] = useState(false);
  const [ausenciasHoy, setAusenciasHoy] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [fecha]);

  useEffect(() => {
    if (empleadoSeleccionado) fetchFichajesMes();
  }, [empleadoSeleccionado, mesSel, anioSel]);

  async function fetchData() {
    setLoading(true);
    try {
      const fechaStr = format(fecha, "yyyy-MM-dd");
      const [fichajesData, empData, ausenciasData] = await Promise.all([
        authFetch(
          `${API}/fichajes?fecha=${fechaStr}&hotel_id=${HOTEL_ID}`,
        ).then((r) => r.json()),
        authFetch(`${API}/usuarios?hotel_id=${HOTEL_ID}`).then((r) => r.json()),
        authFetch(
          `${API}/ausencias?mes=${fecha.getMonth() + 1}&anio=${fecha.getFullYear()}&hotel_id=${HOTEL_ID}`,
        ).then((r) => r.json()),
      ]);
      setFichajes(fichajesData);
      setEmpleados(empData.filter((e: Empleado) => e.active));
      // Filtrar ausencias del día actual
      const ausenciasHoy = Array.isArray(ausenciasData)
        ? ausenciasData.filter((a: any) => a.fecha === fechaStr)
        : [];
      setAusenciasHoy(ausenciasHoy);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFichajesMes() {
    if (!empleadoSeleccionado) return;
    setLoadingMes(true);
    try {
      const diasMes = getDaysInMonth(new Date(anioSel, mesSel));
      const resultados = await Promise.all(
        Array.from({ length: diasMes }, (_, i) => {
          const d = format(new Date(anioSel, mesSel, i + 1), "yyyy-MM-dd");
          return authFetch(`${API}/fichajes?fecha=${d}&hotel_id=${HOTEL_ID}`)
            .then((r) => r.json())
            .then((data: Fichaje[]) =>
              data.filter((f) => f.user_id === parseInt(empleadoSeleccionado)),
            );
        }),
      );
      setFichajesMes(resultados.flat());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMes(false);
    }
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

  function abrirDia(fechaStr: string, fichajesDelDia: Fichaje[]) {
    setFechaDia(fechaStr);
    setFichajesDia(fichajesDelDia.map((f) => ({ ...f })));
    setModalDia(true);
  }

  function agregarTurno() {
    setTurnos((prev) => [
      ...prev,
      { hora_entrada: "", hora_salida: "", notas: "" },
    ]);
  }

  function eliminarTurno(idx: number) {
    setTurnos((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTurno(idx: number, field: keyof Turno, value: string) {
    setTurnos((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    );
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
        if (empleadoSeleccionado) fetchFichajesMes();
      } catch (e) {
        toast.error("Error al guardar");
      } finally {
        setGuardando(false);
      }
      return;
    }

    if (!selectedUserId) {
      toast.error("Seleccioná un empleado");
      return;
    }
    const turnosValidos = turnos.filter((t) => t.hora_entrada || t.hora_salida);
    if (turnosValidos.length === 0) {
      toast.error("Cargá al menos un turno");
      return;
    }

    setGuardando(true);
    try {
      const fechaStr = format(fecha, "yyyy-MM-dd");
      await Promise.all(
        turnosValidos.map((t) =>
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
          }),
        ),
      );
      toast.success(
        `${turnosValidos.length} turno${turnosValidos.length > 1 ? "s" : ""} cargado${turnosValidos.length > 1 ? "s" : ""}`,
      );
      setModalOpen(false);
      fetchData();
      if (empleadoSeleccionado) fetchFichajesMes();
    } catch (e) {
      toast.error("Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id: number) {
    await authFetch(`${API}/fichajes/${id}?hotel_id=${HOTEL_ID}`, {
      method: "DELETE",
    });
    toast.success("Fichaje eliminado");
    fetchData();
    if (empleadoSeleccionado) fetchFichajesMes();
  }

  async function handleGuardarDia() {
    setGuardandoDia(true);
    try {
      await Promise.all(
        fichajesDia.map((f) =>
          authFetch(`${API}/fichajes/${f.id}?hotel_id=${HOTEL_ID}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hora_entrada: f.hora_entrada?.slice(0, 5) || null,
              hora_salida: f.hora_salida?.slice(0, 5) || null,
              notas: f.notas || null,
            }),
          }),
        ),
      );
      toast.success("Turnos actualizados");
      setModalDia(false);
      fetchFichajesMes();
    } catch (e) {
      toast.error("Error al guardar");
    } finally {
      setGuardandoDia(false);
    }
  }

  async function handleEliminarDelDia(id: number) {
    await authFetch(`${API}/fichajes/${id}?hotel_id=${HOTEL_ID}`, {
      method: "DELETE",
    });
    setFichajesDia((prev) => prev.filter((f) => f.id !== id));
    toast.success("Fichaje eliminado");
    fetchFichajesMes();
  }

  const fichajesPorFecha: Record<string, Fichaje[]> = {};
  fichajesMes.forEach((f) => {
    if (!fichajesPorFecha[f.fecha]) fichajesPorFecha[f.fecha] = [];
    fichajesPorFecha[f.fecha].push(f);
  });

  const diasTrabajados = Object.keys(fichajesPorFecha).sort();

  const totalMinsMes = diasTrabajados.reduce((sum, fecha) => {
    return (
      sum +
      fichajesPorFecha[fecha].reduce(
        (s, f) => s + calcMins(f.hora_entrada, f.hora_salida),
        0,
      )
    );
  }, 0);

  const idsConFichaje = new Set(fichajes.map((f) => f.user_id));
  const sinFichaje = empleados.filter((e) => !idsConFichaje.has(e.id));

  const totalHoras = fichajes.reduce((sum, f) => {
    return sum + calcMins(f.hora_entrada, f.hora_salida);
  }, 0);

  const anios = Array.from({ length: 3 }, (_, i) => hoy.getFullYear() - 1 + i);

  async function handleMarcarFalto(userId: number) {
    try {
      const fechaStr = format(fecha, "yyyy-MM-dd");
      await authFetch(`${API}/ausencias?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          fecha: fechaStr,
        }),
      });
      toast.success("Ausencia registrada");
      fetchData();
    } catch (e: any) {
      const msg = await e?.response?.json?.().catch?.(() => null);
      toast.error(msg?.detail || "Error al registrar ausencia");
    }
  }

  async function handleEliminarAusencia(ausenciaId: number) {
  try {
    await authFetch(`${API}/ausencias/${ausenciaId}?hotel_id=${HOTEL_ID}`, { method: "DELETE" });
    toast.success("Ausencia eliminada");
    fetchData();
  } catch (e) {
    toast.error("Error al eliminar ausencia");
  }
}
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
              <Button
                variant="outline"
                className="w-[180px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 size-4" />
                {format(fecha, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={fecha}
                onSelect={(d) => d && setFecha(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button onClick={() => abrirNuevo()} className="gap-2">
            <Plus className="size-4" />
            Cargar fichaje
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Con fichaje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Set(fichajes.map((f) => f.user_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sin fichaje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {sinFichaje.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total horas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalHoras > 0
                ? `${Math.floor(totalHoras / 60)}h ${totalHoras % 60}m`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro del día</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : fichajes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay fichajes cargados para este día
            </p>
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
                {fichajes.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>
                      {f.categoria ? (
                        <Badge variant="outline" className="capitalize">
                          {f.categoria}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {f.hora_entrada ? (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-green-500" />
                          {f.hora_entrada.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {f.hora_salida ? (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-red-500" />
                          {f.hora_salida.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {calcHoras(f.hora_entrada, f.hora_salida)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {f.notas || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirEditar(f)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminar(f.id)}
                        >
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

      {(sinFichaje.length > 0 || ausenciasHoy.length > 0) && (
        <Card style={{ borderColor: "#fecaca" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">
              Sin fichaje hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {/* Empleados con ausencia marcada */}
              {ausenciasHoy.map((a: any) => (
                <div key={a.id} className="flex items-center gap-1">
                  <Badge
                    style={{ backgroundColor: "#ef4444", color: "#fff" }}
                    className="gap-1"
                  >
                    {a.name} · Faltó
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleEliminarAusencia(a.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
              {/* Empleados sin fichaje ni ausencia */}
              {sinFichaje
                .filter(
                  (e) => !ausenciasHoy.find((a: any) => a.user_id === e.id),
                )
                .map((e) => (
                  <div key={e.id} className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="gap-1 cursor-pointer hover:bg-muted"
                      onClick={() => abrirNuevo(e.id.toString())}
                    >
                      {e.name}
                      {e.categoria && (
                        <span className="text-muted-foreground capitalize">
                          · {e.categoria}
                        </span>
                      )}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleMarcarFalto(e.id)}
                    >
                      Faltó
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial mensual por empleado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4" />
            Historial mensual por empleado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              <Select
                value={empleadoSeleccionado}
                onValueChange={setEmpleadoSeleccionado}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Seleccioná un empleado..." />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.name} {e.categoria && `(${e.categoria})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={mesSel.toString()}
                onValueChange={(v) => setMesSel(parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={anioSel.toString()}
                onValueChange={(v) => setAnioSel(parseInt(v))}
              >
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anios.map((a) => (
                    <SelectItem key={a} value={a.toString()}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!empleadoSeleccionado ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Seleccioná un empleado para ver su historial
              </p>
            ) : loadingMes ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : diasTrabajados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay fichajes en {MESES[mesSel]} {anioSel}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {diasTrabajados.length} días trabajados en {MESES[mesSel]}
                  </p>
                  <p className="text-sm font-semibold">
                    Total: {formatMins(totalMinsMes)}
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Turnos</TableHead>
                      <TableHead>Total horas</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diasTrabajados.map((fechaStr) => {
                      const turnosDia = fichajesPorFecha[fechaStr];
                      const minsDia = turnosDia.reduce(
                        (s, f) => s + calcMins(f.hora_entrada, f.hora_salida),
                        0,
                      );
                      return (
                        <TableRow key={fechaStr}>
                          <TableCell className="font-medium">
                            {format(
                              new Date(fechaStr + "T12:00:00"),
                              "dd/MM/yyyy",
                              { locale: es },
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {turnosDia.map((t) => (
                                <span
                                  key={t.id}
                                  className="text-xs text-muted-foreground"
                                >
                                  {t.hora_entrada?.slice(0, 5) || "—"} →{" "}
                                  {t.hora_salida?.slice(0, 5) || "—"}
                                  {t.notas && (
                                    <span className="ml-1 italic">
                                      ({t.notas})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatMins(minsDia)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirDia(fechaStr, turnosDia)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal cargar/editar fichaje */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Editar fichaje — ${editando.name}`
                : "Cargar fichaje"}
            </DialogTitle>
          </DialogHeader>
          {editando ? (
            <div className="flex flex-col gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Hora entrada</Label>
                  <Input
                    type="time"
                    value={formEditar.hora_entrada}
                    onChange={(e) =>
                      setFormEditar((f) => ({
                        ...f,
                        hora_entrada: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Hora salida</Label>
                  <Input
                    type="time"
                    value={formEditar.hora_salida}
                    onChange={(e) =>
                      setFormEditar((f) => ({
                        ...f,
                        hora_salida: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Notas</Label>
                <Input
                  value={formEditar.notas}
                  onChange={(e) =>
                    setFormEditar((f) => ({ ...f, notas: e.target.value }))
                  }
                  placeholder="Observaciones..."
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label>Empleado *</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map((e) => (
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
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-medium">
                        Turno {idx + 1}
                      </p>
                      {idx > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarTurno(idx)}
                        >
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Entrada</Label>
                        <Input
                          type="time"
                          value={turno.hora_entrada}
                          onChange={(e) =>
                            updateTurno(idx, "hora_entrada", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Salida</Label>
                        <Input
                          type="time"
                          value={turno.hora_salida}
                          onChange={(e) =>
                            updateTurno(idx, "hora_salida", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <Input
                      value={turno.notas}
                      onChange={(e) =>
                        updateTurno(idx, "notas", e.target.value)
                      }
                      placeholder="Notas del turno (opcional)"
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={agregarTurno}
                className="gap-2 w-full"
              >
                <Plus className="size-3" />
                Añadir turno
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal editar turnos de un día del historial */}
      <Dialog open={modalDia} onOpenChange={setModalDia}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Editar turnos —{" "}
              {fechaDia
                ? format(new Date(fechaDia + "T12:00:00"), "dd/MM/yyyy", {
                    locale: es,
                  })
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 max-h-[400px] overflow-y-auto">
            {fichajesDia.map((f, idx) => (
              <div key={f.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">
                    Turno {idx + 1}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEliminarDelDia(f.id)}
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Entrada</Label>
                    <Input
                      type="time"
                      value={f.hora_entrada?.slice(0, 5) || ""}
                      onChange={(e) =>
                        setFichajesDia((prev) =>
                          prev.map((fi, i) =>
                            i === idx
                              ? { ...fi, hora_entrada: e.target.value }
                              : fi,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Salida</Label>
                    <Input
                      type="time"
                      value={f.hora_salida?.slice(0, 5) || ""}
                      onChange={(e) =>
                        setFichajesDia((prev) =>
                          prev.map((fi, i) =>
                            i === idx
                              ? { ...fi, hora_salida: e.target.value }
                              : fi,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
                <Input
                  value={f.notas || ""}
                  onChange={(e) =>
                    setFichajesDia((prev) =>
                      prev.map((fi, i) =>
                        i === idx ? { ...fi, notas: e.target.value } : fi,
                      ),
                    )
                  }
                  placeholder="Notas del turno (opcional)"
                  className="text-sm"
                />
                {idx < fichajesDia.length - 1 && <Separator />}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDia(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarDia} disabled={guardandoDia}>
              {guardandoDia ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
