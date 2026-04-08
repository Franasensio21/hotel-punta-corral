"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Package, ShoppingCart, Trash2, Pencil, Search, ChevronDown, ChevronUp } from "lucide-react";
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

const hoy = new Date();

export default function StockPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMov, setLoadingMov] = useState(false);

  // Filtros
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [cantidadFilter, setCantidadFilter] = useState("todos");

  // Mes/año movimientos
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  // Modales
  const [modalProducto, setModalProducto] = useState(false);
  const [modalCompra, setModalCompra] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Expandir categorías
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  // Forms
  const [formProducto, setFormProducto] = useState({ nombre: "", categoria: "desayuno", unidad: "unidad" });
  const [formCompra, setFormCompra] = useState({
    producto_id: "", cantidad: "", precio_unitario: "", fecha: format(new Date(), "yyyy-MM-dd"), notas: ""
  });

  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
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

  async function handleGuardarCompra() {
    if (!formCompra.producto_id || !formCompra.cantidad) {
      toast.error("Producto y cantidad son obligatorios");
      return;
    }
    setGuardando(true);
    try {
      const producto = productos.find(p => p.id === parseInt(formCompra.producto_id));
      await authFetch(`${API}/stock/movimientos?hotel_id=${HOTEL_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: parseInt(formCompra.producto_id),
          cantidad: parseFloat(formCompra.cantidad),
          precio_unitario: parseFloat(formCompra.precio_unitario) || 0,
          fecha: formCompra.fecha,
          notas: formCompra.notas || null,
          nombre_producto: producto?.nombre || "",
          unidad: producto?.unidad || "unidad",
        }),
      });
      toast.success("Compra registrada");
      setModalCompra(false);
      setFormCompra({ producto_id: "", cantidad: "", precio_unitario: "", fecha: format(new Date(), "yyyy-MM-dd"), notas: "" });
      fetchProductos();
      fetchMovimientos();
    } catch (e) { toast.error("Error al registrar") }
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

  // Filtrar productos
  const productosFiltrados = productos.filter(p => {
    if (categoriaFilter !== "todas" && p.categoria !== categoriaFilter) return false;
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (cantidadFilter === "sin_stock" && p.cantidad > 0) return false;
    if (cantidadFilter === "poco_stock" && p.cantidad > 5) return false;
    return true;
  });

  // Agrupar por categoría
  const porCategoria: Record<string, Producto[]> = {};
  productosFiltrados.forEach(p => {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
    porCategoria[p.categoria].push(p);
  });

  const totalGastosMes = movimientos.reduce((sum, m) => sum + Number(m.precio_total), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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
            setFormCompra({ producto_id: "", cantidad: "", precio_unitario: "", fecha: format(new Date(), "yyyy-MM-dd"), notas: "" });
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
                      <TableHead className="w-[100px]"></TableHead>
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
            <>
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
            </>
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
                  <SelectItem value="unidad">Unidad</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="litro">Litro</SelectItem>
                  <SelectItem value="caja">Caja</SelectItem>
                  <SelectItem value="paquete">Paquete</SelectItem>
                  <SelectItem value="rollo">Rollo</SelectItem>
                  <SelectItem value="bolsa">Bolsa</SelectItem>
                  <SelectItem value="docena">Docena</SelectItem>
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

      {/* Modal registrar compra */}
      <Dialog open={modalCompra} onOpenChange={setModalCompra}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar compra</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Producto *</Label>
              <Select value={formCompra.producto_id} onValueChange={v => setFormCompra(f => ({ ...f, producto_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccioná un producto..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(cat => {
                    const prods = productos.filter(p => p.categoria === cat && p.activo);
                    if (prods.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="px-2 py-1 text-xs text-muted-foreground capitalize font-semibold">{cat}</p>
                        {prods.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Cantidad *</Label>
                <Input type="number" placeholder="0" value={formCompra.cantidad}
                  onChange={e => setFormCompra(f => ({ ...f, cantidad: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Precio unitario ($)</Label>
                <Input type="number" placeholder="0" value={formCompra.precio_unitario}
                  onChange={e => setFormCompra(f => ({ ...f, precio_unitario: e.target.value }))} />
              </div>
            </div>
            {formCompra.cantidad && formCompra.precio_unitario && (
              <p className="text-sm font-semibold text-destructive">
                Total: ${(parseFloat(formCompra.cantidad) * parseFloat(formCompra.precio_unitario)).toLocaleString("es-AR")}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label>Fecha</Label>
              <Input type="date" value={formCompra.fecha}
                onChange={e => setFormCompra(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Notas</Label>
              <Input placeholder="Opcional..." value={formCompra.notas}
                onChange={e => setFormCompra(f => ({ ...f, notas: e.target.value }))} />
            </div>
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