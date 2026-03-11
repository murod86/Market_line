import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Receipt, TrendingDown, Search } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

const CATEGORIES = [
  { value: "ijara", label: "Ijara" },
  { value: "maosh", label: "Xodimlar maoshi" },
  { value: "kommunal", label: "Kommunal xizmatlar" },
  { value: "transport", label: "Transport" },
  { value: "reklama", label: "Reklama" },
  { value: "ombor", label: "Ombor xarajati" },
  { value: "boshqa", label: "Boshqa" },
];

const catColor: Record<string, string> = {
  ijara: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  maosh: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  kommunal: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  transport: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  reklama: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  ombor: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  boshqa: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

interface ExpenseForm {
  title: string;
  amount: string;
  category: string;
  notes: string;
}

const emptyForm: ExpenseForm = { title: "", amount: "", category: "boshqa", notes: "" };

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const { toast } = useToast();

  const { data: expenses, isLoading } = useQuery<any[]>({
    queryKey: ["/api/expenses"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Xarajat qo'shildi" });
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Xarajat yangilandi" });
      setDialogOpen(false);
      setEditItem(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Xarajat o'chirildi" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
  });

  function openCreate() {
    setEditItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(exp: any) {
    setEditItem(exp);
    setForm({ title: exp.title, amount: String(exp.amount), category: exp.category, notes: exp.notes || "" });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.title.trim() || !form.amount) {
      toast({ title: "Sarlavha va summa majburiy", variant: "destructive" });
      return;
    }
    const data = { title: form.title.trim(), amount: Number(form.amount), category: form.category, notes: form.notes.trim() || null };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const filtered = (expenses || []).filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || e.category === catFilter;
    return matchSearch && matchCat;
  });

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const todayTotal = (expenses || []).filter(e => new Date(e.createdAt) >= todayStart).reduce((s, e) => s + Number(e.amount), 0);
  const monthTotal = (expenses || []).filter(e => new Date(e.createdAt) >= monthStart).reduce((s, e) => s + Number(e.amount), 0);
  const allTotal = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xarajatlar</h1>
          <p className="text-muted-foreground">Biznes xarajatlarini boshqarish</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-expense">
          <Plus className="h-4 w-4 mr-2" />
          Xarajat qo'shish
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bugungi xarajat</CardTitle>
            <div className="p-2 rounded-md bg-red-500/10"><TrendingDown className="h-4 w-4 text-red-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatCurrency(todayTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Bugun</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Oylik xarajat</CardTitle>
            <div className="p-2 rounded-md bg-orange-500/10"><TrendingDown className="h-4 w-4 text-orange-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{formatCurrency(monthTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Bu oy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jami xarajat</CardTitle>
            <div className="p-2 rounded-md bg-slate-500/10"><Receipt className="h-4 w-4 text-slate-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(allTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Barcha vaqt</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sarlavha bo'yicha qidirish..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-expense"
              />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-category-filter">
                <SelectValue placeholder="Kategoriya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha kategoriyalar</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Xarajatlar topilmadi</p>
              <p className="text-sm mt-1">Yangi xarajat qo'shish uchun yuqoridagi tugmani bosing</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sarlavha</TableHead>
                  <TableHead>Kategoriya</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead>Izoh</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(exp => (
                  <TableRow key={exp.id} data-testid={`row-expense-${exp.id}`}>
                    <TableCell className="font-medium">{exp.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={catColor[exp.category] || catColor.boshqa}>
                        {CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">{formatCurrency(Number(exp.amount))}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(exp.createdAt), "dd.MM.yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{exp.notes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(exp)} data-testid={`button-edit-expense-${exp.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(exp.id)} data-testid={`button-delete-expense-${exp.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Xarajatni tahrirlash" : "Yangi xarajat"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Sarlavha *</Label>
              <Input
                placeholder="Masalan: Aprel oylik ijara"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                data-testid="input-expense-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Summa (UZS) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                data-testid="input-expense-amount"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kategoriya</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-expense-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Textarea
                placeholder="Qo'shimcha ma'lumot..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                data-testid="textarea-expense-notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-expense"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xarajatni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>Ushbu xarajat butunlay o'chiriladi. Davom etasizmi?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-expense"
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
