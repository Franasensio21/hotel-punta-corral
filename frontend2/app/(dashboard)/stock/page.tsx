"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Package, ShoppingCart, Trash2, Pencil, Search, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { authFetch, getUser } from "@/lib/auth";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1";
const HOTEL_ID = (typeof window !== "undefined" ? getUser()?.hotel_id : null) ?? 1;

const CATEGORIAS_BASE = ["desayuno", "cena", "limpieza", "mantenimiento", "servicios"];
const CATEGORIAS = typeof window !== "undefined" && ((getUser()?.hotel_id ?? 1) === 1)
  ? [...CATEGORIAS_BASE, "obra"]
  : CATEGORIAS_BASE;

const CATEGORIA_COLORES: Record<string, string> = {
  desayuno: "#f59e0b",
  cena: "#8b5cf6",
  limpieza: "#22c55e",
  mantenimiento: "#3b82f6",
  servicios: "#06b6d4",
  obra: "#ef4444",
};

const UNIDADES = ["unidad", "kg", "litro", "caja", "paquete", "rollo", "bolsa", "docena"];

interface Producto {
  id: number;
  hotel_id: number;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  activo: boolean;
}

interface Movimiento {
  id: number;
  producto_id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  tipo: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  fecha: string;
  notas: string | null;
}

interface ItemCompra {
  producto_id: string;
  nombre_producto: string;
  unidad: string;
  cantidad: string;
  precio_unitario: string;
  es_nuevo: boolean;
  categoria_nuevo: string;
  unidad_nuevo: string;
}

const itemCompraVacio = (): ItemCompra => ({
  producto_id: "", nombre_producto: "", unidad: "unidad",
  cantidad: "", precio_unitario: "", es_nuevo: false,
  categoria_nuevo: "desayuno", unidad_nuevo: "unidad",
});

