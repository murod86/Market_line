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
import type { Supplier } from "@shared/schema";
import { Plus, Search, Building2, Edit, Phone, MapPin } from "lucide-react";

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", company: "", address: "" });
  const { toast } = useToast();

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const res = await apiRequest("PATCH", `/api/suppliers/${editing.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/suppliers", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: editing ? "Ta'minotchi yangilandi" : "Ta'minotchi qo'shildi" });
      setDialogOpen(false);
      setEditing(null);
      setForm({ name: "", phone: "", company: "", address: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const filtered = suppliers?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.company?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", phone: "", company: "", address: "" });
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      phone: supplier.phone || "",
      company: supplier.company || "",
      address: supplier.address || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "Xatolik", description: "Nomi majburiy", variant: "destructive" });
      return;
    }
    mutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 h-full overflow-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Ta'minotchilar</h1>
          <p className="text-muted-foreground">Barcha ta'minotchilarni boshqarish</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-supplier">
          <Plus className="h-4 w-4 mr-2" /> Yangi ta'minotchi
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-suppliers"
          />
        </div>
        <Badge variant="secondary" data-testid="badge-supplier-count">
          <Building2 className="h-3 w-3 mr-1" /> {suppliers?.length || 0}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi</TableHead>
                <TableHead>Kompaniya</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Manzil</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((supplier) => (
                <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.company || "—"}</TableCell>
                  <TableCell>
                    {supplier.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {supplier.phone}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {supplier.address ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {supplier.address}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.active ? "default" : "secondary"}>
                      {supplier.active ? "Faol" : "Nofaol"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(supplier)} data-testid={`button-edit-supplier-${supplier.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Ta'minotchilar topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Ta'minotchini tahrirlash" : "Yangi ta'minotchi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nomi *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ta'minotchi nomi"
                data-testid="input-supplier-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kompaniya</label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Kompaniya nomi"
                data-testid="input-supplier-company"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefon</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+998..."
                data-testid="input-supplier-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Manzil</label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Manzil"
                data-testid="input-supplier-address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-supplier">
              Bekor qilish
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-save-supplier">
              {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
