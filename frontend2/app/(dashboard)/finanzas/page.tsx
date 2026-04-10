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
  UtensilsCrossed,
  Settings,
  ChevronDown,
  ChevronUp,
  Pencil,
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

const TODAS_CATEGORIAS_GASTO = [
  "mantenimiento",
  "limpieza",
  "servicios",
  "suministros",
  "personal",
  "otro",
  "desayuno",
  "cena",
  "obra",
];

const CATEGORIA_COLORES: Record<string, string> = {
  mantenimiento: "#3b82f6",
  limpieza: "#22c55e",
  servicios: "#06b6d4",
  suministros: "#8b5cf6",
  personal: "#f59e0b",
  otro: "#6b7280",
  desayuno: "#fb923c",
  cena: "#a855f7",
  obra: "#ef4444",
  sueldos: "#f97316",
};

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
  horas_extra_modalidad?: string;
}

function GraficoTorta({
  datos,
  titulo,
}: {
  datos: { label: string; valor: number; color: string }[];
  titulo: string;
}) {
  const total = datos.reduce((s, d) => s + d.valor, 0);
  if (total === 0)
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
        Sin datos
      </div>
    );
  let acumulado = 0;
  const segmentos = datos
    .filter((d) => d.valor > 0)
    .map((d) => {
      const inicio = acumulado;
      acumulado += d.valor / total;
      return { ...d, inicio, fin: acumulado };
    });
  function segmentoPath(
    inicio: number,
    fin: number,
    r = 80,
    cx = 100,
    cy = 100,
  ) {
    const startAngle = inicio * 2 * Math.PI - Math.PI / 2;
    const endAngle = fin * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = fin - inicio > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-center">{titulo}</p>
      <div className="flex gap-4 items-center justify-center flex-wrap">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {segmentos.map((s, i) => (
            <path
              key={i}
              d={segmentoPath(s.inicio, s.fin)}
              fill={s.color}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}
        </svg>
        <div className="flex flex-col gap-1.5">
          {segmentos.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div
                className="size-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="capitalize">{s.label}</span>
              <span className="text-muted-foreground ml-auto pl-4">
                {Math.round((s.valor / total) * 100)}% · $
                {s.valor.toLocaleString("es-AR")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
  const [ingresosCenas, setIngresosCenas] = useState(0);
  const [detalleIngresos, setDetalleIngresos] = useState<any[]>([]);
  const [detalleOpen, setDetalleOpen] = useState(false);

  const [gastoEditando, setGastoEditando] = useState<Gasto | null>(null);
  const [modalEditarGasto, setModalEditarGasto] = useState(false);
  const [formEditar, setFormEditar] = useState({
    fecha: "",
    descripcion: "",
    monto: "",
    categoria: "otro",
    notas: "",
  });

  const [modalConfig, setModalConfig] = useState(false);
  const [categoriasReservas, setCategoriasReservas] = useState<string[]>([]);
  const [categoriasCenas, setCategoriasCenas] = useState<string[]>([]);
  const [empleadosReservas, setEmpleadosReservas] = useState<number[]>([]);
  const [empleadosCenas, setEmpleadosCenas] = useState<number[]>([]);

  const [expandGastos, setExpandGastos] = useState(true);
  const [expandSueldos, setExpandSueldos] = useState(true);
  const [expandDetalleReservas, setExpandDetalleReservas] = useState(false);
  const [expandDetalleCenas, setExpandDetalleCenas] = useState(false);

  const [form, setForm] = useState({
    fecha: format(new Date(), "yyyy-MM-dd"),
    descripcion: "",
    monto: "",
    categoria: "otro",
    notas: "",
  });

  useEffect(() => {
    fetchData();
  }, [mes, anio]);

  // Cargar config guardada al montar
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await authFetch(
          `${API}/finanzas/config?hotel_id=${HOTEL_ID}`,
        ).then((r) => r.json());
        if (config) {
          setCategoriasReservas(config.categorias_reservas || []);
          setCategoriasCenas(config.categorias_cenas || []);
          setEmpleadosReservas(config.empleados_reservas || []);
          setEmpleadosCenas(config.empleados_cenas || []);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadConfig();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const diasMes = getDaysInMonth(new Date(anio, mes));
      const fechaDesde = format(new Date(anio, mes, 1), "yyyy-MM-dd");
      const fechaHasta = format(new Date(anio, mes, diasMes), "yyyy-MM-dd");
      const mesAnterior = mes === 0 ? 11 : mes - 1;
      const anioAnterior = mes === 0 ? anio - 1 : anio;
      const diasMesAnterior = getDaysInMonth(
        new Date(anioAnterior, mesAnterior),
      );

      const [gastosRaw, sueldosData, reservasRaw, cenasRaw] = await Promise.all(
        [
          authFetch(
            `${API}/gastos?mes=${mes + 1}&anio=${anio}&hotel_id=${HOTEL_ID}`,
          ).then((r) => r.json()),
          authFetch(`${API}/sueldos/historial?hotel_id=${HOTEL_ID}`).then((r) =>
            r.json(),
          ),
          authFetch(
            `${API}/reservas?hotel_id=${HOTEL_ID}&desde=${fechaDesde}&hasta=${fechaHasta}`,
          ).then((r) => r.json()),
          authFetch(
            `${API}/cenas?hotel_id=${HOTEL_ID}&mes=${mes + 1}&anio=${anio}`,
          ).then((r) => r.json()),
        ],
      );

      const gastosData: Gasto[] = Array.isArray(gastosRaw)
        ? gastosRaw
        : (gastosRaw?.items ?? gastosRaw?.gastos ?? []);
      setGastos(gastosData);

      const cenasData = Array.isArray(cenasRaw) ? cenasRaw : [];
      setIngresosCenas(
        cenasData.reduce((sum: number, c: any) => sum + Number(c.total), 0),
      );

      const reservas: any[] = Array.isArray(reservasRaw) ? reservasRaw : [];
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
        const key = r.room_number || r.room_id.toString();
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
            canal: r.channel_name || "directo",
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
              // Saltear solo si hay una reserva CON precio que cubre este día específico
              const tieneReservaConPrecioEseDia = reservasConPrecio.find(
                (r: any) =>
                  r.room_id === hab.room_id &&
                  r.check_in <= d &&
                  r.check_out > d,
              );
              if (tieneReservaConPrecioEseDia) continue;
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
                    precios: [],
                    precio,
                    subtotal: 0,
                    es_grupo: esGrupo,
                    es_single: esSingle,
                    tiene_precio_total: false,
                    canal: esGrupo ? "grupo" : hab.origen || "directo",
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

      const sueldosArray: any[] = Array.isArray(sueldosData)
        ? sueldosData
        : (sueldosData?.items ?? sueldosData?.sueldos ?? []);
      const fichajesMesAnteriorData = await Promise.all(
        Array.from({ length: diasMesAnterior }, (_, i) => {
          const d = format(
            new Date(anioAnterior, mesAnterior, i + 1),
            "yyyy-MM-dd",
          );
          return authFetch(
            `${API}/fichajes?fecha=${d}&hotel_id=${HOTEL_ID}`,
          ).then((r) => r.json());
        }),
      );

      const fichajesFlat = fichajesMesAnteriorData.flat();
      const minsTrabajadosPorEmpleado: Record<number, number> = {};
      const minsExtraPorEmpleado: Record<number, number> = {};
      const fichajesPorDia: Record<string, number> = {};

      fichajesFlat.forEach((f: any) => {
        if (!f.hora_entrada || !f.hora_salida) return;
        const [hE, mE] = f.hora_entrada.split(":").map(Number);
        const [hS, mS] = f.hora_salida.split(":").map(Number);
        const mins = (hS * 60 + mS - (hE * 60 + mE) + 24 * 60) % (24 * 60);
        if (mins <= 0) return;
        const key = `${f.user_id}_${f.fecha}`;
        fichajesPorDia[key] = (fichajesPorDia[key] || 0) + mins;
      });

      Object.entries(fichajesPorDia).forEach(([key, minsTotalesDia]) => {
        const userId = parseInt(key.split("_")[0]);
        minsTrabajadosPorEmpleado[userId] =
          (minsTrabajadosPorEmpleado[userId] || 0) + minsTotalesDia;
        const sueldo = sueldosArray.find((s: any) => s.user_id === userId);
        if (sueldo?.tipo_empleado === "fijo" && sueldo?.horas_diarias) {
          const extra = minsTotalesDia - sueldo.horas_diarias * 60;
          if (extra > 0)
            minsExtraPorEmpleado[userId] =
              (minsExtraPorEmpleado[userId] || 0) + extra;
        }
      });

      const getSueldoDelMes = (userId: number) => {
        const arr = sueldosArray.filter((s: any) => s.user_id === userId);
        return (
          arr.find((s: any) => s.mes === mes + 1 && s.anio === anio) ||
          arr
            .filter((s: any) => s.anio !== null)
            .sort(
              (a: any, b: any) =>
                (b.anio || 0) - (a.anio || 0) || (b.mes || 0) - (a.mes || 0),
            )[0] ||
          arr[0]
        );
      };

      const userIds = [
        ...new Set(
          sueldosArray.filter((s: any) => s.activo).map((s: any) => s.user_id),
        ),
      ];
      const calcSueldos: SueldoCalc[] = userIds
        .map((userId: any) => {
          const sueldo = getSueldoDelMes(userId);
          if (!sueldo) return null;
          let total = 0,
            horasMostrar = 0;
          if (sueldo.tipo_empleado === "fijo") {
            const minsExtra = minsExtraPorEmpleado[userId] || 0;
            horasMostrar = Math.round((minsExtra / 60) * 10) / 10;
            total =
              sueldo.horas_extra_modalidad === "acumular"
                ? sueldo.sueldo_fijo
                : sueldo.sueldo_fijo +
                  minsExtra * (sueldo.sueldo_por_hora / 60);
          } else {
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
            horas_extra_modalidad: sueldo.horas_extra_modalidad,
          };
        })
        .filter(Boolean) as SueldoCalc[];

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

  async function handleEditarGasto() {
    if (!gastoEditando) return;
    setGuardando(true);
    try {
      await authFetch(
        `${API}/gastos/${gastoEditando.id}?hotel_id=${HOTEL_ID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fecha: formEditar.fecha,
            descripcion: formEditar.descripcion,
            monto: parseFloat(formEditar.monto),
            categoria: formEditar.categoria,
            notas: formEditar.notas || null,
          }),
        },
      );
      toast.success("Gasto actualizado");
      setModalEditarGasto(false);
      fetchData();
    } catch (e) {
      toast.error("Error al actualizar");
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

  async function handleGuardarConfig() {
    try {
      await authFetch(`${API}/finanzas/config?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorias_reservas: categoriasReservas,
          categorias_cenas: categoriasCenas,
          empleados_reservas: empleadosReservas,
          empleados_cenas: empleadosCenas,
        }),
      });
      toast.success("Configuración guardada");
      setModalConfig(false);
    } catch (e) {
      toast.error("Error al guardar configuración");
    }
  }

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
  const totalSueldos = sueldos.reduce((sum, s) => sum + s.total, 0);
  const totalEgresos = totalGastos + totalSueldos;
  const totalIngresosBrutos = ingresosMes + ingresosCenas;
  const resultadoNeto = totalIngresosBrutos - totalEgresos;
  const mesAnteriorNombre = MESES[mes === 0 ? 11 : mes - 1];
  const anios = Array.from({ length: 3 }, (_, i) => hoy.getFullYear() - 1 + i);

  const gastosPorCategoria: Record<string, number> = {};
  gastos.forEach((g) => {
    gastosPorCategoria[g.categoria] =
      (gastosPorCategoria[g.categoria] || 0) + Number(g.monto);
  });
  gastosPorCategoria["sueldos"] = totalSueldos;

  const datosGraficoEgresos = Object.entries(gastosPorCategoria)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      label: k,
      valor: v,
      color: CATEGORIA_COLORES[k] || "#94a3b8",
    }));

  function normalizarCanal(canal: string, esGrupo: boolean): string {
    if (esGrupo) return "grupo";
    const c = (canal || "").toLowerCase();
    if (c.includes("booking")) return "booking";
    if (c.includes("gmail") || c.includes("email")) return "gmail";
    if (c.includes("group")) return "grupo";
    if (c.includes("direct") || c.includes("directa")) return "reserva directa";
    return "otro";
  }

  const ingresosPorCanal: Record<string, number> = { cenas: ingresosCenas };
  detalleIngresos.forEach((d: any) => {
    const canal = normalizarCanal(d.canal || "", d.es_grupo);
    ingresosPorCanal[canal] = (ingresosPorCanal[canal] || 0) + d.subtotal;
  });
  const CANAL_COLORES: Record<string, string> = {
    cenas: "#a855f7",
    grupo: "#facc15",
    booking: "#3b82f6",
    gmail: "#22c55e",
    "reserva directa": "#f59e0b",
    otro: "#6b7280",
  };
  const datosGraficoIngresos = Object.entries(ingresosPorCanal)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      label: k,
      valor: v,
      color: CANAL_COLORES[k] || "#94a3b8",
    }));

  const gastosDeReservas = gastos.filter((g) =>
    categoriasReservas.includes(g.categoria),
  );
  const sueldosDeReservas = sueldos.filter((s) =>
    empleadosReservas.includes(s.user_id),
  );
  const totalEgresosReservas =
    gastosDeReservas.reduce((s, g) => s + Number(g.monto), 0) +
    sueldosDeReservas.reduce((s, su) => s + su.total, 0);
  const resultadoReservas = ingresosMes - totalEgresosReservas;

  const gastosDeaCenas = gastos.filter((g) =>
    categoriasCenas.includes(g.categoria),
  );
  const sueldosDeCenas = sueldos.filter((s) =>
    empleadosCenas.includes(s.user_id),
  );
  const totalEgresosCenas =
    gastosDeaCenas.reduce((s, g) => s + Number(g.monto), 0) +
    sueldosDeCenas.reduce((s, su) => s + su.total, 0);
  const resultadoCenas = ingresosCenas - totalEgresosCenas;

  function toggleCategoria(cat: string, tipo: "reservas" | "cenas") {
    if (tipo === "reservas")
      setCategoriasReservas((prev) =>
        prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
      );
    else
      setCategoriasCenas((prev) =>
        prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
      );
  }
  function toggleEmpleado(id: number, tipo: "reservas" | "cenas") {
    if (tipo === "reservas")
      setEmpleadosReservas((prev) =>
        prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
      );
    else
      setEmpleadosCenas((prev) =>
        prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
      );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalConfig(true)}
            className="gap-2"
          >
            <Settings className="size-4" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Totales generales */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card style={{ borderColor: "#22c55e" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos totales
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
              ${totalIngresosBrutos.toLocaleString("es-AR")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Reservas: ${ingresosMes.toLocaleString("es-AR")} · Cenas: $
              {ingresosCenas.toLocaleString("es-AR")}
            </div>
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
          const positivo = resultadoNeto >= 0;
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
                  {resultadoNeto.toLocaleString("es-AR")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {positivo ? "Ganancia del mes" : "Pérdida del mes"}
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <GraficoTorta
              titulo="Ingresos por origen"
              datos={datosGraficoIngresos}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <GraficoTorta
              titulo="Egresos por categoría"
              datos={datosGraficoEgresos}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sección Reservas */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setExpandDetalleReservas((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="size-4" />
              Sección Reservas
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Ingresos: </span>
                <span className="font-semibold text-green-600">
                  ${ingresosMes.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Egresos: </span>
                <span className="font-semibold text-destructive">
                  ${totalEgresosReservas.toLocaleString("es-AR")}
                </span>
              </div>
              <div
                className="text-sm font-bold"
                style={{
                  color: resultadoReservas >= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                Neto: {resultadoReservas >= 0 ? "+" : ""}
                {resultadoReservas.toLocaleString("es-AR")}
              </div>
              {expandDetalleReservas ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </div>
          </div>
        </CardHeader>
        {expandDetalleReservas && (
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold mb-2 text-green-600">
                  Ingresos por habitación
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hab.</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalleIngresos.map((d: any) => (
                      <TableRow key={d.numero}>
                        <TableCell className="font-bold">{d.numero}</TableCell>
                        <TableCell className="capitalize text-xs">
                          {d.tipo}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          ${d.subtotal.toLocaleString("es-AR")}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold text-right">
                        Total
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        ${ingresosMes.toLocaleString("es-AR")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2 text-destructive">
                  Egresos asignados
                </p>
                {gastosDeReservas.length === 0 &&
                sueldosDeReservas.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">
                    Configurá categorías y empleados de reservas con el botón
                    Configurar
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Cat.</TableHead>
                        <TableHead>Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gastosDeReservas.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="text-xs">
                            {g.descripcion}
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor:
                                  CATEGORIA_COLORES[g.categoria] || "#6b7280",
                                color: "#fff",
                              }}
                              className="text-xs capitalize"
                            >
                              {g.categoria}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-destructive font-semibold">
                            ${Number(g.monto).toLocaleString("es-AR")}
                          </TableCell>
                        </TableRow>
                      ))}
                      {sueldosDeReservas.map((s) => (
                        <TableRow key={s.user_id}>
                          <TableCell className="text-xs">{s.name}</TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: "#f97316",
                                color: "#fff",
                              }}
                              className="text-xs"
                            >
                              sueldo
                            </Badge>
                          </TableCell>
                          <TableCell className="text-destructive font-semibold">
                            ${s.total.toLocaleString("es-AR")}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="font-bold text-right">
                          Total egresos
                        </TableCell>
                        <TableCell className="font-bold text-destructive">
                          ${totalEgresosReservas.toLocaleString("es-AR")}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Sección Cenas */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setExpandDetalleCenas((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UtensilsCrossed
                className="size-4"
                style={{ color: "#a855f7" }}
              />
              Sección Cenas
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Ingresos: </span>
                <span className="font-semibold" style={{ color: "#a855f7" }}>
                  ${ingresosCenas.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Egresos: </span>
                <span className="font-semibold text-destructive">
                  ${totalEgresosCenas.toLocaleString("es-AR")}
                </span>
              </div>
              <div
                className="text-sm font-bold"
                style={{ color: resultadoCenas >= 0 ? "#22c55e" : "#ef4444" }}
              >
                Neto: {resultadoCenas >= 0 ? "+" : ""}
                {resultadoCenas.toLocaleString("es-AR")}
              </div>
              {expandDetalleCenas ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </div>
          </div>
        </CardHeader>
        {expandDetalleCenas && (
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p
                  className="text-sm font-semibold mb-2"
                  style={{ color: "#a855f7" }}
                >
                  Ingresos por cenas
                </p>
                {ingresosCenas === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">
                    No hay cenas registradas este mes
                  </p>
                ) : (
                  <div
                    className="p-3 rounded-lg border"
                    style={{ borderColor: "#a855f7" }}
                  >
                    <p
                      className="text-2xl font-bold"
                      style={{ color: "#a855f7" }}
                    >
                      ${ingresosCenas.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total cenas del mes
                    </p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold mb-2 text-destructive">
                  Egresos asignados
                </p>
                {gastosDeaCenas.length === 0 && sueldosDeCenas.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">
                    Configurá categorías y empleados de cenas con el botón
                    Configurar
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Cat.</TableHead>
                        <TableHead>Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gastosDeaCenas.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="text-xs">
                            {g.descripcion}
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor:
                                  CATEGORIA_COLORES[g.categoria] || "#6b7280",
                                color: "#fff",
                              }}
                              className="text-xs capitalize"
                            >
                              {g.categoria}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-destructive font-semibold">
                            ${Number(g.monto).toLocaleString("es-AR")}
                          </TableCell>
                        </TableRow>
                      ))}
                      {sueldosDeCenas.map((s) => (
                        <TableRow key={s.user_id}>
                          <TableCell className="text-xs">{s.name}</TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: "#f97316",
                                color: "#fff",
                              }}
                              className="text-xs"
                            >
                              sueldo
                            </Badge>
                          </TableCell>
                          <TableCell className="text-destructive font-semibold">
                            ${s.total.toLocaleString("es-AR")}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="font-bold text-right">
                          Total egresos
                        </TableCell>
                        <TableCell className="font-bold text-destructive">
                          ${totalEgresosCenas.toLocaleString("es-AR")}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Gastos */}
      <Card>
        <CardHeader
          className="flex flex-row items-center justify-between cursor-pointer"
          onClick={() => setExpandGastos((v) => !v)}
        >
          <CardTitle className="text-base">Gastos del mes</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="size-4" />
              Agregar gasto
            </Button>
            {expandGastos ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </div>
        </CardHeader>
        {expandGastos && (
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
                    <TableHead className="w-[80px]"></TableHead>
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
                        <Badge
                          style={{
                            backgroundColor:
                              CATEGORIA_COLORES[g.categoria] || "#6b7280",
                            color: "#fff",
                          }}
                          className="capitalize"
                        >
                          {g.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-destructive">
                        ${Number(g.monto).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setGastoEditando(g);
                              setFormEditar({
                                fecha: g.fecha,
                                descripcion: g.descripcion,
                                monto: g.monto.toString(),
                                categoria: g.categoria,
                                notas: g.notas || "",
                              });
                              setModalEditarGasto(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminarGasto(g.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
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
        )}
      </Card>

      {/* Sueldos */}
      <Card>
        <CardHeader
          className="flex flex-row items-center justify-between cursor-pointer"
          onClick={() => setExpandSueldos((v) => !v)}
        >
          <CardTitle className="text-base">
            Sueldos del mes
            <span className="text-xs font-normal text-muted-foreground ml-2">
              (horas de {mesAnteriorNombre})
            </span>
          </CardTitle>
          {expandSueldos ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </CardHeader>
        {expandSueldos && (
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : sueldos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay sueldos configurados.
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
                              s.tipo_empleado === "fijo"
                                ? "#3b82f6"
                                : "#f59e0b",
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
                        {s.horas_trabajadas > 0
                          ? `${Math.floor(s.horas_trabajadas)}h ${Math.round((s.horas_trabajadas % 1) * 60)}m`
                          : "—"}
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
                    <TableCell
                      className="font-bold"
                      style={{ color: "#f59e0b" }}
                    >
                      ${totalSueldos.toLocaleString("es-AR")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        )}
      </Card>

      {/* Modal agregar gasto */}
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
                    {TODAS_CATEGORIAS_GASTO.map((c) => (
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

      {/* Modal editar gasto */}
      <Dialog open={modalEditarGasto} onOpenChange={setModalEditarGasto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar gasto</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={formEditar.fecha}
                onChange={(e) =>
                  setFormEditar((f) => ({ ...f, fecha: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Descripción *</Label>
              <Input
                value={formEditar.descripcion}
                onChange={(e) =>
                  setFormEditar((f) => ({ ...f, descripcion: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Monto ($) *</Label>
                <Input
                  type="number"
                  value={formEditar.monto}
                  onChange={(e) =>
                    setFormEditar((f) => ({ ...f, monto: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Categoría</Label>
                <Select
                  value={formEditar.categoria}
                  onValueChange={(v) =>
                    setFormEditar((f) => ({ ...f, categoria: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TODAS_CATEGORIAS_GASTO.map((c) => (
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
                value={formEditar.notas}
                onChange={(e) =>
                  setFormEditar((f) => ({ ...f, notas: e.target.value }))
                }
                placeholder="Opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalEditarGasto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditarGasto} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
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
                {detalleIngresos.map((d: any) => (
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
                {ingresosCenas > 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="font-medium"
                      style={{ color: "#a855f7" }}
                    >
                      Cenas de grupos
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{ backgroundColor: "#a855f7", color: "#fff" }}
                      >
                        Cenas
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="font-semibold"
                      style={{ color: "#a855f7" }}
                    >
                      ${ingresosCenas.toLocaleString("es-AR")}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell colSpan={5} className="font-bold text-right">
                    Total
                  </TableCell>
                  <TableCell className="font-bold text-green-600">
                    ${totalIngresosBrutos.toLocaleString("es-AR")}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal configurar secciones */}
      <Dialog open={modalConfig} onOpenChange={setModalConfig}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Configurar secciones</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 flex flex-col gap-6 py-2">
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="size-4" />
                Sección Reservas — Categorías de gastos
              </h3>
              <div className="flex flex-wrap gap-2">
                {TODAS_CATEGORIAS_GASTO.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCategoria(c, "reservas")}
                    className={`px-3 py-1 rounded-full text-xs border capitalize transition-colors ${categoriasReservas.includes(c) ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-muted"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <h3 className="font-semibold">Empleados de reservas</h3>
              <div className="flex flex-wrap gap-2">
                {sueldos.map((s) => (
                  <button
                    key={s.user_id}
                    onClick={() => toggleEmpleado(s.user_id, "reservas")}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${empleadosReservas.includes(s.user_id) ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-muted"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <Separator />
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold flex items-center gap-2">
                <UtensilsCrossed
                  className="size-4"
                  style={{ color: "#a855f7" }}
                />
                Sección Cenas — Categorías de gastos
              </h3>
              <div className="flex flex-wrap gap-2">
                {TODAS_CATEGORIAS_GASTO.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCategoria(c, "cenas")}
                    className={`px-3 py-1 rounded-full text-xs border capitalize transition-colors ${categoriasCenas.includes(c) ? "bg-violet-600 text-white border-violet-600" : "border-gray-300 hover:bg-muted"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <h3 className="font-semibold">Empleados de cenas</h3>
              <div className="flex flex-wrap gap-2">
                {sueldos.map((s) => (
                  <button
                    key={s.user_id}
                    onClick={() => toggleEmpleado(s.user_id, "cenas")}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${empleadosCenas.includes(s.user_id) ? "bg-violet-600 text-white border-violet-600" : "border-gray-300 hover:bg-muted"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConfig(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarConfig}>Guardar y cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
