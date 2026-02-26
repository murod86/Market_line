import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer } from "@shared/schema";
import { Plus, Search, Users, Edit, Phone, MapPin } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    fullName: "", phone: "", address: "", telegramId: "",
  });
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const res = await apiRequest("PATCH", `/api/customers/${editing.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: editing ? "Mijoz yangilandi" : "Mijoz qo'shildi" });
      setDialogOpen(false);
      setEditing(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({ fullName: "", phone: "", address: "", telegramId: "" });
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      fullName: customer.fullName,
      phone: customer.phone,
      address: customer.address || "",
      telegramId: customer.telegramId || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.fullName || !form.phone) {
      toast({ title: "Ism va telefon majburiy", variant: "destructive" });
      return;
    }
    mutation.mutate({
      fullName: form.fullName,
      phone: form.phone,
      address: form.address || null,
      telegramId: form.telegramId || null,
      active: true,
      debt: editing ? undefined : "0",
    });
  };

  const filtered = customers?.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const totalDebt = customers?.reduce((sum, c) => sum + Number(c.debt), 0) || 0;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-customers-title">Mijozlar</h1>
          <p className="text-muted-foreground">
            {customers?.length || 0} ta mijoz | Jami qarz: {formatCurrency(totalDebt)}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditing(null); setDialogOpen(true); }} data-testid="button-add-customer">
          <Plus className="h-4 w-4 mr-2" />
          Yangi mijoz
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Ism yoki telefon bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-customers-search"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Manzil</TableHead>
                  <TableHead>Telegram ID</TableHead>
                  <TableHead>Qarz</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((customer) => (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                          {customer.fullName.charAt(0)}
                        </div>
                        {customer.fullName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.address ? (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{customer.address}</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{customer.telegramId || "-"}</TableCell>
                    <TableCell>
                      {Number(customer.debt) > 0 ? (
                        <Badge variant="destructive">{formatCurrency(Number(customer.debt))}</Badge>
                      ) : (
                        <Badge variant="secondary">Qarz yo'q</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(customer)} data-testid={`button-edit-customer-${customer.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Mijoz topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Mijozni tahrirlash" : "Yangi mijoz"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">To'liq ism *</label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} data-testid="input-customer-name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telefon *</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998901234567" data-testid="input-customer-phone" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Manzil</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-customer-address" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telegram ID</label>
              <Input value={form.telegramId} onChange={(e) => setForm({ ...form, telegramId: e.target.value })} data-testid="input-customer-telegram" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-save-customer">
              {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
