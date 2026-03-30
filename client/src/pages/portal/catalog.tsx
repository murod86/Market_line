import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product, Category } from "@shared/schema";
import { Search, Package, ShoppingCart, Plus, Minus } from "lucide-react";
import { getSellUnitOptions, stockToDisplayQty, productPriceLabel } from "@/lib/units";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export interface CartItem {
  product: Product;
  quantity: number;
  buyUnit: string;
  stockPieces: number;
}

interface CatalogProps {
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onChangeUnit: (productId: string, unit: string) => void;
}

export default function PortalCatalog({ cart, onAddToCart, onUpdateQuantity, onChangeUnit }: CatalogProps) {
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

  const getCartItem = (productId: string) => {
    return cart.find((item) => item.product.id === productId);
  };
  const getCartQty = (productId: string) => {
    return getCartItem(productId)?.quantity || 0;
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered?.map((product) => {
            const category = categories?.find((c) => c.id === product.categoryId);
            const cartItem = getCartItem(product.id);
            const cartQty = cartItem?.quantity || 0;
            const cartUnit = cartItem?.buyUnit || product.unit;
            return (
              <Card
                key={product.id}
                className="overflow-hidden border rounded-xl transition-all hover:shadow-md group"
                data-testid={`card-catalog-${product.id}`}
              >
                <div className="relative aspect-[4/5] bg-muted/30 overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center ${product.imageUrl ? "hidden" : ""}`}>
                    <Package className="h-14 w-14 text-muted-foreground/20" />
                  </div>
                  {category && (
                    <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 opacity-90">
                      {category.name}
                    </Badge>
                  )}
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Badge variant="destructive">Tugagan</Badge>
                    </div>
                  )}
                </div>

                <div className="p-2 space-y-1.5">
                  <h3 className="font-semibold text-xs leading-tight line-clamp-2 min-h-[2rem]">{product.name}</h3>

                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-bold text-sm text-primary">{productPriceLabel(Number(product.price), product.unit)}</span>
                    <span className="text-[10px] text-muted-foreground">{(() => {
                      const defUnit = getSellUnitOptions(product)[0];
                      const dispQty = stockToDisplayQty(product.stock, defUnit, product.unit, product.boxQuantity || 1);
                      return `${dispQty} ${defUnit}`;
                    })()}</span>
                  </div>

                  {product.stock > 0 && (
                    <>
                      {cartQty === 0 ? (
                        <Button
                          className="w-full h-8 text-xs"
                          size="sm"
                          onClick={() => onAddToCart(product)}
                          data-testid={`button-add-catalog-${product.id}`}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Savatga
                        </Button>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Select
                              value={cartUnit}
                              onValueChange={(val) => onChangeUnit(product.id, val)}
                            >
                              <SelectTrigger className="h-7 text-[10px] flex-1" data-testid={`select-catalog-unit-${product.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="dona">dona</SelectItem>
                                <SelectItem value="quti">quti</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="gram">gram</SelectItem>
                                <SelectItem value="litr">litr</SelectItem>
                                <SelectItem value="metr">metr</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border bg-background">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-r-none"
                              onClick={() => onUpdateQuantity(product.id, -1)}
                              data-testid={`button-catalog-minus-${product.id}`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="font-bold text-sm min-w-[1.5rem] text-center" data-testid={`text-catalog-qty-${product.id}`}>
                              {cartQty}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-l-none"
                              onClick={() => onUpdateQuantity(product.id, 1)}
                              data-testid={`button-catalog-plus-${product.id}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {cartUnit === "quti" && (product.boxQuantity || 1) > 1 && (
                            <p className="text-[9px] text-center text-muted-foreground">
                              {cartQty} quti = {cartQty * (product.boxQuantity || 1)} {product.unit}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
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
