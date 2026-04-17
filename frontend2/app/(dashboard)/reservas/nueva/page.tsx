"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ArrowRight, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Cliente, HabitacionDisponible } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authFetch, getUser } from "@/lib/auth";

const API =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1";
const HOTEL_ID = (typeof window !== "undefined" ? getUser()?.hotel_id : null) ?? 1;

const TIPO_LABELS: Record<string, string> = {
  double: "Doble",
  triple: "Triple",
  quad: "Cuádruple",
  quintuple: "Quíntuple",
};

const CANALES = [
  { id: 1, nombre: "Booking.com" },
  { id: 2, nombre: "Directo" },
  { id: 3, nombre: "Email" },
  { id: 4, nombre: "Grupo" },
  { id: 5, nombre: "Estudiantil" },
  { id: 6, nombre: "Expedia" },
];

export default function NuevaReservaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [habitaciones, setHabitaciones] = useState<HabitacionDisponible[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedCanalId, setSelectedCanalId] = useState<string>("2");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [notas, setNotas] = useState("");
  const [tipoOcupacion, setTipoOcupacion] = useState<Record<string, string>>(
    {},
  );
  const [precioTotal, setPrecioTotal] = useState<string>("");
  const [sena, setSena] = useState<string>("");

  // Nuevo cliente
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [modoNuevoCliente, setModoNuevoCliente] = useState(false);

  // Cargar clientes al montar
  useEffect(() => {
    authFetch(`${API}/clientes?hotel_id=${HOTEL_ID}`)
      .then((r) => r.json())
      .then((data) => {
        const mapped = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: c.id,
          nombre: c.name.split(" ")[0] || c.name,
          apellido: c.name.split(" ").slice(1).join(" ") || "",
          dni: "",
          telefono: c.phone || undefined,
          email: c.email || undefined,
          origen: "nacional" as any,
          created_at: c.created_at,
          updated_at: c.created_at,
        }));
        setClientes(mapped);
      })
      .catch(console.error);
  }, []);

  // Cargar habitaciones disponibles cuando cambian fechas
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      setLoadingRooms(true);
      setSelectedRoomIds([]);
      const check_in = format(dateRange.from, "yyyy-MM-dd");
      const check_out = format(dateRange.to, "yyyy-MM-dd");
      fetch(
        `${API}/disponibilidad/rango?check_in=${check_in}&check_out=${check_out}&hotel_id=${HOTEL_ID}`,
      )
        .then((r) => r.json())
        .then((data) => {
          const rooms = (data.habitaciones || []).map((h: any) => ({
            id: h.id,
            numero: h.numero,
            tipo: h.tipo,
            capacidad: h.capacidad,
            disponible: true,
            subtipo: null,
            origen: null,
            huesped: null,
            grupo: null,
            piso: 0,
            genero: "mixto",
            precio_por_noche: 0,
            estado: "libre",
            created_at: "",
            updated_at: "",
          }));
          setHabitaciones(rooms);
        })
        .catch(console.error)
        .finally(() => setLoadingRooms(false));
    }
  }, [dateRange]);

  const noches =
    dateRange.from && dateRange.to
      ? differenceInDays(dateRange.to, dateRange.from)
      : 0;
  const selectedRooms = habitaciones.filter((h) =>
    selectedRoomIds.includes(h.id.toString()),
  );
  const canSubmit =
    (selectedClientId || nuevoNombre.trim()) &&
    selectedRoomIds.length > 0 &&
    dateRange.from &&
    dateRange.to &&
    noches > 0;

  const toggleRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId],
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Completá todos los campos obligatorios");
      return;
    }

    setLoading(true);
    try {
      let clienteId = parseInt(selectedClientId);

      if (modoNuevoCliente && nuevoNombre.trim()) {
        const res = await authFetch(`${API}/clientes?hotel_id=${HOTEL_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nuevoNombre.trim(),
            email: nuevoEmail || null,
            phone: null,
            precio_total: precioTotal ? parseFloat(precioTotal) : null,
            sena: sena ? parseFloat(sena) : null,
          }),
        });
        const nuevoCliente = await res.json();
        clienteId = nuevoCliente.id;
      }

      const resultados = await Promise.all(
        selectedRoomIds.map((roomId) => {
          const tipo = tipoOcupacion[roomId] || "individual";
          return authFetch(`${API}/reservar?hotel_id=${HOTEL_ID}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room_id: parseInt(roomId),
              guest_id: clienteId || null,
              channel_id: parseInt(selectedCanalId),
              check_in: format(dateRange.from!, "yyyy-MM-dd"),
              check_out: format(dateRange.to!, "yyyy-MM-dd"),
              notes: notas || null,
              tipo_ocupacion: tipo,
            }),
          });
        }),
      );

      const errores = resultados.filter((r) => !r.ok);
      if (errores.length > 0) {
        const err = await errores[0]
          .json()
          .catch(() => ({ detail: "Error al crear la reserva" }));
        throw new Error(err.detail);
      }

      toast.success(
        `${selectedRoomIds.length} reserva${selectedRoomIds.length > 1 ? "s" : ""} creada${selectedRoomIds.length > 1 ? "s" : ""} correctamente`,
      );
      router.push("/reservas");
    } catch (e: any) {
      toast.error(e.message || "Error al crear la reserva");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nueva reserva</h2>
        <p className="text-muted-foreground">
          Completá los datos para registrar una reserva
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Cliente</CardTitle>
              <CardDescription>
                Seleccioná un cliente existente o registrá uno nuevo
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Button
                  variant={!modoNuevoCliente ? "default" : "outline"}
                  size="sm"
                  onClick={() => setModoNuevoCliente(false)}
                >
                  Cliente existente
                </Button>
                <Button
                  variant={modoNuevoCliente ? "default" : "outline"}
                  size="sm"
                  onClick={() => setModoNuevoCliente(true)}
                >
                  Nuevo cliente
                </Button>
              </div>

              {!modoNuevoCliente ? (
                <Select
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Buscá un cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.nombre} {c.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Label>Nombre completo *</Label>
                    <Input
                      placeholder="Ej: Ana García"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Email o teléfono</Label>
                    <Input
                      placeholder="Ej: ana@email.com"
                      value={nuevoEmail}
                      onChange={(e) => setNuevoEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Fechas</CardTitle>
              <CardDescription>
                Elegí las fechas de entrada y salida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {dateRange.from
                        ? format(dateRange.from, "dd/MM/yyyy")
                        : "Check-in"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) =>
                        setDateRange((prev) => ({ ...prev, from: date }))
                      }
                      disabled={undefined}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <ArrowRight className="size-4 text-muted-foreground" />

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {dateRange.to
                        ? format(dateRange.to, "dd/MM/yyyy")
                        : "Check-out"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) =>
                        setDateRange((prev) => ({ ...prev, to: date }))
                      }
                      disabled={(date) =>
                        !dateRange.from || date <= dateRange.from
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {noches > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {noches} noche{noches > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Habitaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Habitaciones</CardTitle>
              <CardDescription>
                {dateRange.from && dateRange.to
                  ? `Podés seleccionar varias — ${selectedRoomIds.length} seleccionada${selectedRoomIds.length !== 1 ? "s" : ""}`
                  : "Primero elegí las fechas"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!dateRange.from || !dateRange.to ? (
                <div className="flex items-center justify-center py-8 border rounded-lg border-dashed">
                  <p className="text-sm text-muted-foreground">
                    Seleccioná las fechas para ver disponibilidad
                  </p>
                </div>
              ) : loadingRooms ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : habitaciones.length === 0 ? (
                <div className="flex items-center justify-center py-8 border rounded-lg border-dashed">
                  <p className="text-sm text-muted-foreground">
                    No hay habitaciones disponibles para esas fechas
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {habitaciones.map((h) => {
                      const isSelected = selectedRoomIds.includes(
                        h.id.toString(),
                      );
                      return (
                        <button
                          key={h.id}
                          onClick={() => toggleRoom(h.id.toString())}
                          style={{
                            backgroundColor: isSelected ? "#1d4ed8" : "#f0fdf4",
                            border: `2px solid ${isSelected ? "#1d4ed8" : "#22c55e"}`,
                            color: isSelected ? "#fff" : "#166534",
                            borderRadius: "10px",
                            padding: "10px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "2px",
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{ fontSize: "16px", fontWeight: "900" }}>
                            {h.numero}
                          </span>
                          <span style={{ fontSize: "10px", fontWeight: "600" }}>
                            {TIPO_LABELS[h.tipo] || h.tipo}
                          </span>
                          <span style={{ fontSize: "10px" }}>
                            {h.capacidad} pers.
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedRooms
                    .filter((h) => h.tipo === "double")
                    .map((h) => (
                      <div key={h.id} className="flex flex-col gap-2">
                        <Label>Habitación {h.numero} — Tipo de ocupación</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={
                              (tipoOcupacion[h.id.toString()] ||
                                "individual") === "individual"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setTipoOcupacion((prev) => ({
                                ...prev,
                                [h.id.toString()]: "individual",
                              }))
                            }
                          >
                            Doble (2 personas)
                          </Button>
                          <Button
                            variant={
                              tipoOcupacion[h.id.toString()] === "single"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setTipoOcupacion((prev) => ({
                                ...prev,
                                [h.id.toString()]: "single",
                              }))
                            }
                          >
                            Single (1 persona)
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Canal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">4. Canal de reserva</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedCanalId}
                onValueChange={setSelectedCanalId}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANALES.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          {/* Precio y seña */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                5. Precio y seña{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  (opcional)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Precio total ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={precioTotal}
                    onChange={(e) => setPrecioTotal(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Seña ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={sena}
                    onChange={(e) => setSena(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                6. Notas{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  (opcional)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Pedidos especiales, llegada tarde, etc."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium text-right">
                    {modoNuevoCliente
                      ? nuevoNombre || "—"
                      : clientes.find(
                            (c) => c.id.toString() === selectedClientId,
                          )
                        ? `${clientes.find((c) => c.id.toString() === selectedClientId)!.nombre} ${clientes.find((c) => c.id.toString() === selectedClientId)!.apellido}`
                        : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Habitaciones:</span>
                  {selectedRooms.length === 0 ? (
                    <span className="font-medium">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedRooms.map((h) => (
                        <Badge key={h.id} variant="outline" className="text-xs">
                          {h.numero} {TIPO_LABELS[h.tipo] || h.tipo}
                          <button
                            onClick={() => toggleRoom(h.id.toString())}
                            className="ml-1"
                          >
                            <X className="size-2" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-in:</span>
                  <span className="font-medium">
                    {dateRange.from
                      ? format(dateRange.from, "dd/MM/yyyy")
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-out:</span>
                  <span className="font-medium">
                    {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Noches:</span>
                  <span className="font-medium">{noches || "—"}</span>
                </div>
              </div>

              <Separator />

              <Button
                size="lg"
                className="w-full"
                disabled={!canSubmit || loading}
                onClick={handleSubmit}
              >
                {loading
                  ? "Guardando..."
                  : `Confirmar ${selectedRoomIds.length > 1 ? selectedRoomIds.length + " reservas" : "reserva"}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
