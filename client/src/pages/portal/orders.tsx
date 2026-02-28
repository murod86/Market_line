import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Sale, SaleItem, Product } from "@shared/schema";
import {
  ShoppingBag, Clock, CheckCircle, XCircle, PackageCheck, Eye,
  FileDown, ChevronRight
} from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Kutilmoqda", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
  completed: { label: "Tasdiqlangan", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: CheckCircle },
  delivered: { label: "Qabul qilingan", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: PackageCheck },
  cancelled: { label: "Bekor qilingan", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
};

interface OrderDetail extends Sale {
  items: (SaleItem & { product?: Product })[];
}

export default function PortalOrders() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/portal/orders"],
  });

  const { data: orderDetail, isLoading: detailLoading } = useQuery<OrderDetail>({
    queryKey: ["/api/portal/orders", selectedOrderId],
    enabled: !!selectedOrderId,
  });

  const receiveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("PATCH", `/api/portal/orders/${orderId}/receive`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Buyurtma qabul qilindi!" });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/orders", selectedOrderId] });
      setSelectedOrderId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const generatePDF = () => {
    if (!orders || orders.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = orders.map((order, i) => {
      const status = statusMap[order.status] || statusMap.pending;
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">#${order.id.slice(0, 8)}</td>
        <td style="padding:8px;border:1px solid #ddd">${format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(order.totalAmount))}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(order.paidAmount))}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${status.label}</td>
      </tr>`;
    }).join("");

    const totalSum = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head>
        <title>Buyurtmalar ro'yxati - MARKET_LINE</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #4338ca; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { padding: 10px 8px; border: 1px solid #ddd; background: #4338ca; color: white; text-align: left; }
          .total-row { font-weight: bold; background: #f3f4f6; }
          .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head><body>
        <h1>MARKET_LINE</h1>
        <p class="subtitle">Buyurtmalar ro'yxati - ${format(new Date(), "dd.MM.yyyy")}</p>
        <table>
          <thead>
            <tr>
              <th style="text-align:center">#</th>
              <th>Buyurtma</th>
              <th>Sana</th>
              <th style="text-align:right">Summa</th>
              <th style="text-align:right">To'langan</th>
              <th style="text-align:center">Holat</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="3" style="padding:10px 8px;border:1px solid #ddd;text-align:right">Jami:</td>
              <td style="padding:10px 8px;border:1px solid #ddd;text-align:right">${formatCurrency(totalSum)}</td>
              <td colspan="2" style="padding:10px 8px;border:1px solid #ddd"></td>
            </tr>
          </tbody>
        </table>
        <p class="footer">Jami ${orders.length} ta buyurtma</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateOrderPDF = (order: OrderDetail) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = order.items.map((item, i) => {
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">${item.product?.name || "Mahsulot"}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.quantity} ${item.product?.unit || "dona"}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(item.price))}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(item.total))}</td>
      </tr>`;
    }).join("");

    const status = statusMap[order.status] || statusMap.pending;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head>
        <title>Buyurtma #${order.id.slice(0, 8)} - MARKET_LINE</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #4338ca; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
          .info { margin-bottom: 15px; }
          .info span { display: inline-block; min-width: 120px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { padding: 10px 8px; border: 1px solid #ddd; background: #4338ca; color: white; text-align: left; }
          .total-row { font-weight: bold; background: #f3f4f6; }
          .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head><body>
        <h1>MARKET_LINE</h1>
        <p class="subtitle">Buyurtma tafsilotlari</p>
        <div class="info">
          <p><span>Buyurtma:</span> <strong>#${order.id.slice(0, 8)}</strong></p>
          <p><span>Sana:</span> ${format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}</p>
          <p><span>Holat:</span> ${status.label}</p>
          <p><span>Jami summa:</span> <strong>${formatCurrency(Number(order.totalAmount))}</strong></p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align:center">#</th>
              <th>Mahsulot</th>
              <th style="text-align:center">Miqdor</th>
              <th style="text-align:right">Narx</th>
              <th style="text-align:right">Summa</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="4" style="padding:10px 8px;border:1px solid #ddd;text-align:right">Jami:</td>
              <td style="padding:10px 8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(order.totalAmount))}</td>
            </tr>
          </tbody>
        </table>
        <p class="footer">MARKET_LINE - Mijoz portali</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight" data-testid="text-orders-title">Buyurtmalarim</h2>
          <p className="text-muted-foreground text-sm">{orders?.length || 0} ta buyurtma</p>
        </div>
        {orders && orders.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={generatePDF}
            data-testid="button-orders-pdf"
          >
            <FileDown className="h-4 w-4 mr-2" />
            PDF saqlash
          </Button>
        )}
      </div>

      {orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => {
            const status = statusMap[order.status] || statusMap.pending;
            const StatusIcon = status.icon;
            return (
              <Card
                key={order.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedOrderId(order.id)}
                data-testid={`card-order-${order.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-md ${order.status === "pending" ? "bg-yellow-100 dark:bg-yellow-900" : order.status === "completed" ? "bg-blue-100 dark:bg-blue-900" : order.status === "delivered" ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">Buyurtma #{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(Number(order.totalAmount))}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Hali buyurtma yo'q</p>
          <p className="text-sm mt-1">Katalogdan mahsulot tanlab buyurtma bering</p>
        </div>
      )}

      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Buyurtma #{selectedOrderId?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : orderDetail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Holat</span>
                <Badge className={`${statusMap[orderDetail.status]?.color || ""} border-0`}>
                  {statusMap[orderDetail.status]?.label || orderDetail.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sana</span>
                <span className="text-sm font-medium">
                  {format(new Date(orderDetail.createdAt), "dd.MM.yyyy HH:mm")}
                </span>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Mahsulotlar</p>
                {orderDetail.items.map((item, i) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0" data-testid={`order-item-${i}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.product?.name || "Mahsulot"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(Number(item.price))} x {item.quantity} {item.product?.unit || "dona"}
                      </p>
                    </div>
                    <span className="text-sm font-medium flex-shrink-0">
                      {formatCurrency(Number(item.total))}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-center justify-between text-lg font-bold">
                <span>Jami:</span>
                <span data-testid="text-order-total">{formatCurrency(Number(orderDetail.totalAmount))}</span>
              </div>

              <div className="flex gap-2">
                {orderDetail.status === "completed" && (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => receiveMutation.mutate(orderDetail.id)}
                    disabled={receiveMutation.isPending}
                    data-testid="button-receive-order"
                  >
                    <PackageCheck className="h-4 w-4 mr-2" />
                    {receiveMutation.isPending ? "Qabul qilinmoqda..." : "Qabul qildim"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => generateOrderPDF(orderDetail)}
                  data-testid="button-order-pdf"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
