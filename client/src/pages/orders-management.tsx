import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Search, CheckCircle, XCircle, Clock, Eye, Package, User, Phone,
  PackageCheck, Truck, FileDown, Printer, ArrowRight
} from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Kutilmoqda", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  completed: { label: "Tasdiqlangan", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
  delivering: { label: "Yetkazilmoqda", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Truck },
  shipped: { label: "Topshirildi", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", icon: PackageCheck },
  delivered: { label: "Qabul qilingan", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: PackageCheck },
  cancelled: { label: "Bekor qilingan", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
};

export default function OrdersManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
      toast({ title: "Buyurtma holati yangilandi" });
    },
    onError: (e: Error) => {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    },
  });

  const filtered = orders?.filter((o: any) => {
    const matchSearch = o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone?.includes(search) ||
      o.id?.includes(search);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = orders?.filter((o: any) => o.status === "pending").length || 0;
  const deliveringCount = orders?.filter((o: any) => o.status === "delivering").length || 0;

  const printOrdersList = () => {
    if (!filtered || filtered.length === 0) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = filtered.map((order: any, i: number) => {
      const config = statusConfig[order.status] || statusConfig.pending;
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">#${order.id.slice(0, 8)}</td>
        <td style="padding:8px;border:1px solid #ddd">${order.customerName}</td>
        <td style="padding:8px;border:1px solid #ddd">${order.customerPhone}</td>
        <td style="padding:8px;border:1px solid #ddd">${format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(order.totalAmount))}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${order.items?.length || 0} ta</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${config.label}</td>
      </tr>`;
    }).join("");

    const totalSum = filtered.reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Buyurtmalar ro'yxati - MARKET_LINE</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #4338ca; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { padding: 10px 8px; border: 1px solid #ddd; background: #4338ca; color: white; text-align: left; }
          .total-row { font-weight: bold; background: #f3f4f6; }
          .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
          @media print { body { padding: 10px; } }
        </style>
      </head><body>
        <h1>MARKET_LINE</h1>
        <p class="subtitle">Buyurtmalar ro'yxati - ${format(new Date(), "dd.MM.yyyy HH:mm")}</p>
        <table>
          <thead><tr>
            <th style="text-align:center">#</th>
            <th>Buyurtma</th>
            <th>Mijoz</th>
            <th>Telefon</th>
            <th>Sana</th>
            <th style="text-align:right">Summa</th>
            <th style="text-align:center">Mahsulotlar</th>
            <th style="text-align:center">Holat</th>
          </tr></thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="5" style="padding:10px 8px;border:1px solid #ddd;text-align:right">Jami:</td>
              <td style="padding:10px 8px;border:1px solid #ddd;text-align:right">${formatCurrency(totalSum)}</td>
              <td colspan="2" style="padding:10px 8px;border:1px solid #ddd"></td>
            </tr>
          </tbody>
        </table>
        <p class="footer">Jami ${filtered.length} ta buyurtma</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const printSingleOrder = (order: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const config = statusConfig[order.status] || statusConfig.pending;
    const rows = (order.items || []).map((item: any, i: number) => {
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">${item.productName || "Mahsulot"}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.quantity} ${item.productUnit || "dona"}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(item.price))}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(item.total))}</td>
      </tr>`;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Buyurtma #${order.id.slice(0, 8)} - MARKET_LINE</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #4338ca; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
          .info { margin-bottom: 15px; }
          .info p { margin: 4px 0; }
          .info span { display: inline-block; min-width: 140px; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { padding: 10px 8px; border: 1px solid #ddd; background: #4338ca; color: white; text-align: left; }
          .total-row { font-weight: bold; background: #f3f4f6; }
          .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
          @media print { body { padding: 10px; } }
        </style>
      </head><body>
        <h1>MARKET_LINE</h1>
        <p class="subtitle">Buyurtma tafsilotlari</p>
        <div class="info">
          <p><span>Buyurtma:</span> <strong>#${order.id.slice(0, 8)}</strong></p>
          <p><span>Mijoz:</span> <strong>${order.customerName}</strong></p>
          <p><span>Telefon:</span> ${order.customerPhone}</p>
          <p><span>Sana:</span> ${format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}</p>
          <p><span>Holat:</span> <strong>${config.label}</strong></p>
        </div>
        <table>
          <thead><tr>
            <th style="text-align:center">#</th>
            <th>Mahsulot</th>
            <th style="text-align:center">Miqdor</th>
            <th style="text-align:right">Narx</th>
            <th style="text-align:right">Summa</th>
          </tr></thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="4" style="padding:10px 8px;border:1px solid #ddd;text-align:right">Jami:</td>
              <td style="padding:10px 8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(order.totalAmount))}</td>
            </tr>
          </tbody>
        </table>
        <p class="footer">MARKET_LINE - Buyurtma boshqaruvi</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-orders-mgmt-title">Buyurtmalar</h1>
          <p className="text-muted-foreground">Portal buyurtmalarini boshqarish</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {pendingCount} ta kutilmoqda
          </Badge>
          {deliveringCount > 0 && (
            <Badge variant="outline" className="text-sm text-blue-600">
              {deliveringCount} ta yetkazilmoqda
            </Badge>
          )}
          {filtered && filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={printOrdersList} data-testid="button-print-orders">
              <Printer className="h-4 w-4 mr-2" />
              Chop etish
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mijoz nomi, telefon yoki ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-orders-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-order-status-filter">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="pending">Kutilmoqda</SelectItem>
            <SelectItem value="completed">Tasdiqlangan</SelectItem>
            <SelectItem value="delivering">Yetkazilmoqda</SelectItem>
            <SelectItem value="shipped">Topshirildi</SelectItem>
            <SelectItem value="delivered">Qabul qilingan</SelectItem>
            <SelectItem value="cancelled">Bekor qilingan</SelectItem>
          </SelectContent>
        </Select>
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
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setDetailOrder(order)}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => printSingleOrder(order)}
                            data-testid={`button-print-order-${order.id}`}
                          >
                            <Printer className="h-3.5 w-3.5" />
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
                          {order.status === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => statusMutation.mutate({ id: order.id, status: "delivering" })}
                              disabled={statusMutation.isPending}
                              data-testid={`button-deliver-order-${order.id}`}
                            >
                              <Truck className="h-3 w-3 mr-1" />
                              Yetkazishga
                            </Button>
                          )}
                          {order.status === "delivering" && (
                            <Badge variant="outline" className="text-xs text-blue-500 border-blue-200">
                              <Truck className="h-3 w-3 mr-1" />
                              Yetkazilmoqda
                            </Badge>
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
                <div className="ml-auto">
                  <Badge variant="outline" className={`gap-1 ${(statusConfig[detailOrder.status] || statusConfig.pending).color}`}>
                    {(statusConfig[detailOrder.status] || statusConfig.pending).label}
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Jarayon:</span>
                  <div className="flex items-center gap-1 text-xs flex-wrap">
                    {["pending", "completed", "delivering", "shipped", "delivered"].map((s, i, arr) => {
                      const c = statusConfig[s];
                      const isActive = detailOrder.status === s;
                      const isPast = arr.indexOf(detailOrder.status) > i;
                      return (
                        <span key={s} className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full ${isActive ? c.color + " font-bold" : isPast ? "bg-muted text-muted-foreground line-through" : "bg-muted/50 text-muted-foreground/50"}`}>
                            {c.label}
                          </span>
                          {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/30" />}
                        </span>
                      );
                    })}
                  </div>
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
            <div className="flex gap-2 w-full flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => detailOrder && printSingleOrder(detailOrder)}
                data-testid="button-detail-print"
              >
                <Printer className="h-4 w-4 mr-2" />
                Chop etish
              </Button>
              {detailOrder?.status === "pending" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      statusMutation.mutate({ id: detailOrder.id, status: "cancelled" });
                      setDetailOrder(null);
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    data-testid="button-detail-cancel"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Bekor qilish
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      statusMutation.mutate({ id: detailOrder.id, status: "completed" });
                      setDetailOrder(null);
                    }}
                    data-testid="button-detail-confirm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Tasdiqlash
                  </Button>
                </>
              )}
              {detailOrder?.status === "completed" && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    statusMutation.mutate({ id: detailOrder.id, status: "delivering" });
                    setDetailOrder(null);
                  }}
                  data-testid="button-detail-deliver"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Yetkazishga berish
                </Button>
              )}
              {detailOrder?.status === "delivering" && (
                <Badge variant="outline" className="text-sm text-blue-500 border-blue-200 py-1.5">
                  <Truck className="h-4 w-4 mr-2" />
                  Yetkazib beruvchi topshirishini kutmoqda
                </Badge>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
