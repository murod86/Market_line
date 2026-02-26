import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Sale } from "@shared/schema";
import { ShoppingBag, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: any }> = {
  pending: { label: "Kutilmoqda", variant: "secondary", icon: Clock },
  completed: { label: "Bajarildi", variant: "default", icon: CheckCircle },
  cancelled: { label: "Bekor qilindi", variant: "destructive", icon: XCircle },
};

export default function PortalOrders() {
  const { data: orders, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/portal/orders"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight" data-testid="text-orders-title">Buyurtmalarim</h2>
        <p className="text-muted-foreground text-sm">{orders?.length || 0} ta buyurtma</p>
      </div>

      {orders && orders.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyurtma</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>To'langan</TableHead>
                  <TableHead>Holat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const status = statusMap[order.status] || statusMap.pending;
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                      <TableCell className="font-medium text-sm">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(order.totalAmount))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(Number(order.paidAmount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Hali buyurtma yo'q</p>
          <p className="text-sm mt-1">Katalogdan mahsulot tanlab buyurtma bering</p>
        </div>
      )}
    </div>
  );
}