const hoy = new Date();
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function StockPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMov, setLoadingMov] = useState(false);

  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [cantidadFilter, setCantidadFilter] = useState("todos");

  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  const [modalProducto, setModalProducto] = useState(false);
  const [modalCompra, setModalCompra] = useState(false);
  const [modalCompraRapida, setModalCompraRapida] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [productoRapido, setProductoRapido] = useState<Producto | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  const [formProducto, setFormProducto] = useState({ nombre: "", categoria: "desayuno", unidad: "unidad" });

  // Compra masiva con búsqueda predictiva
  const [fechaCompra, setFechaCompra] = useState(format(new Date(), "yyyy-MM-dd"));
  const [itemsCompra, setItemsCompra] = useState<ItemCompra[]>([itemCompraVacio()]);
  const [busquedasItems, setBusquedasItems] = useState<string[]>([""]);
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState<boolean[]>([false]);

  // Compra rápida
  const [compraRapida, setCompraRapida] = useState({ cantidad: "", precio_unitario: "" });

  const anios = Array.from({ length: 3 }, (_, i) => hoy.getFullYear() - 1 + i);

  useEffect(() => { fetchProductos() }, []);
  useEffect(() => { fetchMovimientos() }, [mes, anio]);

  async function fetchProductos() {
    setLoading(true);
    try {
      const data = await authFetch(`${API}/stock/productos?hotel_id=${HOTEL_ID}`).then(r => r.json());
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function fetchMovimientos() {
    setLoadingMov(true);
    try {
      const data = await authFetch(`${API}/stock/movimientos?hotel_id=${HOTEL_ID}&mes=${mes}&anio=${anio}`).then(r => r.json());
      setMovimientos(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e) }
    finally { setLoadingMov(false) }
  }

  // ── Búsqueda predictiva ─────────────────────────────────
  function getSugerencias(busq: string): Producto[] {
    if (!busq.trim()) return productos.filter(p => p.activo).slice(0, 8);
    return productos.filter(p =>
      p.activo && p.nombre.toLowerCase().includes(busq.toLowerCase())
    ).slice(0, 8);
  }

  function seleccionarProducto(idx: number, producto: Producto) {
    setItemsCompra(prev => prev.map((item, i) => i === idx ? {
      ...item,
      producto_id: producto.id.toString(),
      nombre_producto: producto.nombre,
      unidad: producto.unidad,
      es_nuevo: false,
    } : item));
    setBusquedasItems(prev => prev.map((b, i) => i === idx ? producto.nombre : b));
    setSugerenciasAbiertas(prev => prev.map((s, i) => i === idx ? false : s));
  }

  function marcarComoNuevo(idx: number, nombre: string) {
    setItemsCompra(prev => prev.map((item, i) => i === idx ? {
      ...item,
      producto_id: "",
      nombre_producto: nombre,
      es_nuevo: true,
    } : item));
    setSugerenciasAbiertas(prev => prev.map((s, i) => i === idx ? false : s));
  }

  function agregarItem() {
    setItemsCompra(prev => [...prev, itemCompraVacio()]);
    setBusquedasItems(prev => [...prev, ""]);
    setSugerenciasAbiertas(prev => [...prev, false]);
  }

  function eliminarItem(idx: number) {
    setItemsCompra(prev => prev.filter((_, i) => i !== idx));
    setBusquedasItems(prev => prev.filter((_, i) => i !== idx));
    setSugerenciasAbiertas(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ItemCompra, value: string) {
    setItemsCompra(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  // ── Guardar compra masiva ───────────────────────────────
  async function handleGuardarCompra() {
    const validos = itemsCompra.filter(item =>
      (item.producto_id || item.es_nuevo) && item.cantidad
    );
    if (validos.length === 0) { toast.error("Cargá al menos un producto con cantidad"); return; }

    setGuardando(true);
    try {
      for (const item of validos) {
        let productoId = item.producto_id;

        // Si es nuevo, crearlo primero
        if (item.es_nuevo) {
          const res = await authFetch(`${API}/stock/productos?hotel_id=${HOTEL_ID}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombre: item.nombre_producto,
              categoria: item.categoria_nuevo,
              unidad: item.unidad_nuevo,
            }),
          }).then(r => r.json());
          productoId = res.id.toString();
        }

        await authFetch(`${API}/stock/movimientos?hotel_id=${HOTEL_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producto_id: parseInt(productoId),
            cantidad: parseFloat(item.cantidad),
            precio_unitario: parseFloat(item.precio_unitario) || 0,
            fecha: fechaCompra,
            nombre_producto: item.nombre_producto,
            unidad: item.unidad,
          }),
        });
      }

      toast.success(`${validos.length} producto${validos.length > 1 ? "s" : ""} registrado${validos.length > 1 ? "s" : ""}`);
      setModalCompra(false);
      setItemsCompra([itemCompraVacio()]);
      setBusquedasItems([""]);
      setSugerenciasAbiertas([false]);
      fetchProductos();
      fetchMovimientos();
    } catch (e) {
      toast.error("Error al registrar compra");
    } finally {
      setGuardando(false);
    }
  }

  // ── Compra rápida ───────────────────────────────────────
  async function handleCompraRapida() {
    if (!productoRapido || !compraRapida.cantidad) { toast.error("Completá la cantidad"); return; }
    setGuardando(true);
    try {
      await authFetch(`${API}/stock/movimientos?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: productoRapido.id,
          cantidad: parseFloat(compraRapida.cantidad),
          precio_unitario: parseFloat(compraRapida.precio_unitario) || 0,
          fecha: format(new Date(), "yyyy-MM-dd"),
          nombre_producto: productoRapido.nombre,
          unidad: productoRapido.unidad,
        }),
      });
      toast.success("Stock actualizado");
      setModalCompraRapida(false);
      setCompraRapida({ cantidad: "", precio_unitario: "" });
      fetchProductos();
      fetchMovimientos();
    } catch (e) {
      toast.error("Error al registrar");
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardarProducto() {
    if (!formProducto.nombre) { toast.error("El nombre es obligatorio"); return; }
    setGuardando(true);
    try {
      if (productoEditando) {
        await authFetch(`${API}/stock/productos/${productoEditando.id}?hotel_id=${HOTEL_ID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formProducto),
        });
        toast.success("Producto actualizado");
      } else {
        await authFetch(`${API}/stock/productos?hotel_id=${HOTEL_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formProducto),
        });
        toast.success("Producto creado");
      }
      setModalProducto(false);
      fetchProductos();
    } catch (e) { toast.error("Error al guardar") }
    finally { setGuardando(false) }
  }

  async function handleEliminarMovimiento(id: number) {
    await authFetch(`${API}/stock/movimientos/${id}?hotel_id=${HOTEL_ID}`, { method: "DELETE" });
    toast.success("Movimiento eliminado");
    fetchProductos();
    fetchMovimientos();
  }

  async function handleDesactivarProducto(p: Producto) {
    await authFetch(`${API}/stock/productos/${p.id}?hotel_id=${HOTEL_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !p.activo }),
    });
    toast.success(p.activo ? "Producto desactivado" : "Producto activado");
    fetchProductos();
  }

  const productosFiltrados = productos.filter(p => {
    if (categoriaFilter !== "todas" && p.categoria !== categoriaFilter) return false;
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (cantidadFilter === "sin_stock" && p.cantidad > 0) return false;
    if (cantidadFilter === "poco_stock" && p.cantidad > 5) return false;
    return true;
  });

  const porCategoria: Record<string, Producto[]> = {};
  productosFiltrados.forEach(p => {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
    porCategoria[p.categoria].push(p);
  });

  const totalGastosMes = movimientos.reduce((sum, m) => sum + Number(m.precio_total), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stock</h2>
          <p className="text-muted-foreground">Control de inventario del hotel</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            setProductoEditando(null);
            setFormProducto({ nombre: "", categoria: "desayuno", unidad: "unidad" });
            setModalProducto(true);
          }} className="gap-2">
            <Package className="size-4" />
            Nuevo producto
          </Button>
          <Button onClick={() => {
            setItemsCompra([itemCompraVacio()]);
            setBusquedasItems([""]);
            setSugerenciasAbiertas([false]);
            setFechaCompra(format(new Date(), "yyyy-MM-dd"));
            setModalCompra(true);
          }} className="gap-2">
            <ShoppingCart className="size-4" />
            Registrar compra
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {CATEGORIAS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cantidadFilter} onValueChange={setCantidadFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sin_stock">Sin stock</SelectItem>
                <SelectItem value="poco_stock">Poco stock (≤5)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stock por categoría */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : Object.keys(porCategoria).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay productos cargados todavía
          </CardContent>
        </Card>
      ) : (
        Object.entries(porCategoria).map(([cat, prods]) => (
          <Card key={cat}>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandidas(prev => ({ ...prev, [cat]: !prev[cat] }))}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full" style={{ backgroundColor: CATEGORIA_COLORES[cat] || "#6b7280" }} />
                  <CardTitle className="text-base capitalize">{cat}</CardTitle>
                  <Badge variant="outline">{prods.length} productos</Badge>
                </div>
                {expandidas[cat] ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </div>
            </CardHeader>
            {expandidas[cat] && (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Stock actual</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prods.map(p => (
                      <TableRow key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{p.unidad}</TableCell>
                        <TableCell>
                          <Badge style={{
                            backgroundColor: p.cantidad <= 0 ? "#ef4444" : p.cantidad <= 5 ? "#f59e0b" : "#22c55e",
                            color: "#fff"
                          }}>
                            {p.cantidad} {p.unidad}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {/* Compra rápida */}
                            <Button variant="ghost" size="sm" title="Agregar stock rápido" onClick={() => {
                              setProductoRapido(p);
                              setCompraRapida({ cantidad: "", precio_unitario: "" });
                              setModalCompraRapida(true);
                            }}>
                              <Plus className="size-4 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setProductoEditando(p);
                              setFormProducto({ nombre: p.nombre, categoria: p.categoria, unidad: p.unidad });
                              setModalProducto(true);
                            }}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDesactivarProducto(p)}>
                              <Trash2 className={`size-4 ${p.activo ? "text-destructive" : "text-green-500"}`} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))
      )}

      {/* Movimientos del mes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Compras del mes</CardTitle>
            <div className="flex gap-2 items-center">
              <Select value={mes.toString()} onValueChange={v => setMes(parseInt(v))}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={anio.toString()} onValueChange={v => setAnio(parseInt(v))}>
                <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {anios.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMov ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : movimientos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay compras registradas este mes</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio unit.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">
                      {format(new Date(m.fecha + "T12:00:00"), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{m.nombre}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: CATEGORIA_COLORES[m.categoria] || "#6b7280", color: "#fff" }} className="capitalize">
                        {m.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.cantidad} {m.unidad}</TableCell>
                    <TableCell>${Number(m.precio_unitario).toLocaleString("es-AR")}</TableCell>
                    <TableCell className="font-semibold text-destructive">
                      ${Number(m.precio_total).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEliminarMovimiento(m.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} className="font-bold text-right">Total gastos del mes</TableCell>
                  <TableCell className="font-bold text-destructive">${totalGastosMes.toLocaleString("es-AR")}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal nuevo/editar producto */}
      <Dialog open={modalProducto} onOpenChange={setModalProducto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{productoEditando ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Nombre *</Label>
              <Input value={formProducto.nombre} onChange={e => setFormProducto(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Leche entera" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Categoría</Label>
              <Select value={formProducto.categoria} onValueChange={v => setFormProducto(f => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Unidad de medida</Label>
              <Select value={formProducto.unidad} onValueChange={v => setFormProducto(f => ({ ...f, unidad: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map(u => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalProducto(false)}>Cancelar</Button>
            <Button onClick={handleGuardarProducto} disabled={guardando}>
              {guardando ? "Guardando..." : productoEditando ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal compra rápida */}
      <Dialog open={modalCompraRapida} onOpenChange={setModalCompraRapida}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar stock — {productoRapido?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Cantidad *</Label>
                <Input type="number" placeholder="0" value={compraRapida.cantidad}
                  onChange={e => setCompraRapida(f => ({ ...f, cantidad: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Precio unitario ($)</Label>
                <Input type="number" placeholder="0" value={compraRapida.precio_unitario}
                  onChange={e => setCompraRapida(f => ({ ...f, precio_unitario: e.target.value }))} />
              </div>
            </div>
            {compraRapida.cantidad && compraRapida.precio_unitario && (
              <p className="text-sm font-semibold text-destructive">
                Total: ${(parseFloat(compraRapida.cantidad) * parseFloat(compraRapida.precio_unitario)).toLocaleString("es-AR")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCompraRapida(false)}>Cancelar</Button>
            <Button onClick={handleCompraRapida} disabled={guardando}>
              {guardando ? "Guardando..." : "Agregar stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal compra masiva con búsqueda predictiva */}
      <Dialog open={modalCompra} onOpenChange={setModalCompra}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Registrar compra</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2 overflow-y-auto flex-1">
            <div className="flex flex-col gap-2">
              <Label>Fecha de compra</Label>
              <Input type="date" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} className="w-[200px]" />
            </div>

            <Separator />

            {itemsCompra.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-3 p-3 border rounded-lg relative">
                {itemsCompra.length > 1 && (
                  <Button variant="ghost" size="sm" className="absolute top-2 right-2"
                    onClick={() => eliminarItem(idx)}>
                    <X className="size-4 text-destructive" />
                  </Button>
                )}
                <p className="text-xs font-medium text-muted-foreground">Producto {idx + 1}</p>

                {/* Búsqueda predictiva */}
                <div className="flex flex-col gap-1 relative">
                  <Label className="text-xs">Nombre del producto *</Label>
                  <Input
                    value={busquedasItems[idx]}
                    onChange={e => {
                      const val = e.target.value;
                      setBusquedasItems(prev => prev.map((b, i) => i === idx ? val : b));
                      setSugerenciasAbiertas(prev => prev.map((s, i) => i === idx ? true : s));
                      updateItem(idx, "nombre_producto", val);
                      updateItem(idx, "producto_id", "");
                      updateItem(idx, "es_nuevo", "");
                    }}
                    onFocus={() => setSugerenciasAbiertas(prev => prev.map((s, i) => i === idx ? true : s))}
                    placeholder="Escribí para buscar o crear..."
                  />
                  {sugerenciasAbiertas[idx] && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-background border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {getSugerencias(busquedasItems[idx]).map(p => (
                        <div key={p.id}
                          className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center justify-between text-sm"
                          onMouseDown={() => seleccionarProducto(idx, p)}>
                          <span>{p.nombre}</span>
                          <Badge className="text-xs capitalize" style={{ backgroundColor: CATEGORIA_COLORES[p.categoria] || "#6b7280", color: "#fff" }}>
                            {p.categoria}
                          </Badge>
                        </div>
                      ))}
                      {busquedasItems[idx].trim() && !productos.find(p => p.nombre.toLowerCase() === busquedasItems[idx].toLowerCase()) && (
                        <div
                          className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm border-t"
                          onMouseDown={() => marcarComoNuevo(idx, busquedasItems[idx])}>
                          <Plus className="size-3 text-green-500" />
                          <span>Crear "<strong>{busquedasItems[idx]}</strong>"</span>
                        </div>
                      )}
                    </div>
                  )}
                  {item.producto_id && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="size-3" /> Producto existente
                    </p>
                  )}
                  {item.es_nuevo && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <Plus className="size-3" /> Se creará como producto nuevo
                    </p>
                  )}
                </div>

                {/* Si es nuevo, mostrar categoría y unidad */}
                {item.es_nuevo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Categoría</Label>
                      <Select value={item.categoria_nuevo} onValueChange={v => updateItem(idx, "categoria_nuevo", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Unidad</Label>
                      <Select value={item.unidad_nuevo} onValueChange={v => updateItem(idx, "unidad_nuevo", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UNIDADES.map(u => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Cantidad *</Label>
                    <Input type="number" placeholder="0" value={item.cantidad}
                      onChange={e => updateItem(idx, "cantidad", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Precio unitario ($)</Label>
                    <Input type="number" placeholder="0" value={item.precio_unitario}
                      onChange={e => updateItem(idx, "precio_unitario", e.target.value)} />
                  </div>
                </div>
                {item.cantidad && item.precio_unitario && (
                  <p className="text-xs text-destructive font-semibold">
                    Subtotal: ${(parseFloat(item.cantidad) * parseFloat(item.precio_unitario)).toLocaleString("es-AR")}
                  </p>
                )}
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={agregarItem} className="gap-2">
              <Plus className="size-3" />
              Agregar otro producto
            </Button>

            {/* Total */}
            {itemsCompra.some(i => i.cantidad && i.precio_unitario) && (
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-semibold">Total compra:</span>
                <span className="font-bold text-destructive text-lg">
                  ${itemsCompra.reduce((sum, i) => {
                    const c = parseFloat(i.cantidad) || 0;
                    const p = parseFloat(i.precio_unitario) || 0;
                    return sum + c * p;
                  }, 0).toLocaleString("es-AR")}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCompra(false)}>Cancelar</Button>
            <Button onClick={handleGuardarCompra} disabled={guardando}>
              {guardando ? "Registrando..." : "Registrar compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}