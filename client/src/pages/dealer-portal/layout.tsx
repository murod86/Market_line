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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, ShoppingCart, History, CreditCard, LogOut, Truck,
  Minus, Plus, Trash2, User, Phone, LayoutDashboard, TrendingUp, TrendingDown, Wallet, ArrowDownToLine, ArrowUpFromLine, Banknote, UserPlus, QrCode, Download, Edit, Search, Printer
} from "lucide-react";
import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import logoImg from "@assets/marketline_pro_logo_1.png";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

interface DealerLayoutProps {
  onLogout: () => void;
}

export default function DealerLayout({ onLogout }: DealerLayoutProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "sell" | "customers" | "delivery" | "history" | "debt">("dashboard");
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
    { id: "customers" as const, label: "Mijozlarim", icon: User },
    { id: "delivery" as const, label: "Buyurtmalar", icon: Truck },
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
        {activeTab === "customers" && <CustomersTab />}
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
  buyUnit: string;
  boxQuantity: number;
  stockPieces: number;
}

function SellTab() {
  const [cart, setCart] = useState<SellCartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dealerCustomerId, setDealerCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "debt" | "partial">("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const { toast } = useToast();

  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/inventory"],
  });

  const { data: dealerCustomers } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/customers"],
  });

  const printSaleReceipt = (items: SellCartItem[], totalAmt: number, custName: string, custPhone: string, pType: string, paidAmt: number) => {
    const now = new Date();
    const dateStr = format(now, "dd.MM.yyyy HH:mm");
    const debtAmt = pType === "debt" ? totalAmt : pType === "partial" ? Math.max(0, totalAmt - paidAmt) : 0;

    const itemsHtml = items.map(item =>
      `<tr>
        <td style="padding:4px 0;font-size:11px;border-bottom:1px dashed #ccc">${item.name}</td>
        <td style="padding:4px 0;font-size:11px;text-align:center;border-bottom:1px dashed #ccc">${item.buyUnit === "quti" ? `${item.quantity} quti` : `${item.stockPieces} ${item.unit}`}</td>
        <td style="padding:4px 0;font-size:11px;text-align:right;border-bottom:1px dashed #ccc">${(item.price * item.stockPieces).toLocaleString()} UZS</td>
      </tr>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page { size: 58mm auto; margin: 2mm; }
        body { font-family: 'Courier New', monospace; font-size: 11px; margin: 0; padding: 4px; width: 54mm; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
      </style></head><body>
      <div class="center bold" style="font-size:14px;margin-bottom:4px">MARKET_LINE</div>
      <div class="center" style="font-size:10px;margin-bottom:6px">Sotuv cheki</div>
      <div class="divider"></div>
      ${custName ? `<div style="font-size:10px;margin-bottom:2px"><b>Mijoz:</b> ${custName}</div>` : ""}
      ${custPhone ? `<div style="font-size:10px;margin-bottom:2px"><b>Tel:</b> ${custPhone}</div>` : ""}
      <div style="font-size:10px;margin-bottom:4px"><b>Sana:</b> ${dateStr}</div>
      <div class="divider"></div>
      <table>
        <tr><th style="text-align:left;font-size:10px">Nomi</th><th style="text-align:center;font-size:10px">Soni</th><th style="text-align:right;font-size:10px">Summa</th></tr>
        ${itemsHtml}
      </table>
      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;font-size:13px" class="bold">
        <span>JAMI:</span><span>${totalAmt.toLocaleString()} UZS</span>
      </div>
      ${pType === "cash" ? `<div style="font-size:10px;margin-top:4px"><b>To'lov:</b> Naqd</div>` : ""}
      ${pType === "debt" ? `<div style="font-size:10px;margin-top:4px;color:red"><b>Qarz:</b> ${totalAmt.toLocaleString()} UZS</div>` : ""}
      ${pType === "partial" ? `<div style="font-size:10px;margin-top:4px"><b>To'langan:</b> ${paidAmt.toLocaleString()} UZS</div><div style="font-size:10px;color:red"><b>Qarz:</b> ${debtAmt.toLocaleString()} UZS</div>` : ""}
      <div class="divider"></div>
      <div class="center" style="font-size:9px;margin-top:8px;color:#888">MARKET_LINE - Diller sotuv xizmati</div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close()},5000)}</script>
    </body></html>`;

    const w = window.open("", "_blank", "width=300,height=600");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const sellMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/dealer-portal/sell", data);
      return res.json();
    },
    onSuccess: () => {
      printSaleReceipt(cart, total, customerName, customerPhone, paymentType, Number(paidAmount) || 0);
      toast({ title: "Sotish muvaffaqiyatli amalga oshirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/customers"] });
      setCart([]);
      setCheckoutOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setDealerCustomerId("");
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
        const newQty = existing.quantity + 1;
        const newPieces = existing.buyUnit === "quti" ? newQty * existing.boxQuantity : newQty;
        if (newPieces > item.quantity) {
          toast({ title: "Omborda yetarli emas", variant: "destructive" });
          return prev;
        }
        return prev.map((c) =>
          c.productId === item.productId ? { ...c, quantity: newQty, stockPieces: newPieces } : c
        );
      }
      return [...prev, {
        productId: item.productId,
        name: item.productName,
        price: Number(item.productPrice),
        unit: item.productUnit,
        quantity: 1,
        maxQty: item.quantity,
        buyUnit: item.productUnit,
        boxQuantity: item.boxQuantity || 1,
        stockPieces: 1,
      }];
    });
  };

  const getUnitOptions = (_item: SellCartItem) => {
    return ["dona", "quti", "litr", "kg"];
  };

  const changeCartUnit = (productId: string, newUnit: string) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId !== productId) return c;
        let newQty = c.quantity;
        if (newUnit === "quti" && c.buyUnit !== "quti") {
          newQty = Math.max(1, Math.floor(c.quantity / c.boxQuantity));
        } else if (c.buyUnit === "quti" && newUnit !== "quti") {
          newQty = c.quantity * c.boxQuantity;
        }
        const newPieces = newUnit === "quti" ? newQty * c.boxQuantity : newQty;
        if (newPieces > c.maxQty) return c;
        return { ...c, buyUnit: newUnit, quantity: newQty, stockPieces: newPieces };
      })
    );
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId === productId) {
          const newQty = c.quantity + delta;
          if (newQty <= 0) return c;
          const newPieces = c.buyUnit === "quti" ? newQty * c.boxQuantity : newQty;
          if (newPieces > c.maxQty) {
            toast({ title: "Omborda yetarli emas", variant: "destructive" });
            return c;
          }
          return { ...c, quantity: newQty, stockPieces: newPieces };
        }
        return c;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const total = cart.reduce((s, c) => s + c.price * c.stockPieces, 0);

  const handleSell = () => {
    if (cart.length === 0) return;
    sellMutation.mutate({
      items: cart.map((c) => ({
        productId: c.productId,
        quantity: c.stockPieces,
        price: c.price,
      })),
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      dealerCustomerId: dealerCustomerId || null,
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
                              {item.quantity - (inCart?.stockPieces || 0)} {item.productUnit}
                            </Badge>
                          </div>
                          {(item.boxQuantity || 1) > 1 && (
                            <p className="text-[10px] text-muted-foreground">1 quti = {item.boxQuantity} {item.productUnit}</p>
                          )}
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
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.price)} × {item.stockPieces} {item.unit} = {formatCurrency(item.price * item.stockPieces)}
                          </p>
                          {item.buyUnit === "quti" && item.boxQuantity > 1 && (
                            <p className="text-[10px] text-blue-600">
                              {item.quantity} quti × {item.boxQuantity} = {item.stockPieces} {item.unit}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {getUnitOptions(item).length > 1 && (
                            <Select value={item.buyUnit} onValueChange={(val) => changeCartUnit(item.productId, val)}>
                              <SelectTrigger className="h-7 w-16 text-[10px] px-1.5" data-testid={`select-sell-unit-${item.productId}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getUnitOptions(item).map((u) => (
                                  <SelectItem key={u} value={u}>{u}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
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
            {dealerCustomers && dealerCustomers.length > 0 && (
              <div>
                <Label>
                  <User className="h-3.5 w-3.5 inline mr-1" />
                  Mijozni tanlang
                </Label>
                <Select
                  value={dealerCustomerId || "none"}
                  onValueChange={(v) => {
                    if (v === "none") {
                      setDealerCustomerId("");
                      setCustomerName("");
                      setCustomerPhone("");
                    } else {
                      setDealerCustomerId(v);
                      const dc = dealerCustomers.find((c: any) => c.id === v);
                      if (dc) { setCustomerName(dc.name); setCustomerPhone(dc.phone || ""); }
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-sell-dealer-customer">
                    <SelectValue placeholder="Mijoz tanlang..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yangi mijoz (qo'lda kiritish)</SelectItem>
                    {dealerCustomers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""} {Number(c.debt) > 0 ? `- Qarz: ${formatCurrency(Number(c.debt))}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!dealerCustomerId && (
              <>
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
              </>
            )}

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
                      <span>{item.name} × {item.buyUnit === "quti" ? `${item.quantity} quti (${item.stockPieces} ${item.unit})` : `${item.stockPieces} ${item.unit}`}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.stockPieces)}</span>
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

function CustomersTab() {
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [qrCustomer, setQrCustomer] = useState<any>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { data: dealer } = useQuery<any>({ queryKey: ["/api/dealer-portal/me"] });

  const { data: customers, isLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/customers"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/dealer-portal/customers", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Mijoz qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/customers"] });
      setAddOpen(false);
      setNewName("");
      setNewPhone("");
      setNewPassword("");
      setNewAddress("");
      setQrCustomer(data);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, amount, method, notes }: any) => {
      const res = await apiRequest("POST", `/api/dealer-portal/customers/${id}/payment`, { amount, method, notes });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "To'lov qabul qilindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/customers"] });
      setPayOpen(null);
      setPayAmount("");
      setPayNotes("");
      setPayMethod("cash");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const totalDebt = customers?.reduce((s: number, c: any) => s + Number(c.debt), 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" data-testid="text-dealer-customers-title">Mijozlarim</h2>
        <div className="flex items-center gap-3">
          {totalDebt > 0 && (
            <Badge variant="destructive" className="text-sm" data-testid="text-dealer-customers-total-debt">
              Jami qarz: {formatCurrency(totalDebt)}
            </Badge>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-add-dealer-customer">
            <UserPlus className="h-4 w-4 mr-1" /> Yangi mijoz
          </Button>
        </div>
      </div>

      {customers && customers.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Qarz</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c: any) => (
                  <TableRow key={c.id} data-testid={`row-dealer-customer-${c.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                          {c.name.charAt(0)}
                        </div>
                        {c.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.phone ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {Number(c.debt) > 0 ? (
                        <Badge variant="destructive">{formatCurrency(Number(c.debt))}</Badge>
                      ) : (
                        <Badge variant="secondary">Qarz yo'q</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setQrCustomer(c)}
                          data-testid={`button-qr-dealer-customer-${c.id}`}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        {Number(c.debt) > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() => { setPayOpen(c); setPayAmount(""); setPayNotes(""); setPayMethod("cash"); }}
                            data-testid={`button-pay-dealer-customer-${c.id}`}
                          >
                            <Banknote className="h-4 w-4 mr-1" />
                            To'lov olish
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Hali mijoz yo'q</p>
            <p className="text-sm mt-1">Sotish paytida yoki bu yerda mijoz qo'shing</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Yangi mijoz</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Ism *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Mijoz ismi" data-testid="input-dealer-customer-name" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+998..." data-testid="input-dealer-customer-phone" />
            </div>
            <div>
              <Label>Parol</Label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Parol" data-testid="input-dealer-customer-password" />
            </div>
            <div>
              <Label>Manzil</Label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Mijoz manzili" data-testid="input-dealer-customer-address" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => { if (!newName.trim()) { return; } addMutation.mutate({ name: newName.trim(), phone: newPhone.trim() || null, password: newPassword.trim() || null, address: newAddress.trim() || null }); }}
              disabled={addMutation.isPending}
              data-testid="button-save-dealer-customer"
            >
              {addMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payOpen} onOpenChange={(o) => { if (!o) setPayOpen(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>To'lov olish: {payOpen?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-sm text-muted-foreground">Joriy qarz</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(Number(payOpen?.debt || 0))}</p>
            </div>
            <div>
              <Label>Summa *</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="To'lov summasi"
                data-testid="input-dealer-customer-pay-amount"
              />
            </div>
            <div>
              <Label>To'lov turi</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger data-testid="select-dealer-customer-pay-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Naqd</SelectItem>
                  <SelectItem value="card">Karta</SelectItem>
                  <SelectItem value="transfer">O'tkazma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Izoh</Label>
              <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Izoh..." data-testid="input-dealer-customer-pay-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Bekor qilish</Button>
            <Button
              onClick={() => {
                const amt = Number(payAmount);
                if (!amt || amt <= 0) return;
                payMutation.mutate({ id: payOpen.id, amount: amt, method: payMethod, notes: payNotes.trim() || null });
              }}
              disabled={payMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-dealer-customer-pay"
            >
              {payMutation.isPending ? "Saqlanmoqda..." : "To'lovni tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrCustomer} onOpenChange={(o) => { if (!o) setQrCustomer(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Mijoz QR kodi
            </DialogTitle>
          </DialogHeader>
          {qrCustomer && (
            <div className="flex flex-col items-center gap-4">
              <div
                ref={qrRef}
                className="bg-white p-6 rounded-xl border-2 border-dashed border-muted"
                data-testid="dealer-qr-code-container"
              >
                <div className="flex flex-col items-center gap-3">
                  <img src={logoImg} alt="MARKET_LINE" className="h-8 w-auto" />
                  <QRCodeSVG
                    value={`${window.location.origin}/portal?store=${qrCustomer.tenantId || dealer?.tenantId || ""}&phone=${encodeURIComponent(qrCustomer.phone || "")}`}
                    size={200}
                    level="H"
                    includeMargin={false}
                    fgColor="#2563eb"
                  />
                  <div className="text-center">
                    <p className="font-bold text-gray-800 text-sm">{qrCustomer.name}</p>
                    {qrCustomer.phone && <p className="text-gray-500 text-xs">{qrCustomer.phone}</p>}
                  </div>
                  <p className="text-blue-600 text-xs font-medium">Portalga kirish uchun skanerlang</p>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!qrRef.current) return;
                  const svg = qrRef.current.querySelector("svg");
                  if (!svg) return;
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");
                  const data = new XMLSerializer().serializeToString(svg);
                  const img = new Image();
                  canvas.width = 400;
                  canvas.height = 500;
                  img.onload = () => {
                    if (!ctx) return;
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 100, 40, 200, 200);
                    ctx.fillStyle = "#1e293b";
                    ctx.font = "bold 18px sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText(qrCustomer.name, 200, 280);
                    if (qrCustomer.phone) {
                      ctx.fillStyle = "#64748b";
                      ctx.font = "14px sans-serif";
                      ctx.fillText(qrCustomer.phone, 200, 305);
                    }
                    ctx.fillStyle = "#2563eb";
                    ctx.font = "12px sans-serif";
                    ctx.fillText("MARKET_LINE - Mijoz QR", 200, 340);
                    const link = document.createElement("a");
                    link.download = `qr-${qrCustomer.name}.png`;
                    link.href = canvas.toDataURL("image/png");
                    link.click();
                  };
                  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
                }}
                data-testid="button-download-dealer-qr"
              >
                <Download className="h-4 w-4 mr-2" />
                QR kodni yuklab olish
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeliveryTab() {
  const { data: deliveries, isLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/deliveries"],
  });
  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/inventory"],
  });
  const { toast } = useToast();
  const [editOrder, setEditOrder] = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/dealer-portal/deliveries/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Yetkazish holati yangilandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/customers"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, items }: { id: string; items: any[] }) => {
      const res = await apiRequest("PUT", `/api/dealer-portal/deliveries/${id}/items`, {
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Buyurtma tahrirlandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/deliveries"] });
      setEditOrder(null);
      setEditItems([]);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const openEdit = (order: any) => {
    setEditOrder(order);
    setEditItems(
      (order.items || []).map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        productUnit: item.productUnit || "dona",
        quantity: item.quantity,
        price: Number(item.price),
      }))
    );
  };

  const updateItemQty = (productId: string, delta: number) => {
    setEditItems(prev =>
      prev.map(i => {
        if (i.productId !== productId) return i;
        const inv = inventory?.find(inv => inv.productId === productId);
        const maxQty = inv?.quantity || 999;
        const newQty = Math.max(1, Math.min(maxQty, i.quantity + delta));
        return { ...i, quantity: newQty };
      })
    );
  };

  const removeItem = (productId: string) => {
    setEditItems(prev => prev.filter(i => i.productId !== productId));
  };

  const addProduct = (product: any) => {
    const exists = editItems.find(i => i.productId === product.productId);
    if (exists) {
      updateItemQty(product.productId, 1);
    } else {
      setEditItems(prev => [
        ...prev,
        {
          productId: product.productId,
          productName: product.productName,
          productUnit: product.productUnit || "dona",
          quantity: 1,
          price: Number(product.productPrice || product.price || 0),
        },
      ]);
    }
    setAddProductOpen(false);
    setProductSearch("");
  };

  const editTotal = editItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const printDeliveryReceipt = (d: any) => {
    const items = d.items || [];
    const total = Number(d.totalAmount || 0);
    const now = new Date();
    const dateStr = format(now, "dd.MM.yyyy HH:mm");

    const itemsHtml = items.map((item: any) =>
      `<tr>
        <td style="padding:4px 0;font-size:11px;border-bottom:1px dashed #ccc">${item.productName}</td>
        <td style="padding:4px 0;font-size:11px;text-align:center;border-bottom:1px dashed #ccc">${item.quantity} ${item.productUnit || "dona"}</td>
        <td style="padding:4px 0;font-size:11px;text-align:right;border-bottom:1px dashed #ccc">${Number(item.total || item.price * item.quantity).toLocaleString()} UZS</td>
      </tr>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page { size: 58mm auto; margin: 2mm; }
        body { font-family: 'Courier New', monospace; font-size: 11px; margin: 0; padding: 4px; width: 54mm; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
      </style></head><body>
      <div class="center bold" style="font-size:14px;margin-bottom:4px">MARKET_LINE</div>
      <div class="center" style="font-size:10px;margin-bottom:6px">Yetkazib berish cheki</div>
      <div class="divider"></div>
      <div style="font-size:10px;margin-bottom:2px"><b>Mijoz:</b> ${d.customerName || "-"}</div>
      ${d.customerPhone ? `<div style="font-size:10px;margin-bottom:2px"><b>Tel:</b> ${d.customerPhone}</div>` : ""}
      ${d.address ? `<div style="font-size:10px;margin-bottom:2px"><b>Manzil:</b> ${d.address}</div>` : ""}
      <div style="font-size:10px;margin-bottom:4px"><b>Sana:</b> ${dateStr}</div>
      <div class="divider"></div>
      <table>
        <tr><th style="text-align:left;font-size:10px">Nomi</th><th style="text-align:center;font-size:10px">Soni</th><th style="text-align:right;font-size:10px">Summa</th></tr>
        ${itemsHtml}
      </table>
      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;font-size:13px" class="bold">
        <span>JAMI:</span><span>${total.toLocaleString()} UZS</span>
      </div>
      <div class="divider"></div>
      <div class="center" style="font-size:10px;margin-top:4px">Qarzga yetkazildi</div>
      <div class="center" style="font-size:9px;margin-top:8px;color:#888">MARKET_LINE - Yetkazib berish xizmati</div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close()},5000)}</script>
    </body></html>`;

    const w = window.open("", "_blank", "width=300,height=600");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const availableProducts = inventory?.filter(inv => {
    const matchSearch = !productSearch || inv.productName?.toLowerCase().includes(productSearch.toLowerCase());
    return matchSearch && inv.quantity > 0;
  }) || [];

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
      <h2 className="text-lg font-bold" data-testid="text-delivery-title">Buyurtmalar</h2>

      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Faol buyurtmalar ({active.length})</p>
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
                          <span>{item.productName} x {item.quantity} {item.productUnit}</span>
                          <span className="font-medium">{formatCurrency(Number(item.total))}</span>
                        </div>
                      ))}
                      {d.totalAmount && (
                        <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                          <span>Jami:</span>
                          <span>{formatCurrency(Number(d.totalAmount))}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {d.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(d)}
                          data-testid={`button-edit-delivery-${d.id}`}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Tahrirlash
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => statusMutation.mutate({ id: d.id, status: "in_transit" })}
                          disabled={statusMutation.isPending}
                          data-testid={`button-start-delivery-${d.id}`}
                        >
                          <Truck className="h-3.5 w-3.5 mr-1" />
                          Yo'lga chiqish
                        </Button>
                      </>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => printDeliveryReceipt(d)}
                      data-testid={`button-print-delivery-${d.id}`}
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" />
                      Chek
                    </Button>
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
            <p>Hozircha buyurtmalar yo'q</p>
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
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(d.createdAt), "dd.MM.yyyy HH:mm")}
                      {d.totalAmount ? ` • ${formatCurrency(Number(d.totalAmount))}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.status === "delivered" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => printDeliveryReceipt(d)}
                        data-testid={`button-print-done-${d.id}`}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Badge className={`${st.color} border-0`}>{st.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editOrder} onOpenChange={(o) => { if (!o) { setEditOrder(null); setEditItems([]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Buyurtmani tahrirlash
            </DialogTitle>
          </DialogHeader>
          {editOrder && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>Mijoz:</strong> {editOrder.customerName}</p>
                {editOrder.customerPhone && <p className="text-muted-foreground">{editOrder.customerPhone}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Mahsulotlar</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setAddProductOpen(true); setProductSearch(""); }}
                    data-testid="button-add-product-to-order"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Qo'shish
                  </Button>
                </div>

                {editItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Mahsulotlar yo'q. Kamida 1 ta qo'shing.
                  </p>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {editItems.map((item) => (
                      <div key={item.productId} className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.price)} / {item.productUnit}
                            {(() => { const inv = inventory?.find(i => i.productId === item.productId); return inv ? ` • omborda: ${inv.quantity}` : ""; })()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateItemQty(item.productId, -1)}
                            disabled={item.quantity <= 1}
                            data-testid={`button-dec-qty-${item.productId}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateItemQty(item.productId, 1)}
                            disabled={(() => { const inv = inventory?.find(i => i.productId === item.productId); return item.quantity >= (inv?.quantity || 0); })()}
                            data-testid={`button-inc-qty-${item.productId}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm font-medium w-24 text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeItem(item.productId)}
                          data-testid={`button-remove-item-${item.productId}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center text-base font-bold pt-2 border-t">
                  <span>Jami:</span>
                  <span data-testid="text-edit-total">{formatCurrency(editTotal)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOrder(null); setEditItems([]); }}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => {
                if (editItems.length === 0) {
                  toast({ title: "Kamida 1 ta mahsulot bo'lishi kerak", variant: "destructive" });
                  return;
                }
                editMutation.mutate({ id: editOrder.id, items: editItems });
              }}
              disabled={editMutation.isPending || editItems.length === 0}
              data-testid="button-save-edit-order"
            >
              {editMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addProductOpen} onOpenChange={(o) => { if (!o) { setAddProductOpen(false); setProductSearch(""); } }}>
        <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Mahsulot qo'shish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Mahsulot qidirish..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-add-product"
              />
            </div>
            {availableProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Omboringizda mahsulot topilmadi
              </p>
            ) : (
              <div className="border rounded-lg divide-y max-h-[40vh] overflow-y-auto">
                {availableProducts.map((p: any) => (
                  <button
                    key={p.productId}
                    className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                    onClick={() => addProduct(p)}
                    data-testid={`button-select-product-${p.productId}`}
                  >
                    <p className="text-sm font-medium">{p.productName}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        Omborda: {p.quantity} {p.productUnit || "dona"}
                      </span>
                      <span className="text-xs font-medium">
                        {formatCurrency(Number(p.productPrice || 0))}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
  const currentDebt = Number(dealer?.debt || 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-debt-title">Qarz va to'lovlar</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Joriy qarz</p>
            <p className="text-3xl font-bold text-destructive" data-testid="text-dealer-debt">
              {formatCurrency(currentDebt)}
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

      {currentDebt > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-amber-700 dark:text-amber-400" data-testid="text-pay-admin-note">
              Qarzni to'lash uchun adminga murojaat qiling. To'lovni admin tasdiqlaydi.
            </p>
          </CardContent>
        </Card>
      )}

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
