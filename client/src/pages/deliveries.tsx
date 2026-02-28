import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Delivery, Customer } from "@shared/schema";
import { Truck, MapPin, Clock, CheckCircle, XCircle, Package, Eye, Printer } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Kutilmoqda", variant: "secondary" },
  in_transit: { label: "Yo'lda", variant: "default" },
  delivered: { label: "Yetkazildi", variant: "default" },
  cancelled: { label: "Bekor qilindi", variant: "destructive" },
};

export default function Deliveries() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orderSale, setOrderSale] = useState<any>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const { toast } = useToast();

  const { data: deliveries, isLoading } = useQuery<Delivery[]>({ queryKey: ["/api/deliveries"] });
  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/deliveries/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Holat yangilandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal-orders"] });
    },
  });

  const openDetail = async (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setDetailOpen(true);
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/deliveries/${delivery.id}/items`);
      const data = await res.json();
      setOrderItems(data.items || []);
      setOrderSale(data.sale || null);
    } catch {
      setOrderItems([]);
      setOrderSale(null);
    } finally {
      setLoadingItems(false);
    }
  };

  const filtered = deliveries?.filter(
    (d) => statusFilter === "all" || d.status === statusFilter
  );

  const pendingCount = deliveries?.filter((d) => d.status === "pending").length || 0;
  const inTransitCount = deliveries?.filter((d) => d.status === "in_transit").length || 0;
  const deliveredCount = deliveries?.filter((d) => d.status === "delivered").length || 0;

  const printDeliveriesList = () => {
    if (!filtered || filtered.length === 0) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = filtered.map((delivery, i) => {
      const customer = customers?.find((c) => c.id === delivery.customerId);
      const status = statusMap[delivery.status] || statusMap.pending;
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">${customer?.fullName || "-"}</td>
        <td style="padding:8px;border:1px solid #ddd">${customer?.phone || "-"}</td>
        <td style="padding:8px;border:1px solid #ddd">${delivery.address}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${status.label}</td>
        <td style="padding:8px;border:1px solid #ddd">${format(new Date(delivery.createdAt), "dd.MM.yyyy HH:mm")}</td>
        <td style="padding:8px;border:1px solid #ddd">${delivery.notes || "-"}</td>
      </tr>`;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Yetkazib berish ro'yxati - MARKET_LINE</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #4338ca; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { padding: 10px 8px; border: 1px solid #ddd; background: #4338ca; color: white; text-align: left; }
          .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
          @media print { body { padding: 10px; } }
        </style>
      </head><body>
        <h1>MARKET_LINE</h1>
        <p class="subtitle">Yetkazib berish ro'yxati - ${format(new Date(), "dd.MM.yyyy HH:mm")}</p>
        <table>
          <thead><tr>
            <th style="text-align:center">#</th>
            <th>Mijoz</th>
            <th>Telefon</th>
            <th>Manzil</th>
            <th style="text-align:center">Holat</th>
            <th>Sana</th>
            <th>Izoh</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="footer">Jami ${filtered.length} ta yetkazib berish</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const printSingleDelivery = async (delivery: Delivery) => {
    const customer = customers?.find((c) => c.id === delivery.customerId);
    let items: any[] = [];
    let sale: any = null;
    try {
      const res = await fetch(`/api/deliveries/${delivery.id}/items`);
      const data = await res.json();
      items = data.items || [];
      sale = data.sale || null;
    } catch {}

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const status = statusMap[delivery.status] || statusMap.pending;
    const itemRows = items.map((item: any, i: number) => {
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">${item.productName || "Mahsulot"}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(item.price))}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(item.total))}</td>
      </tr>`;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Yetkazib berish - MARKET_LINE</title>
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
        <p class="subtitle">Yetkazib berish tafsilotlari</p>
        <div class="info">
          <p><span>Mijoz:</span> <strong>${customer?.fullName || "-"}</strong></p>
          <p><span>Telefon:</span> ${customer?.phone || "-"}</p>
          <p><span>Manzil:</span> <strong>${delivery.address}</strong></p>
          <p><span>Holat:</span> <strong>${status.label}</strong></p>
          <p><span>Sana:</span> ${format(new Date(delivery.createdAt), "dd.MM.yyyy HH:mm")}</p>
          ${delivery.notes ? `<p><span>Izoh:</span> ${delivery.notes}</p>` : ""}
        </div>
        ${items.length > 0 ? `
          <table>
            <thead><tr>
              <th style="text-align:center">#</th>
              <th>Mahsulot</th>
              <th style="text-align:center">Miqdor</th>
              <th style="text-align:right">Narx</th>
              <th style="text-align:right">Summa</th>
            </tr></thead>
            <tbody>
              ${itemRows}
              ${sale ? `<tr class="total-row">
                <td colspan="4" style="padding:10px 8px;border:1px solid #ddd;text-align:right">Jami:</td>
                <td style="padding:10px 8px;border:1px solid #ddd;text-align:right">${formatCurrency(Number(sale.totalAmount))}</td>
              </tr>` : ""}
            </tbody>
          </table>
        ` : "<p>Mahsulotlar topilmadi</p>"}
        <p class="footer">MARKET_LINE - Yetkazib berish boshqaruvi</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-deliveries-title">Yetkazib berish</h1>
          <p className="text-muted-foreground">Buyurtmalarni yetkazib berish boshqaruvi</p>
        </div>
        {filtered && filtered.length > 0 && (
          <Button variant="outline" size="sm" onClick={printDeliveriesList} data-testid="button-print-deliveries">
            <Printer className="h-4 w-4 mr-2" />
            Chop etish
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kutilmoqda</p>
                <p className="text-xl font-bold" data-testid="text-pending-count">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Yo'lda</p>
                <p className="text-xl font-bold" data-testid="text-transit-count">{inTransitCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Yetkazildi</p>
                <p className="text-xl font-bold" data-testid="text-delivered-count">{deliveredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-delivery-status-filter">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="pending">Kutilmoqda</SelectItem>
            <SelectItem value="in_transit">Yo'lda</SelectItem>
            <SelectItem value="delivered">Yetkazildi</SelectItem>
            <SelectItem value="cancelled">Bekor qilindi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mijoz</TableHead>
                  <TableHead>Manzil</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead>Izoh</TableHead>
                  <TableHead>Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((delivery) => {
                  const customer = customers?.find((c) => c.id === delivery.customerId);
                  const status = statusMap[delivery.status] || statusMap.pending;
                  return (
                    <TableRow key={delivery.id} data-testid={`row-delivery-${delivery.id}`}>
                      <TableCell className="font-medium">{customer?.fullName || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{delivery.address}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-primary p-0 h-auto"
                          onClick={() => openDetail(delivery)}
                          data-testid={`button-view-items-${delivery.id}`}
                        >
                          <Eye className="h-3 w-3" />
                          Ko'rish
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(delivery.createdAt), "dd.MM.yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{delivery.notes || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => printSingleDelivery(delivery)}
                            data-testid={`button-print-delivery-${delivery.id}`}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          {delivery.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMutation.mutate({ id: delivery.id, status: "in_transit" })}
                              data-testid={`button-transit-${delivery.id}`}
                            >
                              <Truck className="h-3 w-3 mr-1" />
                              Jo'natish
                            </Button>
                          )}
                          {delivery.status === "in_transit" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMutation.mutate({ id: delivery.id, status: "delivered" })}
                              data-testid={`button-deliver-${delivery.id}`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Yetkazildi
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Truck className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p>Yetkazib berish topilmadi</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Buyurtma tarkibi
            </DialogTitle>
          </DialogHeader>
          {loadingItems ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDelivery && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Mijoz: <span className="font-medium text-foreground">{customers?.find(c => c.id === selectedDelivery.customerId)?.fullName}</span></p>
                  <p>Manzil: <span className="font-medium text-foreground">{selectedDelivery.address}</span></p>
                  {selectedDelivery.notes && <p>Izoh: <span className="text-foreground">{selectedDelivery.notes}</span></p>}
                </div>
              )}
              <div className="space-y-2">
                {orderItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-md border bg-muted/30" data-testid={`item-detail-${i}`}>
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="h-12 w-12 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.productName || "Mahsulot"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(Number(item.price))} x {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-sm shrink-0">
                      {formatCurrency(Number(item.total))}
                    </p>
                  </div>
                ))}
              </div>
              {orderSale && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-bold">Jami:</span>
                  <span className="font-bold text-lg" data-testid="text-order-total">{formatCurrency(Number(orderSale.totalAmount))}</span>
                </div>
              )}
              {selectedDelivery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printSingleDelivery(selectedDelivery)}
                  data-testid="button-detail-print-delivery"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Chop etish
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
