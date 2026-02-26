import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Customer } from "@shared/schema";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Percent,
  X,
  Package,
} from "lucide-react";

interface CartItem {
  product: Product;
  quantity: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [paymentType, setPaymentType] = useState<string>("cash");
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { toast } = useToast();

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const saleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/sales", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Savdo muvaffaqiyatli yakunlandi!" });
      setCart([]);
      setDiscount(0);
      setPaidAmount("");
      setSelectedCustomer("");
      setPaymentType("cash");
      setCheckoutOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const filteredProducts = products?.filter(
    (p) =>
      p.active &&
      p.stock > 0 &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ title: "Stokda yetarli mahsulot yo'q", variant: "destructive" });
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) {
              toast({ title: "Stokda yetarli mahsulot yo'q", variant: "destructive" });
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * Number(item.product.price),
    0
  );
  const total = subtotal - discount;
  const paid = paidAmount ? Number(paidAmount) : total;
  const change = paid - total;

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (paymentType === "debt" && !selectedCustomer) {
      toast({ title: "Qarzga sotish uchun mijoz tanlang", variant: "destructive" });
      return;
    }

    saleMutation.mutate({
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: Number(item.product.price),
      })),
      customerId: selectedCustomer || null,
      discount,
      paidAmount: paymentType === "debt" ? Number(paidAmount || 0) : total,
      paymentType,
    });
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mahsulot qidirish (nomi yoki SKU)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-pos-search"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts?.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover-elevate transition-all"
                  onClick={() => addToCart(product)}
                  data-testid={`card-product-${product.id}`}
                >
                  {product.imageUrl && (
                    <div className="w-full h-24 overflow-hidden rounded-t-lg">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {!product.imageUrl && (
                    <div className="w-full h-24 bg-muted flex items-center justify-center rounded-t-lg">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <h3 className="font-medium text-sm leading-tight">{product.name}</h3>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {product.stock}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{product.sku}</p>
                    <p className="font-bold text-sm text-primary">
                      {formatCurrency(Number(product.price))}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {filteredProducts?.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Mahsulot topilmadi
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="w-96 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-1">
            <h2 className="font-semibold flex items-center gap-2" data-testid="text-cart-title">
              <ShoppingCart className="h-4 w-4" />
              Savat
            </h2>
            <Badge variant="secondary">{cart.length} ta</Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Savat bo'sh</p>
              <p className="text-xs mt-1">Mahsulot qo'shish uchun ustiga bosing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-2 rounded-md bg-background"
                  data-testid={`cart-item-${item.product.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Number(item.product.price))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      data-testid={`button-minus-${item.product.id}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      data-testid={`button-plus-${item.product.id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFromCart(item.product.id)}
                      data-testid={`button-remove-${item.product.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-sm font-semibold w-24 text-right">
                    {formatCurrency(item.quantity * Number(item.product.price))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {cart.length > 0 && (
          <div className="p-4 border-t space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Jami:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Chegirma:</span>
                <span className="font-medium text-destructive">-{formatCurrency(discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Umumiy:</span>
              <span data-testid="text-cart-total">{formatCurrency(total)}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => setCheckoutOpen(true)}
              data-testid="button-checkout"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              To'lovga o'tish
            </Button>
          </div>
        )}
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>To'lov</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Mijoz (ixtiyoriy)</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger data-testid="select-customer">
                  <SelectValue placeholder="Mijoz tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName} ({c.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">To'lov turi</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={paymentType === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentType("cash")}
                  data-testid="button-payment-cash"
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Naqd
                </Button>
                <Button
                  variant={paymentType === "debt" ? "default" : "outline"}
                  onClick={() => setPaymentType("debt")}
                  data-testid="button-payment-debt"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Qarzga
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Chegirma (UZS)</label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="pl-10"
                  placeholder="0"
                  data-testid="input-discount"
                />
              </div>
            </div>

            {paymentType === "debt" && (
              <div>
                <label className="text-sm font-medium mb-1 block">To'langan summa</label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  data-testid="input-paid-amount"
                />
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Jami:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Chegirma:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Umumiy:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {paymentType === "cash" && paid > total && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Qaytim:</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
              {paymentType === "debt" && paidAmount && (
                <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                  <span>Qarz:</span>
                  <span>{formatCurrency(total - Number(paidAmount))}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)} data-testid="button-cancel-checkout">
              Bekor qilish
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={saleMutation.isPending}
              data-testid="button-confirm-sale"
            >
              {saleMutation.isPending ? "Yuklanmoqda..." : "Sotishni tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
