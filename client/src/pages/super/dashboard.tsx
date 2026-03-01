import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Store, Users, CreditCard, Shield, LogOut, Plus, Pencil, Trash2,
  BarChart3, Building2, Loader2, AlertTriangle, Key,
} from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";

function StatsCards() {
  const { data: stats } = useQuery({ queryKey: ["/api/super/stats"] });
  const s = stats as any;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Jami do'konlar</p>
              <p className="text-white text-xl font-bold" data-testid="text-total-tenants">{s?.totalTenants || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Faol do'konlar</p>
              <p className="text-white text-xl font-bold">{s?.activeTenants || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Rejalar soni</p>
              <p className="text-white text-xl font-bold">{s?.totalPlans || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Reja taqsimoti</p>
              <div className="flex gap-1 flex-wrap mt-0.5">
                {s?.planCounts && Object.entries(s.planCounts).map(([plan, count]) => (
                  <Badge key={plan} variant="outline" className="text-[10px] border-white/20 text-white/60">
                    {plan}: {count as number}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TenantsTable() {
  const { toast } = useToast();
  const { data: tenants = [], isLoading } = useQuery({ queryKey: ["/api/super/tenants"] });
  const { data: allPlans = [] } = useQuery({ queryKey: ["/api/super/plans"] });
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const updateTenantMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/super/tenants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super/stats"] });
      toast({ title: "Yangilandi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const deleteTenantMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/super/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super/stats"] });
      setDeleteConfirm(null);
      toast({ title: "Do'kon o'chirildi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const planSlugs = (allPlans as any[]).map((p: any) => p.slug);

  if (isLoading) return <div className="text-white/50 text-center py-8">Yuklanmoqda...</div>;

  return (
    <>
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-400" />
            Do'konlar ({(tenants as any[]).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="text-left py-3 px-2">Do'kon nomi</th>
                  <th className="text-left py-3 px-2">Egasi</th>
                  <th className="text-left py-3 px-2">Telefon</th>
                  <th className="text-left py-3 px-2">Reja</th>
                  <th className="text-left py-3 px-2">Holat</th>
                  <th className="text-left py-3 px-2">Sana</th>
                  <th className="text-left py-3 px-2">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {(tenants as any[]).map((t: any) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`row-tenant-${t.id}`}>
                    <td className="py-3 px-2 text-white font-medium">{t.name}</td>
                    <td className="py-3 px-2 text-white/70">{t.ownerName}</td>
                    <td className="py-3 px-2 text-white/60">{t.phone}</td>
                    <td className="py-3 px-2">
                      <Select
                        value={t.plan}
                        onValueChange={(val) => updateTenantMut.mutate({ id: t.id, data: { plan: val } })}
                      >
                        <SelectTrigger className="w-28 h-7 text-xs bg-white/5 border-white/10 text-white" data-testid={`select-plan-${t.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {planSlugs.length > 0 ? planSlugs.map((slug: string) => (
                            <SelectItem key={slug} value={slug}>{slug}</SelectItem>
                          )) : (
                            <>
                              <SelectItem value="free">free</SelectItem>
                              <SelectItem value="pro">pro</SelectItem>
                              <SelectItem value="enterprise">enterprise</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-2">
                      <Switch
                        checked={t.active}
                        onCheckedChange={(val) => updateTenantMut.mutate({ id: t.id, data: { active: val } })}
                        data-testid={`switch-active-${t.id}`}
                      />
                    </td>
                    <td className="py-3 px-2 text-white/40 text-xs">
                      {new Date(t.createdAt).toLocaleDateString("uz")}
                    </td>
                    <td className="py-3 px-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => setDeleteConfirm(t)}
                        data-testid={`button-delete-tenant-${t.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Do'konni o'chirish
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/70 text-sm">
            <strong className="text-white">{deleteConfirm?.name}</strong> do'konini va uning barcha ma'lumotlarini
            (mahsulotlar, mijozlar, sotuvlar) o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.
          </p>
          <DialogFooter>
            <Button variant="ghost" className="text-white/50 hover:text-white" onClick={() => setDeleteConfirm(null)}>
              Bekor qilish
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteConfirm && deleteTenantMut.mutate(deleteConfirm.id)}
              disabled={deleteTenantMut.isPending}
              data-testid="button-confirm-delete-tenant"
            >
              {deleteTenantMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlansManager() {
  const { toast } = useToast();
  const { data: plansList = [], isLoading } = useQuery({ queryKey: ["/api/super/plans"] });
  const [editPlan, setEditPlan] = useState<any>(null);
  const [newPlan, setNewPlan] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", price: "0", maxProducts: "100", maxEmployees: "3", features: "", sortOrder: "0", trialDays: "0", allowedModules: [] as string[] });

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/super/plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super/stats"] });
      setNewPlan(false);
      setForm({ name: "", slug: "", price: "0", maxProducts: "100", maxEmployees: "3", features: "", sortOrder: "0", trialDays: "0", allowedModules: [] });
      toast({ title: "Reja yaratildi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/super/plans/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super/plans"] });
      setEditPlan(null);
      toast({ title: "Reja yangilandi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/super/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super/stats"] });
      toast({ title: "Reja o'chirildi" });
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const openEdit = (p: any) => {
    setEditPlan(p);
    setForm({
      name: p.name,
      slug: p.slug,
      price: p.price,
      maxProducts: String(p.maxProducts),
      maxEmployees: String(p.maxEmployees),
      features: Array.isArray(p.features) ? p.features.join(", ") : "",
      sortOrder: String(p.sortOrder),
      trialDays: String(p.trialDays || 0),
      allowedModules: Array.isArray(p.allowedModules) ? p.allowedModules : [],
    });
  };

  const submitForm = (isNew: boolean) => {
    const data = {
      name: form.name,
      slug: form.slug,
      price: form.price,
      maxProducts: parseInt(form.maxProducts) || 100,
      maxEmployees: parseInt(form.maxEmployees) || 3,
      features: form.features.split(",").map(f => f.trim()).filter(Boolean),
      allowedModules: form.allowedModules,
      trialDays: parseInt(form.trialDays) || 0,
      sortOrder: parseInt(form.sortOrder) || 0,
      active: true,
    };
    if (isNew) {
      createMut.mutate(data);
    } else {
      updateMut.mutate({ id: editPlan.id, data });
    }
  };

  const allModulesList = [
    { key: "pos", label: "Sotuv (POS)" },
    { key: "warehouse", label: "Ombor" },
    { key: "categories", label: "Kategoriyalar" },
    { key: "products", label: "Mahsulotlar" },
    { key: "customers", label: "Mijozlar" },
    { key: "deliveries", label: "Yetkazib berish" },
    { key: "suppliers", label: "Ta'minotchilar" },
    { key: "purchases", label: "Kirim (Xaridlar)" },
    { key: "orders", label: "Buyurtmalar" },
    { key: "dealers", label: "Dillerlar" },
    { key: "roles", label: "Rollar" },
    { key: "employees", label: "Xodimlar" },
    { key: "settings", label: "Sozlamalar" },
  ];

  const toggleModule = (key: string) => {
    setForm(f => ({
      ...f,
      allowedModules: f.allowedModules.includes(key)
        ? f.allowedModules.filter(m => m !== key)
        : [...f.allowedModules, key]
    }));
  };

  const selectAllModules = () => {
    setForm(f => ({ ...f, allowedModules: allModulesList.map(m => m.key) }));
  };

  const planForm = (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-white/70 text-xs">Reja nomi</Label>
          <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-plan-name" />
        </div>
        <div>
          <Label className="text-white/70 text-xs">Slug</Label>
          <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-plan-slug" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-white/70 text-xs">Narx (UZS)</Label>
          <Input value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-plan-price" />
        </div>
        <div>
          <Label className="text-white/70 text-xs">Max mahsulotlar</Label>
          <Input value={form.maxProducts} onChange={(e) => setForm(f => ({ ...f, maxProducts: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-plan-max-products" />
        </div>
        <div>
          <Label className="text-white/70 text-xs">Max xodimlar</Label>
          <Input value={form.maxEmployees} onChange={(e) => setForm(f => ({ ...f, maxEmployees: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-plan-max-employees" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-white/70 text-xs">Sinov muddati (kun)</Label>
          <Input value={form.trialDays} onChange={(e) => setForm(f => ({ ...f, trialDays: e.target.value }))}
            placeholder="0"
            className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-plan-trial-days" />
        </div>
        <div>
          <Label className="text-white/70 text-xs">Tartib raqami</Label>
          <Input value={form.sortOrder} onChange={(e) => setForm(f => ({ ...f, sortOrder: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm" />
        </div>
      </div>
      <div>
        <Label className="text-white/70 text-xs">Xususiyatlar (vergul bilan)</Label>
        <Input value={form.features} onChange={(e) => setForm(f => ({ ...f, features: e.target.value }))}
          placeholder="POS kassa, Ombor, Telegram OTP"
          className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-plan-features" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-white/70 text-xs">Ruxsat berilgan modullar</Label>
          <Button type="button" size="sm" variant="ghost" className="text-xs text-blue-400 hover:text-blue-300 h-6 px-2"
            onClick={selectAllModules} data-testid="button-select-all-modules">
            Barchasini tanlash
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {allModulesList.map((m) => (
            <label
              key={m.key}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer border text-xs transition-colors ${
                form.allowedModules.includes(m.key)
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-200"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
              data-testid={`toggle-module-${m.key}`}
            >
              <input
                type="checkbox"
                checked={form.allowedModules.includes(m.key)}
                onChange={() => toggleModule(m.key)}
                className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/30 h-3.5 w-3.5"
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) return <div className="text-white/50 text-center py-8">Yuklanmoqda...</div>;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-400" />
          Obuna rejalari ({(plansList as any[]).length})
        </CardTitle>
        <Dialog open={newPlan} onOpenChange={(open) => {
          setNewPlan(open);
          if (open) setForm({ name: "", slug: "", price: "0", maxProducts: "100", maxEmployees: "3", features: "", sortOrder: "0", trialDays: "0", allowedModules: [] });
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-0" data-testid="button-add-plan">
              <Plus className="w-4 h-4 mr-1" /> Yangi reja
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Yangi reja yaratish</DialogTitle>
            </DialogHeader>
            {planForm}
            <Button onClick={() => submitForm(true)} disabled={createMut.isPending}
              className="bg-purple-500 hover:bg-purple-600 text-white" data-testid="button-save-plan">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Saqlash
            </Button>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(plansList as any[]).map((p: any) => (
            <Card key={p.id} className="bg-white/5 border-white/10" data-testid={`card-plan-${p.slug}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold text-lg">{p.name}</h3>
                    <Badge variant="outline" className="text-[10px] border-white/20 text-white/50">{p.slug}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Dialog open={editPlan?.id === p.id} onOpenChange={(open) => { if (open) openEdit(p); else setEditPlan(null); }}>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" data-testid={`button-edit-plan-${p.slug}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-900 border-white/10 text-white">
                        <DialogHeader>
                          <DialogTitle>Rejani tahrirlash</DialogTitle>
                        </DialogHeader>
                        {planForm}
                        <Button onClick={() => submitForm(false)} disabled={updateMut.isPending}
                          className="bg-purple-500 hover:bg-purple-600 text-white" data-testid="button-update-plan">
                          {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Yangilash
                        </Button>
                      </DialogContent>
                    </Dialog>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/50 hover:text-red-400"
                      onClick={() => deleteMut.mutate(p.id)} data-testid={`button-delete-plan-${p.slug}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {Number(p.price).toLocaleString()} <span className="text-sm text-white/50 font-normal">UZS/oy</span>
                </div>
                <div className="text-white/40 text-xs mb-2">
                  Max: {p.maxProducts >= 999999 ? "∞" : p.maxProducts} mahsulot, {p.maxEmployees >= 999999 ? "∞" : p.maxEmployees} xodim
                  {p.trialDays > 0 && <span className="ml-2 text-yellow-400">| {p.trialDays} kun sinov</span>}
                </div>
                {Array.isArray(p.allowedModules) && p.allowedModules.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-white/30 mb-1">Modullar ({p.allowedModules.length}/13):</p>
                    <div className="flex flex-wrap gap-1">
                      {p.allowedModules.map((m: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[9px] border-blue-500/20 text-blue-300/70 px-1.5 py-0">{m}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(p.features) && p.features.map((f: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-white/10 text-white/50">{f}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordChange() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/super/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Parol muvaffaqiyatli o'zgartirildi" });
      setOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Barcha maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    if (newPassword.length < 4) {
      toast({ title: "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Yangi parollar mos kelmadi", variant: "destructive" });
      return;
    }
    mutation.mutate({ currentPassword, newPassword });
  };

  return (
    <Card className="bg-white/5 border-white/10 mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Key className="w-5 h-5 text-purple-400" />
          Xavfsizlik sozlamalari
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/10" data-testid="button-change-password">
              <Key className="w-4 h-4 mr-2" />
              Parolni o'zgartirish
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-500" />
                Parolni o'zgartirish
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Joriy parol</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Joriy parolni kiriting"
                  data-testid="input-current-password"
                />
              </div>
              <div>
                <Label>Yangi parol</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yangi parolni kiriting"
                  data-testid="input-new-password"
                />
              </div>
              <div>
                <Label>Yangi parolni tasdiqlang</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Yangi parolni qayta kiriting"
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
              <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-submit-password">
                {mutation.isPending ? "Yuklanmoqda..." : "O'zgartirish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function SuperDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">MARKET_LINE</span>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">SUPER ADMIN</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white hover:bg-white/10"
            onClick={onLogout}
            data-testid="button-super-logout"
          >
            <LogOut className="w-4 h-4 mr-1" /> Chiqish
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <StatsCards />
        <TenantsTable />
        <PlansManager />
        <PasswordChange />
      </main>
    </div>
  );
}
