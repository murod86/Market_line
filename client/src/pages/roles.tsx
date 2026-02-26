import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ALL_PERMISSIONS, type Role, type Permission } from "@shared/schema";
import { Plus, Shield, Edit, Trash2 } from "lucide-react";

const permissionGroups: Record<string, { label: string; permissions: Permission[] }> = {
  pos: {
    label: "Sotuv (POS)",
    permissions: ["pos.sell", "pos.discount", "pos.debt_sale"],
  },
  customers: {
    label: "Mijozlar",
    permissions: ["customers.view", "customers.create", "customers.edit"],
  },
  products: {
    label: "Mahsulotlar",
    permissions: ["products.view", "products.create", "products.edit", "products.stock"],
  },
  warehouse: {
    label: "Ombor",
    permissions: ["warehouse.view"],
  },
  roles: {
    label: "Rollar",
    permissions: ["roles.view", "roles.manage"],
  },
  employees: {
    label: "Hodimlar",
    permissions: ["employees.view", "employees.manage"],
  },
  deliveries: {
    label: "Yetkazib berish",
    permissions: ["deliveries.view", "deliveries.manage"],
  },
  settings: {
    label: "Sozlamalar",
    permissions: ["settings.manage"],
  },
  reports: {
    label: "Hisobotlar",
    permissions: ["reports.view"],
  },
};

const permissionLabels: Record<string, string> = {
  "pos.sell": "Sotish",
  "pos.discount": "Chegirma berish",
  "pos.debt_sale": "Qarzga sotish",
  "customers.view": "Ko'rish",
  "customers.create": "Qo'shish",
  "customers.edit": "Tahrirlash",
  "products.view": "Ko'rish",
  "products.create": "Qo'shish",
  "products.edit": "Tahrirlash",
  "products.stock": "Stok boshqarish",
  "warehouse.view": "Ko'rish",
  "roles.view": "Ko'rish",
  "roles.manage": "Boshqarish",
  "employees.view": "Ko'rish",
  "employees.manage": "Boshqarish",
  "deliveries.view": "Ko'rish",
  "deliveries.manage": "Boshqarish",
  "settings.manage": "Boshqarish",
  "reports.view": "Ko'rish",
};

export default function Roles() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: roles, isLoading } = useQuery<Role[]>({ queryKey: ["/api/roles"] });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const res = await apiRequest("PATCH", `/api/roles/${editing.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/roles", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: editing ? "Rol yangilandi" : "Rol yaratildi" });
      setDialogOpen(false);
      setEditing(null);
      setName("");
      setSelectedPerms([]);
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/roles/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Rol o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
  });

  const openEdit = (role: Role) => {
    setEditing(role);
    setName(role.name);
    setSelectedPerms(role.permissions as string[]);
    setDialogOpen(true);
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = () => {
    if (!name) {
      toast({ title: "Rol nomi majburiy", variant: "destructive" });
      return;
    }
    mutation.mutate({ name, permissions: selectedPerms });
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-roles-title">Rollar</h1>
          <p className="text-muted-foreground">Rollar va ruxsatlarni boshqarish</p>
        </div>
        <Button onClick={() => { setEditing(null); setName(""); setSelectedPerms([]); setDialogOpen(true); }} data-testid="button-add-role">
          <Plus className="h-4 w-4 mr-2" />
          Yangi rol
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles?.map((role) => {
            const perms = role.permissions as string[];
            return (
              <Card key={role.id} className="hover-elevate" data-testid={`card-role-${role.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base">{role.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(role)} data-testid={`button-edit-role-${role.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(role.id)} data-testid={`button-delete-role-${role.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {perms.slice(0, 5).map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                    {perms.length > 5 && (
                      <Badge variant="secondary" className="text-xs">+{perms.length - 5}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{perms.length} ta ruxsat</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Rolni tahrirlash" : "Yangi rol"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Rol nomi *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Kassir" data-testid="input-role-name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ruxsatlar</label>
              <ScrollArea className="h-64 rounded-md border p-3">
                {Object.entries(permissionGroups).map(([key, group]) => (
                  <div key={key} className="mb-4">
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">{group.label}</h4>
                    <div className="space-y-2 ml-2">
                      {group.permissions.map((perm) => (
                        <div key={perm} className="flex items-center gap-2">
                          <Checkbox
                            id={perm}
                            checked={selectedPerms.includes(perm)}
                            onCheckedChange={() => togglePerm(perm)}
                            data-testid={`checkbox-perm-${perm}`}
                          />
                          <label htmlFor={perm} className="text-sm cursor-pointer">
                            {permissionLabels[perm] || perm}
                          </label>
                        </div>
                      ))}
                    </div>
                    <Separator className="mt-3" />
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-save-role">
              {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
