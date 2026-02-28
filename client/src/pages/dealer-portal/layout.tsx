import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Package, ShoppingCart, History, CreditCard, LogOut, Truck,
  Minus, Plus, Trash2, User, Phone, LayoutDashboard, TrendingUp, TrendingDown, Wallet, ArrowDownToLine, ArrowUpFromLine
} from "lucide-react";
import { format } from "date-fns";
import logoImg from "@assets/marketline_final_v1.png";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

interface DealerLayoutProps {
  onLogout: () => void;
}

export default function DealerLayout({ onLogout }: DealerLayoutProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "sell" | "delivery" | "history" | "debt">("dashboard");
  const { toast } = useToast();

  const { data: dealer, isLoading } = useQuery<any>({
    queryKey: ["/api/dealer-portal/me"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/dealer-portal/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      onLogout();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard" as const, label: "Bosh sahifa", icon: LayoutDashboard },
    { id: "inventory" as const, label: "Ombor", icon: Package },
    { id: "sell" as const, label: "Sotish", icon: ShoppingCart },
    { id: "delivery" as const, label: "Yetkazish", icon: Truck },
    { id: "history" as const, label: "Tarix", icon: History },
    { id: "debt" as const, label: "Qarz", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="MARKET_LINE" className="h-7" />
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-sm">Diller portali</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block" data-testid="text-dealer-name">
              {dealer?.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-dealer-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-dealer-${tab.id}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && <DashboardTab dealer={dealer} />}
        {activeTab === "inventory" && <InventoryTab />}
        {activeTab === "sell" && <SellTab />}
        {activeTab === "delivery" && <DeliveryTab />}
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "debt" && <DebtTab dealer={dealer} />}
      </main>
    </div>
  );
}

function DashboardTab({ dealer }: { dealer: any }) {
  const { data: inventory, isLoading: invLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/inventory"],
  });
  const { data: transactions, isLoading: txLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/transactions"],
  });
  const { data: payments, isLoading: payLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/payments"],
  });

  if (invLoading || txLoading || payLoading) return <Skeleton className="h-64 w-full" />;

  const inventoryValue = inventory?.reduce((s, i) => s + i.quantity * Number(i.productPrice), 0) || 0;
  const inventoryCount = inventory?.reduce((s, i) => s + i.quantity, 0) || 0;

  const loadTxs = transactions?.filter((t: any) => t.type === "load") || [];
  const sellTxs = transactions?.filter((t: any) => t.type === "sell") || [];

  const totalLoaded = loadTxs.reduce((s: number, t: any) => s + Number(t.total), 0);
  const totalSold = sellTxs.reduce((s: number, t: any) => s + Number(t.total), 0);
  const totalPaid = payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
  const currentDebt = Number(dealer?.debt || 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySales = sellTxs.filter((t: any) => new Date(t.createdAt) >= todayStart);
  const todayTotal = todaySales.reduce((s: number, t: any) => s + Number(t.total), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold" data-testid="text-dashboard-title">Bosh sahifa</h2>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-xs text-muted-foreground">Ombor qiymati</p>
            <p className="text-lg font-bold text-blue-600" data-testid="text-dash-inv-value">{formatCurrency(inventoryValue)}</p>
            <p className="text-xs text-muted-foreground">{inventoryCount} ta mahsulot</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-xs text-muted-foreground">Joriy qarz</p>
            <p className="text-lg font-bold text-destructive" data-testid="text-dash-debt">{formatCurrency(currentDebt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ArrowDownToLine className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-xs text-muted-foreground">Jami yuklangan</p>
            <p className="text-lg font-bold" data-testid="text-dash-loaded">{formatCurrency(totalLoaded)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-xs text-muted-foreground">Jami sotilgan</p>
            <p className="text-lg font-bold text-green-600" data-testid="text-dash-sold">{formatCurrency(totalSold)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Wallet className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-xs text-muted-foreground">Jami to'langan</p>
            <p className="text-lg font-bold text-green-600" data-testid="text-dash-paid">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ArrowUpFromLine className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
            <p className="text-xs text-muted-foreground">Bugungi sotuvlar</p>
            <p className="text-lg font-bold text-indigo-600" data-testid="text-dash-today">{formatCurrency(todayTotal)}</p>
            <p className="text-xs text-muted-foreground">{todaySales.length} ta savdo</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4 text-center">
            <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-cyan-500" />
            <p className="text-xs text-muted-foreground">Umumiy savdolar soni</p>
            <p className="text-lg font-bold" data-testid="text-dash-sales-count">{sellTxs.length} ta</p>
          </CardContent>
        </Card>
      </div>

      {sellTxs.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">Oxirgi sotuvlar</h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Soni</TableHead>
                    <TableHead>Summa</TableHead>
                    <TableHead>Mijoz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellTxs.slice(-10).reverse().map((t: any) => (
                    <TableRow key={t.id} data-testid={`row-dash-sale-${t.id}`}>
                      <TableCell className="text-xs">{format(new Date(t.createdAt), "dd.MM HH:mm")}</TableCell>
                      <TableCell className="text-sm font-medium">{t.productName || t.productId}</TableCell>
                      <TableCell>{t.quantity}</TableCell>
                      <TableCell className="font-medium text-green-600">{formatCurrency(Number(t.total))}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.customerName || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function InventoryTab() {
  const { data: inventory, isLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/inventory"],
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const totalValue = inventory?.reduce((s, i) => s + i.quantity * Number(i.productPrice), 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" data-testid="text-inventory-title">Mening omborim</h2>
        <Badge variant="secondary" className="text-sm" data-testid="text-inventory-value">
          Jami: {formatCurrency(totalValue)}
        </Badge>
      </div>

      {inventory && inventory.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inventory.map((item: any) => (
            <Card key={item.id} data-testid={`card-inventory-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {item.productImage ? (
                    <img src={item.productImage} alt={item.productName} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.productName}</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(Number(item.productPrice))}</p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.quantity} {item.productUnit}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(item.quantity * Number(item.productPrice))}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Omborda mahsulot yo'q</p>
            <p className="text-sm mt-1">Admin tomonidan mahsulot yuklanadi</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SellCartItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  maxQty: number;
}

function SellTab() {
  const [cart, setCart] = useState<SellCartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "debt" | "partial">("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const { toast } = useToast();

  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/inventory"],
  });

  const sellMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/dealer-portal/sell", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sotish muvaffaqiyatli amalga oshirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/me"] });
      setCart([]);
      setCheckoutOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setPaymentType("cash");
      setPaidAmount("");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === item.productId);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          toast({ title: "Omborda yetarli emas", variant: "destructive" });
          return prev;
        }
        return prev.map((c) =>
          c.productId === item.productId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, {
        productId: item.productId,
        name: item.productName,
        price: Number(item.productPrice),
        unit: item.productUnit,
        quantity: 1,
        maxQty: item.quantity,
      }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId === productId) {
          const newQty = c.quantity + delta;
          if (newQty <= 0) return c;
          if (newQty > c.maxQty) {
            toast({ title: "Omborda yetarli emas", variant: "destructive" });
            return c;
          }
          return { ...c, quantity: newQty };
        }
        return c;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const handleSell = () => {
    if (cart.length === 0) return;
    sellMutation.mutate({
      items: cart.map((c) => ({
        productId: c.productId,
        quantity: c.quantity,
        price: c.price,
      })),
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      notes: notes || null,
      paymentType,
      paidAmount: paymentType === "partial" ? Number(paidAmount) || 0 : 0,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-sell-title">Mijozga sotish</h2>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3">
          <p className="text-sm text-muted-foreground">Mahsulotni tanlang:</p>
          {inventory && inventory.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {inventory.map((item: any) => {
                const inCart = cart.find((c) => c.productId === item.productId);
                return (
                  <Card key={item.id} className="cursor-pointer hover:border-primary/50 transition-colors" data-testid={`card-sell-product-${item.productId}`}>
                    <CardContent className="p-3" onClick={() => addToCart(item)}>
                      <div className="flex items-center gap-3">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.productName}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-primary">{formatCurrency(Number(item.productPrice))}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {item.quantity - (inCart?.quantity || 0)} {item.productUnit}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>Omborda mahsulot yo'q</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-32">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4" /> Savat
                </h3>
                <Badge variant="secondary">{cart.length} ta</Badge>
              </div>

              {cart.length > 0 ? (
                <>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.productId, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.productId, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.productId)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Jami:</span>
                      <span className="text-lg font-bold text-primary" data-testid="text-cart-total">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => setCheckoutOpen(true)}
                    data-testid="button-open-checkout"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Sotishni rasmiylashtirish
                  </Button>
                </>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-6">Savat bo'sh</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sotishni tasdiqlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>
                <User className="h-3.5 w-3.5 inline mr-1" />
                Mijoz ismi (ixtiyoriy)
              </Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Mijoz ismi"
                data-testid="input-sell-customer-name"
              />
            </div>
            <div>
              <Label>
                <Phone className="h-3.5 w-3.5 inline mr-1" />
                Telefon (ixtiyoriy)
              </Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+998..."
                data-testid="input-sell-customer-phone"
              />
            </div>

            <div>
              <Label className="mb-2 block">To'lov turi</Label>
              <div className="flex gap-2">
                {([
                  { value: "cash" as const, label: "Naqd", color: "bg-green-500/10 text-green-700 border-green-300" },
                  { value: "debt" as const, label: "Qarzga", color: "bg-red-500/10 text-red-700 border-red-300" },
                  { value: "partial" as const, label: "Qisman", color: "bg-yellow-500/10 text-yellow-700 border-yellow-300" },
                ] as const).map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`flex-1 ${paymentType === opt.value ? opt.color + " ring-1 ring-current" : ""}`}
                    onClick={() => setPaymentType(opt.value)}
                    data-testid={`button-payment-${opt.value}`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {paymentType === "partial" && (
              <div>
                <Label>To'langan summa (UZS)</Label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  data-testid="input-paid-amount"
                />
                {Number(paidAmount) > 0 && Number(paidAmount) < total && (
                  <p className="text-xs text-destructive mt-1">
                    Qarz: {formatCurrency(total - Number(paidAmount))}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Izoh (ixtiyoriy)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Qo'shimcha ma'lumot..."
                data-testid="input-sell-notes"
              />
            </div>

            <Card>
              <CardContent className="p-3">
                <div className="space-y-1">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                  <span>Jami:</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
                {paymentType === "debt" && (
                  <p className="text-xs text-destructive mt-1">To'liq qarzga: {formatCurrency(total)}</p>
                )}
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSell} disabled={sellMutation.isPending} data-testid="button-confirm-sell">
              {sellMutation.isPending ? "Yuklanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeliveryTab() {
  const { data: deliveries, isLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/deliveries"],
  });
  const { toast } = useToast();

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/dealer-portal/deliveries/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Yetkazish holati yangilandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/deliveries"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Kutilmoqda", color: "bg-yellow-500/10 text-yellow-600" },
    in_transit: { label: "Yo'lda", color: "bg-blue-500/10 text-blue-600" },
    delivered: { label: "Yetkazildi", color: "bg-green-500/10 text-green-600" },
    cancelled: { label: "Bekor qilingan", color: "bg-red-500/10 text-red-600" },
  };

  const active = deliveries?.filter(d => d.status !== "delivered" && d.status !== "cancelled") || [];
  const completed = deliveries?.filter(d => d.status === "delivered" || d.status === "cancelled") || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-delivery-title">Yetkazib berish</h2>

      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Faol yetkazishlar ({active.length})</p>
          {active.map((d: any) => {
            const st = statusMap[d.status] || statusMap.pending;
            return (
              <Card key={d.id} data-testid={`card-delivery-${d.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-1.5">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {d.customerName}
                      </p>
                      {d.customerPhone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {d.customerPhone}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5">{d.address}</p>
                    </div>
                    <Badge className={`${st.color} border-0`}>{st.label}</Badge>
                  </div>

                  {d.items && d.items.length > 0 && (
                    <div className="border rounded-lg p-2 space-y-1">
                      {d.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.productName} × {item.quantity} {item.productUnit}</span>
                          <span className="font-medium">{formatCurrency(Number(item.total))}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {d.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => statusMutation.mutate({ id: d.id, status: "in_transit" })}
                        disabled={statusMutation.isPending}
                        data-testid={`button-start-delivery-${d.id}`}
                      >
                        <Truck className="h-3.5 w-3.5 mr-1" />
                        Yo'lga chiqish
                      </Button>
                    )}
                    {d.status === "in_transit" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => statusMutation.mutate({ id: d.id, status: "delivered" })}
                        disabled={statusMutation.isPending}
                        data-testid={`button-complete-delivery-${d.id}`}
                      >
                        <Package className="h-3.5 w-3.5 mr-1" />
                        Topshirdim
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">{format(new Date(d.createdAt), "dd.MM.yyyy HH:mm")}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {active.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Truck className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Hozircha yetkazish topshiriqlari yo'q</p>
            <p className="text-sm mt-1">Admin buyurtma tayinlaganda bu yerda ko'rinadi</p>
          </CardContent>
        </Card>
      )}

      {completed.length > 0 && (
        <div className="space-y-3 mt-6">
          <p className="text-sm font-medium text-muted-foreground">Bajarilgan ({completed.length})</p>
          {completed.slice(0, 10).map((d: any) => {
            const st = statusMap[d.status] || statusMap.delivered;
            return (
              <Card key={d.id} className="opacity-70" data-testid={`card-delivery-done-${d.id}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{d.customerName}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(d.createdAt), "dd.MM.yyyy HH:mm")}</p>
                  </div>
                  <Badge className={`${st.color} border-0`}>{st.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryTab() {
  const { data: transactions, isLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/transactions"],
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const typeMap: Record<string, { label: string; color: string }> = {
    load: { label: "Yuklash", color: "bg-blue-500/10 text-blue-600" },
    sell: { label: "Sotish", color: "bg-green-500/10 text-green-600" },
    return: { label: "Qaytarish", color: "bg-orange-500/10 text-orange-600" },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-history-title">Operatsiyalar tarixi</h2>

      {transactions && transactions.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sana</TableHead>
              <TableHead>Turi</TableHead>
              <TableHead>Mahsulot</TableHead>
              <TableHead>Miqdor</TableHead>
              <TableHead>Narx</TableHead>
              <TableHead>Izoh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx: any) => {
              const config = typeMap[tx.type] || { label: tx.type, color: "" };
              return (
                <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                  <TableCell>
                    <Badge className={`${config.color} border-0`}>{config.label}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{tx.productName}</TableCell>
                  <TableCell>{tx.quantity} {tx.productUnit}</TableCell>
                  <TableCell>{formatCurrency(Number(tx.price) * tx.quantity)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{tx.notes || "-"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Tarix mavjud emas</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DebtTab({ dealer }: { dealer: any }) {
  const { data: payments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/payments"],
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const totalPaid = payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-debt-title">Qarz va to'lovlar</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Joriy qarz</p>
            <p className="text-3xl font-bold text-destructive" data-testid="text-dealer-debt">
              {formatCurrency(Number(dealer?.debt || 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Jami to'langan</p>
            <p className="text-3xl font-bold text-green-600" data-testid="text-dealer-total-paid">
              {formatCurrency(totalPaid)}
            </p>
          </CardContent>
        </Card>
      </div>

      <h3 className="font-semibold text-sm text-muted-foreground">To'lovlar tarixi</h3>
      {payments && payments.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sana</TableHead>
              <TableHead>Summa</TableHead>
              <TableHead>Turi</TableHead>
              <TableHead>Izoh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p: any) => (
              <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                <TableCell className="text-xs">{format(new Date(p.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                <TableCell className="font-medium text-green-600">{formatCurrency(Number(p.amount))}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {p.method === "cash" ? "Naqd" : p.method === "card" ? "Karta" : "O'tkazma"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.notes || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p>To'lov tarixi mavjud emas</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
