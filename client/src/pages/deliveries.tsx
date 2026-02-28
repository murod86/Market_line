import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Delivery, Customer, Product } from "@shared/schema";
import {
  Truck, MapPin, Clock, CheckCircle, XCircle, Package, Eye, Printer,
  Plus, Minus, Search, ShoppingCart, Trash2, User
} from "lucide-react";
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

interface PickupItem {
  productId: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  quantity: number;
}

export default function Deliveries() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orderSale, setOrderSale] = useState<any>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const { toast } = useToast();

  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickupItems, setPickupItems] = useState<PickupItem[]>([]);
  const [pickupSearch, setPickupSearch] = useState("");
  const [pickupCustomerName, setPickupCustomerName] = useState("");
  const [pickupCustomerPhone, setPickupCustomerPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");

  const { data: deliveries, isLoading } = useQuery<Delivery[]>({ queryKey: ["/api/deliveries"] });
  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/deliveries/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Holat yangilandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const pickupMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/deliveries/pickup", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mahsulotlar yetkazib beruvchiga berildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      resetPickup();
    },
    onError: (e: Error) => {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    },
  });

  const resetPickup = () => {
    setPickupOpen(false);
    setPickupItems([]);
    setPickupSearch("");
    setPickupCustomerName("");
    setPickupCustomerPhone("");
    setPickupAddress("");
    setPickupNotes("");
  };

  const addPickupItem = (product: Product) => {
    const existing = pickupItems.find((i) => i.productId === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setPickupItems(pickupItems.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ));
      }
    } else {
      setPickupItems([...pickupItems, {
        productId: product.id,
        name: product.name,
        unit: product.unit,
        price: Number(product.price),
        stock: product.stock,
        quantity: 1,
      }]);
    }
  };

  const updatePickupQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setPickupItems(pickupItems.filter((i) => i.productId !== productId));
    } else {
      setPickupItems(pickupItems.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.min(qty, i.stock) } : i
      ));
    }
  };

  const pickupTotal = pickupItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const submitPickup = () => {
    if (pickupItems.length === 0) {
      toast({ title: "Mahsulot tanlanmagan", variant: "destructive" });
      return;
    }
    if (!pickupAddress.trim()) {
      toast({ title: "Manzil kiritilmagan", variant: "destructive" });
      return;
    }
    pickupMutation.mutate({
      customerName: pickupCustomerName.trim() || "Noma'lum mijoz",
      customerPhone: pickupCustomerPhone.trim() || null,
      address: pickupAddress.trim(),
      notes: pickupNotes.trim() || null,
      items: pickupItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    });
  };

  const filteredProducts = products?.filter((p) =>
    p.active && p.stock > 0 &&
    (pickupSearch === "" || p.name.toLowerCase().includes(pickupSearch.toLowerCase()) || p.sku?.toLowerCase().includes(pickupSearch.toLowerCase()))
  );

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

  const getDeliveryCustomerName = (delivery: Delivery) => {
    if (delivery.customerId) {
      const customer = customers?.find((c) => c.id === delivery.customerId);
      return customer?.fullName || "-";
    }
    return (delivery as any).customerName || "Noma'lum mijoz";
  };

  const getDeliveryCustomerPhone = (delivery: Delivery) => {
    if (delivery.customerId) {
      const customer = customers?.find((c) => c.id === delivery.customerId);
      return customer?.phone || "-";
    }
    return (delivery as any).customerPhone || "-";
  };

  const printDeliveriesList = () => {
    if (!filtered || filtered.length === 0) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = filtered.map((delivery, i) => {
      const name = getDeliveryCustomerName(delivery);
      const phone = getDeliveryCustomerPhone(delivery);
      const status = statusMap[delivery.status] || statusMap.pending;
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">${name}</td>
        <td style="padding:8px;border:1px solid #ddd">${phone}</td>
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
    const name = getDeliveryCustomerName(delivery);
    const phone = getDeliveryCustomerPhone(delivery);
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
          <p><span>Mijoz:</span> <strong>${name}</strong></p>
          <p><span>Telefon:</span> ${phone}</p>
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
        <div className="flex items-center gap-2">
          <Button onClick={() => setPickupOpen(true)} data-testid="button-pickup-products">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Mahsulot olish
          </Button>
          {filtered && filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={printDeliveriesList} data-testid="button-print-deliveries">
              <Printer className="h-4 w-4 mr-2" />
              Chop etish
            </Button>
          )}
        </div>
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
                  <TableHead>Tarkib</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead>Izoh</TableHead>
                  <TableHead>Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((delivery) => {
                  const name = getDeliveryCustomerName(delivery);
                  const status = statusMap[delivery.status] || statusMap.pending;
                  const isPickup = !delivery.saleId && !delivery.customerId;
                  return (
                    <TableRow key={delivery.id} data-testid={`row-delivery-${delivery.id}`}>
                      <TableCell>
                        <div className="font-medium">{name}</div>
                        {isPickup && (
                          <Badge variant="outline" className="text-xs mt-0.5 text-orange-600 border-orange-200">
                            <User className="h-2.5 w-2.5 mr-0.5" />
                            Noma'lum
                          </Badge>
                        )}
                      </TableCell>
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
                  <p>Mijoz: <span className="font-medium text-foreground">{getDeliveryCustomerName(selectedDelivery)}</span></p>
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

      <Dialog open={pickupOpen} onOpenChange={(open) => { if (!open) resetPickup(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Mahsulot olish — noma'lum mijoz uchun
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Mijoz ismi (ixtiyoriy)</Label>
                <Input
                  placeholder="Noma'lum mijoz"
                  value={pickupCustomerName}
                  onChange={(e) => setPickupCustomerName(e.target.value)}
                  data-testid="input-pickup-name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Telefon (ixtiyoriy)</Label>
                <Input
                  placeholder="+998..."
                  value={pickupCustomerPhone}
                  onChange={(e) => setPickupCustomerPhone(e.target.value)}
                  data-testid="input-pickup-phone"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Manzil *</Label>
                <Input
                  placeholder="Yetkazish manzili"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  data-testid="input-pickup-address"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Izoh (ixtiyoriy)</Label>
                <Textarea
                  placeholder="Qo'shimcha ma'lumot..."
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  rows={2}
                  data-testid="input-pickup-notes"
                />
              </div>

              {pickupItems.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Tanlangan mahsulotlar ({pickupItems.length})</p>
                  {pickupItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30" data-testid={`pickup-item-${item.productId}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.price)} x {item.quantity} {item.unit} = {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePickupQty(item.productId, item.quantity - 1)}
                          data-testid={`button-pickup-minus-${item.productId}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-10 text-center text-sm font-medium" data-testid={`text-pickup-qty-${item.productId}`}>
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePickupQty(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          data-testid={`button-pickup-plus-${item.productId}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => updatePickupQty(item.productId, 0)}
                          data-testid={`button-pickup-remove-${item.productId}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t font-bold text-lg">
                    <span>Jami:</span>
                    <span data-testid="text-pickup-total">{formatCurrency(pickupTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Mahsulot qidirish..."
                  value={pickupSearch}
                  onChange={(e) => setPickupSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-pickup-search"
                />
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {filteredProducts?.map((product) => {
                  const inCart = pickupItems.find((i) => i.productId === product.id);
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                        inCart ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                      }`}
                      onClick={() => addPickupItem(product)}
                      data-testid={`product-pickup-${product.id}`}
                    >
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(product.price))} · {product.stock} {product.unit}
                        </p>
                      </div>
                      {inCart && (
                        <Badge className="shrink-0">{inCart.quantity}</Badge>
                      )}
                      {!inCart && (
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  );
                })}
                {filteredProducts?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Mahsulot topilmadi
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetPickup} data-testid="button-pickup-cancel">
              Bekor qilish
            </Button>
            <Button
              onClick={submitPickup}
              disabled={pickupMutation.isPending || pickupItems.length === 0}
              data-testid="button-pickup-submit"
            >
              <Truck className="h-4 w-4 mr-2" />
              {pickupMutation.isPending ? "Yuklanmoqda..." : `Mahsulot berish (${pickupItems.length} ta)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
