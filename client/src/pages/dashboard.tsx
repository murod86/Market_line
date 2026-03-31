import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CreditCard,
  BarChart3,
  Wallet,
  PiggyBank,
  CalendarDays,
} from "lucide-react";

const MONTHS = [
  "Yanvar","Fevral","Mart","Aprel","May","Iyun",
  "Iyul","Avgust","Sentyabr","Oktyabr","Noyabr","Dekabr",
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

function formatShort(value: number) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + " mlrd";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + " mln";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + " ming";
  return String(value);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-sm">
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}-kun</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.fill }} />
            <span className="text-slate-600 dark:text-slate-300">{p.name}:</span>
            <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data: stats, isLoading } = useQuery<{
    totalProducts: number; lowStockProducts: number; totalCustomers: number;
    totalDebt: number; totalSales: number; totalRevenue: number;
    todaySales: number; todayRevenue: number; todayProfit: number;
    monthProfit: number; totalProfit: number;
  }>({ queryKey: ["/api/stats"], staleTime: 0 });

  const { data: monthly, isLoading: monthlyLoading } = useQuery<{
    days: { day: number; label: string; revenue: number; profit: number }[];
    totalRevenue: number; totalProfit: number; year: number; month: number;
  }>({
    queryKey: ["/api/stats/monthly", selectedYear, selectedMonth],
    queryFn: () =>
      fetch(`/api/stats/monthly?year=${selectedYear}&month=${selectedMonth}`)
        .then(r => r.json()),
    staleTime: 0,
  });

  const years = [now.getFullYear() - 1, now.getFullYear()];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 11 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const profitCards = [
    {
      title: "Bugungi sof foyda", value: formatCurrency(stats?.todayProfit || 0),
      subtitle: "Kirim − Tan narx − Xarajat", icon: TrendingUp,
      color: (stats?.todayProfit || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600",
      bgColor: (stats?.todayProfit || 0) >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      title: "Oylik sof foyda", value: formatCurrency(stats?.monthProfit || 0),
      subtitle: "Bu oyning foydasi", icon: Wallet,
      color: (stats?.monthProfit || 0) >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600",
      bgColor: (stats?.monthProfit || 0) >= 0 ? "bg-blue-500/10" : "bg-red-500/10",
    },
    {
      title: "Umumiy sof foyda", value: formatCurrency(stats?.totalProfit || 0),
      subtitle: "Barcha vaqt", icon: PiggyBank,
      color: (stats?.totalProfit || 0) >= 0 ? "text-violet-600 dark:text-violet-400" : "text-red-600",
      bgColor: (stats?.totalProfit || 0) >= 0 ? "bg-violet-500/10" : "bg-red-500/10",
    },
  ];

  const statCards = [
    { title: "Bugungi savdo", value: stats?.todaySales || 0, subtitle: formatCurrency(stats?.todayRevenue || 0), icon: ShoppingCart, color: "text-primary", bgColor: "bg-primary/10" },
    { title: "Bugungi daromad", value: formatCurrency(stats?.todayRevenue || 0), subtitle: `${stats?.todaySales || 0} ta savdo`, icon: TrendingUp, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10" },
    { title: "Jami mahsulotlar", value: stats?.totalProducts || 0, subtitle: `${stats?.lowStockProducts || 0} ta kam qolgan`, icon: Package, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" },
    { title: "Kam qolgan stok", value: stats?.lowStockProducts || 0, subtitle: "Diqqat talab qiladi", icon: AlertTriangle, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-500/10" },
    { title: "Jami mijozlar", value: stats?.totalCustomers || 0, subtitle: "Faol mijozlar", icon: Users, color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-500/10" },
    { title: "Jami qarz", value: formatCurrency(stats?.totalDebt || 0), subtitle: "Mijozlar qarzi", icon: CreditCard, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500/10" },
    { title: "Jami savdolar", value: stats?.totalSales || 0, subtitle: "Barcha vaqt", icon: BarChart3, color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-500/10" },
    { title: "Umumiy daromad", value: formatCurrency(stats?.totalRevenue || 0), subtitle: "Barcha vaqt", icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10" },
  ];

  const chartData = monthly?.days?.filter(d => d.revenue > 0 || d.profit > 0) || monthly?.days || [];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">Boshqaruv paneli</h1>
        <p className="text-muted-foreground">Biznesingiz holati haqida umumiy ma'lumot</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sof Foyda</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profitCards.map((card, index) => (
            <Card key={index} className="border-2" data-testid={`card-profit-${index}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={`p-2 rounded-md ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card data-testid="card-monthly-chart">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Oylik savdo va foyda grafigi</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {MONTHS[selectedMonth - 1]} {selectedYear} —
                  Savdo: <span className="font-semibold text-blue-600">{formatShort(monthly?.totalRevenue || 0)}</span>,
                  Foyda: <span className="font-semibold text-emerald-600">{formatShort(monthly?.totalProfit || 0)}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-32 h-8 text-sm" data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-sm" data-testid="select-year">
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
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly?.days || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatShort}
                  width={62}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                />
                <Bar dataKey="revenue" name="Savdo" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="profit" name="Foyda" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Umumiy Ko'rsatkichlar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <Card key={index} data-testid={`card-stat-${index}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={`p-2 rounded-md ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
