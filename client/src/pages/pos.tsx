import { useState, useRef } from "react";
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
import type { Product, Customer, Setting, Category } from "@shared/schema";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Wallet,
  Percent,
  X,
  Package,
  Printer,
  UserPlus,
  User,
  Phone,
  MapPin,
} from "lucide-react";

interface CartItem {
  product: Product;
  quantity: number;
  buyUnit: string;
  stockPieces: number;
  customPrice?: number;
}

interface ReceiptData {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  change: number;
  paymentType: string;
  customerName: string | null;
  date: Date;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

function formatCurrencyShort(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount);
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [paymentType, setPaymentType] = useState<string>("cash");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [paperSize, setPaperSize] = useState<"58mm" | "80mm" | "A4">(() => {
    return (localStorage.getItem("pos_paper_size") as "58mm" | "80mm" | "A4") || "58mm";
  });
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: settings } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  const companyName = settings?.find((s) => s.key === "company_name")?.value || "MARKET_LINE";
  const companyPhone = settings?.find((s) => s.key === "company_phone")?.value || "";
  const companyAddress = settings?.find((s) => s.key === "company_address")?.value || "";
  const receiptFooterText = settings?.find((s) => s.key === "receipt_footer")?.value || "Xaridingiz uchun rahmat!";

  const newCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Mijoz qo'shildi!" });
      setSelectedCustomer(data.id);
      setNewCustomerOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const saleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/sales", data);
      return res.json();
    },
    onSuccess: () => {
      const customer = customers?.find((c) => c.id === selectedCustomer);
      const sub = cart.reduce((sum, item) => sum + item.stockPieces * (item.customPrice ?? Number(item.product.price)), 0);
      const tot = sub - discount;
      const pd = paidAmount ? Number(paidAmount) : tot;

      setReceiptData({
        items: [...cart],
        subtotal: sub,
        discount,
        total: tot,
        paidAmount: paymentType === "debt" ? Number(paidAmount || 0) : pd,
        change: paymentType === "cash" ? Math.max(0, pd - tot) : 0,
        paymentType,
        customerName: customer?.fullName || null,
        date: new Date(),
      });

      toast({ title: "Savdo muvaffaqiyatli yakunlandi!" });
      setCart([]);
      setDiscountValue("");
      setDiscountType("amount");
      setPaidAmount("");
      setSelectedCustomer("");
      setCustomerSearch("");
      setPaymentType("cash");
      setCheckoutOpen(false);
      setReceiptOpen(true);

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
      (selectedCategory === "all" || p.categoryId === selectedCategory) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        const newPieces = existing.buyUnit === "quti" ? newQty * (product.boxQuantity || 1) : newQty;
        if (newPieces > product.stock) {
          toast({ title: "Stokda yetarli mahsulot yo'q", variant: "destructive" });
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: newQty, stockPieces: newPieces }
            : item
        );
      }
      return [...prev, { product, quantity: 1, buyUnit: product.unit, stockPieces: 1 }];
    });
  };

  const changeCartUnit = (productId: string, newUnit: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        let newQty = item.quantity;
        const bq = item.product.boxQuantity || 1;
        if (newUnit === "quti" && item.buyUnit !== "quti") {
          newQty = Math.max(1, Math.floor(item.quantity / bq));
        } else if (item.buyUnit === "quti" && newUnit !== "quti") {
          newQty = item.quantity * bq;
        }
        const newPieces = newUnit === "quti" ? newQty * bq : newQty;
        if (newPieces > item.product.stock) return item;
        return { ...item, buyUnit: newUnit, quantity: newQty, stockPieces: newPieces };
      })
    );
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const newPieces = item.buyUnit === "quti" ? newQty * (item.product.boxQuantity || 1) : newQty;
            if (newPieces > item.product.stock) {
              toast({ title: "Stokda yetarli mahsulot yo'q", variant: "destructive" });
              return item;
            }
            return { ...item, quantity: newQty, stockPieces: newPieces };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateCartPrice = (productId: string, price: string) => {
    const val = price === "" ? undefined : Number(price);
    setCart((prev) => prev.map((item) =>
      item.product.id === productId ? { ...item, customPrice: val } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.stockPieces * (item.customPrice ?? Number(item.product.price)),
    0
  );
  const discountNum = Math.max(0, Number(discountValue) || 0);
  const discount = discountType === "percent"
    ? Math.min(Math.round(subtotal * discountNum / 100), subtotal)
    : Math.min(discountNum, subtotal);
  const total = Math.max(0, subtotal - discount);
  const paid = paidAmount ? Number(paidAmount) : total;
  const change = paid - total;

  const filteredCustomers = customers?.filter((c) =>
    !customerSearch ||
    c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (paymentType === "debt" && !selectedCustomer) {
      toast({ title: "Qarzga sotish uchun mijoz tanlang", variant: "destructive" });
      return;
    }

    saleMutation.mutate({
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.stockPieces,
        price: item.customPrice ?? Number(item.product.price),
      })),
      customerId: selectedCustomer || null,
      discount,
      paidAmount: paymentType === "debt" ? Number(paidAmount || 0) : total,
      paymentType,
    });
  };

  const buildReceiptHtml = () => {
    if (!receiptData) return "";
    const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);
    const sizeMap = {
      "58mm": { pageW: "58mm", bodyW: "52mm", fs: "11pt", fsS: "9pt", fsL: "13pt", pad: "2mm 3mm" },
      "80mm": { pageW: "80mm", bodyW: "74mm", fs: "12pt", fsS: "10pt", fsL: "14pt", pad: "3mm 4mm" },
      "A4":   { pageW: "210mm", bodyW: "190mm", fs: "12pt", fsS: "10pt", fsL: "16pt", pad: "8mm 10mm" },
    };
    const sz = sizeMap[paperSize];
    const chekNo = receiptData.date.getTime().toString().slice(-6);
    const dateStr = receiptData.date.toLocaleDateString("uz-UZ") + " " +
      receiptData.date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

    const payLabel = receiptData.paymentType === "cash" ? "Naqd pul"
      : receiptData.paymentType === "card" ? "Plastik karta"
      : receiptData.paymentType === "partial" ? "Qisman to'lov"
      : "Qarzga";

    const row = (left: string, right: string, bold = false, big = false) =>
      `<table style="width:100%;border-collapse:collapse;margin:1px 0">
        <tr>
          <td style="font-size:${big ? sz.fsL : sz.fs};font-weight:${bold ? "bold" : "normal"};color:#000;vertical-align:top">${left}</td>
          <td style="font-size:${big ? sz.fsL : sz.fs};font-weight:${bold ? "bold" : "normal"};color:#000;text-align:right;vertical-align:top;white-space:nowrap;padding-left:4px">${right}</td>
        </tr>
      </table>`;

    const dash = `<div style="border-top:1px dashed #000;margin:4px 0"></div>`;
    const line = `<div style="border-top:2px solid #000;margin:5px 0"></div>`;

    const itemsHtml = receiptData.items.map((item, idx) => {
      const unitPrice = item.customPrice ?? Number(item.product.price);
      const total = item.stockPieces * unitPrice;
      const qtyLabel = item.buyUnit === "quti"
        ? `${item.quantity} quti (${item.stockPieces} ${item.product.unit})`
        : `${item.stockPieces} ${item.product.unit}`;
      return `<div style="margin-bottom:5px">
        <div style="font-size:${sz.fs};font-weight:bold;color:#000;word-break:break-word">${idx + 1}. ${item.product.name}</div>
        ${row(`${qtyLabel} &times; ${fmt(unitPrice)} so'm`, `${fmt(total)} so'm`)}
      </div>`;
    }).join("");

    let payHtml = row("To'lov usuli:", payLabel, true);
    if (receiptData.paymentType === "cash" || receiptData.paymentType === "card") {
      payHtml += row("Berildi:", `${fmt(receiptData.paidAmount)} so'm`);
      if (receiptData.change > 0) payHtml += row("Qaytim:", `${fmt(receiptData.change)} so'm`, true);
    }
    if (receiptData.paymentType === "debt" || receiptData.paymentType === "partial") {
      if (receiptData.paidAmount > 0) payHtml += row("To'landi:", `${fmt(receiptData.paidAmount)} so'm`);
      payHtml += row("QARZ:", `${fmt(Math.max(0, receiptData.total - receiptData.paidAmount))} so'm`, true);
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chek</title>
  <style>
    @page { size: ${sz.pageW} auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${sz.bodyW};
      max-width: ${sz.bodyW};
      font-family: 'Courier New', Courier, monospace;
      font-size: ${sz.fs};
      line-height: 1.45;
      padding: ${sz.pad};
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: visible;
    }
    table { table-layout: fixed; width: 100%; }
    td { overflow-wrap: break-word; word-break: break-word; }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:5px">
    <div style="font-size:${sz.fsL};font-weight:bold;color:#000;letter-spacing:0.5px">${companyName}</div>
    ${companyAddress ? `<div style="font-size:${sz.fsS};color:#000">${companyAddress}</div>` : ""}
    ${companyPhone ? `<div style="font-size:${sz.fsS};color:#000">Tel: ${companyPhone}</div>` : ""}
    <div style="font-size:${sz.fsS};color:#000;margin-top:3px">CHEK #${chekNo}</div>
    <div style="font-size:${sz.fsS};color:#000">${dateStr}</div>
    ${receiptData.customerName ? `<div style="font-size:${sz.fs};font-weight:bold;color:#000;margin-top:2px">Mijoz: ${receiptData.customerName}</div>` : ""}
  </div>
  ${line}
  ${itemsHtml}
  ${dash}
  ${receiptData.discount > 0 ? row("Yig'indi:", `${fmt(receiptData.subtotal)} so'm`) + row("Chegirma:", `-${fmt(receiptData.discount)} so'm`) : ""}
  <div style="margin:3px 0">${row("JAMI TO'LOV:", `${fmt(receiptData.total)} so'm`, true, true)}</div>
  ${dash}
  ${payHtml}
  ${line}
  <div style="text-align:center;font-size:${sz.fs};color:#000">
    <div style="font-weight:bold">${receiptFooterText}</div>
    ${companyPhone ? `<div style="margin-top:2px">Tel: ${companyPhone}</div>` : ""}
  </div>
</body>
</html>`;
  };

  const handlePrintReceipt = () => {
    const html = buildReceiptHtml();
    if (!html) return;

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      let iframe = document.getElementById("print-iframe") as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "print-iframe";
        iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
        document.body.appendChild(iframe);
      }
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 500);
      }
    } else {
      const printWindow = window.open("", "_blank", "width=400,height=700");
      if (!printWindow) { alert("Popup blocker yoqilgan. Brauzerdagi bloklashni o'chiring."); return; }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.onafterprint = () => printWindow.close();
          setTimeout(() => printWindow.close(), 10000);
        }, 300);
      };
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="mb-3">
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

        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-thin">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => setSelectedCategory("all")}
            data-testid="button-category-all"
          >
            Hammasi
          </Button>
          {categories?.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => setSelectedCategory(cat.id)}
              data-testid={`button-category-${cat.id}`}
            >
              {cat.name}
            </Button>
          ))}
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
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="h-20 w-20 shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm leading-tight truncate">{product.name}</h3>
                        <p className="text-xs font-semibold text-primary">{formatCurrency(Number(product.price))}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {product.stock} {product.unit}
                      </Badge>
                      {(product.boxQuantity || 1) > 1 && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          1 quti={product.boxQuantity}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                    </div>
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

      <div className="w-96 border-l bg-card flex flex-col overflow-hidden">
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-1">
            <h2 className="font-semibold flex items-center gap-2" data-testid="text-cart-title">
              <ShoppingCart className="h-4 w-4" />
              Savat
            </h2>
            <Badge variant="secondary">{cart.length} ta</Badge>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Savat bo'sh</p>
              <p className="text-xs mt-1">Mahsulot qo'shish uchun ustiga bosing</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-2 rounded-md bg-background space-y-1.5"
                  data-testid={`cart-item-${item.product.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{item.product.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">Narx:</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.customPrice ?? Number(item.product.price)}
                          onChange={(e) => updateCartPrice(item.product.id, e.target.value)}
                          className="w-20 h-5 text-xs border rounded px-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          data-testid={`input-price-${item.product.id}`}
                        />
                        <span className="text-[10px] text-muted-foreground">/{item.product.unit}</span>
                        {item.customPrice !== undefined && item.customPrice !== Number(item.product.price) && (
                          <button
                            type="button"
                            onClick={() => updateCartPrice(item.product.id, "")}
                            className="text-[10px] text-orange-500 hover:text-orange-700"
                            title="Asl narxga qaytarish"
                          >↺</button>
                        )}
                      </div>
                      {item.buyUnit === "quti" && (item.product.boxQuantity || 1) > 1 && (
                        <p className="text-[10px] text-blue-600">
                          {item.quantity} quti × {item.product.boxQuantity} = {item.stockPieces} {item.product.unit}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-primary">
                        {formatCurrency(item.stockPieces * (item.customPrice ?? Number(item.product.price)))}
                      </div>
                      {item.customPrice !== undefined && item.customPrice !== Number(item.product.price) && (
                        <div className="text-[10px] text-muted-foreground line-through">
                          {formatCurrency(item.stockPieces * Number(item.product.price))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Select
                      value={item.buyUnit}
                      onValueChange={(val) => changeCartUnit(item.product.id, val)}
                    >
                      <SelectTrigger className="h-7 w-[70px] text-[10px] px-1.5" data-testid={`select-unit-${item.product.id}`}>
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
                      <input
                        key={item.quantity}
                        type="number"
                        min={1}
                        defaultValue={item.quantity}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) => {
                          const v = Math.max(1, Number(e.target.value) || 1);
                          if (v !== item.quantity) updateQuantity(item.product.id, v - item.quantity);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        className="w-14 h-7 text-center text-sm font-medium border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        data-testid={`input-qty-${item.product.id}`}
                      />
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t space-y-3 shrink-0">
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
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Chek o'lchami:</span>
              <div className="flex gap-1">
                {(["58mm", "80mm", "A4"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => { setPaperSize(size); localStorage.setItem("pos_paper_size", size); }}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${paperSize === size ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
                    data-testid={`button-cart-paper-size-${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Mijoz (ixtiyoriy)</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setNewCustomerOpen(true)}
                  data-testid="button-add-new-customer"
                >
                  <UserPlus className="h-3 w-3" />
                  Yangi mijoz
                </Button>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Mijoz qidirish (ism yoki telefon)..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  data-testid="input-customer-search"
                />
              </div>
              <div className="max-h-32 overflow-y-auto border rounded-md">
                <div
                  className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-accent ${!selectedCustomer ? "bg-accent font-medium" : ""}`}
                  onClick={() => setSelectedCustomer("")}
                  data-testid="option-no-customer"
                >
                  — Mijozsiz —
                </div>
                {filteredCustomers?.map((c) => (
                  <div
                    key={c.id}
                    className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-accent flex items-center justify-between ${selectedCustomer === c.id ? "bg-accent font-medium" : ""}`}
                    onClick={() => setSelectedCustomer(c.id)}
                    data-testid={`option-customer-${c.id}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {c.fullName}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  </div>
                ))}
                {filteredCustomers?.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center">Mijoz topilmadi</div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">To'lov turi</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentType === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentType("cash")}
                  data-testid="button-payment-cash"
                  className="text-xs"
                >
                  <Banknote className="h-4 w-4 mr-1" />
                  Naqd
                </Button>
                <Button
                  variant={paymentType === "card" ? "default" : "outline"}
                  onClick={() => setPaymentType("card")}
                  data-testid="button-payment-card"
                  className="text-xs"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Karta
                </Button>
                <Button
                  variant={paymentType === "debt" ? "default" : "outline"}
                  onClick={() => setPaymentType("debt")}
                  data-testid="button-payment-debt"
                  className="text-xs"
                >
                  <Wallet className="h-4 w-4 mr-1" />
                  Qarzga
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Chegirma</label>
              <div className="flex gap-2">
                <div className="flex border rounded-md overflow-hidden shrink-0">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${discountType === "amount" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                    onClick={() => setDiscountType("amount")}
                    data-testid="button-discount-amount"
                  >
                    UZS
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${discountType === "percent" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                    onClick={() => setDiscountType("percent")}
                    data-testid="button-discount-percent"
                  >
                    %
                  </button>
                </div>
                <div className="relative flex-1">
                  {discountType === "percent" ? (
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="pl-10"
                    placeholder={discountType === "percent" ? "0-100" : "0"}
                    data-testid="input-discount"
                  />
                </div>
              </div>
              {discount > 0 && (
                <p className="text-xs text-destructive mt-1" data-testid="text-discount-preview">
                  Chegirma: -{formatCurrency(discount)} {discountType === "percent" && `(${discountNum}%)`}
                </p>
              )}
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

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className={paperSize === "A4" ? "sm:max-w-2xl" : paperSize === "80mm" ? "sm:max-w-md" : "sm:max-w-sm"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Chek
            </DialogTitle>
          </DialogHeader>

          <div className="border rounded-lg p-4 bg-white text-black font-mono max-h-[60vh] overflow-y-auto" style={{ maxWidth: paperSize === "A4" ? "100%" : paperSize === "80mm" ? "300px" : "220px", margin: "0 auto", fontSize: paperSize === "A4" ? "14px" : paperSize === "80mm" ? "13px" : "11px" }} data-testid="receipt-preview">
            <div ref={receiptRef}>
              {receiptData && (
                <>
                  {/* Sarlavha */}
                  <div style={{ textAlign: "center", marginBottom: "4px" }}>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "#000", letterSpacing: "0.5px" }}>{companyName}</div>
                    {companyAddress && <div style={{ fontSize: "10px", color: "#000", marginTop: "1px" }}>{companyAddress}</div>}
                    {companyPhone && <div style={{ fontSize: "10px", color: "#000" }}>Tel: {companyPhone}</div>}
                    <div style={{ fontSize: "10px", color: "#000", marginTop: "2px" }}>
                      CHEK #{receiptData.date.getTime().toString().slice(-6)}
                    </div>
                    <div style={{ fontSize: "10px", color: "#000" }}>
                      {receiptData.date.toLocaleDateString("uz-UZ")} {receiptData.date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {receiptData.customerName && (
                      <div style={{ fontSize: "11px", marginTop: "2px", color: "#000", fontWeight: "600" }}>Mijoz: {receiptData.customerName}</div>
                    )}
                  </div>

                  <div style={{ borderTop: "2px solid #000", margin: "5px 0 4px" }} />

                  {/* Mahsulotlar */}
                  {receiptData.items.map((item, idx) => {
                    const unitPrice = item.customPrice ?? Number(item.product.price);
                    const totalPrice = item.stockPieces * unitPrice;
                    const qtyLabel = item.buyUnit === "quti"
                      ? `${item.quantity} quti (${item.stockPieces} ${item.product.unit})`
                      : `${item.stockPieces} ${item.product.unit}`;
                    return (
                      <div key={idx} style={{ marginBottom: "5px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#000", wordBreak: "break-word" }}>
                          {idx + 1}. {item.product.name}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#000", marginTop: "1px" }}>
                          <span>{qtyLabel} × {formatCurrencyShort(unitPrice)} so'm</span>
                          <span style={{ fontWeight: "bold" }}>{formatCurrencyShort(totalPrice)} so'm</span>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />

                  {/* Hisoblar */}
                  {receiptData.discount > 0 && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#000" }}>
                        <span>Yig'indi:</span>
                        <span>{formatCurrencyShort(receiptData.subtotal)} so'm</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#000" }}>
                        <span>Chegirma:</span>
                        <span>-{formatCurrencyShort(receiptData.discount)} so'm</span>
                      </div>
                    </>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "bold", color: "#000", margin: "3px 0" }}>
                    <span>JAMI TO'LOV:</span>
                    <span>{formatCurrencyShort(receiptData.total)} so'm</span>
                  </div>

                  <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

                  {/* To'lov turi */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", color: "#000" }}>
                    <span>To'lov usuli:</span>
                    <span>
                      {receiptData.paymentType === "cash" ? "Naqd pul"
                        : receiptData.paymentType === "card" ? "Plastik karta"
                        : receiptData.paymentType === "partial" ? "Qisman to'lov"
                        : "Qarzga"}
                    </span>
                  </div>

                  {(receiptData.paymentType === "cash" || receiptData.paymentType === "card") && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#000" }}>
                        <span>Berildi:</span>
                        <span>{formatCurrencyShort(receiptData.paidAmount)} so'm</span>
                      </div>
                      {receiptData.change > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "bold", color: "#000" }}>
                          <span>Qaytim:</span>
                          <span>{formatCurrencyShort(receiptData.change)} so'm</span>
                        </div>
                      )}
                    </>
                  )}

                  {(receiptData.paymentType === "debt" || receiptData.paymentType === "partial") && (
                    <>
                      {receiptData.paidAmount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#000" }}>
                          <span>To'landi:</span>
                          <span>{formatCurrencyShort(receiptData.paidAmount)} so'm</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "bold", color: "#000" }}>
                        <span>QARZ:</span>
                        <span>{formatCurrencyShort(Math.max(0, receiptData.total - receiptData.paidAmount))} so'm</span>
                      </div>
                    </>
                  )}

                  <div style={{ borderTop: "2px solid #000", margin: "6px 0 4px" }} />

                  {/* Footer */}
                  <div style={{ textAlign: "center", fontSize: "11px", color: "#000" }}>
                    <div style={{ fontWeight: "bold" }}>{receiptFooterText}</div>
                    {companyPhone && <div style={{ marginTop: "2px" }}>Tel: {companyPhone}</div>}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="px-4 pb-2 pt-0">
            <p className="text-xs text-muted-foreground mb-1.5">Qog'oz o'lchami:</p>
            <div className="flex gap-1.5">
              {(["58mm", "80mm", "A4"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPaperSize(size);
                    localStorage.setItem("pos_paper_size", size);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                    paperSize === size
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-accent"
                  }`}
                  data-testid={`button-paper-size-${size}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReceiptOpen(false)} data-testid="button-close-receipt">
              Yopish
            </Button>
            <Button onClick={handlePrintReceipt} data-testid="button-print-receipt">
              <Printer className="h-4 w-4 mr-2" />
              Chop etish ({paperSize})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Yangi mijoz qo'shish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Ism *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Ism familya"
                  className="pl-10"
                  data-testid="input-new-customer-name"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telefon</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="pl-10"
                  data-testid="input-new-customer-phone"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Manzil</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  placeholder="Manzil"
                  className="pl-10"
                  data-testid="input-new-customer-address"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerOpen(false)} data-testid="button-cancel-new-customer">
              Bekor qilish
            </Button>
            <Button
              onClick={() => {
                if (!newCustomerName.trim()) {
                  toast({ title: "Ism majburiy", variant: "destructive" });
                  return;
                }
                newCustomerMutation.mutate({
                  fullName: newCustomerName.trim(),
                  phone: newCustomerPhone.trim() || null,
                  address: newCustomerAddress.trim() || null,
                });
              }}
              disabled={newCustomerMutation.isPending}
              data-testid="button-save-new-customer"
            >
              {newCustomerMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
