import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Phone, MapPin, Lock, QrCode, Download, Banknote, History, ShoppingCart, RotateCcw, AlertTriangle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import logoImg from "@assets/marketline_pro_logo_1.png";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [qrCustomer, setQrCustomer] = useState<Customer | null>(null);
  const [showQrAfterSave, setShowQrAfterSave] = useState(false);
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [payHistoryCustomer, setPayHistoryCustomer] = useState<Customer | null>(null);
  const [salesHistoryCustomer, setSalesHistoryCustomer] = useState<Customer | null>(null);
  const [returnSale, setReturnSale] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [replaceProducts, setReplaceProducts] = useState<{ productId: string; productName: string; price: number; stock: number; unit: string; quantity: number }[]>([]);
  const [replaceSearch, setReplaceSearch] = useState("");
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    fullName: "", phone: "", address: "", telegramId: "", password: "", dealerId: "", debt: "",
  });
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const { data: customers, isLoading } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: allProducts } = useQuery<any[]>({ queryKey: ["/api/products"] });

  const { data: tenant } = useQuery<any>({ queryKey: ["/api/auth/me"] });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const res = await apiRequest("PATCH", `/api/customers/${editing.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: (result: Customer) => {
      toast({ title: editing ? "Mijoz yangilandi" : "Mijoz qo'shildi" });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      if (!editing) {
        setQrCustomer(result);
        setShowQrAfterSave(true);
      }
      setEditing(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/customers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mijoz o'chirildi" });
      setDeleteCustomer(null);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const { data: payHistory } = useQuery<any[]>({
    queryKey: ["/api/customers", payHistoryCustomer?.id, "payments"],
    enabled: !!payHistoryCustomer,
  });

  const { data: customerSales, isLoading: salesLoading } = useQuery<any[]>({
    queryKey: ["/api/customers", salesHistoryCustomer?.id, "sales"],
    enabled: !!salesHistoryCustomer,
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/sales/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sotuv o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", salesHistoryCustomer?.id, "sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const partialReturnMutation = useMutation({
    mutationFn: async ({ saleId, items, replacements }: {
      saleId: string;
      items: { itemId: string; quantity: number }[];
      replacements: { productId: string; quantity: number }[];
    }) => {
      const res = await apiRequest("POST", `/api/sales/${saleId}/partial-return`, { items, replacements });
      return res.json();
    },
    onSuccess: (data: any) => {
      const hasReplace = replaceProducts.some(r => r.quantity > 0);
      let msg = "Mahsulotlar qaytarildi";
      if (hasReplace && data.netDiff > 0) msg += ` · Qo'shimcha qarz: ${formatCurrency(data.netDiff)}`;
      else if (hasReplace && data.netDiff < 0) msg += ` · Qarz ${formatCurrency(Math.abs(data.netDiff))} ga kamaydi`;
      toast({ title: msg });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", salesHistoryCustomer?.id, "sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setReturnSale(null);
      setReturnItems({});
      setReplaceProducts([]);
      setReplaceSearch("");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/payments/customer", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "To'lov qabul qilindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setPayCustomer(null);
      setPayAmount("");
      setPayMethod("cash");
      setPayNotes("");
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const submitPayment = () => {
    if (!payCustomer || !payAmount) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Noto'g'ri summa", variant: "destructive" });
      return;
    }
    paymentMutation.mutate({
      customerId: payCustomer.id,
      amount,
      method: payMethod,
      notes: payNotes.trim() || null,
    });
  };

  const { data: dealers } = useQuery<any[]>({ queryKey: ["/api/dealers"] });

  const resetForm = () => {
    setForm({ fullName: "", phone: "", address: "", telegramId: "", password: "", dealerId: "", debt: "" });
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      fullName: customer.fullName,
      phone: customer.phone,
      address: customer.address || "",
      telegramId: customer.telegramId || "",
      password: "",
      dealerId: customer.dealerId || "",
      debt: Number(customer.debt || 0) > 0 ? String(customer.debt) : "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.fullName || !form.phone) {
      toast({ title: "Ism va telefon majburiy", variant: "destructive" });
      return;
    }
    if (!editing && !form.password) {
      toast({ title: "Parol majburiy", variant: "destructive" });
      return;
    }
    const debtVal = form.debt !== "" ? Math.max(0, Number(form.debt) || 0) : undefined;
    const data: any = {
      fullName: form.fullName,
      phone: form.phone,
      address: form.address || null,
      telegramId: form.telegramId || null,
      dealerId: form.dealerId || null,
      active: true,
      debt: editing
        ? (debtVal !== undefined ? String(debtVal) : undefined)
        : String(debtVal ?? 0),
    };
    if (form.password) {
      data.password = form.password;
    }
    mutation.mutate(data);
  };

  const getPortalUrl = useCallback((customer: Customer) => {
    const base = window.location.origin;
    const tenantId = tenant?.id || "";
    return `${base}/portal?store=${tenantId}&phone=${encodeURIComponent(customer.phone)}`;
  }, [tenant]);

  const downloadQr = useCallback(() => {
    if (!qrRef.current || !qrCustomer) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 400;
    const h = 540;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.onload = () => {
      ctx.fillStyle = "#4338ca";
      ctx.fillRect(0, 0, w, 65);
      const logoH = 35;
      const logoW = (logo.width / logo.height) * logoH;
      ctx.drawImage(logo, (w - logoW - 130) / 2, 15, logoW, logoH);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "left";
      ctx.fillText(tenant?.name || "MARKET_LINE", (w - logoW - 130) / 2 + logoW + 10, 42);
      ctx.textAlign = "center";

      drawQrPart();
    };
    logo.onerror = () => {
      ctx.fillStyle = "#4338ca";
      ctx.fillRect(0, 0, w, 60);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Arial";
      ctx.textAlign = "center";
      ctx.fillText(tenant?.name || "MARKET_LINE", w / 2, 40);

      drawQrPart();
    };
    logo.src = logoImg;

    function drawQrPart() {
      if (!svg || !ctx) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const qrImg = new Image();
      qrImg.onload = () => {
        if (!ctx) return;
        const qrSize = 280;
        const x = (w - qrSize) / 2;
        ctx.drawImage(qrImg, x, 85, qrSize, qrSize);

        ctx.fillStyle = "#333333";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(qrCustomer!.fullName, w / 2, 400);

        ctx.fillStyle = "#666666";
        ctx.font = "14px Arial";
        ctx.fillText(qrCustomer!.phone, w / 2, 425);

        ctx.fillStyle = "#4338ca";
        ctx.font = "12px Arial";
        ctx.fillText("Portalga kirish uchun skanerlang", w / 2, 455);

        if (tenant?.name) {
          ctx.fillStyle = "#999999";
          ctx.font = "11px Arial";
          ctx.fillText(tenant.name, w / 2, 480);
        }

        const link = document.createElement("a");
        link.download = `qr-${qrCustomer!.fullName.replace(/\s+/g, "_")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        URL.revokeObjectURL(url);
      };
      qrImg.src = url;
    }
  }, [qrCustomer, tenant]);

  const filtered = customers?.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const totalDebt = customers?.reduce((sum, c) => sum + Number(c.debt), 0) || 0;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-customers-title">Mijozlar</h1>
          <p className="text-muted-foreground">
            {customers?.length || 0} ta mijoz | Jami qarz: {formatCurrency(totalDebt)}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditing(null); setDialogOpen(true); }} data-testid="button-add-customer">
          <Plus className="h-4 w-4 mr-2" />
          Yangi mijoz
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Ism yoki telefon bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-customers-search"
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
                  <TableHead>Ism</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Manzil</TableHead>
                  <TableHead>Diller</TableHead>
                  <TableHead>Qarz</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((customer) => (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                          {customer.fullName.charAt(0)}
                        </div>
                        {customer.fullName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.address ? (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{customer.address}</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {customer.dealerId ? (
                        <Badge variant="outline" className="text-xs">
                          {dealers?.find((d: any) => d.id === customer.dealerId)?.name || "—"}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {Number(customer.debt) > 0 ? (
                        <Badge variant="destructive">{formatCurrency(Number(customer.debt))}</Badge>
                      ) : (
                        <Badge variant="secondary">Qarz yo'q</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {Number(customer.debt) > 0 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setPayCustomer(customer); setPayAmount(""); setPayNotes(""); setPayMethod("cash"); }}
                            data-testid={`button-pay-customer-${customer.id}`}
                            title="To'lov qilish"
                            className="text-green-600"
                          >
                            <Banknote className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPayHistoryCustomer(customer)}
                          data-testid={`button-history-customer-${customer.id}`}
                          title="To'lov tarixi"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSalesHistoryCustomer(customer)}
                          data-testid={`button-sales-customer-${customer.id}`}
                          title="Sotuv tarixi"
                          className="text-blue-500"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setQrCustomer(customer); setShowQrAfterSave(false); }}
                          data-testid={`button-qr-customer-${customer.id}`}
                          title="QR kod"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(customer)} data-testid={`button-edit-customer-${customer.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteCustomer(customer)}
                          data-testid={`button-delete-customer-${customer.id}`}
                          title="O'chirish"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Mijoz topilmadi
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
            <DialogTitle>{editing ? "Mijozni tahrirlash" : "Yangi mijoz"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">To'liq ism *</label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} data-testid="input-customer-name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telefon *</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998901234567" data-testid="input-customer-phone" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Parol {editing ? "(o'zgartirish uchun kiriting)" : "*"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editing ? "Yangi parol" : "Parol kiriting"}
                  className="pl-10"
                  data-testid="input-customer-password"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Manzil</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-customer-address" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telegram ID</label>
              <Input value={form.telegramId} onChange={(e) => setForm({ ...form, telegramId: e.target.value })} data-testid="input-customer-telegram" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Diller</label>
              <Select value={form.dealerId || "none"} onValueChange={(v) => setForm({ ...form, dealerId: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="select-customer-dealer">
                  <SelectValue placeholder="Diller tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Dillersiz</SelectItem>
                  {dealers?.filter((d: any) => d.active).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} {d.phone ? `(${d.phone})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                {editing ? "Qarz (o'zgartirish)" : "Boshlang'ich qarz"}
                <span className="text-xs font-normal text-muted-foreground ml-1">(ixtiyoriy, UZS)</span>
              </label>
              <Input
                type="number"
                min={0}
                value={form.debt}
                onChange={(e) => setForm({ ...form, debt: e.target.value })}
                placeholder="0"
                data-testid="input-customer-debt"
              />
              {editing && Number(form.debt) !== Number(editing?.debt || 0) && (
                <p className="text-xs text-amber-600 mt-1">
                  Hozirgi qarz: {formatCurrency(Number(editing?.debt || 0))} → Yangi: {formatCurrency(Math.max(0, Number(form.debt) || 0))}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-save-customer">
              {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrCustomer} onOpenChange={(open) => { if (!open) { setQrCustomer(null); setShowQrAfterSave(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Mijoz QR kodi
            </DialogTitle>
          </DialogHeader>
          {qrCustomer && (
            <div className="flex flex-col items-center gap-4">
              {showQrAfterSave && (
                <div className="w-full p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm text-center">
                  Mijoz muvaffaqiyatli qo'shildi! QR kodni mijozga ko'rsating.
                </div>
              )}

              <div
                ref={qrRef}
                className="bg-white p-6 rounded-xl border-2 border-dashed border-muted"
                data-testid="qr-code-container"
              >
                <div className="flex flex-col items-center gap-3">
                  <img src={logoImg} alt="MARKET_LINE" className="h-8 w-auto" />
                  <QRCodeSVG
                    value={getPortalUrl(qrCustomer)}
                    size={200}
                    level="H"
                    includeMargin={false}
                    fgColor="#4338ca"
                  />
                  <div className="text-center">
                    <p className="font-bold text-gray-800 text-sm">{qrCustomer.fullName}</p>
                    <p className="text-gray-500 text-xs">{qrCustomer.phone}</p>
                  </div>
                  <p className="text-indigo-600 text-xs font-medium">Portalga kirish uchun skanerlang</p>
                  {tenant?.name && (
                    <p className="text-gray-400 text-[10px]">{tenant.name}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <Button
                  className="flex-1"
                  onClick={downloadQr}
                  data-testid="button-download-qr"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Yuklab olish
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setQrCustomer(null); setShowQrAfterSave(false); }}
                  data-testid="button-close-qr"
                >
                  Yopish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!payCustomer} onOpenChange={(o) => { if (!o) setPayCustomer(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              To'lov qabul qilish
            </DialogTitle>
          </DialogHeader>
          {payCustomer && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/50 border">
                <p className="font-medium">{payCustomer.fullName}</p>
                <p className="text-sm text-muted-foreground">{payCustomer.phone}</p>
                <p className="text-lg font-bold text-destructive mt-1">
                  Qarz: {formatCurrency(Number(payCustomer.debt))}
                </p>
              </div>
              <div>
                <Label>To'lov summasi *</Label>
                <Input
                  type="number"
                  placeholder="Summa kiriting"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  data-testid="input-payment-amount"
                />
                <div className="flex gap-1 mt-1">
                  <Button size="sm" variant="outline" onClick={() => setPayAmount(String(Number(payCustomer.debt)))} data-testid="button-pay-full">
                    To'liq to'lash
                  </Button>
                </div>
              </div>
              <div>
                <Label>To'lov turi</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Naqd</SelectItem>
                    <SelectItem value="card">Karta</SelectItem>
                    <SelectItem value="transfer">O'tkazma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Izoh (ixtiyoriy)</Label>
                <Input
                  placeholder="Izoh..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  data-testid="input-payment-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayCustomer(null)}>Bekor qilish</Button>
            <Button
              onClick={submitPayment}
              disabled={paymentMutation.isPending || !payAmount}
              data-testid="button-submit-payment"
            >
              {paymentMutation.isPending ? "Yuklanmoqda..." : "To'lovni tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales History Dialog */}
      <Dialog open={!!salesHistoryCustomer} onOpenChange={(o) => { if (!o) { setSalesHistoryCustomer(null); setReturnSale(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              Sotuv tarixi — {salesHistoryCustomer?.fullName}
            </DialogTitle>
          </DialogHeader>
          {salesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : customerSales && customerSales.length > 0 ? (
            <div className="space-y-3">
              {customerSales.map((sale: any) => {
                const isReturned = sale.status === "returned";
                const totalAmount = Number(sale.total_amount);
                const paidAmount = Number(sale.paid_amount || 0);
                const debt = Math.max(0, totalAmount - paidAmount);
                const payLabel = sale.payment_type === "debt" ? "Qarz" : sale.payment_type === "partial" ? "Qisman" : sale.payment_type === "card" ? "Karta" : "Naqd";
                return (
                  <div key={sale.id} className={`border rounded-lg p-3 space-y-2 ${isReturned ? "opacity-60 bg-muted/30" : ""}`} data-testid={`sale-card-${sale.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{sale.created_at ? (() => { try { return format(new Date(sale.created_at), "dd.MM.yyyy HH:mm"); } catch { return "—"; } })() : "—"}</span>
                        <Badge variant={isReturned ? "secondary" : sale.payment_type === "debt" || sale.payment_type === "partial" ? "destructive" : "default"} className="text-[10px]">
                          {isReturned ? "Qaytarilgan" : payLabel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">{formatCurrency(totalAmount)}</span>
                        {!isReturned && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                            onClick={() => {
                              setReturnSale(sale);
                              const initial: Record<string, number> = {};
                              sale.items?.filter((i: any) => i.id).forEach((i: any) => {
                                const maxRet = Number(i.quantity) - Number(i.returned_qty || 0);
                                initial[i.id] = maxRet > 0 ? maxRet : 0;
                              });
                              setReturnItems(initial);
                            }}
                            data-testid={`button-return-sale-${sale.id}`}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Qaytarish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm("Bu sotuvni o'chirmoqchimisiz? Stok qaytariladi va qarz kamayadi.")) {
                              deleteSaleMutation.mutate(sale.id);
                            }
                          }}
                          data-testid={`button-delete-sale-${sale.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {sale.items && sale.items[0] && (
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {sale.items.filter((i: any) => i.id).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.product_name} × {item.quantity} {item.product_unit}</span>
                            <span>{formatCurrency(Number(item.total))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {debt > 0 && !isReturned && (
                      <div className="text-xs text-red-600 font-medium">Qarz: {formatCurrency(debt)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Sotuvlar mavjud emas</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Qisman Qaytarish / Almashtirish Dialogi */}
      <Dialog open={!!returnSale} onOpenChange={(o) => { if (!o) { setReturnSale(null); setReturnItems({}); setReplaceProducts([]); setReplaceSearch(""); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <RotateCcw className="h-5 w-5" />
              Mahsulot qaytarish / almashtirish
            </DialogTitle>
          </DialogHeader>
          {returnSale && (() => {
            const activeItems = returnSale.items?.filter((i: any) => i.id && (Number(i.quantity) - Number(i.returned_qty || 0)) > 0) || [];
            const returnAmount = activeItems.reduce((sum: number, item: any) => {
              const qty = returnItems[item.id] || 0;
              return sum + qty * Number(item.price);
            }, 0);
            const replacementAmount = replaceProducts.reduce((sum, r) => sum + r.price * r.quantity, 0);
            const netDiff = replacementAmount - returnAmount;
            const hasSelection = activeItems.some((i: any) => (returnItems[i.id] || 0) > 0) || replaceProducts.some(r => r.quantity > 0);

            const filteredProducts = (allProducts || []).filter((p: any) =>
              p.stock > 0 &&
              p.name.toLowerCase().includes(replaceSearch.toLowerCase()) &&
              !replaceProducts.find(r => r.productId === p.id)
            ).slice(0, 8);

            return (
              <div className="space-y-4">
                {/* --- Qaytarish bo'limi --- */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Qaytariladigan mahsulotlar</p>
                  <div className="space-y-2">
                    {activeItems.map((item: any) => {
                      const maxRet = Number(item.quantity) - Number(item.returned_qty || 0);
                      const val = returnItems[item.id] ?? maxRet;
                      return (
                        <div key={item.id} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.product_name}</div>
                            <div className="text-xs text-muted-foreground">Qaytarish mumkin: {maxRet} {item.product_unit}</div>
                          </div>
                          <Input
                            type="number" min={0} max={maxRet} value={val}
                            onChange={(e) => {
                              const n = Math.min(maxRet, Math.max(0, Number(e.target.value) || 0));
                              setReturnItems(prev => ({ ...prev, [item.id]: n }));
                            }}
                            className="w-20 h-8 text-center text-sm"
                            data-testid={`input-return-qty-${item.id}`}
                          />
                        </div>
                      );
                    })}
                    {activeItems.length === 0 && (
                      <p className="text-sm text-center text-muted-foreground py-2">Barcha mahsulotlar allaqachon qaytarilgan</p>
                    )}
                  </div>
                </div>

                {/* --- Almashtirish bo'limi --- */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">O'rniga beriladigan mahsulot (ixtiyoriy)</p>
                  <Input
                    placeholder="Mahsulot qidirish..."
                    value={replaceSearch}
                    onChange={(e) => setReplaceSearch(e.target.value)}
                    className="h-8 text-sm mb-2"
                    data-testid="input-replace-search"
                  />
                  {replaceSearch.length > 0 && filteredProducts.length > 0 && (
                    <div className="border rounded-md divide-y mb-2 max-h-36 overflow-y-auto bg-background shadow-sm">
                      {filteredProducts.map((p: any) => (
                        <button key={p.id} className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted text-sm text-left"
                          onClick={() => {
                            setReplaceProducts(prev => [...prev, { productId: p.id, productName: p.name, price: Number(p.price), stock: p.stock, unit: p.unit || "dona", quantity: 1 }]);
                            setReplaceSearch("");
                          }}
                          data-testid={`button-add-replace-${p.id}`}
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground text-xs">{formatCurrency(Number(p.price))} · {p.stock} {p.unit}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {replaceProducts.length > 0 && (
                    <div className="space-y-2">
                      {replaceProducts.map((r, idx) => (
                        <div key={r.productId} className="flex items-center gap-2 p-2 rounded border bg-green-50 dark:bg-green-950/20">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{r.productName}</div>
                            <div className="text-xs text-muted-foreground">{formatCurrency(r.price)} / {r.unit} · Ombor: {r.stock}</div>
                          </div>
                          <Input
                            type="number" min={1} max={r.stock} value={r.quantity}
                            onChange={(e) => {
                              const n = Math.min(r.stock, Math.max(1, Number(e.target.value) || 1));
                              setReplaceProducts(prev => prev.map((x, i) => i === idx ? { ...x, quantity: n } : x));
                            }}
                            className="w-20 h-8 text-center text-sm"
                            data-testid={`input-replace-qty-${r.productId}`}
                          />
                          <button className="text-destructive hover:text-destructive/80 p-1"
                            onClick={() => setReplaceProducts(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* --- Hisob xulosasi --- */}
                {(returnAmount > 0 || replacementAmount > 0) && (
                  <div className="p-3 rounded border space-y-1 text-sm bg-muted/30">
                    {returnAmount > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Qaytariladi:</span><span>− {formatCurrency(returnAmount)}</span>
                      </div>
                    )}
                    {replacementAmount > 0 && (
                      <div className="flex justify-between text-green-700 dark:text-green-400">
                        <span>Yangi mahsulot:</span><span>+ {formatCurrency(replacementAmount)}</span>
                      </div>
                    )}
                    {returnAmount > 0 && replacementAmount > 0 && (
                      <div className={`flex justify-between font-semibold border-t pt-1 ${netDiff > 0 ? "text-destructive" : "text-green-600"}`}>
                        <span>{netDiff > 0 ? "Qo'shimcha qarz:" : "Qarz kamayishi:"}</span>
                        <span>{formatCurrency(Math.abs(netDiff))}</span>
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => { setReturnSale(null); setReturnItems({}); setReplaceProducts([]); setReplaceSearch(""); }}>Bekor</Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={partialReturnMutation.isPending || !hasSelection}
                    onClick={() => {
                      const items = activeItems
                        .filter((i: any) => (returnItems[i.id] || 0) > 0)
                        .map((i: any) => ({ itemId: i.id, quantity: returnItems[i.id] || 0 }));
                      const replacements = replaceProducts
                        .filter(r => r.quantity > 0)
                        .map(r => ({ productId: r.productId, quantity: r.quantity }));
                      partialReturnMutation.mutate({ saleId: returnSale.id, items, replacements });
                    }}
                    data-testid="button-confirm-return"
                  >
                    {partialReturnMutation.isPending ? "Amalga oshirilmoqda..." : "Tasdiqlash"}
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!payHistoryCustomer} onOpenChange={(o) => { if (!o) setPayHistoryCustomer(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              To'lov tarixi — {payHistoryCustomer?.fullName}
            </DialogTitle>
          </DialogHeader>
          {payHistory && payHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sana</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Turi</TableHead>
                  <TableHead>Izoh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payHistory.map((p: any) => (
                  <TableRow key={p.id} data-testid={`payment-row-${p.id}`}>
                    <TableCell className="text-xs">{format(new Date(p.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell className="font-medium text-green-600">{formatCurrency(Number(p.amount))}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {p.method === "cash" ? "Naqd" : p.method === "card" ? "Karta" : "O'tkazma"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>To'lov tarixi mavjud emas</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* O'chirish tasdiqlash dialogi */}
      <Dialog open={!!deleteCustomer} onOpenChange={(o) => !o && setDeleteCustomer(null)}>
        <DialogContent data-testid="dialog-delete-customer">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Mijozni o'chirish
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{deleteCustomer?.fullName}</span> mijozini o'chirishni tasdiqlaysizmi?
            Barcha sotuv va to'lov tarixi ham o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteCustomer(null)} data-testid="button-cancel-delete-customer">
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteCustomer && deleteMutation.mutate(deleteCustomer.id)}
              data-testid="button-confirm-delete-customer"
            >
              {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
