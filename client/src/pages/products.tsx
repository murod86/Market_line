import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Category } from "@shared/schema";
import { Plus, Search, Package, Edit, Upload, X, Image as ImageIcon } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export default function Products() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", sku: "", price: "", costPrice: "",
    stock: "", minStock: "5", categoryId: "", unit: "dona", imageUrl: "",
  });
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Rasm hajmi 5MB dan oshmasligi kerak", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Yuklash xatosi");
      const data = await res.json();
      setForm((prev) => ({ ...prev, imageUrl: data.url }));
      toast({ title: "Rasm yuklandi" });
    } catch {
      toast({ title: "Rasm yuklashda xatolik", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const { data: products, isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const res = await apiRequest("PATCH", `/api/products/${editing.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/products", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: editing ? "Mahsulot yangilandi" : "Mahsulot qo'shildi" });
      setDialogOpen(false);
      setEditing(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", description: "", sku: "", price: "", costPrice: "", stock: "", minStock: "5", categoryId: "", unit: "dona", imageUrl: "" });
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description || "",
      sku: product.sku,
      price: product.price,
      costPrice: product.costPrice,
      stock: String(product.stock),
      minStock: String(product.minStock),
      categoryId: product.categoryId || "",
      unit: product.unit,
      imageUrl: product.imageUrl || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.sku || !form.price || !form.costPrice) {
      toast({ title: "Barcha majburiy maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: form.name,
      description: form.description || null,
      sku: form.sku,
      price: form.price,
      costPrice: form.costPrice,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 5,
      categoryId: form.categoryId || null,
      unit: form.unit,
      imageUrl: form.imageUrl || null,
      active: true,
    });
  };

  const filtered = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-products-title">Mahsulotlar</h1>
          <p className="text-muted-foreground">Mahsulotlarni boshqarish</p>
        </div>
        <Button onClick={() => { resetForm(); setEditing(null); setDialogOpen(true); }} data-testid="button-add-product">
          <Plus className="h-4 w-4 mr-2" />
          Yangi mahsulot
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-products-search"
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
                  <TableHead>Rasm</TableHead>
                  <TableHead>Nomi</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Kategoriya</TableHead>
                  <TableHead>Narxi</TableHead>
                  <TableHead>Tan narxi</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Holati</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((product) => {
                  const category = categories?.find((c) => c.id === product.categoryId);
                  const isLow = product.stock <= product.minStock;
                  return (
                    <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                      <TableCell>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground/30" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                      <TableCell>
                        {category ? <Badge variant="secondary">{category.name}</Badge> : "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(product.price))}</TableCell>
                      <TableCell className="text-muted-foreground">{formatCurrency(Number(product.costPrice))}</TableCell>
                      <TableCell>
                        <span className={isLow ? "text-destructive font-medium" : ""}>
                          {product.stock} {product.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge variant="destructive">Kam</Badge>
                        ) : (
                          <Badge variant="secondary">Yetarli</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(product)} data-testid={`button-edit-product-${product.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Mahsulot topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nomi *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-product-name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">SKU *</label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} data-testid="input-product-sku" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tavsif</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-product-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Narxi (UZS) *</label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="input-product-price" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tan narxi (UZS) *</label>
                <Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} data-testid="input-product-cost" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Stok</label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} data-testid="input-product-stock" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Min stok</label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} data-testid="input-product-min-stock" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Birlik</label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger data-testid="select-product-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dona">Dona</SelectItem>
                    <SelectItem value="quti">Quti</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="gram">Gram</SelectItem>
                    <SelectItem value="litr">Litr</SelectItem>
                    <SelectItem value="metr">Metr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Kategoriya</label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger data-testid="select-product-category">
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Mahsulot rasmi</label>
              {form.imageUrl ? (
                <div className="relative w-full h-40 rounded-md overflow-hidden border bg-muted">
                  <img src={form.imageUrl} alt="Mahsulot" className="w-full h-full object-contain" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => setForm({ ...form, imageUrl: "" })}
                    data-testid="button-remove-image"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/50 cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    data-testid="input-product-image"
                  />
                  {uploading ? (
                    <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Rasm yuklash uchun bosing</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP (max 5MB)</p>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-product">
              {createMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
