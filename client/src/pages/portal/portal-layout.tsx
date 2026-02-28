import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@assets/marketline_final_v1.png";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, Product } from "@shared/schema";
import PortalCatalog, { type CartItem } from "./catalog";
import PortalOrders from "./orders";
import PortalDebt from "./debt";
import {
  ShoppingCart,
  Store,
  Package,
  CreditCard,
  LogOut,
  User,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Download,
  X,
  Smartphone,
} from "lucide-react";

function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const dismissed = sessionStorage.getItem("pwa-dismissed");
    if (dismissed) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isSafari = /safari/.test(navigator.userAgent.toLowerCase()) && !/chrome/.test(navigator.userAgent.toLowerCase());
    if (isIos && isSafari) {
      setShowBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (result.outcome === "accepted") {
      setShowBanner(false);
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  const dismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  return { showBanner, install, dismiss, deferredPrompt, isInstalled };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

interface PortalLayoutProps {
  onLogout: () => void;
}

export default function PortalLayout({ onLogout }: PortalLayoutProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "orders" | "debt">("catalog");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const pwa = usePwaInstall();

  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/portal/me"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/portal/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      onLogout();
    },
  });

  const orderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/portal/orders", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Buyurtma muvaffaqiyatli yuborildi!" });
      setCart([]);
      setCartOpen(false);
      setCheckoutOpen(false);
      setAddress("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/catalog"] });
      setActiveTab("orders");
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ title: "Stokda yetarli emas", variant: "destructive" });
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
              toast({ title: "Stokda yetarli emas", variant: "destructive" });
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

  const total = cart.reduce(
    (sum, item) => sum + item.quantity * Number(item.product.price),
    0
  );

  const handleOrder = () => {
    if (cart.length === 0) return;
    orderMutation.mutate({
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      address: address || customer?.address || "",
      notes: notes || undefined,
    });
  };

  const tabs = [
    { key: "catalog" as const, label: "Katalog", icon: Package },
    { key: "orders" as const, label: "Buyurtmalar", icon: ShoppingBag },
    { key: "debt" as const, label: "Qarz", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="MARKET_LINE" className="h-9 w-auto rounded-lg" />
            <div>
              <h1 className="text-sm font-bold tracking-wide" data-testid="text-portal-header">MARKET_LINE</h1>
              <p className="text-xs text-muted-foreground">Mijoz portali</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="relative"
              onClick={() => setCartOpen(true)}
              data-testid="button-open-cart"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Savat
              {cart.length > 0 && (
                <Badge variant="default" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </Button>

            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline" data-testid="text-customer-name">{customer?.fullName}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {pwa.showBanner && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-white">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Ilovani o'rnating</p>
                  <p className="text-xs text-white/70">Tezroq kirish uchun telefoningizga qo'shing</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {pwa.deferredPrompt ? (
                  <Button
                    size="sm"
                    onClick={() => pwa.install()}
                    className="bg-white text-indigo-700 hover:bg-white/90 font-semibold text-xs h-8 px-3"
                    data-testid="button-pwa-install"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    O'rnatish
                  </Button>
                ) : (
                  <div className="text-white text-xs text-right leading-tight">
                    <span className="font-medium">Safari:</span> <span className="text-white/80">Ulashish → Bosh ekranga</span>
                  </div>
                )}
                <button
                  onClick={() => pwa.dismiss()}
                  className="text-white/60 hover:text-white p-1"
                  data-testid="button-pwa-dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
                data-testid={`tab-portal-${tab.key}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {activeTab === "catalog" && (
          <PortalCatalog cart={cart} onAddToCart={addToCart} onUpdateQuantity={updateQuantity} />
        )}
        {activeTab === "orders" && <PortalOrders />}
        {activeTab === "debt" && <PortalDebt />}
      </main>

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Savat
            </DialogTitle>
          </DialogHeader>
          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Savat bo'sh</p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(item.product.price))} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-medium w-24 text-right">
                        {formatCurrency(item.quantity * Number(item.product.price))}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Jami:</span>
                <span data-testid="text-cart-total">{formatCurrency(total)}</span>
              </div>
              <Button className="w-full" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} data-testid="button-proceed-checkout">
                Buyurtma berish
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buyurtma tasdiqlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Yetkazib berish manzili</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={address || customer?.address || ""}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Manzilingiz"
                  className="pl-10"
                  data-testid="input-order-address"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Izoh</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Qo'shimcha izoh (ixtiyoriy)"
                className="resize-none"
                data-testid="input-order-notes"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.product.name} x{item.quantity}</span>
                  <span>{formatCurrency(item.quantity * Number(item.product.price))}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Jami:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu summa qarzga yoziladi
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={handleOrder}
              disabled={orderMutation.isPending}
              data-testid="button-confirm-order"
            >
              {orderMutation.isPending ? "Yuklanmoqda..." : "Buyurtma berish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
