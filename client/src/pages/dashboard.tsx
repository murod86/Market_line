import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CreditCard,
  BarChart3,
} from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<{
    totalProducts: number;
    lowStockProducts: number;
    totalCustomers: number;
    totalDebt: number;
    totalSales: number;
    totalRevenue: number;
    todaySales: number;
    todayRevenue: number;
  }>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Bugungi savdo",
      value: stats?.todaySales || 0,
      subtitle: formatCurrency(stats?.todayRevenue || 0),
      icon: ShoppingCart,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Bugungi daromad",
      value: formatCurrency(stats?.todayRevenue || 0),
      subtitle: `${stats?.todaySales || 0} ta savdo`,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Jami mahsulotlar",
      value: stats?.totalProducts || 0,
      subtitle: `${stats?.lowStockProducts || 0} ta kam qolgan`,
      icon: Package,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Kam qolgan stok",
      value: stats?.lowStockProducts || 0,
      subtitle: "Diqqat talab qiladi",
      icon: AlertTriangle,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Jami mijozlar",
      value: stats?.totalCustomers || 0,
      subtitle: "Faol mijozlar",
      icon: Users,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-500/10",
    },
    {
      title: "Jami qarz",
      value: formatCurrency(stats?.totalDebt || 0),
      subtitle: "Mijozlar qarzi",
      icon: CreditCard,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Jami savdolar",
      value: stats?.totalSales || 0,
      subtitle: "Barcha vaqt",
      icon: BarChart3,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-500/10",
    },
    {
      title: "Umumiy daromad",
      value: formatCurrency(stats?.totalRevenue || 0),
      subtitle: "Barcha vaqt",
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">Boshqaruv paneli</h1>
        <p className="text-muted-foreground">Biznesingiz holati haqida umumiy ma'lumot</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <Card key={index} data-testid={`card-stat-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
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
  );
}
