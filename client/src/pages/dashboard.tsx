import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, PieChart,
  Pie, Cell, Area, AreaChart,
} from "recharts";
import {
  Package, Users, ShoppingCart, AlertTriangle, TrendingUp,
  DollarSign, CreditCard, BarChart3, Wallet, PiggyBank,
  CalendarDays, ArrowUpRight, ArrowDownRight, Star,
  Banknote, Smartphone, HandCoins,
} from "lucide-react";

const MONTHS = [
  "Yanvar","Fevral","Mart","Aprel","May","Iyun",
  "Iyul","Avgust","Sentyabr","Oktyabr","Noyabr","Dekabr",
];

function fmt(amount: number) {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + " mlrd";
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + " mln";
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + " ming";
  return String(Math.round(amount));
}

function fmtFull(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(amount)) + " UZS";
}

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-sm">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-bold text-slate-800 dark:text-white">{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PIE_COLORS: Record<string, { color: string; label: string; icon: any }> = {
  cash:    { color: "#10b981", label: "Naqd",   icon: Banknote },
  card:    { color: "#3b82f6", label: "Karta",  icon: Smartphone },
  debt:    { color: "#f59e0b", label: "Qarz",   icon: HandCoins },
  partial: { color: "#8b5cf6", label: "Qisman", icon: HandCoins },
};

export default function Dashboard() {
  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [chartYear, setChartYear] = useState(now.getFullYear());

  const { data: stats, isLoading } = useQuery<{
    totalProducts: number; lowStockProducts: number; totalCustomers: number;
    totalDebt: number; totalSales: number; totalRevenue: number;
    todaySales: number; todayRevenue: number; todayProfit: number;
    monthProfit: number; totalProfit: number;
  }>({ queryKey: ["/api/stats"], staleTime: 0 });

  const { data: monthly, isLoading: monthlyLoading } = useQuery<{
    days: { day: number; label: string; revenue: number; profit: number }[];
    totalRevenue: number; totalProfit: number;
  }>({
    queryKey: ["/api/stats/monthly", selYear, selMonth],
    queryFn: () => fetch(`/api/stats/monthly?year=${selYear}&month=${selMonth}`).then(r => r.json()),
    staleTime: 0,
  });

  const { data: yearly } = useQuery<{
    year: number;
    months: { month: number; name: string; revenue: number; profit: number }[];
  }>({
    queryKey: ["/api/stats/yearly", chartYear],
    queryFn: () => fetch(`/api/stats/yearly?year=${chartYear}`).then(r => r.json()),
    staleTime: 0,
  });

  const { data: topProducts } = useQuery<{
    id: string; name: string; unit: string;
    totalQty: number; totalRevenue: number; totalProfit: number; saleCount: number;
  }[]>({ queryKey: ["/api/stats/top-products"], staleTime: 0 });

  const { data: paymentTypes } = useQuery<{
    type: string; count: number; total: number;
  }[]>({ queryKey: ["/api/stats/payment-types"], staleTime: 0 });

  const years = [now.getFullYear() - 1, now.getFullYear()];
  const totalPayment = paymentTypes?.reduce((s, p) => s + p.total, 0) || 1;
  const maxRevenue = topProducts?.[0]?.totalRevenue || 1;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full">

      {/* ===== HERO BANNER ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-10 w-40 h-40 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-2 right-32 w-24 h-24 rounded-full bg-cyan-400/30 blur-xl" />
          <div className="absolute top-2 left-1/2 w-32 h-32 rounded-full bg-indigo-300/20 blur-2xl" />
        </div>
        <div className="relative z-10">
          <p className="text-blue-200 text-sm font-medium mb-1">Bugungi holat</p>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="text-3xl md:text-4xl font-black tracking-tight">
                {fmtFull(stats?.todayRevenue || 0)}
              </div>
              <p className="text-blue-200 text-sm mt-1">Bugungi daromad · {stats?.todaySales || 0} ta sotuv</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-blue-200 text-xs">Bugungi foyda</p>
                <p className={`text-lg font-bold ${(stats?.todayProfit || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {(stats?.todayProfit || 0) >= 0 ? "+" : ""}{fmt(stats?.todayProfit || 0)}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-blue-200 text-xs">Oylik foyda</p>
                <p className={`text-lg font-bold ${(stats?.monthProfit || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {(stats?.monthProfit || 0) >= 0 ? "+" : ""}{fmt(stats?.monthProfit || 0)}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-blue-200 text-xs">Jami foyda</p>
                <p className={`text-lg font-bold ${(stats?.totalProfit || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {(stats?.totalProfit || 0) >= 0 ? "+" : ""}{fmt(stats?.totalProfit || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Jami mahsulot", value: stats?.totalProducts || 0, sub: `${stats?.lowStockProducts || 0} ta kam qolgan`, icon: Package, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/50" },
          { label: "Kam stok", value: stats?.lowStockProducts || 0, sub: "Diqqat talab qiladi", icon: AlertTriangle, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/50" },
          { label: "Mijozlar", value: stats?.totalCustomers || 0, sub: "Faol mijozlar", icon: Users, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/50" },
          { label: "Jami qarz", value: fmtFull(stats?.totalDebt || 0), sub: "Mijozlar qarzi", icon: CreditCard, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/50" },
          { label: "Jami savdolar", value: stats?.totalSales || 0, sub: "Barcha vaqt", icon: BarChart3, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/50" },
          { label: "Umumiy daromad", value: fmt(stats?.totalRevenue || 0), sub: fmtFull(stats?.totalRevenue || 0), icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50" },
          { label: "Umumiy sof foyda", value: fmt(stats?.totalProfit || 0), sub: fmtFull(stats?.totalProfit || 0), icon: PiggyBank, color: (stats?.totalProfit||0)>=0?"text-violet-600 dark:text-violet-400":"text-red-600", bg: (stats?.totalProfit||0)>=0?"bg-violet-50 dark:bg-violet-950/50":"bg-red-50 dark:bg-red-950/50" },
          { label: "Bugungi savdo", value: stats?.todaySales || 0, sub: fmtFull(stats?.todayRevenue || 0), icon: ShoppingCart, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/50" },
        ].map((card, i) => (
          <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow" data-testid={`card-stat-${i}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground leading-tight">{card.label}</p>
                <div className={`p-1.5 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </div>
              <div className="text-xl font-bold tracking-tight">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===== CHARTS ROW 1: Yearly trend + Payment types ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Yearly line chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Yillik trend</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Oylar bo'yicha daromad va foyda</p>
              </div>
              <Select value={String(chartYear)} onValueChange={v => setChartYear(Number(v))}>
                <SelectTrigger className="w-24 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={yearly?.months || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmt} width={55} />
                <Tooltip content={<BarTooltip />} cursor={{ stroke: "rgba(148,163,184,0.2)", strokeWidth: 2 }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="revenue" name="Savdo" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                <Area type="monotone" dataKey="profit" name="Foyda" stroke="#10b981" strokeWidth={2} fill="url(#profGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment types */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">To'lov turlari</CardTitle>
            <p className="text-xs text-muted-foreground">Barcha sotuvlar bo'yicha</p>
          </CardHeader>
          <CardContent>
            {paymentTypes && paymentTypes.length > 0 ? (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={paymentTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      dataKey="total"
                      strokeWidth={0}
                    >
                      {paymentTypes.map((entry, index) => (
                        <Cell key={index} fill={PIE_COLORS[entry.type]?.color || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => fmtFull(Number(v))}
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {paymentTypes.map((pt) => {
                    const meta = PIE_COLORS[pt.type];
                    const pct = Math.round((pt.total / totalPayment) * 100);
                    return (
                      <div key={pt.type} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta?.color || "#94a3b8" }} />
                        <span className="text-xs text-muted-foreground flex-1">{meta?.label || pt.type}</span>
                        <span className="text-xs font-semibold">{pt.count} ta</span>
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">{pct}%</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Ma'lumot yo'q
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== CHARTS ROW 2: Monthly bar + Top products ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly bar chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Oylik savdo grafigi</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {MONTHS[selMonth - 1]} {selYear} — Savdo: <span className="text-blue-600 font-semibold">{fmt(monthly?.totalRevenue || 0)}</span>, Foyda: <span className="text-emerald-600 font-semibold">{fmt(monthly?.totalProfit || 0)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(selMonth)} onValueChange={v => setSelMonth(Number(v))}>
                  <SelectTrigger className="w-28 h-7 text-xs" data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(selYear)} onValueChange={v => setSelYear(Number(v))}>
                  <SelectTrigger className="w-20 h-7 text-xs" data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly?.days || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmt} width={55} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="revenue" name="Savdo" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="profit" name="Foyda" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card className="border-0 shadow-sm" data-testid="card-top-products">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50">
                <Star className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Top mahsulotlar</CardTitle>
                <p className="text-xs text-muted-foreground">Daromad bo'yicha</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((p, i) => {
                  const pct = Math.round((p.totalRevenue / maxRevenue) * 100);
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-bold w-4 flex-shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-500" : "text-muted-foreground"}`}>
                            {i + 1}
                          </span>
                          <span className="text-xs font-medium truncate">{p.name}</span>
                        </div>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2">
                          {fmt(p.totalRevenue)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.saleCount} ta sotuv · foyda {fmt(p.totalProfit)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Sotuv ma'lumoti yo'q
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
