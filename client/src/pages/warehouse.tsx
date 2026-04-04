import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Product, Category } from "@shared/schema";
import { Search, Package, AlertTriangle, TrendingUp, DollarSign, Banknote } from "lucide-react";
import { stockBadge, productPriceLabel } from "@/lib/units";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export default function Warehouse() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const filtered = products?.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || p.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalStock = products?.reduce((sum, p) => sum + p.stock, 0) || 0;
  const lowStockCount = products?.filter((p) => p.stock <= p.minStock).length || 0;
  const costValue = products?.reduce((sum, p) => sum + p.stock * Number(p.costPrice || 0), 0) || 0;
  const sellValue = products?.reduce((sum, p) => sum + p.stock * Number(p.price), 0) || 0;
  const potentialProfit = sellValue - costValue;
  const totalValue = sellValue;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-warehouse-title">Ombor</h1>
        <p className="text-muted-foreground">Mahsulotlar stoki va katalog</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Mahsulot turi</p>
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Package className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-stock">{products?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">ta tur mahsulot</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Jami miqdor</p>
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{new Intl.NumberFormat("uz-UZ").format(totalStock)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">jami dona/kg</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Kam qolgan</p>
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-low-stock">{lowStockCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">ta diqqat talab</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Kirim narxida</p>
              <div className="p-1.5 rounded-lg bg-slate-500/10">
                <Banknote className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <p className="text-lg font-bold leading-tight" data-testid="text-cost-value">
              {new Intl.NumberFormat("uz-UZ").format(Math.round(costValue))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">UZS (tan narx)</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Sotish narxida</p>
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <DollarSign className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400 leading-tight" data-testid="text-stock-value">
              {new Intl.NumberFormat("uz-UZ").format(Math.round(sellValue))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">UZS (barchasi sotilsa)</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Potensial foyda</p>
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight" data-testid="text-potential-profit">
              {new Intl.NumberFormat("uz-UZ").format(Math.round(potentialProfit))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">UZS (sof margin)</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mahsulot qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-warehouse-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue placeholder="Kategoriya" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered?.map((product) => {
            const isLow = product.stock <= product.minStock;
            const category = categories?.find((c) => c.id === product.categoryId);
            return (
              <Card
                key={product.id}
                className="hover-elevate transition-all"
                data-testid={`card-warehouse-${product.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-12 w-12 shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-medium text-sm leading-tight truncate">{product.name}</h3>
                        {isLow && (
                          <Badge variant="destructive" className="text-xs shrink-0">Kam</Badge>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-primary">{productPriceLabel(Number(product.price), product.unit)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {category && (
                      <Badge variant="secondary" className="text-xs">{category.name}</Badge>
                    )}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="font-bold text-sm text-primary">
                        {productPriceLabel(Number(product.price), product.unit)}
                      </span>
                      <span className={`text-sm font-medium ${isLow ? "text-destructive" : "text-muted-foreground"}`}>
                        {stockBadge(product.stock, product.unit, product.boxQuantity || 1)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Mahsulot topilmadi</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
