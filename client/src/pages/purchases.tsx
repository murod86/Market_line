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
import type { Product, Supplier, Purchase } from "@shared/schema";
import { Plus, Trash2, Package, Eye, ShoppingBasket } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("uz-UZ", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
}

export default function Purchases() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemCost, setItemCost] = useState("");
  const { toast } = useToast();

  const { data: purchases, isLoading } = useQuery<Purchase[]>({ queryKey: ["/api/purchases"] });
  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: purchaseDetail } = useQuery({
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
    setSelectedProduct("");
    setItemQty("1");
    setItemCost("");
  };

  const addToCart = () => {
    if (!selectedProduct) {
      toast({ title: "Mahsulot tanlang", variant: "destructive" });
      return;
    }
    const qty = parseInt(itemQty);
    const cost = parseFloat(itemCost);
    if (!qty || qty < 1) {
      toast({ title: "Miqdor noto'g'ri", variant: "destructive" });
      return;
    }
    if (!cost || cost <= 0) {
      toast({ title: "Tan narxi noto'g'ri", variant: "destructive" });
      return;
    }
    const product = products?.find((p) => p.id === selectedProduct);
    if (!product) return;

    const existing = cart.findIndex((c) => c.productId === selectedProduct);
    if (existing >= 0) {
      const updated = [...cart];
      updated[existing].quantity += qty;
      updated[existing].costPrice = cost;
      setCart(updated);
    } else {
      setCart([...cart, { productId: selectedProduct, productName: product.name, quantity: qty, costPrice: cost }]);
    }
    setSelectedProduct("");
    setItemQty("1");
    setItemCost("");
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);

  const handleSubmit = () => {
    if (cart.length === 0) {
      toast({ title: "Kamida 1 ta mahsulot qo'shing", variant: "destructive" });
      return;
    }
    mutation.mutate({
      supplierId: supplierId || null,
      items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, costPrice: c.costPrice })),
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen} modal={false}>
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
              <div className="grid grid-cols-4 gap-2">
                <Select value={selectedProduct} onValueChange={(val) => {
                  setSelectedProduct(val);
                  const p = products?.find((p) => p.id === val);
                  if (p) setItemCost(String(p.costPrice));
                }}>
                  <SelectTrigger data-testid="select-purchase-product">
                    <SelectValue placeholder="Mahsulot" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  placeholder="Miqdor"
                  min="1"
                  data-testid="input-purchase-qty"
                />
                <Input
                  type="number"
                  value={itemCost}
                  onChange={(e) => setItemCost(e.target.value)}
                  placeholder="Tan narxi"
                  data-testid="input-purchase-cost"
                />
                <Button onClick={addToCart} variant="secondary" data-testid="button-add-to-cart">
                  <Plus className="h-4 w-4 mr-1" /> Qo'shish
                </Button>
              </div>
            </div>

            {cart.length > 0 && (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mahsulot</TableHead>
                      <TableHead className="text-right">Miqdor</TableHead>
                      <TableHead className="text-right">Tan narxi</TableHead>
                      <TableHead className="text-right">Jami</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, index) => (
                      <TableRow key={index} data-testid={`row-cart-item-${index}`}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.costPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.quantity * item.costPrice)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(index)} data-testid={`button-remove-cart-${index}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-2">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Jami summa:</p>
                    <p className="text-lg font-bold" data-testid="text-cart-total">{formatCurrency(cartTotal)}</p>
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
    </div>
  );
}
