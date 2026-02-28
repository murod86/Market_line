import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, CheckCircle, XCircle, Clock, Eye, Package, User, Phone, PackageCheck } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Kutilmoqda", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  completed: { label: "Tasdiqlangan", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
  delivered: { label: "Qabul qilingan", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: PackageCheck },
  cancelled: { label: "Bekor qilingan", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
};

export default function OrdersManagement() {
  const [search, setSearch] = useState("");
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/portal-orders"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/portal-orders/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Buyurtma holati yangilandi" });
    },
    onError: (e: Error) => {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    },
  });

  const filtered = orders?.filter((o: any) =>
    o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    o.customerPhone?.includes(search) ||
    o.id?.includes(search)
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-orders-mgmt-title">Buyurtmalar</h1>
          <p className="text-muted-foreground">Portal buyurtmalarini boshqarish</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {orders?.filter((o: any) => o.status === "pending").length || 0} ta kutilmoqda
        </Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Mijoz nomi, telefon yoki ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-orders-search"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : filtered && filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyurtma</TableHead>
                  <TableHead>Mijoz</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Mahsulotlar</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order: any) => {
                  const config = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <TableRow key={order.id} data-testid={`row-admin-order-${order.id}`}>
                      <TableCell className="font-mono text-xs">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(order.totalAmount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {order.items?.length || 0} ta
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setDetailOrder(order)}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {order.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => statusMutation.mutate({ id: order.id, status: "completed" })}
                                disabled={statusMutation.isPending}
                                data-testid={`button-confirm-order-${order.id}`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Tasdiqlash
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => statusMutation.mutate({ id: order.id, status: "cancelled" })}
                                disabled={statusMutation.isPending}
                                data-testid={`button-cancel-order-${order.id}`}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Bekor
                              </Button>
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
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Buyurtmalar yo'q</p>
          <p className="text-sm mt-1">Mijozlar portaldan buyurtma berganda bu yerda ko'rinadi</p>
        </div>
      )}

      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buyurtma tafsilotlari</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{detailOrder.customerName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {detailOrder.customerPhone}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Mahsulotlar:</p>
                {detailOrder.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.productUnit} x {formatCurrency(Number(item.price))}
                      </p>
                    </div>
                    <p className="text-sm font-medium">{formatCurrency(Number(item.total))}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t font-bold">
                <span>Jami:</span>
                <span data-testid="text-order-detail-total">{formatCurrency(Number(detailOrder.totalAmount))}</span>
              </div>

              <div className="text-xs text-muted-foreground">
                Sana: {format(new Date(detailOrder.createdAt), "dd.MM.yyyy HH:mm")}
              </div>
            </div>
          )}
          <DialogFooter>
            {detailOrder?.status === "pending" && (
              <div className="flex gap-2 w-full">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    statusMutation.mutate({ id: detailOrder.id, status: "cancelled" });
                    setDetailOrder(null);
                  }}
                  data-testid="button-detail-cancel"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Bekor qilish
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    statusMutation.mutate({ id: detailOrder.id, status: "completed" });
                    setDetailOrder(null);
                  }}
                  data-testid="button-detail-confirm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Tasdiqlash
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
