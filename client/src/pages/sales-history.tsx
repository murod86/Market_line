import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, ShoppingCart, Banknote, CreditCard, Wallet, Eye, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SaleHistory {
  id: string;
  total_amount: string;
  discount: string;
  paid_amount: string;
  payment_type: string;
  status: string;
  created_at: string;
  customer_name: string | null;
  item_count: number;
  profit: string;
}

interface SaleDetail {
  id: string;
  totalAmount: string;
  discount: string;
  paidAmount: string;
  paymentType: string;
  status: string;
  createdAt: string;
  items: {
    id: string;
    productId: string;
    quantity: number;
    price: string;
    costPrice: string;
    total: string;
  }[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(amount)) + " so'm";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function paymentLabel(type: string) {
  if (type === "cash") return { label: "Naqd", icon: Banknote, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  if (type === "card") return { label: "Karta", icon: CreditCard, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
  return { label: "Qarz", icon: Wallet, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
}

export default function SalesHistory() {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const { data: sales, isLoading } = useQuery<SaleHistory[]>({
    queryKey: ["/api/sales-history"],
  });

  const { data: detail, isLoading: detailLoading } = useQuery<SaleDetail>({
    queryKey: ["/api/sales", selectedSaleId],
    enabled: !!selectedSaleId,
  });

  const filtered = (sales || []).filter(s => {
    const matchSearch = !search || (s.customer_name || "Noma'lum").toLowerCase().includes(search.toLowerCase());
    const matchPayment = paymentFilter === "all" || s.payment_type === paymentFilter;
    const date = new Date(s.created_at);
    const matchFrom = !dateFrom || date >= new Date(dateFrom);
    const matchTo = !dateTo || date <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchPayment && matchFrom && matchTo;
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const todaySales = filtered.filter(s => new Date(s.created_at) >= today);
  const monthSales = filtered.filter(s => new Date(s.created_at) >= monthStart);

  const todayTotal = todaySales.reduce((s, x) => s + Number(x.total_amount), 0);
  const monthTotal = monthSales.reduce((s, x) => s + Number(x.total_amount), 0);
  const allTotal = filtered.reduce((s, x) => s + Number(x.total_amount), 0);

  const todayProfit = todaySales.reduce((s, x) => s + Number(x.profit), 0);
  const monthProfit = monthSales.reduce((s, x) => s + Number(x.profit), 0);
  const allProfit = filtered.reduce((s, x) => s + Number(x.profit), 0);

  const openDetail = (id: string) => {
    setSelectedSaleId(id);
    setDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sotuvlar tarixi</h1>
        <p className="text-muted-foreground">Barcha sotuvlar ro'yxati va statistika</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bugungi savdo</CardTitle>
            <div className="p-2 rounded-md bg-blue-500/10">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(todayTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{todaySales.length} ta sotuv · foyda: {formatCurrency(todayProfit)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Oylik savdo</CardTitle>
            <div className="p-2 rounded-md bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(monthTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{monthSales.length} ta sotuv · foyda: {formatCurrency(monthProfit)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jami savdo</CardTitle>
            <div className="p-2 rounded-md bg-violet-500/10">
              <Banknote className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(allTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} ta sotuv · foyda: {formatCurrency(allProfit)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Mijoz nomi bo'yicha qidirish..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-sales-search"
              />
            </div>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-payment-filter">
                <SelectValue placeholder="To'lov turi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hammasi</SelectItem>
                <SelectItem value="cash">Naqd</SelectItem>
                <SelectItem value="card">Karta</SelectItem>
                <SelectItem value="debt">Qarz</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 items-center">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-36"
                data-testid="input-date-from"
              />
              <span className="text-muted-foreground text-sm">—</span>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-36"
                data-testid="input-date-to"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Sotuvlar topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">#</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Sana</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Mijoz</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Mahsulot</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">Summa</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">Foyda</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">To'lov</th>
                    <th className="pb-3 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sale, idx) => {
                    const pt = paymentLabel(sale.payment_type);
                    const PtIcon = pt.icon;
                    return (
                      <tr key={sale.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors" data-testid={`row-sale-${sale.id}`}>
                        <td className="py-3 pr-4 text-muted-foreground">{filtered.length - idx}</td>
                        <td className="py-3 pr-4 whitespace-nowrap text-xs">{formatDate(sale.created_at)}</td>
                        <td className="py-3 pr-4 font-medium">{sale.customer_name || <span className="text-muted-foreground italic">Noma'lum</span>}</td>
                        <td className="py-3 pr-4 text-center">
                          <Badge variant="secondary">{sale.item_count} ta</Badge>
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold">{formatCurrency(Number(sale.total_amount))}</td>
                        <td className="py-3 pr-4 text-right">
                          <span className={Number(sale.profit) >= 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-500 font-medium"}>
                            {formatCurrency(Number(sale.profit))}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${pt.color}`}>
                            <PtIcon className="h-3 w-3" />
                            {pt.label}
                          </span>
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(sale.id)} data-testid={`button-sale-detail-${sale.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sotuv tafsiloti</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Sana:</div>
                <div className="font-medium">{formatDate(detail.createdAt)}</div>
                <div className="text-muted-foreground">To'lov turi:</div>
                <div className="font-medium">{paymentLabel(detail.paymentType).label}</div>
                <div className="text-muted-foreground">Chegirma:</div>
                <div className="font-medium">{formatCurrency(Number(detail.discount))}</div>
                <div className="text-muted-foreground">To'langan:</div>
                <div className="font-medium">{formatCurrency(Number(detail.paidAmount))}</div>
                <div className="text-muted-foreground">Jami:</div>
                <div className="text-lg font-bold text-primary">{formatCurrency(Number(detail.totalAmount))}</div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Mahsulotlar:</p>
                <div className="space-y-2">
                  {detail.items.map((item, i) => (
                    <div key={item.id} className="flex justify-between items-center text-sm bg-accent/30 rounded-md px-3 py-2" data-testid={`item-detail-${i}`}>
                      <div>
                        <span className="text-muted-foreground mr-2">{item.quantity} x</span>
                        <span>{formatCurrency(Number(item.price))}</span>
                      </div>
                      <div className="font-semibold">{formatCurrency(Number(item.total))}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
