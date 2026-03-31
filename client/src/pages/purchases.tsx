import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Supplier, Purchase, Category } from "@shared/schema";
import { Plus, Trash2, Package, Eye, Search, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { getBuyUnitOptions as libGetBuyUnitOptions, toNativeQty, toNativePrice, toDisplayPrice, formatQtyDisplay, stockBadge, qtyInputStep } from "@/lib/units";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("uz-UZ", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  buyUnit: string;
  productUnit: string;
  boxQuantity: number;
  stockPieces: number;
}

export default function Purchases() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [itemQty, setItemQty] = useState("1");
  const [itemCost, setItemCost] = useState("");
  const [itemBuyUnit, setItemBuyUnit] = useState("dona");
  const [itemBoxQty, setItemBoxQty] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const { toast } = useToast();

  const { data: purchases, isLoading } = useQuery<Purchase[]>({ queryKey: ["/api/purchases"] });
  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const { data: purchaseDetail } = useQuery<any>({
    queryKey: ["/api/purchases", selectedId],
    enabled: !!selectedId,
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/purchases", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kirim muvaffaqiyatli yaratildi" });
      setCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSupplierId("");
    setPaidAmount("");
    setNotes("");
    setCart([]);
    setProductSearch("");
    setItemQty("1");
    setItemCost("");
    setItemBuyUnit("dona");
    setItemBoxQty("");
    setSelectedProductId("");
  };

  const filteredProducts = products?.filter((p) =>
    p.active &&
    (productSearch === "" || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const getBuyUnitOptions = (product: Product) => libGetBuyUnitOptions(product);
  const calcStockPieces = (qty: number, buyUnit: string, productUnit: string, boxQty: number) =>
    toNativeQty(qty, buyUnit, productUnit, boxQty);

  const selectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    const defaultUnit = getBuyUnitOptions(product)[0];
    const bq = product.boxQuantity || 1;
    const displayCost = toDisplayPrice(Number(product.costPrice), defaultUnit, product.unit, bq);
    setItemCost(String(displayCost));
    setItemBuyUnit(defaultUnit);
    setItemBoxQty(String(bq));
    setProductSearch("");
    setProductPickerOpen(false);
  };

  const addToCart = () => {
    if (!selectedProductId) {
      toast({ title: "Mahsulot tanlang", variant: "destructive" });
      return;
    }
    const qty = parseFloat(itemQty);
    const cost = parseFloat(itemCost);
    if (!qty || qty <= 0 || isNaN(qty)) {
      toast({ title: "Miqdor noto'g'ri", variant: "destructive" });
      return;
    }
    if (!cost || cost <= 0) {
      toast({ title: "Tan narxi noto'g'ri", variant: "destructive" });
      return;
    }
    if (itemBuyUnit === "quti" && (!itemBoxQty || parseInt(itemBoxQty) < 1)) {
      toast({ title: "Qutidagi sonni kiriting", variant: "destructive" });
      return;
    }
    const product = products?.find((p) => p.id === selectedProductId);
    if (!product) return;

    const boxQty = itemBuyUnit === "quti" ? (parseInt(itemBoxQty) || product.boxQuantity || 1) : (product.boxQuantity || 1);
    const stockPieces = calcStockPieces(qty, itemBuyUnit, product.unit, boxQty);

    const existing = cart.findIndex((c) => c.productId === selectedProductId && c.buyUnit === itemBuyUnit);
    if (existing >= 0) {
      const updated = [...cart];
      const newQty = updated[existing].quantity + qty;
      updated[existing].quantity = newQty;
      updated[existing].costPrice = cost;
      updated[existing].boxQuantity = boxQty;
      updated[existing].stockPieces = calcStockPieces(newQty, itemBuyUnit, product.unit, boxQty);
      setCart(updated);
    } else {
      setCart([...cart, {
        productId: selectedProductId,
        productName: product.name,
        quantity: qty,
        costPrice: cost,
        buyUnit: itemBuyUnit,
        productUnit: product.unit,
        boxQuantity: boxQty,
        stockPieces,
      }]);
    }
    setSelectedProductId("");
    setItemQty("1");
    setItemCost("");
    setItemBoxQty("");
    setItemBuyUnit("dona");
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
  const cartTotalPieces = cart.reduce((sum, item) => sum + item.stockPieces, 0);

  const handleSubmit = () => {
    if (cart.length === 0) {
      toast({ title: "Kamida 1 ta mahsulot qo'shing", variant: "destructive" });
      return;
    }
    mutation.mutate({
      supplierId: supplierId || null,
      items: cart.map((c) => ({
        productId: c.productId,
        quantity: c.stockPieces,
        costPrice: toNativePrice(c.costPrice, c.buyUnit, c.productUnit, c.boxQuantity),
        displayQuantity: c.quantity,
        displayUnit: c.buyUnit,
        boxQuantity: c.boxQuantity,
      })),
      paidAmount: parseFloat(paidAmount) || 0,
      notes: notes || null,
    });
  };

  const viewDetail = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const getSupplierName = (id: string | null) => {
    if (!id) return "—";
    return suppliers?.find((s) => s.id === id)?.name || "—";
  };

  const selectedProduct = products?.find((p) => p.id === selectedProductId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 h-full overflow-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Kirim (Xaridlar)</h1>
          <p className="text-muted-foreground">Omborga kirim qilish va tarixni ko'rish</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} data-testid="button-add-purchase">
          <Plus className="h-4 w-4 mr-2" /> Yangi kirim
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sana</TableHead>
                <TableHead>Ta'minotchi</TableHead>
                <TableHead className="text-right">Jami summa</TableHead>
                <TableHead className="text-right">To'langan</TableHead>
                <TableHead className="text-right">Qarz</TableHead>
                <TableHead>Izoh</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases?.map((purchase) => {
                const debt = Number(purchase.totalAmount) - Number(purchase.paidAmount);
                return (
                  <TableRow key={purchase.id} data-testid={`row-purchase-${purchase.id}`}>
                    <TableCell>{formatDate(purchase.createdAt)}</TableCell>
                    <TableCell>{getSupplierName(purchase.supplierId)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(purchase.totalAmount))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(purchase.paidAmount))}</TableCell>
                    <TableCell className="text-right">
                      {debt > 0 ? (
                        <Badge variant="destructive">{formatCurrency(debt)}</Badge>
                      ) : (
                        <Badge variant="default">To'langan</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{purchase.notes || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => viewDetail(purchase.id)} data-testid={`button-view-purchase-${purchase.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {purchases?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Kirimlar topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(o) => { if (!productPickerOpen) setCreateOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi kirim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ta'minotchi</label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger data-testid="select-purchase-supplier">
                    <SelectValue placeholder="Tanlang (ixtiyoriy)" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">To'langan summa</label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  data-testid="input-purchase-paid"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Izoh</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Qo'shimcha ma'lumot..."
                data-testid="input-purchase-notes"
              />
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-3">Mahsulot qo'shish</h3>

              <div className="flex items-center gap-2 mb-3">
                {selectedProductId && selectedProduct ? (
                  <div className="flex-1 flex items-center gap-2 border rounded-md p-2 bg-muted/30">
                    {selectedProduct.imageUrl ? (
                      <img src={selectedProduct.imageUrl} alt="" className="h-9 w-9 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedProduct.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {selectedProduct.sku} | Stok: {selectedProduct.stock} {selectedProduct.unit}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedProductId(""); setItemCost(""); setItemBuyUnit("dona"); setItemBoxQty(""); }} data-testid="button-clear-product">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-muted-foreground"
                    onClick={() => { setProductSearch(""); setProductPickerOpen(true); }}
                    data-testid="button-open-product-picker"
                  >
                    <Search className="h-4 w-4" />
                    Mahsulot tanlash...
                  </Button>
                )}
              </div>

              {selectedProductId && selectedProduct && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <div>
                      <label className="text-xs text-muted-foreground">Birlik</label>
                      <Select value={itemBuyUnit} onValueChange={(v) => {
                        setItemBuyUnit(v);
                        const bq = v === "quti"
                          ? (parseInt(itemBoxQty) || selectedProduct.boxQuantity || 1)
                          : (selectedProduct.boxQuantity || 1);
                        const displayCost = toDisplayPrice(Number(selectedProduct.costPrice), v, selectedProduct.unit, bq);
                        setItemCost(String(displayCost));
                        setItemQty("1");
                      }}>
                        <SelectTrigger data-testid="select-purchase-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getBuyUnitOptions(selectedProduct).map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {itemBuyUnit === "quti" && (
                      <div>
                        <label className="text-xs text-muted-foreground">1 qutida nechta {selectedProduct.unit}?</label>
                        <Input
                          type="number"
                          value={itemBoxQty}
                          onChange={(e) => {
                            setItemBoxQty(e.target.value);
                            const bq = parseInt(e.target.value) || 1;
                            const displayCost = toDisplayPrice(Number(selectedProduct.costPrice), "quti", selectedProduct.unit, bq);
                            setItemCost(String(displayCost));
                          }}
                          placeholder={String(selectedProduct.boxQuantity || 1)}
                          min="1"
                          data-testid="input-purchase-box-qty"
                        />
                      </div>
                    )}
                  </div>
                  {itemBuyUnit === "quti" && itemBoxQty && parseInt(itemBoxQty) > 0 && (
                    <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1">
                      1 quti = {itemBoxQty} {selectedProduct.unit}
                    </div>
                  )}
                  {itemBuyUnit === "kg" && selectedProduct.unit === "gram" && (
                    <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded px-2 py-1">
                      1 kg = 1000 gram omborga qo'shiladi
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-xs text-muted-foreground">Miqdor ({itemBuyUnit})</label>
                      <Input
                        type="number"
                        value={itemQty}
                        onChange={(e) => setItemQty(e.target.value)}
                        placeholder="1"
                        min="0"
                        step={String(qtyInputStep(itemBuyUnit))}
                        data-testid="input-purchase-qty"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Narx (1 {itemBuyUnit})
                      </label>
                      <Input
                        type="number"
                        value={itemCost}
                        onChange={(e) => setItemCost(e.target.value)}
                        placeholder="Tan narxi"
                        data-testid="input-purchase-cost"
                      />
                    </div>
                    <Button onClick={addToCart} variant="secondary" data-testid="button-add-to-cart">
                      <Plus className="h-4 w-4 mr-1" /> Qo'shish
                    </Button>
                  </div>
                </div>
              )}

              {selectedProductId && selectedProduct && Number(itemQty) > 0 && itemBuyUnit !== selectedProduct.unit && (
                <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded px-2 py-1 mt-1">
                  {Number(itemQty)} {itemBuyUnit} →{" "}
                  <strong>{stockBadge(calcStockPieces(Number(itemQty), itemBuyUnit, selectedProduct.unit, parseInt(itemBoxQty) || selectedProduct.boxQuantity || 1), selectedProduct.unit, selectedProduct.boxQuantity || 1)}</strong>
                  {" "}omborga qo'shiladi
                </p>
              )}
            </div>

            {cart.length > 0 && (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mahsulot</TableHead>
                      <TableHead className="text-right">Miqdor</TableHead>
                      <TableHead className="text-right">Narx</TableHead>
                      <TableHead className="text-right">Jami</TableHead>
                      <TableHead className="text-right">Omborga</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, index) => (
                      <TableRow key={index} data-testid={`row-cart-item-${index}`}>
                        <TableCell>
                          <span className="font-medium">{item.productName}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span>{item.quantity} {item.buyUnit}</span>
                            {item.buyUnit === "quti" && item.productUnit !== "quti" && (
                              <p className="text-[11px] text-blue-600">{item.boxQuantity} {item.productUnit}/quti → {Math.round(item.stockPieces)} {item.productUnit}</p>
                            )}
                            {item.buyUnit === "kg" && item.productUnit === "gram" && (
                              <p className="text-[11px] text-emerald-600">= {Math.round(item.stockPieces)} gram</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.costPrice)}<span className="text-[10px] text-muted-foreground block">/{item.buyUnit}</span></TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.quantity * item.costPrice)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            +{stockBadge(item.stockPieces, item.productUnit, item.boxQuantity)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(index)} data-testid={`button-remove-cart-${index}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between mt-3 items-center">
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>Jami omborga:</p>
                    {Array.from(new Set(cart.map(i => i.productUnit))).map(unit => {
                      const total = cart.filter(i => i.productUnit === unit).reduce((s, i) => s + i.stockPieces, 0);
                      return <p key={unit} className="font-medium text-foreground">+{stockBadge(total, unit, 1)}</p>;
                    })}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Jami summa:</p>
                    <p className="text-lg font-bold" data-testid="text-cart-total">{formatCurrency(cartTotal)}</p>
                    {parseFloat(paidAmount) > 0 && parseFloat(paidAmount) < cartTotal && (
                      <p className="text-sm text-destructive">
                        Qarz: {formatCurrency(cartTotal - parseFloat(paidAmount))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-purchase">
              Bekor qilish
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending || cart.length === 0} data-testid="button-save-purchase">
              {mutation.isPending ? "Saqlanmoqda..." : "Kirim qilish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelectedId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kirim tafsilotlari</DialogTitle>
          </DialogHeader>
          {purchaseDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Ta'minotchi:</span>
                  <p className="font-medium">{getSupplierName((purchaseDetail as any).supplierId)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sana:</span>
                  <p className="font-medium">{formatDate((purchaseDetail as any).createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Jami:</span>
                  <p className="font-medium">{formatCurrency(Number((purchaseDetail as any).totalAmount))}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">To'langan:</span>
                  <p className="font-medium">{formatCurrency(Number((purchaseDetail as any).paidAmount))}</p>
                </div>
                {Number((purchaseDetail as any).totalAmount) - Number((purchaseDetail as any).paidAmount) > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Qarz:</span>
                    <p className="font-medium text-destructive">
                      {formatCurrency(Number((purchaseDetail as any).totalAmount) - Number((purchaseDetail as any).paidAmount))}
                    </p>
                  </div>
                )}
              </div>
              {(purchaseDetail as any).notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Izoh:</span>
                  <p>{(purchaseDetail as any).notes}</p>
                </div>
              )}
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Mahsulotlar</h4>
                <div className="space-y-2">
                  {(purchaseDetail as any).items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 border rounded-md" data-testid={`detail-item-${item.id}`}>
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatCurrency(Number(item.costPrice))}
                        </p>
                      </div>
                      <p className="text-sm font-bold">{formatCurrency(Number(item.total))}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Mahsulot tanlash</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ism, SKU bo'yicha qidirish..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-10"
              autoFocus
              data-testid="input-product-picker-search"
            />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 border rounded-md">
            {filteredProducts && filteredProducts.length > 0 ? (() => {
              const grouped: Record<string, Product[]> = {};
              const uncategorized: Product[] = [];
              filteredProducts.forEach((p) => {
                if (p.categoryId) {
                  if (!grouped[p.categoryId]) grouped[p.categoryId] = [];
                  grouped[p.categoryId].push(p);
                } else {
                  uncategorized.push(p);
                }
              });
              const categoryOrder = categories?.filter((c) => grouped[c.id]) || [];
              const toggleCategory = (catId: string) => {
                setExpandedCategories((prev) => ({ ...prev, [catId]: prev[catId] === false ? true : false }));
              };
              const allExpanded = Object.keys(grouped).length > 0 && Object.keys(grouped).every((k) => expandedCategories[k] !== false);
              return (
                <div>
                  {Object.keys(grouped).length > 1 && (
                    <div className="sticky top-0 z-10 bg-background border-b px-3 py-1.5 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          const keys = Object.keys(grouped);
                          const newVal = !allExpanded;
                          const next: Record<string, boolean> = {};
                          keys.forEach((k) => { next[k] = newVal; });
                          setExpandedCategories(next);
                        }}
                        data-testid="button-toggle-all-categories"
                      >
                        {allExpanded ? "Hammasini yopish" : "Hammasini ochish"}
                      </Button>
                    </div>
                  )}
                  {categoryOrder.map((cat) => {
                    const catProducts = grouped[cat.id];
                    const isExpanded = expandedCategories[cat.id] !== false;
                    return (
                      <div key={cat.id}>
                        <div
                          className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b cursor-pointer hover:bg-muted transition-colors sticky top-0 z-[5]"
                          onClick={() => toggleCategory(cat.id)}
                          data-testid={`category-header-${cat.id}`}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <Layers className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold flex-1">{cat.name}</span>
                          <Badge variant="secondary" className="text-xs">{catProducts.length}</Badge>
                        </div>
                        {isExpanded && catProducts.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-0 transition-colors pl-6"
                            onClick={() => selectProduct(p)}
                            data-testid={`picker-product-${p.id}`}
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                SKU: {p.sku} | Stok: {p.stock} {p.unit}
                                {p.boxQuantity > 1 && ` | 1 quti = ${p.boxQuantity} ${p.unit}`}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold">{formatCurrency(Number(p.costPrice))}</p>
                              <p className="text-[10px] text-muted-foreground">tan narxi</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {uncategorized.length > 0 && (
                    <div>
                      {categoryOrder.length > 0 && (
                        <div
                          className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => toggleCategory("__none__")}
                          data-testid="category-header-uncategorized"
                        >
                          {expandedCategories["__none__"] !== false ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-semibold flex-1 text-muted-foreground">Kategoriyasiz</span>
                          <Badge variant="secondary" className="text-xs">{uncategorized.length}</Badge>
                        </div>
                      )}
                      {(categoryOrder.length === 0 || expandedCategories["__none__"] !== false) && uncategorized.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-0 transition-colors pl-6"
                          onClick={() => selectProduct(p)}
                          data-testid={`picker-product-${p.id}`}
                        >
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              SKU: {p.sku} | Stok: {p.stock} {p.unit}
                              {p.boxQuantity > 1 && ` | 1 quti = ${p.boxQuantity} ${p.unit}`}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold">{formatCurrency(Number(p.costPrice))}</p>
                            <p className="text-[10px] text-muted-foreground">tan narxi</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {productSearch ? "Mahsulot topilmadi" : "Mahsulotlar yo'q"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
