import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product, Category } from "@shared/schema";
import { Search, Package, ShoppingCart, Plus, Minus } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CatalogProps {
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
}

export default function PortalCatalog({ cart, onAddToCart, onUpdateQuantity }: CatalogProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/portal/catalog"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/portal/categories"],
  });

  const filtered = products?.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || p.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCartQty = (productId: string) => {
    return cart.find((item) => item.product.id === productId)?.quantity || 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight" data-testid="text-catalog-title">Katalog</h2>
        <p className="text-muted-foreground text-sm">Mahsulotlarni ko'ring va buyurtma bering</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mahsulot qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-catalog-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-testid="select-catalog-category">
            <SelectValue placeholder="Kategoriya" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered?.map((product) => {
            const category = categories?.find((c) => c.id === product.categoryId);
            const cartQty = getCartQty(product.id);
            return (
              <Card key={product.id} className="hover-elevate transition-all" data-testid={`card-catalog-${product.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm leading-tight">{product.name}</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                    )}
                    {category && (
                      <Badge variant="secondary" className="text-xs">{category.name}</Badge>
                    )}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="font-bold text-sm text-primary">
                        {formatCurrency(Number(product.price))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {product.stock} {product.unit}
                      </span>
                    </div>
                    {cartQty === 0 ? (
                      <Button
                        className="w-full"
                        size="sm"
                        variant="outline"
                        onClick={() => onAddToCart(product)}
                        data-testid={`button-add-catalog-${product.id}`}
                      >
                        <ShoppingCart className="h-3 w-3 mr-2" />
                        Savatga qo'shish
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => onUpdateQuantity(product.id, -1)}
                          data-testid={`button-catalog-minus-${product.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium text-sm">{cartQty}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => onUpdateQuantity(product.id, 1)}
                          data-testid={`button-catalog-plus-${product.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
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
