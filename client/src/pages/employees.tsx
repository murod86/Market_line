import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Employee, Role } from "@shared/schema";
import { Plus, Search, UserCog, Edit, Phone } from "lucide-react";

export default function Employees() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    fullName: "", phone: "", username: "", password: "", roleId: "", active: true,
  });
  const { toast } = useToast();

  const { data: employees, isLoading } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: roles } = useQuery<Role[]>({ queryKey: ["/api/roles"] });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const res = await apiRequest("PATCH", `/api/employees/${editing.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/employees", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: editing ? "Hodim yangilandi" : "Hodim qo'shildi" });
      setDialogOpen(false);
      setEditing(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({ fullName: "", phone: "", username: "", password: "", roleId: "", active: true });
  };

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setForm({
      fullName: employee.fullName,
      phone: employee.phone,
      username: employee.username,
      password: "",
      roleId: employee.roleId || "",
      active: employee.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.fullName || !form.phone || !form.username) {
      toast({ title: "Majburiy maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    if (!editing && !form.password) {
      toast({ title: "Parol majburiy", variant: "destructive" });
      return;
    }
    const data: any = {
      fullName: form.fullName,
      phone: form.phone,
      username: form.username,
      roleId: form.roleId || null,
      active: form.active,
    };
    if (form.password) data.password = form.password;
    else if (editing) data.password = editing.password;
    mutation.mutate(data);
  };

  const filtered = employees?.filter(
    (e) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-employees-title">Hodimlar</h1>
          <p className="text-muted-foreground">{employees?.length || 0} ta hodim</p>
        </div>
        <Button onClick={() => { resetForm(); setEditing(null); setDialogOpen(true); }} data-testid="button-add-employee">
          <Plus className="h-4 w-4 mr-2" />
          Yangi hodim
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Ism yoki username bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-employees-search"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hodim</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Holati</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((employee) => {
                  const role = roles?.find((r) => r.id === employee.roleId);
                  return (
                    <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                            {employee.fullName.charAt(0)}
                          </div>
                          {employee.fullName}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">@{employee.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {employee.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {role ? <Badge variant="secondary">{role.name}</Badge> : "-"}
                      </TableCell>
                      <TableCell>
                        {employee.active ? (
                          <Badge variant="default">Faol</Badge>
                        ) : (
                          <Badge variant="secondary">Nofaol</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(employee)} data-testid={`button-edit-employee-${employee.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Hodim topilmadi
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
            <DialogTitle>{editing ? "Hodimni tahrirlash" : "Yangi hodim"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">To'liq ism *</label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} data-testid="input-employee-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Username *</label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} data-testid="input-employee-username" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{editing ? "Yangi parol" : "Parol *"}</label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="input-employee-password" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telefon *</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998901234567" data-testid="input-employee-phone" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Rol</label>
              <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                <SelectTrigger data-testid="select-employee-role">
                  <SelectValue placeholder="Rol tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} data-testid="switch-employee-active" />
              <label className="text-sm font-medium">Faol</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-save-employee">
              {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
