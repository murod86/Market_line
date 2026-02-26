import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Customer, Sale } from "@shared/schema";
import { CreditCard, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export default function PortalDebt() {
  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ["/api/portal/me"],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Sale[]>({
    queryKey: ["/api/portal/orders"],
  });

  if (customerLoading || ordersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const debt = Number(customer?.debt || 0);
  const debtOrders = orders?.filter((o) => o.paymentType === "debt") || [];
  const totalDebtAmount = debtOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalPaid = debtOrders.reduce((sum, o) => sum + Number(o.paidAmount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight" data-testid="text-debt-title">Qarz ma'lumotlari</h2>
        <p className="text-muted-foreground text-sm">Qarz holatingiz haqida batafsil</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-md ${debt > 0 ? "bg-red-500/10" : "bg-green-500/10"}`}>
                {debt > 0 ? (
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joriy qarz</p>
                <p className={`text-2xl font-bold ${debt > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`} data-testid="text-current-debt">
                  {formatCurrency(debt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-md bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jami qarz olingan</p>
                <p className="text-2xl font-bold" data-testid="text-total-debt">
                  {formatCurrency(totalDebtAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-md bg-green-500/10">
                <TrendingDown className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jami to'langan</p>
                <p className="text-2xl font-bold" data-testid="text-total-paid">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {debtOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qarz tarixi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {debtOrders.map((order) => {
              const remaining = Number(order.totalAmount) - Number(order.paidAmount);
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md bg-background border"
                  data-testid={`debt-order-${order.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      Buyurtma #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(Number(order.totalAmount))}</p>
                    {remaining > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        Qarz: {formatCurrency(remaining)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">To'langan</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {debtOrders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium">Qarz yo'q</p>
          <p className="text-sm mt-1">Sizda hech qanday qarz mavjud emas</p>
        </div>
      )}
    </div>
  );
}
