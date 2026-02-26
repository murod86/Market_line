import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Delivery, Customer } from "@shared/schema";
import { Truck, MapPin, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Kutilmoqda", variant: "secondary" },
  in_transit: { label: "Yo'lda", variant: "default" },
  delivered: { label: "Yetkazildi", variant: "default" },
  cancelled: { label: "Bekor qilindi", variant: "destructive" },
};

export default function Deliveries() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
    },
  });

  const filtered = deliveries?.filter(
    (d) => statusFilter === "all" || d.status === statusFilter
  );

  const pendingCount = deliveries?.filter((d) => d.status === "pending").length || 0;
  const inTransitCount = deliveries?.filter((d) => d.status === "in_transit").length || 0;
  const deliveredCount = deliveries?.filter((d) => d.status === "delivered").length || 0;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-deliveries-title">Yetkazib berish</h1>
        <p className="text-muted-foreground">Buyurtmalarni yetkazib berish boshqaruvi</p>
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
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(delivery.createdAt), "dd.MM.yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{delivery.notes || "-"}</TableCell>
                      <TableCell>
                        {delivery.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMutation.mutate({ id: delivery.id, status: "in_transit" })}
                              data-testid={`button-transit-${delivery.id}`}
                            >
                              <Truck className="h-3 w-3 mr-1" />
                              Jo'natish
                            </Button>
                          </div>
                        )}
                        {delivery.status === "in_transit" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMutation.mutate({ id: delivery.id, status: "delivered" })}
                              data-testid={`button-deliver-${delivery.id}`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Yetkazildi
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
    </div>
  );
}
