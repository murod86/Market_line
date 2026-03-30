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
  Minus, Plus, Trash2, User, Phone, LayoutDashboard, TrendingUp, TrendingDown, Wallet, ArrowDownToLine, ArrowUpFromLine, Banknote, UserPlus, QrCode, Download, Edit, Search, Printer, Users, AlertCircle, Eye
} from "lucide-react";
import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import logoImg from "@assets/marketline_pro_logo_1.png";
import { getSellUnitOptions, toNativeQty, stockToDisplayQty, toDisplayPrice, toNativePrice, productPriceLabel } from "@/lib/units";

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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
              <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 max-w-[140px] truncate" data-testid="text-dealer-name">
                {dealer?.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-dealer-logout"
              className="h-8 w-8 p-0"
              title="Chiqish"
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
  const { toast } = useToast();
  const { data: inventory, isLoading: invLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/inventory"],
  });
  const { data: transactions, isLoading: txLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/transactions"],
  });
  const { data: payments, isLoading: payLoading } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/payments"],
  });
  const { data: dealerCustomers } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/customers"],
  });

  const [editTx, setEditTx] = useState<any>(null);
  const [deleteTx, setDeleteTx] = useState<any>(null);
  const [viewTx, setViewTx] = useState<any>(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCustName, setEditCustName] = useState("");
  const [editCustPhone, setEditCustPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const openEdit = (tx: any) => {
    setEditTx(tx);
    setEditQty(String(tx.quantity));
    setEditPrice(String(tx.price));
    setEditCustName(tx.customerName || "");
    setEditCustPhone(tx.customerPhone || "");
    setEditNotes(tx.notes || "");
  };

  const dashEditMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/dealer-portal/transactions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sotuv tahrirlandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/transactions"] });
      setEditTx(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const dashDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/dealer-portal/transactions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sotuv o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/inventory"] });
      setDeleteTx(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
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

      {(() => {
        const customersWithDebt = (dealerCustomers || []).filter((c: any) => Number(c.debt) > 0);
        const totalCustomerDebt = customersWithDebt.reduce((s: number, c: any) => s + Number(c.debt), 0);
        if (customersWithDebt.length === 0) return null;
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Mijozlar qarzi
              </h3>
              <Badge variant="destructive" data-testid="text-dash-customer-debt-total">
                Jami: {formatCurrency(totalCustomerDebt)}
              </Badge>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mijoz</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead className="text-right">Qarz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customersWithDebt.map((c: any) => (
                      <TableRow key={c.id} data-testid={`row-dash-debt-${c.id}`}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.phone || "-"}</TableCell>
                        <TableCell className="text-right font-bold text-destructive">
                          <div className="flex items-center justify-end gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {formatCurrency(Number(c.debt))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      })()}

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
                    <TableHead>To'lov</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...sellTxs]
                    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                    .slice(0, 10)
                    .map((t: any) => {
                    const pt = t.paymentType;
                    const payBadge = pt === "debt"
                      ? <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">Qarz</Badge>
                      : pt === "partial"
                      ? <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200 bg-orange-50">Qisman</Badge>
                      : <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">Naqd</Badge>;
                    const dateStr = t.createdAt ? (() => { try { return format(new Date(t.createdAt), "dd.MM HH:mm"); } catch { return "—"; } })() : "—";
                    return (
                      <TableRow key={t.id} data-testid={`row-dash-sale-${t.id}`}>
                        <TableCell className="text-xs">{dateStr}</TableCell>
                        <TableCell className="text-sm font-medium">{t.productName || t.productId}</TableCell>
                        <TableCell>{t.quantity} {t.productUnit}</TableCell>
                        <TableCell className="font-medium text-green-600">{formatCurrency(Number(t.total))}</TableCell>
                        <TableCell>{payBadge}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.customerName || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewTx(t)} data-testid={`button-view-dash-sale-${t.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)} data-testid={`button-edit-dash-sale-${t.id}`}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTx(t)} data-testid={`button-delete-dash-sale-${t.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {(() => {
        const debtSells = sellTxs.filter((t: any) => {
          if (t.paymentType === "debt") return true;
          if (t.paymentType === "partial") return Math.max(0, Number(t.total) - Number(t.paidAmount || 0)) > 0;
          return false;
        });
        if (debtSells.length === 0) return null;
        const totalDebtAmount = debtSells.reduce((s: number, t: any) => s + Math.max(0, Number(t.total) - Number(t.paidAmount || 0)), 0);
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-orange-500" />
                Qarzga berilgan sotuvlar
              </h3>
              <Badge variant="destructive" data-testid="text-dash-debt-sells-total">
                Jami qarz: {formatCurrency(totalDebtAmount)}
              </Badge>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sana</TableHead>
                      <TableHead>Mahsulot</TableHead>
                      <TableHead>Soni</TableHead>
                      <TableHead>Jami</TableHead>
                      <TableHead>Qarz</TableHead>
                      <TableHead>Mijoz</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debtSells.reverse().map((t: any) => {
                      const debtAmount = Math.max(0, Number(t.total) - Number(t.paidAmount || 0));
                      return (
                        <TableRow key={t.id} data-testid={`row-dash-debt-sell-${t.id}`}>
                          <TableCell className="text-xs">{format(new Date(t.createdAt), "dd.MM HH:mm")}</TableCell>
                          <TableCell className="text-sm font-medium">{t.productName || t.productId}</TableCell>
                          <TableCell className="text-sm">{t.quantity} {t.productUnit}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(Number(t.total))}</TableCell>
                          <TableCell className="text-sm font-bold text-destructive">{formatCurrency(debtAmount)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.customerName || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewTx(t)} data-testid={`button-view-debt-sell-${t.id}`}>
                                <Search className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)} data-testid={`button-edit-debt-sell-${t.id}`}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTx(t)} data-testid={`button-delete-debt-sell-${t.id}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* To'lovlar tarixi */}
      {payments && payments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Banknote className="h-4 w-4 text-green-500" />
              Admin ga to'lovlar
            </h3>
            <Badge variant="outline" className="text-green-600 border-green-200">
              Jami: {formatCurrency(totalPaid)}
            </Badge>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead className="text-right">Summa</TableHead>
                    <TableHead>Turi</TableHead>
                    <TableHead>Izoh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...payments].reverse().slice(0, 10).map((p: any) => (
                    <TableRow key={p.id} data-testid={`row-dash-payment-${p.id}`}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(p.createdAt), "dd.MM.yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(Number(p.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {p.method === "cash" ? "Naqd" : p.method === "card" ? "Karta" : "O'tkazma"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ko'rish dialogi */}
      <Dialog open={!!viewTx} onOpenChange={(o) => { if (!o) setViewTx(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Sotuv tafsiloti
            </DialogTitle>
          </DialogHeader>
          {viewTx && (
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/60 font-semibold text-base">{viewTx.productName}</div>
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-muted-foreground">Sana:</span>
                <span className="font-medium">{format(new Date(viewTx.createdAt), "dd.MM.yyyy HH:mm")}</span>
                <span className="text-muted-foreground">Miqdor:</span>
                <span className="font-medium">{viewTx.quantity} {viewTx.productUnit}</span>
                <span className="text-muted-foreground">Narxi:</span>
                <span className="font-medium">{formatCurrency(Number(viewTx.price))}</span>
                <span className="text-muted-foreground">Jami summa:</span>
                <span className="font-medium text-green-600">{formatCurrency(Number(viewTx.total))}</span>
                {viewTx.paidAmount && Number(viewTx.paidAmount) < Number(viewTx.total) && (
                  <>
                    <span className="text-muted-foreground">To'langan:</span>
                    <span className="font-medium">{formatCurrency(Number(viewTx.paidAmount))}</span>
                    <span className="text-muted-foreground">Qarz:</span>
                    <span className="font-bold text-destructive">{formatCurrency(Math.max(0, Number(viewTx.total) - Number(viewTx.paidAmount)))}</span>
                  </>
                )}
                <span className="text-muted-foreground">Mijoz:</span>
                <span className="font-medium">{viewTx.customerName || "-"}</span>
                {viewTx.customerPhone && (
                  <>
                    <span className="text-muted-foreground">Telefon:</span>
                    <span className="font-medium">{viewTx.customerPhone}</span>
                  </>
                )}
                {viewTx.notes && (
                  <>
                    <span className="text-muted-foreground">Izoh:</span>
                    <span className="font-medium">{viewTx.notes}</span>
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTx(null)}>Yopish</Button>
            {viewTx && (
              <Button onClick={() => { openEdit(viewTx); setViewTx(null); }}>
                <Edit className="h-4 w-4 mr-1" /> Tahrirlash
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tahrirlash dialogi */}
      <Dialog open={!!editTx} onOpenChange={(o) => { if (!o) setEditTx(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Sotuvni tahrirlash
            </DialogTitle>
          </DialogHeader>
          {editTx && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-md bg-muted text-sm font-medium">{editTx.productName}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Miqdor ({editTx.productUnit})</Label>
                  <Input type="number" min="1" value={editQty} onChange={(e) => setEditQty(e.target.value)} data-testid="input-dash-edit-qty" />
                </div>
                <div>
                  <Label className="text-xs">Narx</Label>
                  <Input type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} data-testid="input-dash-edit-price" />
                </div>
              </div>
              {editQty && editPrice && (
                <div className="text-sm font-semibold text-primary text-right">
                  Jami: {formatCurrency(Number(editQty) * Number(editPrice))}
                </div>
              )}
              <div>
                <Label className="text-xs">Mijoz ismi</Label>
                <Input value={editCustName} onChange={(e) => setEditCustName(e.target.value)} placeholder="Mijoz ismi" data-testid="input-dash-edit-customer" />
              </div>
              <div>
                <Label className="text-xs">Telefon</Label>
                <Input value={editCustPhone} onChange={(e) => setEditCustPhone(e.target.value)} placeholder="+998..." data-testid="input-dash-edit-phone" />
              </div>
              <div>
                <Label className="text-xs">Izoh</Label>
                <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Izoh..." data-testid="input-dash-edit-notes" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTx(null)}>Bekor</Button>
            <Button
              disabled={dashEditMutation.isPending || !editQty || !editPrice || Number(editQty) < 1}
              onClick={() => dashEditMutation.mutate({ id: editTx.id, data: { quantity: Number(editQty), price: Number(editPrice), customerName: editCustName || null, customerPhone: editCustPhone || null, notes: editNotes || null } })}
              data-testid="button-save-dash-edit"
            >
              {dashEditMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* O'chirish dialogi */}
      <Dialog open={!!deleteTx} onOpenChange={(o) => { if (!o) setDeleteTx(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sotuvni o'chirish</DialogTitle>
          </DialogHeader>
          {deleteTx && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{deleteTx.productName}</span> sotuvini o'chirmoqchimisiz?
                Mahsulot omboringizga qaytariladi.
              </p>
              <p className="text-sm font-semibold">Summa: {formatCurrency(Number(deleteTx.total))}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTx(null)}>Bekor</Button>
            <Button
              variant="destructive"
              disabled={dashDeleteMutation.isPending}
              onClick={() => dashDeleteMutation.mutate(deleteTx.id)}
              data-testid="button-confirm-dash-delete"
            >
              {dashDeleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                    <p className="text-lg font-bold text-primary">
                      {productPriceLabel(Number(item.productPrice), item.productUnit)}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="outline" className="text-xs">
                        {(() => {
                          const fakeP = { unit: item.productUnit, boxQuantity: item.boxQuantity || 1 } as any;
                          const defUnit = getSellUnitOptions(fakeP)[0];
                          const dispQty = stockToDisplayQty(item.quantity, defUnit, item.productUnit, item.boxQuantity || 1);
                          return `${dispQty} ${defUnit}`;
                        })()}
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
  customPrice?: number;
  failKey?: number;
}

function SellTab() {
  const [cart, setCart] = useState<SellCartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false);
  const [createCustomerMode, setCreateCustomerMode] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustPassword, setNewCustPassword] = useState("");
  const [sellQrCustomer, setSellQrCustomer] = useState<any>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dealerCustomerId, setDealerCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDialogSearch, setCustomerDialogSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "debt" | "partial">("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [paperSize, setPaperSize] = useState<"58mm" | "80mm" | "A4">(() =>
    (localStorage.getItem("dealer_paper_size") as "58mm" | "80mm" | "A4") || "58mm"
  );
  const { toast } = useToast();

  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/inventory"],
  });

  const { data: dealerCustomers } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/customers"],
  });

  const createCustomerMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/dealer-portal/customers", data);
      return res.json();
    },
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/customers"] });
      setDealerCustomerId(created.id);
      setCustomerName(created.name);
      setCustomerPhone(created.phone || "");
      setCreateCustomerMode(false);
      setNewCustName(""); setNewCustPhone(""); setNewCustAddress(""); setNewCustPassword("");
      setCustomerSelectOpen(false);
      toast({ title: "Mijoz qo'shildi" });
      if (created.phone) setSellQrCustomer(created);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const printSaleReceipt = (items: SellCartItem[], subtotalAmt: number, discAmt: number, totalAmt: number, custName: string, custPhone: string, pType: string, paidAmt: number, ps: "58mm" | "80mm" | "A4" = "58mm") => {
    const now = new Date();
    const dateStr = format(now, "dd.MM.yyyy HH:mm");
    const debtAmt = pType === "debt" ? totalAmt : pType === "partial" ? Math.max(0, totalAmt - paidAmt) : 0;

    const sizeMap = {
      "58mm": { pageWidth: "58mm", bodyWidth: "54mm", baseFontSize: "11px", padding: "1mm 2mm" },
      "80mm": { pageWidth: "80mm", bodyWidth: "76mm", baseFontSize: "13px", padding: "2mm 3mm" },
      "A4":   { pageWidth: "210mm", bodyWidth: "190mm", baseFontSize: "14px", padding: "5mm 8mm" },
    };
    const sz = sizeMap[ps];

    const itemsHtml = items.map(item => {
      const isKgGram = item.unit === "gram" && item.buyUnit === "kg";
      const ql = item.buyUnit === "quti"
        ? `${item.quantity} quti (${item.stockPieces} ${item.unit})`
        : isKgGram
          ? `${item.quantity} kg (${item.stockPieces} gram)`
          : `${item.stockPieces} ${item.unit}`;
      const nativeUnitPrice = item.customPrice ?? item.price;
      const dispUnitPrice = isKgGram ? nativeUnitPrice * 1000 : nativeUnitPrice;
      const dispUnit = isKgGram ? "kg" : item.buyUnit;
      const unitPriceStr = dispUnitPrice.toLocaleString();
      const totalPriceStr = (nativeUnitPrice * item.stockPieces).toLocaleString();
      return `<tr>
        <td colspan="2" style="padding:4px 2px 1px 2px;font-weight:900;border-top:2px solid #000;font-size:1.05em">${item.name}</td>
      </tr>
      <tr>
        <td style="padding:1px 2px;font-weight:700">${ql}</td>
        <td style="padding:1px 2px;text-align:right;font-weight:700">${unitPriceStr}/${dispUnit}</td>
      </tr>
      <tr>
        <td style="padding:1px 2px 5px 2px;font-weight:900">= Jami:</td>
        <td style="padding:1px 2px 5px 2px;font-weight:900;text-align:right">${totalPriceStr} UZS</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        @page { size: ${sz.pageWidth} auto; margin: 0; }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:${sz.bodyWidth}; font-family:'Courier New',monospace; font-size:${sz.baseFontSize}; font-weight:700; line-height:1.5; padding:${sz.padding}; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .center { text-align:center; }
        .bold { font-weight:900; }
        .divider { border-top:2px solid #000; margin:5px 0; }
        table { width:100%; border-collapse:collapse; }
        td { font-weight:700; color:#000; }
        div,span,p,b { color:#000; }
        b { font-weight:900; }
      </style></head><body>
      <div class="center bold" style="font-size:1.4em;margin-bottom:2px;letter-spacing:1px">MARKET_LINE</div>
      <div class="center bold" style="font-size:1em;margin-bottom:5px">Sotuv cheki</div>
      <div class="divider"></div>
      ${custName ? `<div style="margin-bottom:2px"><b>Mijoz:</b> ${custName}</div>` : ""}
      ${custPhone ? `<div style="margin-bottom:2px"><b>Tel:</b> ${custPhone}</div>` : ""}
      <div style="margin-bottom:4px"><b>Sana:</b> ${dateStr}</div>
      <div class="divider"></div>
      <table>${itemsHtml}</table>
      <div class="divider"></div>
      ${discAmt > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span>Summa:</span><span>${subtotalAmt.toLocaleString()} UZS</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span>Chegirma:</span><span>-${discAmt.toLocaleString()} UZS</span>
        </div>
      ` : ""}
      <div style="display:flex;justify-content:space-between;font-size:1.3em;font-weight:900;border-top:2px solid #000;padding-top:3px;margin-top:2px">
        <span>JAMI:</span><span>${totalAmt.toLocaleString()} UZS</span>
      </div>
      ${pType === "cash" ? `<div style="margin-top:4px"><b>To'lov:</b> Naqd</div>` : ""}
      ${pType === "debt" ? `<div style="margin-top:4px"><b>Qarz:</b> ${totalAmt.toLocaleString()} UZS</div>` : ""}
      ${pType === "partial" ? `<div style="margin-top:4px"><b>To'langan:</b> ${paidAmt.toLocaleString()} UZS</div><div><b>Qarz:</b> ${debtAmt.toLocaleString()} UZS</div>` : ""}
      <div class="divider"></div>
      <div class="center bold" style="font-size:1em;margin-top:5px">Xaridingiz uchun rahmat!</div>
      <script>window.onload=function(){setTimeout(function(){window.print();window.onafterprint=function(){window.close()};setTimeout(function(){window.close()},8000)},300)}<\/script>
    </body></html>`;

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      let iframe = document.getElementById("dealer-print-iframe") as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "dealer-print-iframe";
        iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
        document.body.appendChild(iframe);
      }
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open(); iframeDoc.write(html); iframeDoc.close();
        setTimeout(() => { iframe.contentWindow?.print(); }, 400);
      }
    } else {
      const w = window.open("", "_blank", "width=320,height=600");
      if (w) { w.document.write(html); w.document.close(); }
    }
  };

  const sellMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/dealer-portal/sell", data);
      return res.json();
    },
    onSuccess: () => {
      printSaleReceipt(cart, subtotal, discountAmount, total, customerName, customerPhone, paymentType, Number(paidAmount) || 0, paperSize);
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
      setCustomerSearch("");
      setCustomerDialogSearch("");
      setNotes("");
      setPaymentType("cash");
      setPaidAmount("");
      setDiscountValue("");
      setDiscountType("amount");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const addToCart = (item: any) => {
    setCart((prev) => {
      const bq = item.boxQuantity || 1;
      const fakeProduct = { unit: item.productUnit, boxQuantity: bq } as any;
      const defaultUnit = getSellUnitOptions(fakeProduct)[0];
      const existing = prev.find((c) => c.productId === item.productId);
      if (existing) {
        const newQty = existing.quantity + 1;
        const newPieces = toNativeQty(newQty, existing.buyUnit, item.productUnit, bq);
        if (newPieces > item.quantity) {
          toast({ title: "Omborda yetarli emas", variant: "destructive" });
          return prev;
        }
        return prev.map((c) =>
          c.productId === item.productId ? { ...c, quantity: newQty, stockPieces: newPieces } : c
        );
      }
      const initPieces = toNativeQty(1, defaultUnit, item.productUnit, bq);
      if (initPieces > item.quantity) {
        toast({ title: "Omborda yetarli emas", variant: "destructive" });
        return prev;
      }
      return [...prev, {
        productId: item.productId,
        name: item.productName,
        price: Number(item.productPrice),
        unit: item.productUnit,
        quantity: 1,
        maxQty: item.quantity,
        buyUnit: defaultUnit,
        boxQuantity: bq,
        stockPieces: initPieces,
      }];
    });
  };

  const getUnitOptions = (item: SellCartItem): string[] => {
    const fakeProduct = { unit: item.unit, boxQuantity: item.boxQuantity } as any;
    return getSellUnitOptions(fakeProduct);
  };

  const changeCartUnit = (productId: string, newUnit: string) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId !== productId) return c;
        const newQty = stockToDisplayQty(c.stockPieces, newUnit, c.unit, c.boxQuantity);
        const newPieces = toNativeQty(newQty, newUnit, c.unit, c.boxQuantity);
        if (newPieces > c.maxQty) return c;
        return { ...c, buyUnit: newUnit, quantity: newQty, stockPieces: newPieces };
      })
    );
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId === productId) {
          const newQty = parseFloat((c.quantity + delta).toFixed(6));
          if (newQty <= 0) return c;
          const newPieces = toNativeQty(newQty, c.buyUnit, c.unit, c.boxQuantity);
          if (newPieces > c.maxQty) {
            toast({ title: "Omborda yetarli emas", variant: "destructive" });
            return { ...c, failKey: (c.failKey || 0) + 1 };
          }
          return { ...c, quantity: newQty, stockPieces: newPieces };
        }
        return c;
      })
    );
  };

  const updateQtyDirect = (productId: string, val: string) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId !== productId) return c;
        const isDecimalUnit = c.buyUnit === "kg";
        const newQty = isDecimalUnit
          ? Math.max(0.001, parseFloat(parseFloat(val).toFixed(3)) || 0.001)
          : Math.max(1, Math.round(Number(val)) || 1);
        const newPieces = toNativeQty(newQty, c.buyUnit, c.unit, c.boxQuantity);
        if (newPieces > c.maxQty) {
          toast({ title: "Omborda yetarli emas", variant: "destructive" });
          return { ...c, failKey: (c.failKey || 0) + 1 };
        }
        return { ...c, quantity: newQty, stockPieces: newPieces };
      })
    );
  };

  const updateCartPrice = (productId: string, price: string) => {
    const val = price === "" ? undefined : Number(price);
    setCart((prev) => prev.map((c) => c.productId === productId ? { ...c, customPrice: val } : c));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const subtotal = cart.reduce((s, c) => s + (c.customPrice ?? c.price) * c.stockPieces, 0);
  const discountNum = Math.max(0, Number(discountValue) || 0);
  const discountAmount = discountType === "percent"
    ? Math.min(Math.round(subtotal * discountNum / 100), subtotal)
    : Math.min(discountNum, subtotal);
  const total = Math.max(0, subtotal - discountAmount);

  const handleSell = () => {
    if (cart.length === 0) return;
    if (discountAmount > subtotal) {
      toast({ title: "Chegirma jami summadan oshib ketdi", variant: "destructive" });
      return;
    }
    sellMutation.mutate({
      items: cart.map((c) => ({
        productId: c.productId,
        quantity: c.stockPieces,
        price: c.customPrice ?? c.price,
      })),
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      dealerCustomerId: dealerCustomerId || null,
      notes: notes || null,
      paymentType,
      paidAmount: paymentType === "partial" ? Number(paidAmount) || 0 : 0,
      discount: discountAmount,
    });
  };

  const filteredForDialog = (dealerCustomers as any[] || []).filter((c: any) =>
    !customerDialogSearch ||
    c.name?.toLowerCase().includes(customerDialogSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerDialogSearch))
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-sell-title">Mijozga sotish</h2>

      {/* Customer selector - always visible */}
      <Card className="border-dashed">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
            <User className="h-3 w-3" /> MIJOZ
          </p>
          {customerName ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary truncate">{customerName}</p>
                {customerPhone && <p className="text-xs text-muted-foreground">{customerPhone}</p>}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                onClick={() => { setCustomerDialogSearch(""); setCustomerSelectOpen(true); }}
                data-testid="button-change-customer"
              >
                <Search className="h-3 w-3" />
                O'zgartirish
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => { setCustomerName(""); setCustomerPhone(""); setDealerCustomerId(""); }}
                data-testid="button-clear-customer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors text-left"
                onClick={() => { setCustomerDialogSearch(""); setCustomerSelectOpen(true); }}
                data-testid="button-open-customer-select"
              >
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Mijoz qidirish yoki tanlash...</span>
              </button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                onClick={() => { setCreateCustomerMode(true); setCustomerSelectOpen(true); }}
                data-testid="button-quick-create-customer"
              >
                <UserPlus className="h-4 w-4" />
                Yangi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Select / Create Dialog */}
      <Dialog open={customerSelectOpen} onOpenChange={(o) => { setCustomerSelectOpen(o); if (!o) { setCreateCustomerMode(false); setNewCustName(""); setNewCustPhone(""); setNewCustAddress(""); setNewCustPassword(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {createCustomerMode ? <UserPlus className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              {createCustomerMode ? "Yangi mijoz qo'shish" : "Mijoz tanlash"}
            </DialogTitle>
          </DialogHeader>

          {createCustomerMode ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Ism *</label>
                <Input
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Mijoz ismi"
                  autoFocus
                  data-testid="input-new-customer-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Telefon *</label>
                <Input
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+998901234567"
                  data-testid="input-new-customer-phone"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Parol (portal uchun)</label>
                <Input
                  type="password"
                  value={newCustPassword}
                  onChange={(e) => setNewCustPassword(e.target.value)}
                  placeholder="Kamida 4 ta belgi"
                  data-testid="input-new-customer-password"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Manzil</label>
                <Input
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Manzil (ixtiyoriy)"
                  data-testid="input-new-customer-address"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setCreateCustomerMode(false); }}>
                  Orqaga
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!newCustName.trim() || createCustomerMut.isPending}
                  onClick={() => createCustomerMut.mutate({ name: newCustName.trim(), phone: newCustPhone.trim() || null, password: newCustPassword.trim() || null, address: newCustAddress.trim() || null })}
                  data-testid="button-save-new-customer"
                >
                  {createCustomerMut.isPending ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={customerDialogSearch}
                    onChange={(e) => setCustomerDialogSearch(e.target.value)}
                    placeholder="Ism yoki telefon raqam..."
                    className="pl-9"
                    autoFocus
                    data-testid="input-customer-dialog-search"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0"
                  onClick={() => { setCreateCustomerMode(true); setCustomerDialogSearch(""); }}
                  data-testid="button-create-new-customer"
                >
                  <Plus className="h-4 w-4" />
                  Yangi
                </Button>
              </div>
              <div className="border rounded-md max-h-72 overflow-y-auto">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b text-muted-foreground"
                  onClick={() => {
                    setDealerCustomerId("");
                    setCustomerName("");
                    setCustomerPhone("");
                    setCustomerSelectOpen(false);
                  }}
                  data-testid="button-no-customer"
                >
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Mijoz tanlash (ixtiyoriy)
                  </span>
                </button>
                {filteredForDialog.length === 0 && customerDialogSearch ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    <p>Topilmadi</p>
                    <Button variant="ghost" size="sm" className="mt-1 h-auto p-0 text-primary hover:bg-transparent" onClick={() => { setNewCustName(customerDialogSearch); setCreateCustomerMode(true); }}>
                      + "{customerDialogSearch}" ni yaratish
                    </Button>
                  </div>
                ) : filteredForDialog.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Mijozlar yo'q</p>
                    <Button variant="ghost" size="sm" className="mt-1 h-auto p-0 text-primary hover:bg-transparent" onClick={() => setCreateCustomerMode(true)}>
                      + Yangi mijoz qo'shish
                    </Button>
                  </div>
                ) : null}
                {filteredForDialog.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b last:border-0 ${dealerCustomerId === c.id ? "bg-primary/10" : ""}`}
                    onClick={() => {
                      setDealerCustomerId(c.id);
                      setCustomerName(c.name);
                      setCustomerPhone(c.phone || "");
                      setCustomerSelectOpen(false);
                      setCustomerDialogSearch("");
                    }}
                    data-testid={`button-select-customer-${c.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium truncate">{c.name}</p>
                          {c.source === "admin" && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0 font-medium">ADMIN</span>
                          )}
                        </div>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                        {c.address && <p className="text-xs text-muted-foreground truncate">{c.address}</p>}
                      </div>
                      {Number(c.debt) > 0 && (
                        <Badge variant="destructive" className="text-[10px] shrink-0">
                          Qarz: {formatCurrency(Number(c.debt))}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">Narx:</span>
                            {(() => {
                              const nativePrice = item.customPrice ?? item.price;
                              const dispPrice = toDisplayPrice(nativePrice, item.buyUnit, item.unit, item.boxQuantity);
                              return (<>
                                <input
                                  type="number"
                                  min="0"
                                  step="100"
                                  value={dispPrice}
                                  onChange={(e) => {
                                    const raw = Number(e.target.value);
                                    const native = toNativePrice(raw, item.buyUnit, item.unit, item.boxQuantity);
                                    updateCartPrice(item.productId, String(native));
                                  }}
                                  className="w-24 h-5 text-xs border rounded px-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  data-testid={`input-sell-price-${item.productId}`}
                                />
                                <span className="text-[10px] text-muted-foreground">/{item.buyUnit}</span>
                                {item.customPrice !== undefined && item.customPrice !== item.price && (
                                  <button type="button" onClick={() => updateCartPrice(item.productId, "")} className="text-[10px] text-orange-500 hover:text-orange-700" title="Asl narxga qaytarish">↺</button>
                                )}
                              </>);
                            })()}
                            <span className="text-xs font-medium text-primary ml-1">
                              = {formatCurrency((item.customPrice ?? item.price) * item.stockPieces)}
                            </span>
                          </div>
                          {item.buyUnit !== item.unit && (
                            <p className={`text-[10px] ${item.buyUnit === "kg" ? "text-emerald-600" : "text-blue-600"}`}>
                              {item.buyUnit === "kg" ? `${item.quantity} kg (${item.stockPieces} gram)` : `${item.quantity} quti (${item.stockPieces} ${item.unit})`}
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
                          {(() => {
                            const isDecimalUnit = item.buyUnit === "kg";
                            const delta = isDecimalUnit ? 0.1 : 1;
                            const minV = isDecimalUnit ? 0.001 : 1;
                            const stepV = isDecimalUnit ? 0.001 : 1;
                            return (<>
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.productId, -delta)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <input
                                key={`${item.quantity}-${item.failKey || 0}`}
                                type="number"
                                min={minV}
                                step={stepV}
                                defaultValue={item.quantity}
                                onFocus={(e) => e.target.select()}
                                onBlur={(e) => updateQtyDirect(item.productId, e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                                className="w-12 h-7 text-center text-sm font-medium border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                data-testid={`input-sell-qty-${item.productId}`}
                              />
                              <span className="text-[10px] text-muted-foreground w-8">{item.buyUnit}</span>
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.productId, delta)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </>);
                          })()}
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.productId)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Summa:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-sm text-red-600">
                        <span>Chegirma:</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
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
            {/* Mijoz ko'rsatish */}
            {customerName ? (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-primary/10 border border-primary/20">
                <User className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">{customerName}</p>
                  {customerPhone && <p className="text-xs text-muted-foreground">{customerPhone}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2 shrink-0"
                  onClick={() => { setCheckoutOpen(false); setTimeout(() => { setCustomerDialogSearch(""); setCustomerSelectOpen(true); }, 100); }}
                >
                  O'zgartirish
                </Button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 p-2.5 rounded-md border border-dashed cursor-pointer hover:bg-accent transition-colors"
                onClick={() => { setCheckoutOpen(false); setTimeout(() => { setCustomerDialogSearch(""); setCustomerSelectOpen(true); }, 100); }}
                data-testid="button-checkout-select-customer"
              >
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Mijoz tanlanmagan — tanlash uchun bosing</span>
              </div>
            )}

            <div>
              <Label className="mb-1 block">Chegirma</Label>
              <div className="flex gap-2">
                <div className="flex border rounded-md overflow-hidden shrink-0">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${discountType === "amount" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                    onClick={() => setDiscountType("amount")}
                    data-testid="button-sell-discount-amount"
                  >
                    UZS
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${discountType === "percent" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                    onClick={() => setDiscountType("percent")}
                    data-testid="button-sell-discount-percent"
                  >
                    %
                  </button>
                </div>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "0-100" : "0"}
                  className="flex-1"
                  data-testid="input-sell-discount"
                />
              </div>
              {discountAmount > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Chegirma: -{formatCurrency(discountAmount)} {discountType === "percent" && `(${discountNum}%)`}
                </p>
              )}
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
                      <span>{item.name} × {
                        item.buyUnit === "quti"
                          ? `${item.quantity} quti (${item.stockPieces} ${item.unit})`
                          : item.unit === "gram" && item.buyUnit === "kg"
                            ? `${item.quantity} kg (${item.stockPieces} gram)`
                            : `${item.stockPieces} ${item.unit}`
                      }</span>
                      <span className="font-medium">{formatCurrency((item.customPrice ?? item.price) * item.stockPieces)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-2 pt-2 space-y-1">
                  {discountAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Summa:</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Chegirma:</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Jami:</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
                {paymentType === "debt" && (
                  <p className="text-xs text-destructive mt-1">To'liq qarzga: {formatCurrency(total)}</p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="px-1 pb-2">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Chek o'lchami:</span>
              <div className="flex gap-1">
                {(["58mm", "80mm", "A4"] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setPaperSize(s); localStorage.setItem("dealer_paper_size", s); }}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${paperSize === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
                    data-testid={`button-paper-size-${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSell} disabled={sellMutation.isPending} data-testid="button-confirm-sell">
              {sellMutation.isPending ? "Yuklanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog — yangi mijoz yaratilgandan so'ng */}
      <Dialog open={!!sellQrCustomer} onOpenChange={(o) => { if (!o) setSellQrCustomer(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Mijoz QR kodi
            </DialogTitle>
          </DialogHeader>
          {sellQrCustomer && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="bg-white p-4 rounded-xl shadow-md">
                <QRCodeSVG
                  value={`${window.location.origin}/portal?store=${sellQrCustomer.tenantId || ""}&phone=${encodeURIComponent(sellQrCustomer.phone || "")}`}
                  size={180}
                  level="M"
                />
              </div>
              <div className="text-center">
                <p className="font-bold text-base">{sellQrCustomer.name}</p>
                {sellQrCustomer.phone && <p className="text-sm text-muted-foreground">{sellQrCustomer.phone}</p>}
                <p className="text-xs text-muted-foreground mt-2 max-w-[220px]">
                  Mijoz ushbu QR orqali portal ga kirishi mumkin
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSellQrCustomer(null)}
                >
                  Yopish
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    const url = `${window.location.origin}/portal?store=${sellQrCustomer.tenantId || ""}&phone=${encodeURIComponent(sellQrCustomer.phone || "")}`;
                    navigator.clipboard?.writeText(url).then(() => toast({ title: "Havola nusxalandi!" }));
                  }}
                  data-testid="button-copy-portal-link"
                >
                  Havolani ko'chirish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomersTab() {
  const [addOpen, setAddOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<any>(null);
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
    select: (data) => data ?? [],
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

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/dealer-portal/customers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mijoz tahrirlandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/customers"] });
      setEditCustomer(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/dealer-portal/customers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mijoz o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/customers"] });
      setDeleteCustomer(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const openEdit = (c: any) => {
    setEditCustomer(c);
    setNewName(c.name);
    setNewPhone(c.phone || "");
    setNewAddress(c.address || "");
  };

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
                {(customers || []).map((c: any) => {
                  const isAdmin = c.source === "admin";
                  const displayName = c.name || "—";
                  return (
                  <TableRow key={`${c.source}-${c.id}`} data-testid={`row-dealer-customer-${c.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold ${isAdmin ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-primary/10 text-primary"}`}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{displayName}</span>
                            {isAdmin && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">ADMIN</span>
                            )}
                          </div>
                          {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
                        </div>
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
                      <div className="flex items-center gap-1 flex-wrap">
                        {!isAdmin && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEdit(c)}
                              data-testid={`button-edit-dealer-customer-${c.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteCustomer(c)}
                              data-testid={`button-delete-dealer-customer-${c.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
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

      <Dialog open={!!editCustomer} onOpenChange={(o) => { if (!o) setEditCustomer(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mijozni tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Ism *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Mijoz ismi" data-testid="input-edit-dealer-customer-name" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+998..." data-testid="input-edit-dealer-customer-phone" />
            </div>
            <div>
              <Label>Manzil</Label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Mijoz manzili" data-testid="input-edit-dealer-customer-address" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomer(null)}>Bekor qilish</Button>
            <Button
              onClick={() => {
                if (!newName.trim()) return;
                editMutation.mutate({
                  id: editCustomer.id,
                  data: { name: newName.trim(), phone: newPhone.trim() || null, address: newAddress.trim() || null },
                });
              }}
              disabled={editMutation.isPending}
              data-testid="button-save-edit-dealer-customer"
            >
              {editMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCustomer} onOpenChange={(o) => { if (!o) setDeleteCustomer(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mijozni o'chirish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{deleteCustomer?.name}</strong> mijozini o'chirmoqchimisiz?
          </p>
          {Number(deleteCustomer?.debt) > 0 && (
            <p className="text-sm text-destructive">
              Bu mijozning {formatCurrency(Number(deleteCustomer?.debt))} qarzi bor. Qarzdor mijozni o'chirib bo'lmaydi.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCustomer(null)}>Bekor qilish</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteCustomer.id)}
              disabled={deleteMutation.isPending || Number(deleteCustomer?.debt) > 0}
              data-testid="button-confirm-delete-dealer-customer"
            >
              {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
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
  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/dealer-portal/inventory"],
  });
  const { toast } = useToast();
  const [editOrder, setEditOrder] = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editDiscount, setEditDiscount] = useState("");
  const [editDiscountType, setEditDiscountType] = useState<"amount" | "percent">("amount");
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
    mutationFn: async ({ id, items, discount }: { id: string; items: any[]; discount?: number }) => {
      const res = await apiRequest("PUT", `/api/dealer-portal/deliveries/${id}/items`, {
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        discount: discount || 0,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Buyurtma tahrirlandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/deliveries"] });
      setEditOrder(null);
      setEditItems([]);
      setEditDiscount("");
      setEditDiscountType("amount");
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
    setEditDiscount(Number(order.discount) > 0 ? String(Number(order.discount)) : "");
    setEditDiscountType("amount");
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

  const editSubtotal = editItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const editDiscountNum = Math.max(0, Number(editDiscount) || 0);
  const editDiscountAmount = editDiscountType === "percent"
    ? Math.min(Math.round(editSubtotal * editDiscountNum / 100), editSubtotal)
    : Math.min(editDiscountNum, editSubtotal);
  const editTotal = Math.max(0, editSubtotal - editDiscountAmount);

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
                      {Number(d.discount) > 0 && (
                        <div className="flex justify-between text-sm text-red-600 border-t pt-1 mt-1">
                          <span>Chegirma:</span>
                          <span>-{formatCurrency(Number(d.discount))}</span>
                        </div>
                      )}
                      {d.totalAmount && (
                        <div className={`flex justify-between text-sm font-bold ${Number(d.discount) > 0 ? '' : 'border-t pt-1 mt-1'}`}>
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

                <div className="pt-2 border-t space-y-2">
                  <div>
                    <Label className="text-sm mb-1 block">Chegirma</Label>
                    <div className="flex gap-2">
                      <div className="flex border rounded-md overflow-hidden shrink-0">
                        <button
                          type="button"
                          className={`px-2.5 py-1 text-xs font-medium transition-colors ${editDiscountType === "amount" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                          onClick={() => setEditDiscountType("amount")}
                          data-testid="button-edit-discount-amount"
                        >
                          UZS
                        </button>
                        <button
                          type="button"
                          className={`px-2.5 py-1 text-xs font-medium transition-colors ${editDiscountType === "percent" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                          onClick={() => setEditDiscountType("percent")}
                          data-testid="button-edit-discount-percent"
                        >
                          %
                        </button>
                      </div>
                      <Input
                        type="number"
                        value={editDiscount}
                        onChange={(e) => setEditDiscount(e.target.value)}
                        placeholder={editDiscountType === "percent" ? "0-100" : "0"}
                        className="flex-1"
                        data-testid="input-edit-discount"
                      />
                    </div>
                  </div>
                  {editDiscountAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Summa:</span>
                        <span>{formatCurrency(editSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Chegirma:</span>
                        <span>-{formatCurrency(editDiscountAmount)} {editDiscountType === "percent" && `(${editDiscountNum}%)`}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center text-base font-bold">
                    <span>Jami:</span>
                    <span data-testid="text-edit-total">{formatCurrency(editTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOrder(null); setEditItems([]); setEditDiscount(""); setEditDiscountType("amount"); }}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => {
                if (editItems.length === 0) {
                  toast({ title: "Kamida 1 ta mahsulot bo'lishi kerak", variant: "destructive" });
                  return;
                }
                if (editDiscountAmount > editSubtotal) {
                  toast({ title: "Chegirma summadan oshib ketdi", variant: "destructive" });
                  return;
                }
                editMutation.mutate({ id: editOrder.id, items: editItems, discount: editDiscountAmount });
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
  const { toast } = useToast();
  const [viewTx, setViewTx] = useState<any>(null);
  const [editTx, setEditTx] = useState<any>(null);
  const [deleteTx, setDeleteTx] = useState<any>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editPayType, setEditPayType] = useState("cash");
  const [editPaid, setEditPaid] = useState("");
  const [editCustName, setEditCustName] = useState("");
  const [editCustPhone, setEditCustPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const openEdit = (tx: any) => {
    setEditTx(tx);
    setEditQty(String(tx.quantity));
    setEditPrice(String(tx.price));
    setEditPayType(tx.paymentType || "cash");
    setEditPaid(String(tx.paidAmount || 0));
    setEditCustName(tx.customerName || "");
    setEditCustPhone(tx.customerPhone || "");
    setEditNotes(tx.notes || "");
  };

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/dealer-portal/transactions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sotuv tahrirlandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/inventory"] });
      setEditTx(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/dealer-portal/transactions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sotuv o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/inventory"] });
      setDeleteTx(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/dealer-portal/sell-history");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sotuv tarixi tozalandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/inventory"] });
      setClearConfirm(false);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const sellTxs = [...(transactions?.filter((t: any) => t.type === "sell") || [])]
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const fmtDate = (d: any) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd.MM.yyyy HH:mm"); } catch { return "—"; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" data-testid="text-history-title">
          Sotuvlar tarixi
          {sellTxs.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({sellTxs.length} ta)</span>}
        </h2>
        {sellTxs.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setClearConfirm(true)}
            data-testid="button-clear-sell-history"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Tarixni tozalash
          </Button>
        )}
      </div>

      {sellTxs.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sana</TableHead>
                <TableHead>Mahsulot</TableHead>
                <TableHead>Miqdor</TableHead>
                <TableHead>Narx</TableHead>
                <TableHead>Summa</TableHead>
                <TableHead>To'lov</TableHead>
                <TableHead>Mijoz</TableHead>
                <TableHead className="w-[110px] text-center">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellTxs.map((tx: any) => {
                const pt = tx.paymentType;
                const payBadge = pt === "debt"
                  ? <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">Qarz</Badge>
                  : pt === "partial"
                  ? <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200 bg-orange-50">Qisman</Badge>
                  : <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">Naqd</Badge>;
                return (
                  <TableRow key={tx.id} data-testid={`row-sell-history-${tx.id}`}>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{fmtDate(tx.createdAt)}</TableCell>
                    <TableCell className="font-medium text-sm">{tx.productName}</TableCell>
                    <TableCell className="text-sm">{tx.quantity} {tx.productUnit}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(Number(tx.price))}</TableCell>
                    <TableCell className="text-sm font-semibold text-green-600">{formatCurrency(Number(tx.total) || Number(tx.price) * tx.quantity)}</TableCell>
                    <TableCell>{payBadge}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.customerName || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => setViewTx(tx)}
                          data-testid={`button-view-sell-${tx.id}`}
                          title="Ko'rish"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(tx)}
                          data-testid={`button-edit-sell-${tx.id}`}
                          title="Tahrirlash"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTx(tx)}
                          data-testid={`button-delete-sell-${tx.id}`}
                          title="O'chirish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Sotuvlar tarixi mavjud emas</p>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewTx} onOpenChange={(o) => { if (!o) setViewTx(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              Sotuv tafsiloti
            </DialogTitle>
          </DialogHeader>
          {viewTx && (
            <div className="space-y-2 text-sm">
              <div className="p-3 rounded-md bg-muted font-semibold text-base">{viewTx.productName}</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Miqdor</p>
                  <p className="font-medium">{viewTx.quantity} {viewTx.productUnit}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Narx</p>
                  <p className="font-medium">{formatCurrency(Number(viewTx.price))}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Jami summa</p>
                  <p className="font-semibold text-green-600">{formatCurrency(Number(viewTx.total) || Number(viewTx.price) * viewTx.quantity)}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">To'lov turi</p>
                  <p className="font-medium">
                    {viewTx.paymentType === "debt" ? "Qarz" : viewTx.paymentType === "partial" ? "Qisman" : "Naqd"}
                  </p>
                </div>
                {viewTx.paymentType === "partial" && (
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">To'langan</p>
                    <p className="font-medium">{formatCurrency(Number(viewTx.paidAmount || 0))}</p>
                  </div>
                )}
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Sana</p>
                  <p className="font-medium">{fmtDate(viewTx.createdAt)}</p>
                </div>
              </div>
              {viewTx.customerName && (
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Mijoz</p>
                  <p className="font-medium">{viewTx.customerName} {viewTx.customerPhone ? `• ${viewTx.customerPhone}` : ""}</p>
                </div>
              )}
              {viewTx.notes && (
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Izoh</p>
                  <p>{viewTx.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewTx(null)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTx} onOpenChange={(o) => { if (!o) setEditTx(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Sotuvni tahrirlash
            </DialogTitle>
          </DialogHeader>
          {editTx && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-md bg-muted text-sm font-medium">{editTx.productName}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Miqdor ({editTx.productUnit})</Label>
                  <Input type="number" min="1" value={editQty} onChange={(e) => setEditQty(e.target.value)} data-testid="input-edit-tx-qty" />
                </div>
                <div>
                  <Label className="text-xs">Narx</Label>
                  <Input type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} data-testid="input-edit-tx-price" />
                </div>
              </div>
              {editQty && editPrice && (
                <div className="text-sm font-semibold text-primary text-right">
                  Jami: {formatCurrency(Number(editQty) * Number(editPrice))}
                </div>
              )}
              <div>
                <Label className="text-xs">To'lov turi</Label>
                <Select value={editPayType} onValueChange={setEditPayType}>
                  <SelectTrigger data-testid="select-edit-tx-paytype"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Naqd</SelectItem>
                    <SelectItem value="debt">Qarz</SelectItem>
                    <SelectItem value="partial">Qisman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editPayType === "partial" && (
                <div>
                  <Label className="text-xs">To'langan summa</Label>
                  <Input type="number" min="0" value={editPaid} onChange={(e) => setEditPaid(e.target.value)} data-testid="input-edit-tx-paid" />
                </div>
              )}
              <div>
                <Label className="text-xs">Mijoz ismi</Label>
                <Input value={editCustName} onChange={(e) => setEditCustName(e.target.value)} placeholder="Mijoz ismi" data-testid="input-edit-tx-customer" />
              </div>
              <div>
                <Label className="text-xs">Telefon</Label>
                <Input value={editCustPhone} onChange={(e) => setEditCustPhone(e.target.value)} placeholder="+998..." data-testid="input-edit-tx-phone" />
              </div>
              <div>
                <Label className="text-xs">Izoh</Label>
                <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Izoh..." data-testid="input-edit-tx-notes" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTx(null)}>Bekor</Button>
            <Button
              disabled={editMutation.isPending || !editQty || !editPrice || Number(editQty) < 1}
              onClick={() => editMutation.mutate({
                id: editTx.id,
                data: {
                  quantity: Number(editQty),
                  price: Number(editPrice),
                  paymentType: editPayType,
                  paidAmount: editPayType === "partial" ? Number(editPaid) : editPayType === "cash" ? Number(editQty) * Number(editPrice) : 0,
                  customerName: editCustName || null,
                  customerPhone: editCustPhone || null,
                  notes: editNotes || null,
                }
              })}
              data-testid="button-save-edit-transaction"
            >
              {editMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTx} onOpenChange={(o) => { if (!o) setDeleteTx(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Sotuvni o'chirish
            </DialogTitle>
          </DialogHeader>
          {deleteTx && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{deleteTx.productName}</span> — {deleteTx.quantity} {deleteTx.productUnit} sotuvini o'chirmoqchimisiz?
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                Mahsulot omborga qaytariladi.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTx(null)}>Bekor</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTx.id)}
              data-testid="button-confirm-delete-sell"
            >
              {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All History Confirm Dialog */}
      <Dialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Tarixni tozalash
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Barcha <span className="font-semibold text-foreground">{sellTxs.length} ta sotuv</span> tarixi o'chiriladi. Bu amalni qaytarib bo'lmaydi!
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
              Mahsulotlar omborga qaytarilmaydi — faqat tarix tozalanadi.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirm(false)}>Bekor</Button>
            <Button
              variant="destructive"
              disabled={clearMutation.isPending}
              onClick={() => clearMutation.mutate()}
              data-testid="button-confirm-clear-history"
            >
              {clearMutation.isPending ? "Tozalanmoqda..." : "Hammasini o'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
