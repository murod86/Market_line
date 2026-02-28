import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Dealer, Product, Category } from "@shared/schema";
import {
  UserCheck, Plus, Edit, Phone, Car, Package, Search,
  Minus, Trash2, ArrowDownToLine, ArrowUpFromLine, ShoppingCart,
  History, Eye, Printer, RotateCcw, Banknote
} from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

interface CartItem {
  productId: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  quantity: number;
}

const txTypeLabels: Record<string, { label: string; color: string }> = {
  load: { label: "Yuklash", color: "text-blue-600" },
  sell: { label: "Sotish", color: "text-green-600" },
  return: { label: "Qaytarish", color: "text-orange-600" },
};

export default function Dealers() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editDealer, setEditDealer] = useState<Dealer | null>(null);
  const [detailDealer, setDetailDealer] = useState<Dealer | null>(null);
  const [activeTab, setActiveTab] = useState("inventory");

  const [loadOpen, setLoadOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sellCustomerName, setSellCustomerName] = useState("");
  const [sellCustomerPhone, setSellCustomerPhone] = useState("");
  const [operationNotes, setOperationNotes] = useState("");

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formVehicle, setFormVehicle] = useState("");
  const [formPassword, setFormPassword] = useState("");

  const { toast } = useToast();

  const { data: dealersList, isLoading } = useQuery<Dealer[]>({ queryKey: ["/api/dealers"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/dealers", detailDealer?.id, "inventory"],
    enabled: !!detailDealer,
  });

  const { data: transactions } = useQuery<any[]>({
    queryKey: ["/api/dealers", detailDealer?.id, "transactions"],
    enabled: !!detailDealer,
  });

  const { data: dealerPayments } = useQuery<any[]>({
    queryKey: ["/api/payments", "dealer", detailDealer?.id],
    enabled: !!detailDealer,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/dealers", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Diller qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/dealers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Diller yangilandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      setEditDealer(null);
      resetForm();
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const loadMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/dealers/${detailDealer!.id}/load`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mahsulotlar dillerga yuklandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      resetCart();
      setLoadOpen(false);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const sellMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/dealers/${detailDealer!.id}/sell`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sotish muvaffaqiyatli" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "transactions"] });
      resetCart();
      setSellOpen(false);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const returnMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/dealers/${detailDealer!.id}/return`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mahsulotlar omborga qaytarildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      resetCart();
      setReturnOpen(false);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/payments/dealer", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "To'lov qabul qilindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments", "dealer", detailDealer?.id] });
      if (detailDealer) {
        const newDebt = Math.max(0, Number(detailDealer.debt) - Number(payAmount));
        setDetailDealer({ ...detailDealer, debt: newDebt.toFixed(2) });
      }
      setPayOpen(false);
      setPayAmount("");
      setPayMethod("cash");
      setPayNotes("");
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const submitDealerPayment = () => {
    if (!detailDealer || !payAmount) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Noto'g'ri summa", variant: "destructive" });
      return;
    }
    paymentMutation.mutate({
      dealerId: detailDealer.id,
      amount,
      method: payMethod,
      notes: payNotes.trim() || null,
    });
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormVehicle("");
    setFormPassword("");
  };

  const resetCart = () => {
    setCart([]);
    setSearchTerm("");
    setSelectedCategory("all");
    setSellCustomerName("");
    setSellCustomerPhone("");
    setOperationNotes("");
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      setCart(cart.map((i) =>
        i.productId === product.id ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) } : i
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        unit: product.unit,
        price: Number(product.price),
        stock: product.stock,
        quantity: 1,
      }]);
    }
  };

  const addInventoryToCart = (item: any) => {
    const existing = cart.find((i) => i.productId === item.productId);
    if (existing) {
      setCart(cart.map((i) =>
        i.productId === item.productId ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) } : i
      ));
    } else {
      setCart([...cart, {
        productId: item.productId,
        name: item.productName,
        unit: item.productUnit,
        price: Number(item.productPrice),
        stock: item.quantity,
        quantity: 1,
      }]);
    }
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((i) => i.productId !== productId));
    } else {
      setCart(cart.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.min(qty, i.stock) } : i
      ));
    }
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const filteredProducts = products?.filter((p) =>
    p.active && p.stock > 0 &&
    (searchTerm === "" || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedCategory === "all" || p.categoryId === selectedCategory)
  );

  const openLoadDialog = () => {
    resetCart();
    setLoadOpen(true);
  };

  const openSellDialog = () => {
    resetCart();
    setSellOpen(true);
  };

  const openReturnDialog = () => {
    resetCart();
    setReturnOpen(true);
  };

  const submitLoad = () => {
    if (cart.length === 0) return;
    loadMutation.mutate({
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      notes: operationNotes.trim() || null,
    });
  };

  const submitSell = () => {
    if (cart.length === 0) return;
    sellMutation.mutate({
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      customerName: sellCustomerName.trim() || null,
      customerPhone: sellCustomerPhone.trim() || null,
      notes: operationNotes.trim() || null,
    });
  };

  const submitReturn = () => {
    if (cart.length === 0) return;
    returnMutation.mutate({
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      notes: operationNotes.trim() || null,
    });
  };

  const printTransactions = () => {
    if (!transactions || !detailDealer) return;
    const html = `<html><head><title>Diller tarixi - ${detailDealer.name}</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5;font-weight:600}.load{color:#2563eb}.sell{color:#16a34a}.return{color:#ea580c}</style></head><body>
      <h2>Diller: ${detailDealer.name}</h2>
      <p>Telefon: ${detailDealer.phone || "-"} | Mashina: ${detailDealer.vehicleInfo || "-"}</p>
      <table><tr><th>Sana</th><th>Turi</th><th>Mahsulot</th><th>Miqdor</th><th>Narx</th><th>Jami</th><th>Mijoz</th><th>Izoh</th></tr>
      ${transactions.map((tx: any) => `<tr>
        <td>${format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}</td>
        <td class="${tx.type}">${txTypeLabels[tx.type]?.label || tx.type}</td>
        <td>${tx.productName}</td>
        <td>${tx.quantity} ${tx.productUnit}</td>
        <td>${formatCurrency(Number(tx.price))}</td>
        <td>${formatCurrency(Number(tx.total))}</td>
        <td>${tx.customerName || "-"}</td>
        <td>${tx.notes || "-"}</td>
      </tr>`).join("")}
      </table></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const inventoryTotal = inventory?.reduce((sum: number, i: any) => sum + Number(i.productPrice) * i.quantity, 0) || 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 h-full overflow-y-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  if (detailDealer) {
    return (
      <div className="p-6 space-y-4 h-full overflow-y-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { setDetailDealer(null); resetCart(); }} data-testid="button-back-dealers">
              ← Orqaga
            </Button>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2" data-testid="text-dealer-name">
                <UserCheck className="h-5 w-5" />
                {detailDealer.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {detailDealer.phone && <span className="mr-3"><Phone className="h-3 w-3 inline mr-1" />{detailDealer.phone}</span>}
                {detailDealer.vehicleInfo && <span><Car className="h-3 w-3 inline mr-1" />{detailDealer.vehicleInfo}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={openLoadDialog} data-testid="button-load-products">
              <ArrowDownToLine className="h-4 w-4 mr-1" />
              Mahsulot yuklash
            </Button>
            <Button size="sm" variant="secondary" onClick={openSellDialog} data-testid="button-sell-products">
              <ShoppingCart className="h-4 w-4 mr-1" />
              Sotish
            </Button>
            <Button size="sm" variant="outline" onClick={openReturnDialog} data-testid="button-return-products">
              <RotateCcw className="h-4 w-4 mr-1" />
              Qaytarish
            </Button>
            {Number(detailDealer.debt) > 0 && (
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => { setPayOpen(true); setPayAmount(""); setPayMethod("cash"); setPayNotes(""); }} data-testid="button-dealer-pay">
                <Banknote className="h-4 w-4 mr-1" />
                To'lov qilish
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Qarz</p>
              <p className="text-lg font-bold text-destructive" data-testid="text-dealer-debt">{formatCurrency(Number(detailDealer.debt))}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Ombor qiymati</p>
              <p className="text-lg font-bold text-primary" data-testid="text-dealer-inv-total">{formatCurrency(inventoryTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Jami to'langan</p>
              <p className="text-lg font-bold text-green-600" data-testid="text-dealer-paid">
                {formatCurrency(dealerPayments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Mahsulotlar</p>
              <p className="text-lg font-bold">{inventory?.length || 0} ta</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="inventory" data-testid="tab-inventory">
              <Package className="h-4 w-4 mr-1" />
              Diller ombori ({inventory?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="h-4 w-4 mr-1" />
              Tarix ({transactions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">
              <Banknote className="h-4 w-4 mr-1" />
              To'lovlar ({dealerPayments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-4">
            {inventory && inventory.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mahsulot</TableHead>
                        <TableHead>Miqdor</TableHead>
                        <TableHead>Narx</TableHead>
                        <TableHead>Jami</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item: any) => (
                        <TableRow key={item.id} data-testid={`inventory-item-${item.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.productImage ? (
                                <img src={item.productImage} alt="" className="h-8 w-8 rounded object-cover" />
                              ) : (
                                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                  <Package className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                              <span className="font-medium">{item.productName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.quantity} {item.productUnit}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(Number(item.productPrice))}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(Number(item.productPrice) * item.quantity)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/30">
                        <TableCell colSpan={3}>Umumiy qiymat</TableCell>
                        <TableCell data-testid="text-inventory-total">{formatCurrency(inventoryTotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Diller omborida mahsulot yo'q</p>
                <Button size="sm" className="mt-3" onClick={openLoadDialog}>
                  <ArrowDownToLine className="h-4 w-4 mr-1" />
                  Mahsulot yuklash
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={printTransactions} disabled={!transactions?.length} data-testid="button-print-history">
                <Printer className="h-4 w-4 mr-1" />
                Chop etish
              </Button>
            </div>
            {transactions && transactions.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sana</TableHead>
                        <TableHead>Turi</TableHead>
                        <TableHead>Mahsulot</TableHead>
                        <TableHead>Miqdor</TableHead>
                        <TableHead>Jami</TableHead>
                        <TableHead>Mijoz</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx: any) => (
                        <TableRow key={tx.id} data-testid={`transaction-${tx.id}`}>
                          <TableCell className="text-xs">{format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                          <TableCell>
                            <Badge variant={tx.type === "load" ? "default" : tx.type === "sell" ? "secondary" : "outline"}>
                              {txTypeLabels[tx.type]?.label || tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{tx.productName}</TableCell>
                          <TableCell>{tx.quantity} {tx.productUnit}</TableCell>
                          <TableCell>{formatCurrency(Number(tx.total))}</TableCell>
                          <TableCell className="text-sm">{tx.customerName || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Tarix mavjud emas</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {renderProductPickerDialog(
          loadOpen,
          () => { setLoadOpen(false); resetCart(); },
          "Ombordan mahsulot yuklash",
          <ArrowDownToLine className="h-5 w-5" />,
          filteredProducts || [],
          submitLoad,
          loadMutation.isPending,
          "Yuklash",
          false,
        )}

        {renderProductPickerDialog(
          sellOpen,
          () => { setSellOpen(false); resetCart(); },
          "Mijozga sotish",
          <ShoppingCart className="h-5 w-5" />,
          [],
          submitSell,
          sellMutation.isPending,
          "Sotish",
          true,
        )}

        {renderProductPickerDialog(
          returnOpen,
          () => { setReturnOpen(false); resetCart(); },
          "Omborga qaytarish",
          <RotateCcw className="h-5 w-5" />,
          [],
          submitReturn,
          returnMutation.isPending,
          "Qaytarish",
          false,
        )}
      </div>
    );
  }

  function renderProductPickerDialog(
    open: boolean,
    onClose: () => void,
    title: string,
    icon: React.ReactNode,
    productList: Product[],
    onSubmit: () => void,
    isPending: boolean,
    submitLabel: string,
    showCustomer: boolean,
  ) {
    const isFromInventory = productList.length === 0 && inventory;
    const sourceItems = isFromInventory ? inventory : null;

    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {title} — {detailDealer?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {showCustomer && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Mijoz ismi (ixtiyoriy)</Label>
                    <Input
                      placeholder="Noma'lum mijoz"
                      value={sellCustomerName}
                      onChange={(e) => setSellCustomerName(e.target.value)}
                      data-testid="input-sell-customer-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefon (ixtiyoriy)</Label>
                    <Input
                      placeholder="+998..."
                      value={sellCustomerPhone}
                      onChange={(e) => setSellCustomerPhone(e.target.value)}
                      data-testid="input-sell-customer-phone"
                    />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Izoh (ixtiyoriy)</Label>
                <Textarea
                  placeholder="Qo'shimcha ma'lumot..."
                  value={operationNotes}
                  onChange={(e) => setOperationNotes(e.target.value)}
                  rows={2}
                  data-testid="input-operation-notes"
                />
              </div>

              {cart.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Tanlangan mahsulotlar ({cart.length})</p>
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30" data-testid={`cart-item-${item.productId}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.price)} x {item.quantity} {item.unit} = {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                          data-testid={`button-cart-minus-${item.productId}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-10 text-center text-sm font-medium" data-testid={`text-cart-qty-${item.productId}`}>
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          data-testid={`button-cart-plus-${item.productId}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => updateCartQty(item.productId, 0)}
                          data-testid={`button-cart-remove-${item.productId}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t font-bold text-lg">
                    <span>Jami:</span>
                    <span data-testid="text-cart-total">{formatCurrency(cartTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Mahsulot qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-product-search"
                />
              </div>

              {!isFromInventory && categories && categories.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <Button
                    size="sm"
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    onClick={() => setSelectedCategory("all")}
                    data-testid="button-category-all"
                  >
                    Hammasi
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      size="sm"
                      variant={selectedCategory === cat.id ? "default" : "outline"}
                      onClick={() => setSelectedCategory(cat.id)}
                      data-testid={`button-category-${cat.id}`}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              )}

              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {isFromInventory ? (
                  <>
                    {(sourceItems || [])
                      .filter((item: any) =>
                        searchTerm === "" || item.productName.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((item: any) => {
                        const inCart = cart.find((c) => c.productId === item.productId);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                              inCart ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                            }`}
                            onClick={() => addInventoryToCart(item)}
                            data-testid={`inv-product-${item.productId}`}
                          >
                            {item.productImage ? (
                              <img src={item.productImage} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(Number(item.productPrice))} · {item.quantity} {item.productUnit}
                              </p>
                            </div>
                            {inCart ? (
                              <Badge className="shrink-0">{inCart.quantity}</Badge>
                            ) : (
                              <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    {(!sourceItems || sourceItems.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        Diller omborida mahsulot yo'q
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(productList || []).map((product) => {
                      const inCart = cart.find((i) => i.productId === product.id);
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                            inCart ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                          }`}
                          onClick={() => addToCart(product)}
                          data-testid={`product-${product.id}`}
                        >
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(Number(product.price))} · {product.stock} {product.unit}
                            </p>
                          </div>
                          {inCart ? (
                            <Badge className="shrink-0">{inCart.quantity}</Badge>
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    {productList.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        Mahsulot topilmadi
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} data-testid="button-dialog-cancel">
              Bekor qilish
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isPending || cart.length === 0}
              data-testid="button-dialog-submit"
            >
              {isPending ? "Yuklanmoqda..." : `${submitLabel} (${cart.length} ta)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6" />
            Dillerlar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dillerlarni boshqaring — mahsulot yuklash, sotish, qaytarish
          </p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} data-testid="button-add-dealer">
          <Plus className="h-4 w-4 mr-2" />
          Yangi diller
        </Button>
      </div>

      {dealersList && dealersList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dealersList.map((dealer) => (
            <Card key={dealer.id} className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`dealer-card-${dealer.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold" data-testid={`text-dealer-name-${dealer.id}`}>{dealer.name}</h3>
                      {dealer.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />{dealer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={dealer.active ? "default" : "destructive"}>
                    {dealer.active ? "Faol" : "Nofaol"}
                  </Badge>
                </div>

                {dealer.vehicleInfo && (
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <Car className="h-3 w-3" /> {dealer.vehicleInfo}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => { setDetailDealer(dealer); setActiveTab("inventory"); }} data-testid={`button-view-dealer-${dealer.id}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    Ko'rish
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setFormName(dealer.name);
                    setFormPhone(dealer.phone || "");
                    setFormVehicle(dealer.vehicleInfo || "");
                    setEditDealer(dealer);
                  }} data-testid={`button-edit-dealer-${dealer.id}`}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <UserCheck className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">Hozircha dillerlar yo'q</h3>
          <p className="text-sm mb-4">Birinchi dillerni qo'shing va mahsulotlarni yuklang</p>
          <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Yangi diller
          </Button>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) setCreateOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi diller qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ism *</Label>
              <Input
                placeholder="Diller ismi"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                data-testid="input-dealer-name"
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                placeholder="+998..."
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                data-testid="input-dealer-phone"
              />
            </div>
            <div>
              <Label>Mashina ma'lumotlari</Label>
              <Input
                placeholder="01 A 123 BC"
                value={formVehicle}
                onChange={(e) => setFormVehicle(e.target.value)}
                data-testid="input-dealer-vehicle"
              />
            </div>
            <div>
              <Label>Parol (portal uchun)</Label>
              <Input
                type="password"
                placeholder="Parol kiriting"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                data-testid="input-dealer-password"
              />
              <p className="text-xs text-muted-foreground mt-1">Diller portaliga kirish uchun parol</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => createMutation.mutate({ name: formName, phone: formPhone || null, vehicleInfo: formVehicle || null, password: formPassword || null })}
              disabled={!formName.trim() || createMutation.isPending}
              data-testid="button-create-dealer"
            >
              {createMutation.isPending ? "Yuklanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDealer} onOpenChange={(o) => { if (!o) setEditDealer(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dillerni tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ism *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                data-testid="input-edit-dealer-name"
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                data-testid="input-edit-dealer-phone"
              />
            </div>
            <div>
              <Label>Mashina ma'lumotlari</Label>
              <Input
                value={formVehicle}
                onChange={(e) => setFormVehicle(e.target.value)}
                data-testid="input-edit-dealer-vehicle"
              />
            </div>
            <div>
              <Label>Yangi parol (bo'sh qoldirsa o'zgarmaydi)</Label>
              <Input
                type="password"
                placeholder="Yangi parol"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                data-testid="input-edit-dealer-password"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>Holati:</Label>
              <Select value={editDealer?.active ? "true" : "false"} onValueChange={(v) => setEditDealer(editDealer ? { ...editDealer, active: v === "true" } : null)}>
                <SelectTrigger className="w-32" data-testid="select-dealer-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Faol</SelectItem>
                  <SelectItem value="false">Nofaol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDealer(null)}>Bekor qilish</Button>
            <Button
              onClick={() => editDealer && updateMutation.mutate({
                id: editDealer.id,
                data: {
                  name: formName, phone: formPhone || null, vehicleInfo: formVehicle || null,
                  active: editDealer.active,
                  ...(formPassword ? { password: formPassword } : {}),
                },
              })}
              disabled={!formName.trim() || updateMutation.isPending}
              data-testid="button-update-dealer"
            >
              {updateMutation.isPending ? "Yuklanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
