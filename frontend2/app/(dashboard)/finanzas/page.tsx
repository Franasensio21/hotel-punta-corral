"use client";

import { useState, useEffect } from "react";
import { format, getDaysInMonth } from "date-fns";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth";

const API =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1";
const HOTEL_ID = 1;

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
const CATEGORIAS_GASTO = [
  "mantenimiento",
  "limpieza",
  "servicios",
  "suministros",
  "personal",
  "otro",
];

interface Gasto {
  id: number;
  fecha: string;
  descripcion: string;
  monto: number;
  categoria: string;
  notas: string | null;
}

interface SueldoCalc {
  user_id: number;
  name: string;
  categoria: string | null;
  sueldo_fijo: number;
  sueldo_por_hora: number;
  horas_trabajadas: number;
  total: number;
  tipo_empleado?: string;
}

export default function FinanzasPage() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [sueldos, setSueldos] = useState<SueldoCalc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [ingresosMes, setIngresosMes] = useState(0);
  const [form, setForm] = useState({
    fecha: format(new Date(), "yyyy-MM-dd"),
    descripcion: "",
    monto: "",
    categoria: "otro",
    notas: "",
  });
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleIngresos, setDetalleIngresos] = useState<
    {
      numero: string;
      tipo: string;
      noches: number;
      precio: number;
      subtotal: number;
      es_grupo: boolean;
      es_single: boolean;
      precios?: number[];
    }[]
  >([]);

  useEffect(() => {
    fetchData();
  }, [mes, anio]);

  async function fetchData() {
    setLoading(true);
    try {
      const diasMes = getDaysInMonth(new Date(anio, mes));
      const fechaDesde = format(new Date(anio, mes, 1), "yyyy-MM-dd");
      const fechaHasta = format(new Date(anio, mes, diasMes), "yyyy-MM-dd");

      // Mes anterior para calcular horas (las horas de febrero se pagan en marzo)
      const mesAnterior = mes === 0 ? 11 : mes - 1;
      const anioAnterior = mes === 0 ? anio - 1 : anio;
      const diasMesAnterior = getDaysInMonth(new Date(anioAnterior, mesAnterior));

      const [gastosRaw, sueldosData, reservasRaw] = await Promise.all([
        authFetch(
          `${API}/gastos?mes=${mes + 1}&anio=${anio}&hotel_id=${HOTEL_ID}`,
        ).then((r) => r.json()),
        authFetch(`${API}/sueldos/historial?hotel_id=${HOTEL_ID}`).then((r) =>
          r.json(),
        ),
        authFetch(
          `${API}/reservas?hotel_id=${HOTEL_ID}&desde=${fechaDesde}&hasta=${fechaHasta}`,
        ).then((r) => r.json()),
      ]);

      const gastosData: Gasto[] = Array.isArray(gastosRaw)
        ? gastosRaw
        : (gastosRaw?.items ?? gastosRaw?.gastos ?? []);
      setGastos(gastosData);

      const reservas: any[] = Array.isArray(reservasRaw) ? reservasRaw : [];

      // ── Calcular ingresos ──────────────────────────────────────────────
      let totalIngresosMes = 0;
      const detalleTemp: Record<string, any> = {};

      const reservasConPrecio = reservas.filter(
        (r) => r.precio_total && r.status !== "cancelled",
      );
      const reservasSinPrecio = reservas.filter(
        (r) => !r.precio_total && r.status !== "cancelled",
      );

      for (const r of reservasConPrecio) {
        totalIngresosMes += parseFloat(r.precio_total);
        const key = `room_${r.room_id}`;
        if (!detalleTemp[key]) {
          detalleTemp[key] = {
            numero: r.room_number || r.room_id.toString(),
            tipo: r.room_type || "—",
            noches: 0,
            precio: 0,
            subtotal: 0,
            es_grupo: !!r.group_id,
            es_single: r.tipo_ocupacion === "single",
            tiene_precio_total: true,
          };
        }
        detalleTemp[key].subtotal += parseFloat(r.precio_total);
      }

      if (reservasSinPrecio.length > 0) {
        await Promise.all(
          Array.from({ length: diasMes }, async (_, i) => {
            const d = format(new Date(anio, mes, i + 1), "yyyy-MM-dd");
            const dispRes = await authFetch(
              `${API}/disponibilidad?fecha=${d}&hotel_id=${HOTEL_ID}`,
            ).then((r) => r.json());
            const ocupadas =
              dispRes.habitaciones?.filter(
                (h: any) => h.estado === "ocupada",
              ) || [];

            for (const hab of ocupadas) {
              const reserva = reservasSinPrecio.find(
                (r: any) => r.room_id === hab.room_id,
              );
              if (
                !reserva &&
                reservasConPrecio.find((r: any) => r.room_id === hab.room_id)
              )
                continue;

              const esGrupo = !!hab.grupo;
              const esSingle = hab.tipo_ocupacion === "single";
              const tipoConsulta = esSingle ? "single" : hab.tipo;

              const precioRes = await authFetch(
                `${API}/precios/consulta?fecha=${d}&tipo=${tipoConsulta}&hotel_id=${HOTEL_ID}`,
              ).then((r) => r.json());

              const precio = esGrupo
                ? precioRes.precio_grupo
                  ? parseFloat(precioRes.precio_grupo)
                  : precioRes.precio
                    ? parseFloat(precioRes.precio)
                    : 0
                : precioRes.precio
                  ? parseFloat(precioRes.precio)
                  : 0;

              if (precio > 0) {
                totalIngresosMes += precio;
                const key = hab.numero;
                if (!detalleTemp[key]) {
                  detalleTemp[key] = {
                    numero: hab.numero,
                    tipo: esSingle ? "single" : hab.tipo,
                    noches: 0,
                    precios: [] as number[],
                    precio: precio,
                    subtotal: 0,
                    es_grupo: esGrupo,
                    es_single: esSingle,
                    tiene_precio_total: false,
                  };
                }
                detalleTemp[key].noches += 1;
                detalleTemp[key].subtotal += precio;
                detalleTemp[key].precios?.push(precio);
                detalleTemp[key].precio = Math.round(
                  detalleTemp[key].subtotal / detalleTemp[key].noches,
                );
              }
            }
          }),
        );
      }

      setDetalleIngresos(
        Object.values(detalleTemp).sort(
          (a: any, b: any) => parseInt(a.numero) - parseInt(b.numero),
        ),
      );
      setIngresosMes(totalIngresosMes);

      // ── Calcular sueldos usando fichajes del MES ANTERIOR ─────────────
      const sueldosArray: any[] = Array.isArray(sueldosData)
        ? sueldosData
        : (sueldosData?.items ?? sueldosData?.sueldos ?? []);

      // Traer fichajes del mes anterior
      const fichajesMesAnteriorData = await Promise.all(
        Array.from({ length: diasMesAnterior }, (_, i) => {
          const d = format(new Date(anioAnterior, mesAnterior, i + 1), "yyyy-MM-dd");
          return authFetch(
            `${API}/fichajes?fecha=${d}&hotel_id=${HOTEL_ID}`,
          ).then((r) => r.json());
        }),
      );

      const fichajesFlat = fichajesMesAnteriorData.flat();

      // Calcular minutos por empleado distinguiendo fijos de temporales
      const minsTrabajadosPorEmpleado: Record<number, number> = {};
      const minsExtraPorEmpleado: Record<number, number> = {};

      fichajesFlat.forEach((f: any) => {
        if (!f.hora_entrada || !f.hora_salida) return;
        const [hE, mE] = f.hora_entrada.split(":").map(Number);
        const [hS, mS] = f.hora_salida.split(":").map(Number);
        const mins = ((hS * 60 + mS) - (hE * 60 + mE) + 24 * 60) % (24 * 60)
        if (mins <= 0) return;

        minsTrabajadosPorEmpleado[f.user_id] =
          (minsTrabajadosPorEmpleado[f.user_id] || 0) + mins;

        // Para empleados fijos: calcular solo los minutos que superan la carga horaria
        const sueldo = sueldosArray.find((s: any) => s.user_id === f.user_id);
        if (sueldo?.tipo_empleado === "fijo" && sueldo?.horas_diarias) {
          const minutosEsperados = sueldo.horas_diarias * 60;
          const extra = mins - minutosEsperados;
          if (extra > 0) {
            minsExtraPorEmpleado[f.user_id] =
              (minsExtraPorEmpleado[f.user_id] || 0) + extra;
          }
        }
      });

      // Buscar sueldo del mes actual para cada empleado
      const getSueldoDelMes = (userId: number) => {
        const sueldosEmpleado = sueldosArray.filter((s: any) => s.user_id === userId);
        return (
          sueldosEmpleado.find((s: any) => s.mes === mes + 1 && s.anio === anio) ||
          sueldosEmpleado
            .filter((s: any) => s.anio !== null)
            .sort(
              (a: any, b: any) =>
                (b.anio || 0) - (a.anio || 0) || (b.mes || 0) - (a.mes || 0),
            )[0] ||
          sueldosEmpleado[0]
        );
      };

      // Obtener usuarios únicos con sueldo activo
      const userIds = [...new Set(sueldosArray.filter((s: any) => s.activo).map((s: any) => s.user_id))];

      const calcSueldos: SueldoCalc[] = userIds.map((userId: any) => {
        const sueldo = getSueldoDelMes(userId);
        if (!sueldo) return null;

        let total = 0;
        let horasMostrar = 0;

        if (sueldo.tipo_empleado === "fijo") {
          // Fijo: sueldo fijo + horas extra del mes anterior
          const minsExtra = minsExtraPorEmpleado[userId] || 0;
          horasMostrar = Math.round((minsExtra / 60) * 10) / 10;
          total = sueldo.sueldo_fijo + minsExtra * (sueldo.sueldo_por_hora / 60);
        } else {
          // Temporal: todas las horas trabajadas del mes anterior
          const minsTrabajados = minsTrabajadosPorEmpleado[userId] || 0;
          horasMostrar = Math.round((minsTrabajados / 60) * 10) / 10;
          total = minsTrabajados * (sueldo.sueldo_por_hora / 60);
        }

        return {
          user_id: userId,
          name: sueldo.name,
          categoria: sueldo.categoria,
          sueldo_fijo: sueldo.sueldo_fijo || 0,
          sueldo_por_hora: sueldo.sueldo_por_hora || 0,
          horas_trabajadas: horasMostrar,
          total: Math.round(total),
          tipo_empleado: sueldo.tipo_empleado,
        };
      }).filter(Boolean) as SueldoCalc[];

      setSueldos(calcSueldos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardarGasto() {
    if (!form.descripcion || !form.monto || !form.fecha) {
      toast.error("Completá todos los campos obligatorios");
      return;
    }
    setGuardando(true);
    try {
      await authFetch(`${API}/gastos?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: form.fecha,
          descripcion: form.descripcion,
          monto: parseFloat(form.monto),
          categoria: form.categoria,
          notas: form.notas || null,
        }),
      });
      toast.success("Gasto cargado");
      setModalOpen(false);
      setForm({
        fecha: format(new Date(), "yyyy-MM-dd"),
        descripcion: "",
        monto: "",
        categoria: "otro",
        notas: "",
      });
      fetchData();
    } catch (e) {
      toast.error("Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminarGasto(id: number) {
    await authFetch(`${API}/gastos/${id}?hotel_id=${HOTEL_ID}`, {
      method: "DELETE",
    });
    toast.success("Gasto eliminado");
    fetchData();
  }

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
  const totalSueldos = sueldos.reduce((sum, s) => sum + s.total, 0);
  const totalEgresos = totalGastos + totalSueldos;
  const mesAnteriorNombre = MESES[mes === 0 ? 11 : mes - 1];

  const anios = Array.from({ length: 3 }, (_, i) => hoy.getFullYear() - 1 + i);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Finanzas</h2>
          <p className="text-muted-foreground">
            {MESES[mes]} {anio}
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={mes.toString()}
            onValueChange={(v) => setMes(parseInt(v))}
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
            value={anio.toString()}
            onValueChange={(v) => setAnio(parseInt(v))}
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
      </div>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card style={{ borderColor: "#22c55e" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos estimados
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetalleOpen(true)}
              >
                Ver detalle
              </Button>
              <TrendingUp className="size-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${ingresosMes.toLocaleString("es-AR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Basado en precios cargados
            </p>
          </CardContent>
        </Card>
        <Card style={{ borderColor: "#ef4444" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total gastos</CardTitle>
            <TrendingDown className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ${totalGastos.toLocaleString("es-AR")}
            </div>
          </CardContent>
        </Card>
        <Card style={{ borderColor: "#f59e0b" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total sueldos</CardTitle>
            <Users className="size-4" style={{ color: "#f59e0b" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#f59e0b" }}>
              ${totalSueldos.toLocaleString("es-AR")}
            </div>
          </CardContent>
        </Card>
        <Card style={{ borderColor: "#8b5cf6" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total egresos</CardTitle>
            <DollarSign className="size-4" style={{ color: "#8b5cf6" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#8b5cf6" }}>
              ${totalEgresos.toLocaleString("es-AR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gastos + Sueldos
            </p>
          </CardContent>
        </Card>
        {(() => {
          const neto = ingresosMes - totalEgresos;
          const positivo = neto >= 0;
          return (
            <Card style={{ borderColor: positivo ? "#22c55e" : "#ef4444" }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Resultado neto
                </CardTitle>
                {positivo ? (
                  <TrendingUp className="size-4 text-green-500" />
                ) : (
                  <TrendingDown className="size-4 text-destructive" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className="text-2xl font-bold"
                  style={{ color: positivo ? "#22c55e" : "#ef4444" }}
                >
                  {positivo ? "+" : ""}
                  {neto.toLocaleString("es-AR")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {positivo ? "Ganancia del mes" : "Pérdida del mes"}
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Gastos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Gastos del mes</CardTitle>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="gap-2"
          >
            <Plus className="size-4" />
            Agregar gasto
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : gastos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay gastos cargados este mes
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastos.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-sm">
                      {format(new Date(g.fecha + "T12:00:00"), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {g.descripcion}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {g.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-destructive">
                      ${Number(g.monto).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarGasto(g.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="font-bold text-right">
                    Total
                  </TableCell>
                  <TableCell className="font-bold text-destructive">
                    ${totalGastos.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sueldos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Sueldos del mes
            <span className="text-xs font-normal text-muted-foreground ml-2">
              (horas de {mesAnteriorNombre})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sueldos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay sueldos configurados. Cargalos en la sección Empleados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Sueldo fijo</TableHead>
                  <TableHead>Hs extra / trabajadas</TableHead>
                  <TableHead>$/hora</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sueldos.map((s) => (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      {s.categoria ? (
                        <Badge variant="outline" className="capitalize">
                          {s.categoria}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor:
                            s.tipo_empleado === "fijo" ? "#3b82f6" : "#f59e0b",
                          color: "#fff",
                        }}
                      >
                        {s.tipo_empleado === "fijo" ? "Fijo" : "Temporal"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.tipo_empleado === "fijo"
                        ? `$${s.sueldo_fijo.toLocaleString("es-AR")}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {s.horas_trabajadas > 0 ? `${s.horas_trabajadas}h` : "—"}
                    </TableCell>
                    <TableCell>
                      {s.sueldo_por_hora > 0
                        ? `$${s.sueldo_por_hora.toLocaleString("es-AR")}`
                        : "—"}
                    </TableCell>
                    <TableCell
                      className="font-bold"
                      style={{ color: "#f59e0b" }}
                    >
                      ${s.total.toLocaleString("es-AR")}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={6} className="font-bold text-right">
                    Total sueldos
                  </TableCell>
                  <TableCell className="font-bold" style={{ color: "#f59e0b" }}>
                    ${totalSueldos.toLocaleString("es-AR")}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal gasto */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar gasto</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fecha: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Descripción *</Label>
              <Input
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                placeholder="Ej: Reparación aire acondicionado"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Monto ($) *</Label>
                <Input
                  type="number"
                  value={form.monto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, monto: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Categoría</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, categoria: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_GASTO.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Notas</Label>
              <Input
                value={form.notas}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notas: e.target.value }))
                }
                placeholder="Opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarGasto} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar gasto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal detalle ingresos */}
      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Detalle de ingresos — {MESES[mes]} {anio}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hab.</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Noches</TableHead>
                  <TableHead>Precio/noche</TableHead>
                  <TableHead>Reserva</TableHead>
                  <TableHead>Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalleIngresos.map((d) => (
                  <TableRow key={d.numero}>
                    <TableCell className="font-bold">{d.numero}</TableCell>
                    <TableCell className="capitalize">{d.tipo}</TableCell>
                    <TableCell>{d.noches}</TableCell>
                    <TableCell>${d.precio.toLocaleString("es-AR")}</TableCell>
                    <TableCell>
                      {d.es_grupo ? (
                        <Badge
                          style={{
                            backgroundColor: "#facc15",
                            color: "#1a1a1a",
                          }}
                        >
                          Grupo
                        </Badge>
                      ) : d.es_single ? (
                        <Badge
                          style={{ backgroundColor: "#f59e0b", color: "#fff" }}
                        >
                          Single
                        </Badge>
                      ) : (
                        <Badge variant="outline">Individual</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ${d.subtotal.toLocaleString("es-AR")}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} className="font-bold text-right">
                    Total
                  </TableCell>
                  <TableCell className="font-bold text-green-600">
                    ${ingresosMes.toLocaleString("es-AR")}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
