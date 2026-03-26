"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  UserX,
  UserCheck,
  DollarSign,
  BarChart2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { format, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
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
const CATEGORIAS = [
  "Administrador",
  "Encargado",
  "Mucama",
  "Mozo",
  "Mantenimiento",
  "Sereno",
  "Lavanderia",
  "Desayuno",
  "Jardineria",
  "Jefe de cocina",
  "Ayudante de cocina",
  "Bachero",
  "otro",
];
const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "employee", label: "Empleado" },
];

interface Empleado {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  categoria: string | null;
  fecha_ingreso: string | null;
  active: boolean;
}

interface Sueldo {
  id: number;
  user_id: number;
  sueldo_fijo: number;
  sueldo_por_hora: number;
  tipo_empleado: string;
  horas_diarias: number | null;
  mes:             number | null;
  anio:            number | null;
}

const emptyForm = {
  name: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  role: "employee",
  categoria: "",
  fecha_ingreso: "",
};
const emptySueldo = {
  sueldo_fijo: "",
  sueldo_por_hora: "",
  tipo_empleado: "temporal",
  horas_diarias: "",
  mes: new Date().getMonth() + 1,
  anio: new Date().getFullYear(),
};

export default function EmpleadosPage() {
  const hoy = new Date();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sueldos, setSueldos] = useState<Sueldo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [sueldoOpen, setSueldoOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [empleadoSueldo, setEmpleadoSueldo] = useState<Empleado | null>(null);
  const [empleadoDashboard, setEmpleadoDashboard] = useState<Empleado | null>(
    null,
  );
  const [form, setForm] = useState(emptyForm);
  const [formSueldo, setFormSueldo] = useState(emptySueldo);
  const [guardando, setGuardando] = useState(false);

  // Dashboard state
  const [dashMes, setDashMes] = useState(hoy.getMonth());
  const [dashAnio, setDashAnio] = useState(hoy.getFullYear());
  const [dashLoading, setDashLoading] = useState(false);
  const [dashData, setDashData] = useState<{
    sueldo_fijo: number;
    horas_extra_mins: number;
    horas_trabajadas_mins: number;
    total_extra: number;
    total: number;
    tipo_empleado: string;
    sueldo_por_hora: number;
    horas_diarias: number | null;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [empData, sueldoData] = await Promise.all([
        authFetch(`${API}/usuarios?hotel_id=${HOTEL_ID}`).then((r) => r.json()),
        authFetch(`${API}/sueldos/historial?hotel_id=${HOTEL_ID}`).then(r => r.json()),
      ]);
      setEmpleados(empData);
      setSueldos(sueldoData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

async function calcularDashboard(emp: Empleado, mes: number, anio: number) {
  setDashLoading(true)
  setDashData(null)
  try {
    const sueldosEmpleado = sueldos.filter(s => s.user_id === emp.id)
    const sueldo = sueldosEmpleado.find(s => s.mes === (mes + 1) && s.anio === anio)
      || sueldosEmpleado
          .filter(s => s.anio !== null)
          .sort((a, b) => (b.anio || 0) - (a.anio || 0) || (b.mes || 0) - (a.mes || 0))[0]
      || sueldosEmpleado[0]

    if (!sueldo) { setDashLoading(false); return }

    // Fichajes del MES ANTERIOR
    const mesAnterior = mes === 0 ? 11 : mes - 1
    const anioAnterior = mes === 0 ? anio - 1 : anio
    const diasMesAnterior = getDaysInMonth(new Date(anioAnterior, mesAnterior))

    const fichajesData = await Promise.all(
      Array.from({ length: diasMesAnterior }, (_, i) => {
        const d = format(new Date(anioAnterior, mesAnterior, i + 1), "yyyy-MM-dd")
        return authFetch(`${API}/fichajes?fecha=${d}&hotel_id=${HOTEL_ID}`).then(r => r.json())
      })
    )

    const fichajes = fichajesData.flat().filter((f: any) => f.user_id === emp.id)

    let totalMinsTrabajados = 0
    let totalMinsExtra = 0

    fichajes.forEach((f: any) => {
      if (!f.hora_entrada || !f.hora_salida) return
      const [hE, mE] = f.hora_entrada.split(":").map(Number)
      const [hS, mS] = f.hora_salida.split(":").map(Number)
      const mins = (hS * 60 + mS) - (hE * 60 + mE)
      if (mins <= 0) return

      totalMinsTrabajados += mins

      if (sueldo.tipo_empleado === "fijo" && sueldo.horas_diarias) {
        const minutosEsperados = sueldo.horas_diarias * 60
        const extra = mins - minutosEsperados
        if (extra > 0) totalMinsExtra += extra
      }
    })

    const precioMinuto = sueldo.sueldo_por_hora / 60
    let totalExtra = 0
    let total = 0

    if (sueldo.tipo_empleado === "fijo") {
      totalExtra = totalMinsExtra * precioMinuto
      total = sueldo.sueldo_fijo + totalExtra
    } else {
      total = totalMinsTrabajados * precioMinuto
    }

    setDashData({
      sueldo_fijo:           sueldo.sueldo_fijo,
      horas_extra_mins:      totalMinsExtra,
      horas_trabajadas_mins: totalMinsTrabajados,
      total_extra:           Math.round(totalExtra),
      total:                 Math.round(total),
      tipo_empleado:         sueldo.tipo_empleado,
      sueldo_por_hora:       sueldo.sueldo_por_hora,
      horas_diarias:         sueldo.horas_diarias || null,
    })
  } catch (e) {
    console.error(e)
  } finally {
    setDashLoading(false)
  }
}

  function abrirDashboard(emp: Empleado) {
    setEmpleadoDashboard(emp);
    setDashboardOpen(true);
    calcularDashboard(emp, dashMes, dashAnio);
  }

  function abrirCrear() {
    setEditando(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function abrirEditar(emp: Empleado) {
    setEditando(emp);
    setForm({
      name: emp.name,
      email: emp.email,
      password: "",
      phone: emp.phone || "",
      role: emp.role,
      categoria: emp.categoria || "",
      fecha_ingreso: emp.fecha_ingreso ? emp.fecha_ingreso.slice(0, 10) : "",
      username: emp.email || "",
    });
    setModalOpen(true);
  }

  function abrirSueldo(emp: Empleado) {
    setEmpleadoSueldo(emp);
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();
    // Buscar sueldo del mes actual
    const s =
      sueldos.find(
        (s) =>
          s.user_id === emp.id && s.mes === mesActual && s.anio === anioActual,
      ) || sueldos.find((s) => s.user_id === emp.id);
    setFormSueldo({
      sueldo_fijo: s ? s.sueldo_fijo.toString() : "0",
      sueldo_por_hora: s ? s.sueldo_por_hora.toString() : "0",
      tipo_empleado: s ? s.tipo_empleado || "temporal" : "temporal",
      horas_diarias: s?.horas_diarias ? s.horas_diarias.toString() : "",
      mes: mesActual,
      anio: anioActual,
    });
    setSueldoOpen(true);
  }
  async function handleGuardar() {
    if (!form.name) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!editando && !form.password) {
      toast.error("La contraseña es obligatoria para nuevos empleados");
      return;
    }
    setGuardando(true);
    try {
      const body: any = {
        name: form.name,
        email: form.username,
        phone: form.phone || null,
        role: form.role,
        categoria: form.categoria || null,
        fecha_ingreso: form.fecha_ingreso || null,
      };
      if (form.password) body.password = form.password;

      if (editando) {
        await authFetch(`${API}/usuarios/${editando.id}?hotel_id=${HOTEL_ID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast.success("Empleado actualizado");
      } else {
        await authFetch(`${API}/usuarios?hotel_id=${HOTEL_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast.success("Empleado creado");
      }
      setModalOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggleActivo(emp: Empleado) {
    await authFetch(`${API}/usuarios/${emp.id}?hotel_id=${HOTEL_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !emp.active }),
    });
    toast.success(emp.active ? "Empleado desactivado" : "Empleado activado");
    fetchData();
  }

  async function handleGuardarSueldo() {
    if (!empleadoSueldo) return;
    setGuardando(true);
    try {
      await authFetch(`${API}/sueldos?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: empleadoSueldo.id,
          sueldo_fijo: parseFloat(formSueldo.sueldo_fijo) || 0,
          sueldo_por_hora: parseFloat(formSueldo.sueldo_por_hora) || 0,
          tipo_empleado: formSueldo.tipo_empleado,
          horas_diarias: formSueldo.horas_diarias
            ? parseFloat(formSueldo.horas_diarias)
            : null,
          mes: formSueldo.mes,
          anio: formSueldo.anio,
        }),
      });
      toast.success("Sueldo guardado");
      setSueldoOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Error al guardar sueldo");
    } finally {
      setGuardando(false);
    }
  }

  const campo = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const anios = Array.from({ length: 3 }, (_, i) => hoy.getFullYear() - 1 + i);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Empleados</h2>
          <p className="text-muted-foreground">
            Gestión del personal del hotel
          </p>
        </div>
        <Button onClick={abrirCrear} className="gap-2">
          <Plus className="size-4" />
          Nuevo empleado
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : empleados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                No hay empleados cargados todavía
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead>Sueldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleados.map((emp) => {
                  const mesActual = new Date().getMonth() + 1
                  const anioActual = new Date().getFullYear()
                  const sueldo = sueldos.find(s => s.user_id === emp.id && s.mes === mesActual && s.anio === anioActual)
                    || sueldos.filter(s => s.user_id === emp.id)
                    .sort((a, b) => (b.anio || 0) - (a.anio || 0) || (b.mes || 0) - (a.mes || 0))[0]
                  return (
                    <TableRow
                      key={emp.id}
                      style={{ opacity: emp.active ? 1 : 0.5 }}
                    >
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {emp.phone || "—"}
                      </TableCell>
                      <TableCell>
                        {emp.categoria ? (
                          <Badge variant="outline" className="capitalize">
                            {emp.categoria}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {sueldo ? (
                          <Badge
                            style={{
                              backgroundColor:
                                sueldo.tipo_empleado === "fijo"
                                  ? "#3b82f6"
                                  : "#f59e0b",
                              color: "#fff",
                            }}
                          >
                            {sueldo.tipo_empleado === "fijo"
                              ? "Fijo"
                              : "Temporal"}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {emp.fecha_ingreso
                          ? format(
                              new Date(emp.fecha_ingreso + "T12:00:00"),
                              "dd/MM/yyyy",
                              { locale: es },
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {sueldo ? (
                          <div className="flex flex-col">
                            {sueldo.tipo_empleado === "fijo" &&
                              sueldo.sueldo_fijo > 0 && (
                                <span>
                                  ${sueldo.sueldo_fijo.toLocaleString("es-AR")}{" "}
                                  fijo
                                </span>
                              )}
                            {sueldo.sueldo_por_hora > 0 && (
                              <span>
                                $
                                {sueldo.sueldo_por_hora.toLocaleString("es-AR")}
                                /hr extra
                              </span>
                            )}
                            {sueldo.tipo_empleado === "fijo" &&
                              sueldo.horas_diarias && (
                                <span className="text-muted-foreground">
                                  {sueldo.horas_diarias}hs/día
                                </span>
                              )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            backgroundColor: emp.active ? "#22c55e" : "#9ca3af",
                            color: "#fff",
                          }}
                        >
                          {emp.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEditar(emp)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirSueldo(emp)}
                          >
                            <DollarSign className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirDashboard(emp)}
                          >
                            <BarChart2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActivo(emp)}
                          >
                            {emp.active ? (
                              <UserX className="size-4 text-destructive" />
                            ) : (
                              <UserCheck className="size-4 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal crear/editar empleado */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar empleado" : "Nuevo empleado"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Nombre completo *</Label>
              <Input
                value={form.name}
                onChange={(e) => campo("name", e.target.value)}
                placeholder="Ej: María García"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Usuario (para login) *</Label>
              <Input
                value={form.username}
                onChange={(e) => campo("username", e.target.value)}
                placeholder="Ej: maria.garcia"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => campo("email", e.target.value)}
                placeholder="empleado@hotel.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>
                {editando ? "Nueva contraseña (opcional)" : "Contraseña *"}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => campo("password", e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={(e) => campo("phone", e.target.value)}
                placeholder="Ej: 2214567890"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Categoría</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => campo("categoria", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Rol del sistema</Label>
              <Select value={form.role} onValueChange={(v) => campo("role", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Fecha de ingreso</Label>
              <Input
                type="date"
                value={form.fecha_ingreso}
                onChange={(e) => campo("fecha_ingreso", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando
                ? "Guardando..."
                : editando
                  ? "Guardar cambios"
                  : "Crear empleado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal sueldo */}
      <Dialog open={sueldoOpen} onOpenChange={setSueldoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sueldo — {empleadoSueldo?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex gap-2">
              <div className="flex flex-col gap-2 flex-1">
                <Label>Mes</Label>
                <Select
                  value={formSueldo.mes.toString()}
                  onValueChange={(v) => {
                    const m = parseInt(v);
                    const s =
                      sueldos.find(
                        (s) =>
                          s.user_id === empleadoSueldo?.id &&
                          s.mes === m &&
                          s.anio === formSueldo.anio,
                      ) ||
                      sueldos.find(
                        (s) => s.user_id === empleadoSueldo?.id && !s.mes,
                      );
                    setFormSueldo((f) => ({
                      ...f,
                      mes: m,
                      sueldo_fijo: s ? s.sueldo_fijo.toString() : "0",
                      sueldo_por_hora: s ? s.sueldo_por_hora.toString() : "0",
                      tipo_empleado: s
                        ? s.tipo_empleado || "temporal"
                        : "temporal",
                      horas_diarias: s?.horas_diarias
                        ? s.horas_diarias.toString()
                        : "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Año</Label>
                <Select
                  value={formSueldo.anio.toString()}
                  onValueChange={(v) => {
                    const a = parseInt(v);
                    const s =
                      sueldos.find(
                        (s) =>
                          s.user_id === empleadoSueldo?.id &&
                          s.mes === formSueldo.mes &&
                          s.anio === a,
                      ) ||
                      sueldos.find(
                        (s) => s.user_id === empleadoSueldo?.id && !s.mes,
                      );
                    setFormSueldo((f) => ({
                      ...f,
                      anio: a,
                      sueldo_fijo: s ? s.sueldo_fijo.toString() : "0",
                      sueldo_por_hora: s ? s.sueldo_por_hora.toString() : "0",
                      tipo_empleado: s
                        ? s.tipo_empleado || "temporal"
                        : "temporal",
                      horas_diarias: s?.horas_diarias
                        ? s.horas_diarias.toString()
                        : "",
                    }));
                  }}
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
            <div className="flex flex-col gap-2">
              <Label>Tipo de empleado</Label>
              <Select
                value={formSueldo.tipo_empleado}
                onValueChange={(v) =>
                  setFormSueldo((f) => ({ ...f, tipo_empleado: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fijo">Fijo</SelectItem>
                  <SelectItem value="temporal">Temporal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formSueldo.tipo_empleado === "fijo" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Sueldo fijo mensual ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formSueldo.sueldo_fijo}
                    onChange={(e) =>
                      setFormSueldo((f) => ({
                        ...f,
                        sueldo_fijo: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Carga horaria diaria (horas)</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 8"
                    value={formSueldo.horas_diarias}
                    onChange={(e) =>
                      setFormSueldo((f) => ({
                        ...f,
                        horas_diarias: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Precio hora extra ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formSueldo.sueldo_por_hora}
                    onChange={(e) =>
                      setFormSueldo((f) => ({
                        ...f,
                        sueldo_por_hora: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}

            {formSueldo.tipo_empleado === "temporal" && (
              <div className="flex flex-col gap-2">
                <Label>Precio por hora ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formSueldo.sueldo_por_hora}
                  onChange={(e) =>
                    setFormSueldo((f) => ({
                      ...f,
                      sueldo_por_hora: e.target.value,
                    }))
                  }
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {formSueldo.tipo_empleado === "fijo"
                ? "Las horas que superen la carga horaria diaria se cobran como horas extra."
                : "Se cobra por cada minuto trabajado según los fichajes del mes."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSueldoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarSueldo} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar sueldo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal dashboard empleado */}
      <Dialog open={dashboardOpen} onOpenChange={setDashboardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resumen — {empleadoDashboard?.name}</DialogTitle>
          </DialogHeader>

          {/* Selector de mes */}
          <div className="flex gap-2">
            <Select
              value={dashMes.toString()}
              onValueChange={(v) => {
                const m = parseInt(v);
                setDashMes(m);
                if (empleadoDashboard)
                  calcularDashboard(empleadoDashboard, m, dashAnio);
              }}
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
              value={dashAnio.toString()}
              onValueChange={(v) => {
                const a = parseInt(v);
                setDashAnio(a);
                if (empleadoDashboard)
                  calcularDashboard(empleadoDashboard, dashMes, a);
              }}
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

          {dashLoading ? (
            <div className="flex flex-col gap-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !dashData ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay datos de sueldo configurados para este empleado.
            </p>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tipo</span>
                <Badge
                  style={{
                    backgroundColor:
                      dashData.tipo_empleado === "fijo" ? "#3b82f6" : "#f59e0b",
                    color: "#fff",
                  }}
                >
                  {dashData.tipo_empleado === "fijo" ? "Fijo" : "Temporal"}
                </Badge>
              </div>

              <Separator />

              {dashData.tipo_empleado === "fijo" ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sueldo fijo</span>
                    <span className="font-semibold">
                      ${dashData.sueldo_fijo.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Carga horaria diaria
                    </span>
                    <span className="font-semibold">
                      {dashData.horas_diarias}hs
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Horas extra acumuladas
                    </span>
                    <span className="font-semibold">
                      {formatMins(dashData.horas_extra_mins)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Precio hora extra
                    </span>
                    <span className="font-semibold">
                      ${dashData.sueldo_por_hora.toLocaleString("es-AR")}/hr
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total horas extra
                    </span>
                    <span className="font-semibold text-blue-600">
                      ${dashData.total_extra.toLocaleString("es-AR")}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total horas trabajadas
                    </span>
                    <span className="font-semibold">
                      {formatMins(dashData.horas_trabajadas_mins)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Precio por hora
                    </span>
                    <span className="font-semibold">
                      ${dashData.sueldo_por_hora.toLocaleString("es-AR")}/hr
                    </span>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex justify-between">
                <span className="font-bold">Sueldo total del mes</span>
                <span className="font-bold text-xl text-green-600">
                  ${dashData.total.toLocaleString("es-AR")}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDashboardOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
