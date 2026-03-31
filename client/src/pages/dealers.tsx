import { useState, useMemo, Fragment } from "react";
import * as XLSX from "xlsx";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Dealer, Product, Category } from "@shared/schema";
import {
  UserCheck, Plus, Edit, Phone, Car, Package, Search,
  Minus, Trash2, ArrowDownToLine, ArrowUpFromLine, ShoppingCart,
  History, Eye, Printer, RotateCcw, Banknote, QrCode, Download,
  FileSpreadsheet, CalendarRange
} from "lucide-react";
import { format } from "date-fns";
import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import logoImg from "@assets/logo_clean.svg";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

interface CartItem {
  productId: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  quantity: number;
  buyUnit: string;
  boxQuantity: number;
  stockPieces: number;
  customPrice?: number;
}

const txTypeLabels: Record<string, { label: string; color: string }> = {
  load: { label: "Yuklash", color: "text-blue-600" },
  sell: { label: "Sotish", color: "text-green-600" },
  return: { label: "Qaytarish", color: "text-orange-600" },
};

export default function Dealers() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editDealer, setEditDealer] = useState<Dealer | null>(null);
  const [detailDealer, setDetailDealer] = useState<Dealer | null>(null);
  const [deleteDealer, setDeleteDealer] = useState<Dealer | null>(null);
  const [activeTab, setActiveTab] = useState("inventory");

  const [loadOpen, setLoadOpen] = useState(false);
  const [loadPaymentType, setLoadPaymentType] = useState<"debt" | "cash" | "partial">("debt");
  const [loadPaidAmount, setLoadPaidAmount] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");

  const [historyFilter, setHistoryFilter] = useState<"all" | "load" | "sell" | "return">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedAdminGroups, setExpandedAdminGroups] = useState<Set<string>>(new Set());

  const toggleAdminGroup = (key: string) => {
    setExpandedAdminGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const [editPayment, setEditPayment] = useState<any | null>(null);
  const [editPayAmount, setEditPayAmount] = useState("");
  const [editPayMethod, setEditPayMethod] = useState("cash");
  const [editPayNotes, setEditPayNotes] = useState("");
  const [deletePayment, setDeletePayment] = useState<any | null>(null);

  const [editTx, setEditTx] = useState<any | null>(null);
  const [editTxQty, setEditTxQty] = useState("");
  const [editTxNotes, setEditTxNotes] = useState("");
  const [editTxPaymentType, setEditTxPaymentType] = useState("debt");
  const [editTxPaidAmount, setEditTxPaidAmount] = useState("");
  const [editTxCustomerName, setEditTxCustomerName] = useState("");
  const [deleteTx, setDeleteTx] = useState<any | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loadPaperSize, setLoadPaperSize] = useState<"58mm" | "80mm" | "A4">(() =>
    (localStorage.getItem("dealer_load_paper_size") as "58mm" | "80mm" | "A4") || "58mm"
  );
  const [sellCustomerName, setSellCustomerName] = useState("");
  const [sellCustomerPhone, setSellCustomerPhone] = useState("");
  const [operationNotes, setOperationNotes] = useState("");

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formVehicle, setFormVehicle] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [qrDealer, setQrDealer] = useState<Dealer | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const { data: dealersList, isLoading } = useQuery<Dealer[]>({ queryKey: ["/api/dealers"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/dealers", detailDealer?.id, "inventory"],
    enabled: !!detailDealer,
  });

  const { data: transactions } = useQuery<any[]>({
    queryKey: ["/api/dealers", detailDealer?.id, "transactions"],
    enabled: !!detailDealer,
  });

  const { data: dealerPayments } = useQuery<any[]>({
    queryKey: ["/api/dealers", detailDealer?.id, "payments"],
    enabled: !!detailDealer,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/dealers", data);
      return res.json();
    },
    onSuccess: (newDealer: any) => {
      toast({ title: "Diller qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      setCreateOpen(false);
      if (newDealer?.phone) {
        setQrDealer(newDealer);
      }
      resetForm();
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/dealers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Diller yangilandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      setEditDealer(null);
      resetForm();
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const printLoadReceipt = (items: CartItem[], dealerName: string, ps: "58mm" | "80mm" | "A4" = "58mm") => {
    const now = new Date();
    const dateStr = format(now, "dd.MM.yyyy HH:mm");
    const total = items.reduce((s, i) => s + (i.customPrice ?? i.price) * i.stockPieces, 0);

    const sizeMap = {
      "58mm": { pageSize: "58mm auto", bodyWidth: "54mm", fontSize: "11px", fontSizeSm: "10px", padding: "4px", winWidth: 300 },
      "80mm": { pageSize: "80mm auto", bodyWidth: "76mm", fontSize: "13px", fontSizeSm: "11px", padding: "6px", winWidth: 380 },
      "A4":   { pageSize: "A4",        bodyWidth: "190mm", fontSize: "14px", fontSizeSm: "12px", padding: "15mm 15mm", winWidth: 800 },
    };
    const sz = sizeMap[ps];

    const itemsHtml = items.map((item, idx) => {
      const qtyLabel = item.buyUnit === "quti"
        ? `${item.quantity} quti (${item.stockPieces} ${item.unit})`
        : `${item.stockPieces} ${item.unit}`;
      const unitPrice = (item.customPrice ?? item.price).toLocaleString();
      const totalPrice = ((item.customPrice ?? item.price) * item.stockPieces).toLocaleString();
      return `<tr>
        <td colspan="2" style="padding:3px 2px 0px 2px;font-size:${sz.fontSize};font-weight:900;border-top:2px solid #000">${idx + 1}. ${item.name}</td>
      </tr>
      <tr>
        <td style="padding:1px 2px;font-size:${sz.fontSizeSm}">${qtyLabel}</td>
        <td style="padding:1px 2px;font-size:${sz.fontSizeSm};text-align:right">${unitPrice}/dona</td>
      </tr>
      <tr>
        <td style="padding:1px 2px 4px 2px;font-size:${sz.fontSize};font-weight:700">= Jami:</td>
        <td style="padding:1px 2px 4px 2px;font-size:${sz.fontSize};font-weight:700;text-align:right">${totalPrice} UZS</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page { size: ${sz.pageSize}; margin: ${ps === "A4" ? "10mm" : "2mm"}; }
        body { font-family: 'Courier New', monospace; font-size: ${sz.fontSize}; margin: 0; padding: ${sz.padding}; ${ps !== "A4" ? `width: ${sz.bodyWidth};` : "max-width: 190mm; margin: 0 auto;"} }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 2px solid #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
      </style></head><body>
      <div class="center bold" style="font-size:${ps === "A4" ? "22px" : "16px"};margin-bottom:4px">MARKET_LINE</div>
      <div class="center" style="font-size:${sz.fontSizeSm};margin-bottom:6px">Dillerga yuklash hujjati</div>
      <div class="divider"></div>
      <div style="font-size:${sz.fontSizeSm};margin-bottom:2px"><b>Diller:</b> ${dealerName}</div>
      <div style="font-size:${sz.fontSizeSm};margin-bottom:4px"><b>Sana:</b> ${dateStr}</div>
      <div style="font-size:${sz.fontSizeSm};margin-bottom:4px"><b>Mahsulotlar soni:</b> ${items.length} ta</div>
      <div class="divider"></div>
      <table>
        ${itemsHtml}
      </table>
      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;font-size:${ps === "A4" ? "16px" : "13px"}" class="bold">
        <span>JAMI:</span><span>${total.toLocaleString()} UZS</span>
      </div>
      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;margin-top:${ps === "A4" ? "30px" : "20px"};font-size:${sz.fontSizeSm}">
        <div>Topshirdi: __________</div>
        <div>Qabul qildi: __________</div>
      </div>
      <div class="center" style="font-size:${ps === "A4" ? "11px" : "9px"};margin-top:12px;color:#888">MARKET_LINE &bull; ${dateStr}</div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close()},5000)}</script>
    </body></html>`;

    const w = window.open("", "_blank", `width=${sz.winWidth},height=600`);
    if (w) { w.document.write(html); w.document.close(); }
  };

  const printSingleTxReceipt = (tx: any, dealerName: string) => {
    const dateStr = format(new Date(), "dd.MM.yyyy HH:mm");
    const totalAmt = Number(tx.total) || 0;
    const paidAmt = Number(tx.paidAmount || 0);
    const isLoad = tx.type === "load";
    const debtAmt = tx.paymentType === "debt" ? totalAmt : tx.paymentType === "partial" ? Math.max(0, totalAmt - paidAmt) : 0;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page { size: 58mm auto; margin: 0; }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:54mm; font-family:'Courier New',monospace; font-size:11px; font-weight:700; line-height:1.5; padding:1mm 2mm; color:#000; -webkit-print-color-adjust:exact; }
        .center { text-align:center; }
        .bold { font-weight:900; }
        .divider { border-top:2px solid #000; margin:5px 0; }
        .row { display:flex; justify-content:space-between; }
        div,span,p,b { color:#000; }
        b { font-weight:900; }
      </style></head><body>
      <div class="center bold" style="font-size:1.4em;margin-bottom:2px;letter-spacing:1px">MARKET_LINE</div>
      <div class="center bold" style="font-size:1em;margin-bottom:5px">${isLoad ? "Yuklash hujjati (nusxa)" : "Sotuv cheki (nusxa)"}</div>
      <div class="divider"></div>
      <div><b>Diller:</b> ${dealerName}</div>
      ${tx.customerName ? `<div><b>Mijoz:</b> ${tx.customerName}</div>` : ""}
      <div style="margin-bottom:4px"><b>Sana:</b> ${dateStr}</div>
      <div class="divider"></div>
      <div style="font-weight:900;font-size:1.05em;padding:3px 0">${tx.productName}</div>
      <div class="row"><span>${tx.quantity} ${tx.productUnit || "dona"} x ${Number(tx.price).toLocaleString()}</span><span>${totalAmt.toLocaleString()} UZS</span></div>
      <div class="divider"></div>
      <div class="row bold" style="font-size:1.3em;border-top:2px solid #000;padding-top:3px"><span>JAMI:</span><span>${totalAmt.toLocaleString()} UZS</span></div>
      ${!isLoad && tx.paymentType === "cash" ? `<div style="margin-top:4px"><b>To'lov:</b> Naqd</div>` : ""}
      ${!isLoad && tx.paymentType === "debt" ? `<div style="margin-top:4px"><b>Qarz:</b> ${totalAmt.toLocaleString()} UZS</div>` : ""}
      ${!isLoad && tx.paymentType === "partial" ? `<div style="margin-top:4px"><b>To'langan:</b> ${paidAmt.toLocaleString()} UZS</div><div><b>Qarz:</b> ${debtAmt.toLocaleString()} UZS</div>` : ""}
      ${isLoad ? `<div style="display:flex;justify-content:space-between;margin-top:20px;font-size:9px"><div>Topshirdi: __________</div><div>Qabul qildi: __________</div></div>` : ""}
      ${tx.notes ? `<div style="margin-top:3px"><b>Izoh:</b> ${tx.notes}</div>` : ""}
      <div class="divider"></div>
      <div class="center" style="margin-top:5px;font-size:9px">MARKET_LINE &bull; ${dateStr}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();window.onafterprint=function(){window.close()};setTimeout(function(){window.close()},8000)},300)}<\/script>
    </body></html>`;
    const w = window.open("", "_blank", "width=320,height=600");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const printGroupTxReceiptForDealer = (items: any[], dealerName: string) => {
    if (!items.length) return;
    const first = items[0];
    const dateStr = format(new Date(), "dd.MM.yyyy HH:mm");
    const totalAmt = items.reduce((s, tx) => s + (Number(tx.total) || Number(tx.price) * tx.quantity), 0);
    const paidAmt = items.reduce((s, tx) => s + Number(tx.paidAmount || 0), 0);
    const pt = first.paymentType;
    const debtAmt = pt === "debt" ? totalAmt : pt === "partial" ? Math.max(0, totalAmt - paidAmt) : 0;
    const itemsHtml = items.map((tx) => {
      const itemTotal = Number(tx.total) || Number(tx.price) * tx.quantity;
      return `<div style="font-weight:900;font-size:1.02em;padding:3px 0 1px 0;border-top:1px solid #ccc">${tx.productName}</div>
        <div style="display:flex;justify-content:space-between"><span>${tx.quantity} ${tx.productUnit || "dona"} x ${Number(tx.price).toLocaleString()}</span><span>${itemTotal.toLocaleString()} UZS</span></div>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page { size: 58mm auto; margin: 0; }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:54mm; font-family:'Courier New',monospace; font-size:11px; font-weight:700; line-height:1.5; padding:1mm 2mm; color:#000; -webkit-print-color-adjust:exact; }
        .center { text-align:center; }
        .bold { font-weight:900; }
        .divider { border-top:2px solid #000; margin:5px 0; }
        .row { display:flex; justify-content:space-between; }
        div,span,b { color:#000; }
        b { font-weight:900; }
      </style></head><body>
      <div class="center bold" style="font-size:1.4em;margin-bottom:2px;letter-spacing:1px">MARKET_LINE</div>
      <div class="center bold" style="font-size:1em;margin-bottom:5px">Sotuv cheki (nusxa)</div>
      <div class="divider"></div>
      <div><b>Diller:</b> ${dealerName}</div>
      ${first.customerName ? `<div><b>Mijoz:</b> ${first.customerName}</div>` : ""}
      <div style="margin-bottom:4px"><b>Sana:</b> ${dateStr}</div>
      <div class="divider"></div>
      ${itemsHtml}
      <div class="divider"></div>
      <div class="row bold" style="font-size:1.3em;border-top:2px solid #000;padding-top:3px"><span>JAMI:</span><span>${totalAmt.toLocaleString()} UZS</span></div>
      ${pt === "cash" ? `<div style="margin-top:4px"><b>To'lov:</b> Naqd</div>` : ""}
      ${pt === "debt" ? `<div style="margin-top:4px"><b>Qarz:</b> ${totalAmt.toLocaleString()} UZS</div>` : ""}
      ${pt === "partial" ? `<div style="margin-top:4px"><b>To'langan:</b> ${paidAmt.toLocaleString()} UZS</div><div><b>Qarz:</b> ${debtAmt.toLocaleString()} UZS</div>` : ""}
      <div class="divider"></div>
      <div class="center" style="margin-top:5px;font-size:9px">MARKET_LINE &bull; ${dateStr}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();window.onafterprint=function(){window.close()};setTimeout(function(){window.close()},8000)},300)}<\/script>
    </body></html>`;
    const w2 = window.open("", "_blank", "width=320,height=600");
    if (w2) { w2.document.write(html); w2.document.close(); }
  };

  const loadMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/dealers/${detailDealer!.id}/load`, data);
      return res.json();
    },
    onSuccess: () => {
      printLoadReceipt(cart, detailDealer?.name || "Diller", loadPaperSize);
      toast({ title: "Mahsulotlar dillerga yuklandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      resetCart();
      setLoadOpen(false);
      setLoadPaymentType("debt");
      setLoadPaidAmount("");
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const sellMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/dealers/${detailDealer!.id}/sell`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sotish muvaffaqiyatli" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "transactions"] });
      resetCart();
      setSellOpen(false);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const returnMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/dealers/${detailDealer!.id}/return`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mahsulotlar omborga qaytarildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      resetCart();
      setReturnOpen(false);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const editTxMutation = useMutation({
    mutationFn: async ({ id, quantity, notes, customerName, paymentType, paidAmount }: { id: string; quantity?: number; notes?: string; customerName?: string; paymentType?: string; paidAmount?: number }) => {
      const res = await apiRequest("PATCH", `/api/dealer-transactions/${id}`, { quantity, notes, customerName, paymentType, paidAmount });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tranzaksiya tahrirlandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditTx(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/dealer-transactions/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Tranzaksiya o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDeleteTx(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/dealers/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Diller o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      setDeleteDealer(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/payments/dealer", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "To'lov qabul qilindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "payments"] });
      if (detailDealer) {
        const newDebt = Math.max(0, Number(detailDealer.debt) - Number(payAmount));
        setDetailDealer({ ...detailDealer, debt: newDebt.toFixed(2) });
      }
      setPayOpen(false);
      setPayAmount("");
      setPayMethod("cash");
      setPayNotes("");
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const editPaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/payments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "To'lov tahrirlandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "payments"] });
      setEditPayment(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/payments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "To'lov o'chirildi, qarz qaytarildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealers", detailDealer?.id, "payments"] });
      setDeletePayment(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const submitDealerPayment = () => {
    if (!detailDealer || !payAmount) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Noto'g'ri summa", variant: "destructive" });
      return;
    }
    paymentMutation.mutate({
      dealerId: detailDealer.id,
      amount,
      method: payMethod,
      notes: payNotes.trim() || null,
    });
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormVehicle("");
    setFormPassword("");
  };

  const resetCart = () => {
    setCart([]);
    setSearchTerm("");
    setSelectedCategory("all");
    setSellCustomerName("");
    setSellCustomerPhone("");
    setOperationNotes("");
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      const newQty = existing.quantity + 1;
      const newPieces = existing.buyUnit === "quti" ? newQty * existing.boxQuantity : newQty;
      if (newPieces > product.stock) {
        toast({ title: `${product.name}: omborda yetarli emas (${product.stock} ${product.unit} bor)`, variant: "destructive" });
        return;
      }
      setCart(cart.map((i) =>
        i.productId === product.id ? { ...i, quantity: newQty, stockPieces: newPieces } : i
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        unit: product.unit,
        price: Number(product.price),
        stock: product.stock,
        quantity: 1,
        buyUnit: product.unit,
        boxQuantity: product.boxQuantity || 1,
        stockPieces: 1,
      }]);
    }
  };

  const addInventoryToCart = (item: any) => {
    const existing = cart.find((i) => i.productId === item.productId);
    if (existing) {
      const newQty = existing.quantity + 1;
      const newPieces = existing.buyUnit === "quti" ? newQty * existing.boxQuantity : newQty;
      if (newPieces > item.quantity) {
        toast({ title: `${item.productName}: dillerda yetarli emas`, variant: "destructive" });
        return;
      }
      setCart(cart.map((i) =>
        i.productId === item.productId ? { ...i, quantity: newQty, stockPieces: newPieces } : i
      ));
    } else {
      setCart([...cart, {
        productId: item.productId,
        name: item.productName,
        unit: item.productUnit,
        price: Number(item.productPrice),
        stock: item.quantity,
        quantity: 1,
        buyUnit: item.productUnit,
        boxQuantity: item.boxQuantity || 1,
        stockPieces: 1,
      }]);
    }
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((i) => i.productId !== productId));
    } else {
      setCart(cart.map((i) => {
        if (i.productId !== productId) return i;
        const newPieces = i.buyUnit === "quti" ? qty * i.boxQuantity : qty;
        const maxPieces = i.stock;
        if (newPieces > maxPieces) return i;
        return { ...i, quantity: qty, stockPieces: newPieces };
      }));
    }
  };

  const getUnitOptions = (_item: CartItem) => {
    return ["dona", "quti", "litr", "kg"];
  };

  const changeCartUnit = (productId: string, newUnit: string) => {
    setCart(cart.map((i) => {
      if (i.productId !== productId) return i;
      let newQty = i.quantity;
      if (newUnit === "quti" && i.buyUnit !== "quti") {
        newQty = Math.max(1, Math.floor(i.quantity / i.boxQuantity));
      } else if (i.buyUnit === "quti" && newUnit !== "quti") {
        newQty = i.quantity * i.boxQuantity;
      }
      const newPieces = newUnit === "quti" ? newQty * i.boxQuantity : newQty;
      if (newPieces > i.stock) return i;
      return { ...i, buyUnit: newUnit, quantity: newQty, stockPieces: newPieces };
    }));
  };

  const updateCartPrice = (productId: string, price: string) => {
    const val = price === "" ? undefined : Number(price);
    setCart(cart.map((i) => i.productId === productId ? { ...i, customPrice: val } : i));
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.customPrice ?? i.price) * i.stockPieces, 0);

  const filteredProducts = products?.filter((p) =>
    p.active && p.stock > 0 &&
    (searchTerm === "" || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedCategory === "all" || p.categoryId === selectedCategory)
  );

  const openLoadDialog = () => {
    resetCart();
    setLoadOpen(true);
  };

  const openSellDialog = () => {
    resetCart();
    setSellOpen(true);
  };

  const openReturnDialog = () => {
    resetCart();
    setReturnOpen(true);
  };

  const submitLoad = () => {
    if (cart.length === 0) return;
    loadMutation.mutate({
      items: cart.map((i) => ({ productId: i.productId, quantity: Math.round(i.stockPieces) })),
      notes: operationNotes.trim() || null,
      paymentType: loadPaymentType,
      paidAmount: loadPaymentType === "partial" ? Number(loadPaidAmount) || 0 : 0,
    });
  };

  const submitSell = () => {
    if (cart.length === 0) return;
    sellMutation.mutate({
      items: cart.map((i) => ({ productId: i.productId, quantity: Math.round(i.stockPieces), price: i.customPrice ?? i.price })),
      customerName: sellCustomerName.trim() || null,
      customerPhone: sellCustomerPhone.trim() || null,
      notes: operationNotes.trim() || null,
    });
  };

  const submitReturn = () => {
    if (cart.length === 0) return;
    returnMutation.mutate({
      items: cart.map((i) => ({ productId: i.productId, quantity: Math.round(i.stockPieces) })),
      notes: operationNotes.trim() || null,
    });
  };

  const printTransactions = () => {
    if (!transactions || !detailDealer) return;
    const html = `<html><head><title>Diller tarixi - ${detailDealer.name}</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5;font-weight:600}.load{color:#2563eb}.sell{color:#16a34a}.return{color:#ea580c}</style></head><body>
      <h2>Diller: ${detailDealer.name}</h2>
      <p>Telefon: ${detailDealer.phone || "-"} | Mashina: ${detailDealer.vehicleInfo || "-"}</p>
      <table><tr><th>Sana</th><th>Turi</th><th>Mahsulot</th><th>Miqdor</th><th>Narx</th><th>Jami</th><th>Mijoz</th><th>Izoh</th></tr>
      ${transactions.map((tx: any) => `<tr>
        <td>${format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}</td>
        <td class="${tx.type}">${txTypeLabels[tx.type]?.label || tx.type}</td>
        <td>${tx.productName}</td>
        <td>${tx.quantity} ${tx.productUnit}</td>
        <td>${formatCurrency(Number(tx.price))}</td>
        <td>${formatCurrency(Number(tx.total))}</td>
        <td>${tx.customerName || "-"}</td>
        <td>${tx.notes || "-"}</td>
      </tr>`).join("")}
      </table></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const inventoryTotal = inventory?.reduce((sum: number, i: any) => sum + Number(i.productPrice) * i.quantity, 0) || 0;

  const dateFilteredTx = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx: any) => {
      const d = new Date(tx.createdAt);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  const dateFilteredPayments = useMemo(() => {
    if (!dealerPayments) return [];
    return dealerPayments.filter((p: any) => {
      const d = new Date(p.createdAt);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [dealerPayments, dateFrom, dateTo]);

  const exportToExcel = () => {
    if (!detailDealer) return;
    const dealerName = detailDealer.name;
    const fmt = (n: number) => Math.round(n);
    const dateLabel = dateFrom || dateTo
      ? ` (${dateFrom || "..."} - ${dateTo || "..."})`
      : "";

    const loaded = dateFilteredTx.filter((t: any) => t.type === "load");
    const returned = dateFilteredTx.filter((t: any) => t.type === "return");
    const payments = dateFilteredPayments;

    const loadSheet = XLSX.utils.json_to_sheet(
      loaded.length > 0 ? loaded.map((t: any) => ({
        "Sana": format(new Date(t.createdAt), "dd.MM.yyyy HH:mm"),
        "Mahsulot": t.productName || "",
        "Miqdor": t.quantity,
        "O'lchov": t.productUnit || "dona",
        "Narx (UZS)": fmt(Number(t.productPrice || 0)),
        "Jami (UZS)": fmt(Number(t.total || 0)),
        "To'lov turi": t.paymentType === "cash" ? "Naqd" : t.paymentType === "partial" ? "Qisman" : "Qarz",
        "To'langan (UZS)": fmt(Number(t.paidAmount || 0)),
        "Qarz (UZS)": fmt(Math.max(0, Number(t.total || 0) - Number(t.paidAmount || 0))),
        "Izoh": t.notes || "",
      })) : [{ "Ma'lumot": "Yuklash tarixi mavjud emas" }]
    );

    const returnSheet = XLSX.utils.json_to_sheet(
      returned.length > 0 ? returned.map((t: any) => ({
        "Sana": format(new Date(t.createdAt), "dd.MM.yyyy HH:mm"),
        "Mahsulot": t.productName || "",
        "Miqdor": t.quantity,
        "O'lchov": t.productUnit || "dona",
        "Narx (UZS)": fmt(Number(t.productPrice || 0)),
        "Jami (UZS)": fmt(Number(t.total || 0)),
        "Izoh": t.notes || "",
      })) : [{ "Ma'lumot": "Qaytarish tarixi mavjud emas" }]
    );

    const paySheet = XLSX.utils.json_to_sheet(
      payments.length > 0 ? payments.map((p: any) => ({
        "Sana": format(new Date(p.createdAt), "dd.MM.yyyy HH:mm"),
        "Summa (UZS)": fmt(Number(p.amount || 0)),
        "Usul": p.method === "cash" ? "Naqd" : p.method === "card" ? "Karta" : p.method === "transfer" ? "O'tkazma" : p.method || "Naqd",
        "Izoh": p.notes || "",
      })) : [{ "Ma'lumot": "To'lov tarixi mavjud emas" }]
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, loadSheet, "Yuklangan");
    XLSX.utils.book_append_sheet(wb, returnSheet, "Qaytarilgan");
    XLSX.utils.book_append_sheet(wb, paySheet, "To'langan");

    const fileName = `${dealerName}_hisobot${dateLabel}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 h-full overflow-y-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  if (detailDealer) {
    return (
      <div className="p-6 space-y-4 h-full overflow-y-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { setDetailDealer(null); resetCart(); }} data-testid="button-back-dealers">
              ← Orqaga
            </Button>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2" data-testid="text-dealer-name">
                <UserCheck className="h-5 w-5" />
                {detailDealer.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {detailDealer.phone && <span className="mr-3"><Phone className="h-3 w-3 inline mr-1" />{detailDealer.phone}</span>}
                {detailDealer.vehicleInfo && <span><Car className="h-3 w-3 inline mr-1" />{detailDealer.vehicleInfo}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={openLoadDialog} data-testid="button-load-products">
              <ArrowDownToLine className="h-4 w-4 mr-1" />
              Mahsulot yuklash
            </Button>
            <Button size="sm" variant="secondary" onClick={openSellDialog} data-testid="button-sell-products">
              <ShoppingCart className="h-4 w-4 mr-1" />
              Sotish
            </Button>
            <Button size="sm" variant="outline" onClick={openReturnDialog} data-testid="button-return-products">
              <RotateCcw className="h-4 w-4 mr-1" />
              Qaytarish
            </Button>
            {Number(detailDealer.debt) > 0 && (
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => { setPayOpen(true); setPayAmount(""); setPayMethod("cash"); setPayNotes(""); }} data-testid="button-dealer-pay">
                <Banknote className="h-4 w-4 mr-1" />
                To'lov qilish
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Qarz</p>
              <p className="text-lg font-bold text-destructive" data-testid="text-dealer-debt">{formatCurrency(Number(detailDealer.debt))}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Ombor qiymati</p>
              <p className="text-lg font-bold text-primary" data-testid="text-dealer-inv-total">{formatCurrency(inventoryTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Jami to'langan</p>
              <p className="text-lg font-bold text-green-600" data-testid="text-dealer-paid">
                {formatCurrency(dealerPayments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Mahsulotlar</p>
              <p className="text-lg font-bold">{inventory?.length || 0} ta</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border mb-2">
          <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="input-date-from"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="input-date-to"
            />
          </div>
          {(dateFrom || dateTo) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              data-testid="button-clear-date"
            >
              ✕ Tozalash
            </Button>
          )}
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              onClick={exportToExcel}
              disabled={!transactions?.length && !dealerPayments?.length}
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Excel yuklab olish
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="inventory" data-testid="tab-inventory">
              <Package className="h-4 w-4 mr-1" />
              Diller ombori ({inventory?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="h-4 w-4 mr-1" />
              Tarix ({transactions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">
              <Banknote className="h-4 w-4 mr-1" />
              To'lovlar ({dealerPayments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-4">
            {inventory && inventory.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mahsulot</TableHead>
                        <TableHead>Miqdor</TableHead>
                        <TableHead>Narx</TableHead>
                        <TableHead>Jami</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item: any) => (
                        <TableRow key={item.id} data-testid={`inventory-item-${item.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.productImage ? (
                                <img src={item.productImage} alt="" className="h-8 w-8 rounded object-cover" />
                              ) : (
                                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                  <Package className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                              <span className="font-medium">{item.productName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.quantity} {item.productUnit}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(Number(item.productPrice))}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(Number(item.productPrice) * item.quantity)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/30">
                        <TableCell colSpan={3}>Umumiy qiymat</TableCell>
                        <TableCell data-testid="text-inventory-total">{formatCurrency(inventoryTotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Diller omborida mahsulot yo'q</p>
                <Button size="sm" className="mt-3" onClick={openLoadDialog}>
                  <ArrowDownToLine className="h-4 w-4 mr-1" />
                  Mahsulot yuklash
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap gap-1.5">
                {(["all", "load", "sell", "return"] as const).map((f) => {
                  const labels: Record<string, string> = { all: "Barchasi", load: "Yuklash", sell: "Sotish", return: "Qaytarish" };
                  const counts: Record<string, number> = {
                    all: dateFilteredTx.length,
                    load: dateFilteredTx.filter((t: any) => t.type === "load").length,
                    sell: dateFilteredTx.filter((t: any) => t.type === "sell").length,
                    return: dateFilteredTx.filter((t: any) => t.type === "return").length,
                  };
                  return (
                    <Button
                      key={f}
                      size="sm"
                      variant={historyFilter === f ? "default" : "outline"}
                      className={`h-7 text-xs ${f === "return" && historyFilter !== "return" ? "text-orange-600 border-orange-200" : ""}`}
                      onClick={() => setHistoryFilter(f)}
                      data-testid={`button-filter-history-${f}`}
                    >
                      {labels[f]}
                      <span className="ml-1 opacity-70">({counts[f]})</span>
                    </Button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" onClick={printTransactions} disabled={!transactions?.length} data-testid="button-print-history">
                <Printer className="h-4 w-4 mr-1" />
                Chop etish
              </Button>
            </div>
            {(() => {
              const base = dateFilteredTx;
              const filtered = historyFilter === "all" ? base : base.filter((t: any) => t.type === historyFilter);
              if (!transactions || transactions.length === 0) return (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Tarix mavjud emas</p>
                </div>
              );
              if (filtered.length === 0) return (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>{dateFrom || dateTo ? "Tanlangan sanada ma'lumot yo'q" : "Bu turda transaksiya mavjud emas"}</p>
                </div>
              );
              // Build display rows: sell txs grouped, load/return individual
              type DisplayRow =
                | { kind: "single"; tx: any }
                | { kind: "group"; items: any[]; key: string; date: string };
              const displayRows: DisplayRow[] = [];
              const sellGroups = new Map<string, any[]>();
              for (const tx of filtered) {
                if (tx.type === "sell") {
                  const key = tx.saleGroupId || tx.id;
                  if (!sellGroups.has(key)) sellGroups.set(key, []);
                  sellGroups.get(key)!.push(tx);
                } else {
                  displayRows.push({ kind: "single", tx });
                }
              }
              Array.from(sellGroups.entries()).forEach(([key, items]) => {
                displayRows.push({ kind: "group", items, key, date: items[0].createdAt });
              });
              displayRows.sort((a, b) => {
                const dA = a.kind === "single" ? a.tx.createdAt : a.date;
                const dB = b.kind === "single" ? b.tx.createdAt : b.date;
                return new Date(dB || 0).getTime() - new Date(dA || 0).getTime();
              });
              return (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-7"></TableHead>
                        <TableHead>Sana</TableHead>
                        <TableHead>Turi</TableHead>
                        <TableHead>Mahsulot</TableHead>
                        <TableHead>Miqdor</TableHead>
                        <TableHead>Jami</TableHead>
                        <TableHead>Mijoz</TableHead>
                        <TableHead>Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayRows.map((row) => {
                        if (row.kind === "single") {
                          const tx = row.tx;
                          return (
                            <TableRow key={tx.id} data-testid={`transaction-${tx.id}`}>
                              <TableCell></TableCell>
                              <TableCell className="text-xs">{format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                              <TableCell>
                                <Badge variant={tx.type === "load" ? "default" : "outline"}>
                                  {txTypeLabels[tx.type]?.label || tx.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{tx.productName}</TableCell>
                              <TableCell>{tx.quantity} {tx.productUnit}</TableCell>
                              <TableCell>{formatCurrency(Number(tx.total))}</TableCell>
                              <TableCell className="text-sm">{tx.customerName || "-"}</TableCell>
                              <TableCell>
                                {tx.type === "load" && (
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                                      onClick={() => printSingleTxReceipt(tx, detailDealer?.name || "Diller")}
                                      data-testid={`button-reprint-tx-${tx.id}`} title="Chekni qayta chiqarish">
                                      <Printer className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7"
                                      onClick={() => { setEditTx(tx); setEditTxQty(String(tx.quantity)); setEditTxNotes(tx.notes || ""); setEditTxCustomerName(tx.customerName || ""); setEditTxPaymentType(tx.paymentType || "debt"); setEditTxPaidAmount(tx.paidAmount ? String(Math.round(Number(tx.paidAmount))) : ""); }}
                                      data-testid={`button-edit-tx-${tx.id}`}>
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                      onClick={() => setDeleteTx(tx)} data-testid={`button-delete-tx-${tx.id}`}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        }
                        // Group row (sell transactions)
                        const { items, key } = row;
                        const first = items[0];
                        const isExpanded = expandedAdminGroups.has(key);
                        const groupTotal = items.reduce((s, tx) => s + (Number(tx.total) || Number(tx.price) * tx.quantity), 0);
                        const pt = first.paymentType;
                        const payBadge = pt === "debt"
                          ? <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">Qarz</Badge>
                          : pt === "partial"
                          ? <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200 bg-orange-50">Qisman</Badge>
                          : <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">Naqd</Badge>;
                        return (
                          <Fragment key={key}>
                            <TableRow
                              className="cursor-pointer hover:bg-muted/40"
                              data-testid={`transaction-group-${key}`}
                              onClick={() => toggleAdminGroup(key)}
                            >
                              <TableCell className="pl-3 pr-0">
                                <span className="text-muted-foreground text-xs">{isExpanded ? "▼" : "▶"}</span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(first.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{txTypeLabels["sell"]?.label || "Sotish"}</Badge>
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {items.length === 1 ? items[0].productName : `${items.length} ta mahsulot`}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {items.length === 1 ? `${items[0].quantity} ${items[0].productUnit}` : "—"}
                              </TableCell>
                              <TableCell className="font-semibold text-green-600">{formatCurrency(groupTotal)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{first.customerName || "-"}</TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                                    onClick={() => items.length === 1 ? printSingleTxReceipt(items[0], detailDealer?.name || "Diller") : printGroupTxReceiptForDealer(items, detailDealer?.name || "Diller")}
                                    data-testid={`button-reprint-group-${key}`} title="Chekni qayta chiqarish">
                                    <Printer className="h-3.5 w-3.5" />
                                  </Button>
                                  {items.length === 1 && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7"
                                      onClick={() => { setEditTx(items[0]); setEditTxQty(String(items[0].quantity)); setEditTxNotes(items[0].notes || ""); setEditTxCustomerName(items[0].customerName || ""); setEditTxPaymentType(items[0].paymentType || "debt"); setEditTxPaidAmount(items[0].paidAmount ? String(Math.round(Number(items[0].paidAmount))) : ""); }}
                                      data-testid={`button-edit-group-${key}`}>
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                    onClick={() => setDeleteTx(items.length === 1 ? items[0] : { ...items[0], _groupIds: items.map((t: any) => t.id) })}
                                    data-testid={`button-delete-group-${key}`}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && items.map((tx: any) => (
                              <TableRow key={tx.id} className="bg-muted/20" data-testid={`transaction-item-${tx.id}`}>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-sm pl-4">
                                  <span className="text-muted-foreground mr-1">•</span>{tx.productName}
                                </TableCell>
                                <TableCell className="text-sm">{tx.quantity} {tx.productUnit}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatCurrency(Number(tx.total) || Number(tx.price) * tx.quantity)}
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell>
                                  <Button size="icon" variant="ghost" className="h-7 w-7"
                                    onClick={() => { setEditTx(tx); setEditTxQty(String(tx.quantity)); setEditTxNotes(tx.notes || ""); setEditTxCustomerName(tx.customerName || ""); setEditTxPaymentType(tx.paymentType || "debt"); setEditTxPaidAmount(tx.paidAmount ? String(Math.round(Number(tx.paidAmount))) : ""); }}
                                    data-testid={`button-edit-item-${tx.id}`}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            {dealerPayments && dealerPayments.length > 0 ? (
              dateFilteredPayments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Banknote className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Tanlangan sanada to'lov mavjud emas</p>
                </div>
              ) : (
              <Card>
                <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sana</TableHead>
                      <TableHead>Miqdor</TableHead>
                      <TableHead>Usul</TableHead>
                      <TableHead>Izoh</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dateFilteredPayments.map((p: any) => (
                      <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(p.createdAt), "dd.MM.yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(Number(p.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {p.method === "cash" ? "Naqd" : p.method === "card" ? "Karta" : p.method === "transfer" ? "O'tkazma" : p.method || "Naqd"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.notes || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => {
                                setEditPayment(p);
                                setEditPayAmount(String(Math.round(Number(p.amount))));
                                setEditPayMethod(p.method || "cash");
                                setEditPayNotes(p.notes || "");
                              }}
                              data-testid={`button-edit-payment-${p.id}`}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                              onClick={() => setDeletePayment(p)}
                              data-testid={`button-delete-payment-${p.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/30">
                      <TableCell colSpan={3}>Jami to'lovlar</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(dateFilteredPayments.reduce((s: number, p: any) => s + Number(p.amount), 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                </CardContent>
              </Card>
              )
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Banknote className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>To'lovlar mavjud emas</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {renderProductPickerDialog(
          loadOpen,
          () => { setLoadOpen(false); resetCart(); setLoadPaymentType("debt"); setLoadPaidAmount(""); },
          "Ombordan mahsulot yuklash",
          <ArrowDownToLine className="h-5 w-5" />,
          filteredProducts || [],
          submitLoad,
          loadMutation.isPending,
          "Yuklash",
          false,
          true,
          true,
        )}

        {renderProductPickerDialog(
          sellOpen,
          () => { setSellOpen(false); resetCart(); },
          "Mijozga sotish",
          <ShoppingCart className="h-5 w-5" />,
          [],
          submitSell,
          sellMutation.isPending,
          "Sotish",
          true,
        )}

        {renderProductPickerDialog(
          returnOpen,
          () => { setReturnOpen(false); resetCart(); },
          "Omborga qaytarish",
          <RotateCcw className="h-5 w-5" />,
          [],
          submitReturn,
          returnMutation.isPending,
          "Qaytarish",
          false,
        )}

        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Diller to'lovi</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Diller: <strong>{detailDealer.name}</strong></p>
                <p className="text-sm text-muted-foreground mt-1">Joriy qarz:</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(Number(detailDealer.debt))}</p>
              </div>
              <div>
                <Label>To'lov summasi (UZS)</Label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Summani kiriting"
                  data-testid="input-dealer-pay-amount"
                />
              </div>
              <div>
                <Label>To'lov turi</Label>
                <div className="flex gap-2 mt-1">
                  {[
                    { value: "cash", label: "Naqd" },
                    { value: "card", label: "Karta" },
                    { value: "transfer", label: "O'tkazma" },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={payMethod === opt.value ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setPayMethod(opt.value)}
                      data-testid={`button-dealer-pay-method-${opt.value}`}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Izoh (ixtiyoriy)</Label>
                <Input
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Izoh..."
                  data-testid="input-dealer-pay-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayOpen(false)}>Bekor qilish</Button>
              <Button
                onClick={submitDealerPayment}
                disabled={paymentMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-confirm-dealer-payment"
              >
                {paymentMutation.isPending ? "Yuklanmoqda..." : "To'lovni tasdiqlash"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Edit payment dialog */}
      <Dialog open={!!editPayment} onOpenChange={(o) => { if (!o) setEditPayment(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>To'lovni tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-1 block">Summa (UZS)</Label>
              <Input
                type="number"
                value={editPayAmount}
                onChange={(e) => setEditPayAmount(e.target.value)}
                placeholder="Summa"
                data-testid="input-edit-payment-amount"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">To'lov usuli</Label>
              <Select value={editPayMethod} onValueChange={setEditPayMethod}>
                <SelectTrigger data-testid="select-edit-payment-method">
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
              <Label className="text-sm font-medium mb-1 block">Izoh</Label>
              <Input
                value={editPayNotes}
                onChange={(e) => setEditPayNotes(e.target.value)}
                placeholder="Ixtiyoriy izoh"
                data-testid="input-edit-payment-notes"
              />
            </div>
            {editPayment && (
              <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                Joriy: {formatCurrency(Number(editPayment.amount))}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPayment(null)}>Bekor qilish</Button>
            <Button
              onClick={() => {
                const amount = Number(editPayAmount);
                if (!editPayment || isNaN(amount) || amount <= 0) return;
                editPaymentMutation.mutate({
                  id: editPayment.id,
                  data: { amount, method: editPayMethod, notes: editPayNotes || null },
                });
              }}
              disabled={editPaymentMutation.isPending}
              data-testid="button-confirm-edit-payment"
            >
              {editPaymentMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete payment confirm dialog */}
      <Dialog open={!!deletePayment} onOpenChange={() => setDeletePayment(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>To'lovni o'chirish</DialogTitle>
          </DialogHeader>
          {deletePayment && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Bu to'lovni o'chirmoqchimisiz?</p>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-bold text-green-600">{formatCurrency(Number(deletePayment.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  {deletePayment.method === "cash" ? "Naqd" : deletePayment.method === "card" ? "Karta" : "O'tkazma"} — {format(new Date(deletePayment.createdAt), "dd.MM.yyyy")}
                </p>
              </div>
              <p className="text-xs text-orange-600">O'chirilgandan so'ng diller qarziga qaytariladi.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePayment(null)}>Bekor qilish</Button>
            <Button
              variant="destructive"
              onClick={() => deletePayment && deletePaymentMutation.mutate(deletePayment.id)}
              disabled={deletePaymentMutation.isPending}
              data-testid="button-confirm-delete-payment"
            >
              {deletePaymentMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit transaction dialog */}
      <Dialog open={!!editTx} onOpenChange={() => setEditTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTx?.type === "sell" ? "Sotuvni tahrirlash" : "Yuklashni tahrirlash"}</DialogTitle>
          </DialogHeader>
          {editTx && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">{editTx.productName}</p>
                <p className="text-xs text-muted-foreground">
                  Narxi: {formatCurrency(Number(editTx.price))} / {editTx.productUnit}
                </p>
                <p className="text-xs text-muted-foreground">
                  Hozirgi miqdor: {editTx.quantity} {editTx.productUnit}
                </p>
              </div>
              <div>
                <Label>Miqdor</Label>
                <Input
                  type="number"
                  min="1"
                  value={editTxQty}
                  onChange={(e) => setEditTxQty(e.target.value)}
                  data-testid="input-edit-tx-qty"
                />
                {editTxQty && Number(editTxQty) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Jami: {formatCurrency(Number(editTx.price) * Number(editTxQty))}
                  </p>
                )}
              </div>
              {editTx.type === "sell" ? (
                <div>
                  <Label>Mijoz ismi</Label>
                  <Input
                    value={editTxCustomerName}
                    onChange={(e) => setEditTxCustomerName(e.target.value)}
                    placeholder="Mijoz ismi (ixtiyoriy)"
                    data-testid="input-edit-tx-customer-name"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <Label>To'lov turi</Label>
                    <Select value={editTxPaymentType} onValueChange={v => { setEditTxPaymentType(v); if (v !== "partial") setEditTxPaidAmount(""); }}>
                      <SelectTrigger data-testid="select-edit-tx-payment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debt">Qarzga</SelectItem>
                        <SelectItem value="cash">Naqd (to'liq)</SelectItem>
                        <SelectItem value="partial">Qisman</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editTxPaymentType === "partial" && (
                    <div>
                      <Label>To'langan summa</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="To'langan miqdor"
                        value={editTxPaidAmount}
                        onChange={e => setEditTxPaidAmount(e.target.value)}
                        data-testid="input-edit-tx-paid-amount"
                      />
                    </div>
                  )}
                </>
              )}
              <div>
                <Label>Izoh</Label>
                <Textarea
                  value={editTxNotes}
                  onChange={(e) => setEditTxNotes(e.target.value)}
                  placeholder="Izoh (ixtiyoriy)"
                  className="resize-none"
                  data-testid="input-edit-tx-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTx(null)}>Bekor qilish</Button>
            <Button
              onClick={() => {
                if (!editTx || !editTxQty || Number(editTxQty) <= 0) return;
                if (editTx.type === "sell") {
                  editTxMutation.mutate({
                    id: editTx.id,
                    quantity: Number(editTxQty),
                    notes: editTxNotes || undefined,
                    customerName: editTxCustomerName || undefined,
                  });
                } else {
                  editTxMutation.mutate({
                    id: editTx.id,
                    quantity: Number(editTxQty),
                    notes: editTxNotes || undefined,
                    paymentType: editTxPaymentType,
                    paidAmount: editTxPaymentType === "partial" ? (Number(editTxPaidAmount) || 0) : undefined,
                  });
                }
              }}
              disabled={editTxMutation.isPending || !editTxQty || Number(editTxQty) <= 0}
              data-testid="button-save-edit-tx"
            >
              {editTxMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete transaction dialog */}
      <Dialog open={!!deleteTx} onOpenChange={() => setDeleteTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTx?.type === "sell" ? "Sotuvni o'chirish" : "Yuklashni o'chirish"}</DialogTitle>
          </DialogHeader>
          {deleteTx && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Bu {deleteTx.type === "sell" ? "sotuvni" : "yuklashni"} o'chirmoqchimisiz?
              </p>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">{deleteTx.productName}</p>
                <p className="text-xs">{deleteTx.quantity} {deleteTx.productUnit} — {formatCurrency(Number(deleteTx.total))}</p>
                {deleteTx.customerName && <p className="text-xs text-muted-foreground">Mijoz: {deleteTx.customerName}</p>}
              </div>
              <p className="text-xs text-orange-600">
                {deleteTx.type === "sell"
                  ? "Mahsulotlar dillerning inventariga qaytariladi."
                  : "Mahsulotlar omborga qaytariladi va diller qarzidan ayiriladi."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTx(null)}>Bekor qilish</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTx && deleteTxMutation.mutate(deleteTx.id)}
              disabled={deleteTxMutation.isPending}
              data-testid="button-confirm-delete-tx"
            >
              {deleteTxMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    );
  }

  function renderProductPickerDialog(
    open: boolean,
    onClose: () => void,
    title: string,
    icon: React.ReactNode,
    productList: Product[],
    onSubmit: () => void,
    isPending: boolean,
    submitLabel: string,
    showCustomer: boolean,
    showPaymentType: boolean = false,
    showPaperSize: boolean = false,
  ) {
    const isFromInventory = productList.length === 0 && inventory;
    const sourceItems = isFromInventory ? inventory : null;

    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {title} — {detailDealer?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {showCustomer && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Mijoz ismi (ixtiyoriy)</Label>
                    <Input
                      placeholder="Noma'lum mijoz"
                      value={sellCustomerName}
                      onChange={(e) => setSellCustomerName(e.target.value)}
                      data-testid="input-sell-customer-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefon (ixtiyoriy)</Label>
                    <Input
                      placeholder="+998..."
                      value={sellCustomerPhone}
                      onChange={(e) => setSellCustomerPhone(e.target.value)}
                      data-testid="input-sell-customer-phone"
                    />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Izoh (ixtiyoriy)</Label>
                <Textarea
                  placeholder="Qo'shimcha ma'lumot..."
                  value={operationNotes}
                  onChange={(e) => setOperationNotes(e.target.value)}
                  rows={2}
                  data-testid="input-operation-notes"
                />
              </div>

              {showPaymentType && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">To'lov turi</Label>
                  <div className="flex gap-2">
                    {([
                      { value: "debt" as const, label: "Qarzga", color: "bg-red-500/10 text-red-700 border-red-300" },
                      { value: "cash" as const, label: "Naqd to'laydi", color: "bg-green-500/10 text-green-700 border-green-300" },
                      { value: "partial" as const, label: "Qisman", color: "bg-yellow-500/10 text-yellow-700 border-yellow-300" },
                    ] as const).map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`flex-1 text-xs ${loadPaymentType === opt.value ? opt.color + " ring-1 ring-current" : ""}`}
                        onClick={() => setLoadPaymentType(opt.value)}
                        data-testid={`button-load-payment-${opt.value}`}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  {loadPaymentType === "partial" && (
                    <div>
                      <Label className="text-xs text-muted-foreground">To'langan summa (UZS)</Label>
                      <Input
                        type="number"
                        value={loadPaidAmount}
                        onChange={(e) => setLoadPaidAmount(e.target.value)}
                        placeholder="0"
                        data-testid="input-load-paid-amount"
                      />
                      {Number(loadPaidAmount) > 0 && Number(loadPaidAmount) < cartTotal && (
                        <p className="text-xs text-destructive mt-1">
                          Qarz: {formatCurrency(cartTotal - Number(loadPaidAmount))}
                        </p>
                      )}
                    </div>
                  )}
                  {loadPaymentType === "cash" && cartTotal > 0 && (
                    <p className="text-xs text-green-600">To'liq naqd to'lanadi: {formatCurrency(cartTotal)}</p>
                  )}
                  {loadPaymentType === "debt" && cartTotal > 0 && (
                    <p className="text-xs text-destructive">To'liq qarzga: {formatCurrency(cartTotal)}</p>
                  )}
                </div>
              )}

              {cart.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Tanlangan mahsulotlar ({cart.length})</p>
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30" data-testid={`cart-item-${item.productId}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {showCustomer ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">Narx:</span>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={item.customPrice ?? item.price}
                              onChange={(e) => updateCartPrice(item.productId, e.target.value)}
                              className="w-20 h-5 text-xs border rounded px-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              data-testid={`input-price-${item.productId}`}
                            />
                            <span className="text-[10px] text-muted-foreground">/{item.unit}</span>
                            {item.customPrice !== undefined && item.customPrice !== item.price && (
                              <button type="button" onClick={() => updateCartPrice(item.productId, "")} className="text-[10px] text-orange-500 hover:text-orange-700" title="Asl narxga qaytarish">↺</button>
                            )}
                            <span className="text-xs font-medium text-primary ml-1">
                              = {formatCurrency((item.customPrice ?? item.price) * item.stockPieces)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.price)} × {item.stockPieces} {item.unit} = {formatCurrency(item.price * item.stockPieces)}
                          </p>
                        )}
                        {item.buyUnit === "quti" && item.boxQuantity > 1 && (
                          <p className="text-[10px] text-blue-600">
                            {item.quantity} quti × {item.boxQuantity} = {item.stockPieces} {item.unit}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {getUnitOptions(item).length > 1 && (
                          <Select
                            value={item.buyUnit}
                            onValueChange={(val) => changeCartUnit(item.productId, val)}
                          >
                            <SelectTrigger className="h-7 w-16 text-[10px] px-1.5" data-testid={`select-cart-unit-${item.productId}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getUnitOptions(item).map((u) => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                          data-testid={`button-cart-minus-${item.productId}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const v = Math.max(1, Number(e.target.value) || 1);
                            updateCartQty(item.productId, v);
                          }}
                          className="w-16 h-8 text-center text-sm font-medium border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          data-testid={`input-cart-qty-${item.productId}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                          disabled={item.stockPieces >= item.stock}
                          data-testid={`button-cart-plus-${item.productId}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => updateCartQty(item.productId, 0)}
                          data-testid={`button-cart-remove-${item.productId}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t font-bold text-lg">
                    <span>Jami:</span>
                    <span data-testid="text-cart-total">{formatCurrency(cartTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Mahsulot qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-product-search"
                />
              </div>

              {!isFromInventory && categories && categories.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <Button
                    size="sm"
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    onClick={() => setSelectedCategory("all")}
                    data-testid="button-category-all"
                  >
                    Hammasi
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      size="sm"
                      variant={selectedCategory === cat.id ? "default" : "outline"}
                      onClick={() => setSelectedCategory(cat.id)}
                      data-testid={`button-category-${cat.id}`}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              )}

              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {isFromInventory ? (
                  <>
                    {(sourceItems || [])
                      .filter((item: any) =>
                        searchTerm === "" || item.productName.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((item: any) => {
                        const inCart = cart.find((c) => c.productId === item.productId);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                              inCart ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                            }`}
                            onClick={() => addInventoryToCart(item)}
                            data-testid={`inv-product-${item.productId}`}
                          >
                            {item.productImage ? (
                              <img src={item.productImage} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(Number(item.productPrice))} · {item.quantity} {item.productUnit}
                              </p>
                            </div>
                            {inCart ? (
                              <Badge className="shrink-0">{inCart.quantity}</Badge>
                            ) : (
                              <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    {(!sourceItems || sourceItems.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        Diller omborida mahsulot yo'q
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(productList || []).map((product) => {
                      const inCart = cart.find((i) => i.productId === product.id);
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                            inCart ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                          }`}
                          onClick={() => addToCart(product)}
                          data-testid={`product-${product.id}`}
                        >
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(Number(product.price))} · {product.stock} {product.unit}
                              {(product.boxQuantity || 1) > 1 && ` · 1 quti=${product.boxQuantity} ${product.unit}`}
                            </p>
                          </div>
                          {inCart ? (
                            <Badge className="shrink-0">{inCart.stockPieces} {inCart.unit}</Badge>
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    {productList.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        Mahsulot topilmadi
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {showPaperSize && (
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-xs text-muted-foreground shrink-0">Chek o'lchami:</span>
                <div className="flex gap-1">
                  {(["58mm", "80mm", "A4"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setLoadPaperSize(size); localStorage.setItem("dealer_load_paper_size", size); }}
                      className={`px-2 py-0.5 rounded text-xs border transition-colors ${loadPaperSize === size ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
                      data-testid={`button-load-paper-size-${size}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button variant="outline" onClick={onClose} data-testid="button-dialog-cancel">
              Bekor qilish
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isPending || cart.length === 0}
              data-testid="button-dialog-submit"
            >
              {isPending ? "Yuklanmoqda..." : `${submitLabel} (${cart.length} ta)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6" />
            Dillerlar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dillerlarni boshqaring — mahsulot yuklash, sotish, qaytarish
          </p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} data-testid="button-add-dealer">
          <Plus className="h-4 w-4 mr-2" />
          Yangi diller
        </Button>
      </div>

      {dealersList && dealersList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dealersList.map((dealer) => (
            <Card key={dealer.id} className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`dealer-card-${dealer.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold" data-testid={`text-dealer-name-${dealer.id}`}>{dealer.name}</h3>
                      {dealer.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />{dealer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={dealer.active ? "default" : "destructive"}>
                    {dealer.active ? "Faol" : "Nofaol"}
                  </Badge>
                </div>

                {dealer.vehicleInfo && (
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <Car className="h-3 w-3" /> {dealer.vehicleInfo}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => { setDetailDealer(dealer); setActiveTab("inventory"); }} data-testid={`button-view-dealer-${dealer.id}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    Ko'rish
                  </Button>
                  {dealer.phone && (
                    <Button size="sm" variant="outline" onClick={() => setQrDealer(dealer)} data-testid={`button-qr-dealer-${dealer.id}`}>
                      <QrCode className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => {
                    setFormName(dealer.name);
                    setFormPhone(dealer.phone || "");
                    setFormVehicle(dealer.vehicleInfo || "");
                    setEditDealer(dealer);
                  }} data-testid={`button-edit-dealer-${dealer.id}`}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteDealer(dealer); }} data-testid={`button-delete-dealer-${dealer.id}`}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <UserCheck className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">Hozircha dillerlar yo'q</h3>
          <p className="text-sm mb-4">Birinchi dillerni qo'shing va mahsulotlarni yuklang</p>
          <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Yangi diller
          </Button>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) setCreateOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi diller qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ism *</Label>
              <Input
                placeholder="Diller ismi"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                data-testid="input-dealer-name"
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                placeholder="+998..."
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                data-testid="input-dealer-phone"
              />
            </div>
            <div>
              <Label>Mashina ma'lumotlari</Label>
              <Input
                placeholder="01 A 123 BC"
                value={formVehicle}
                onChange={(e) => setFormVehicle(e.target.value)}
                data-testid="input-dealer-vehicle"
              />
            </div>
            <div>
              <Label>Parol (portal uchun)</Label>
              <Input
                type="password"
                placeholder="Parol kiriting"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                data-testid="input-dealer-password"
              />
              <p className="text-xs text-muted-foreground mt-1">Diller portaliga kirish uchun parol</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => createMutation.mutate({ name: formName, phone: formPhone || null, vehicleInfo: formVehicle || null, password: formPassword || null })}
              disabled={!formName.trim() || createMutation.isPending}
              data-testid="button-create-dealer"
            >
              {createMutation.isPending ? "Yuklanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDealer} onOpenChange={(o) => { if (!o) setEditDealer(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dillerni tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ism *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                data-testid="input-edit-dealer-name"
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                data-testid="input-edit-dealer-phone"
              />
            </div>
            <div>
              <Label>Mashina ma'lumotlari</Label>
              <Input
                value={formVehicle}
                onChange={(e) => setFormVehicle(e.target.value)}
                data-testid="input-edit-dealer-vehicle"
              />
            </div>
            <div>
              <Label>Yangi parol (bo'sh qoldirsa o'zgarmaydi)</Label>
              <Input
                type="password"
                placeholder="Yangi parol"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                data-testid="input-edit-dealer-password"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>Holati:</Label>
              <Select value={editDealer?.active ? "true" : "false"} onValueChange={(v) => setEditDealer(editDealer ? { ...editDealer, active: v === "true" } : null)}>
                <SelectTrigger className="w-32" data-testid="select-dealer-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Faol</SelectItem>
                  <SelectItem value="false">Nofaol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDealer(null)}>Bekor qilish</Button>
            <Button
              onClick={() => editDealer && updateMutation.mutate({
                id: editDealer.id,
                data: {
                  name: formName, phone: formPhone || null, vehicleInfo: formVehicle || null,
                  active: editDealer.active,
                  ...(formPassword ? { password: formPassword } : {}),
                },
              })}
              disabled={!formName.trim() || updateMutation.isPending}
              data-testid="button-update-dealer"
            >
              {updateMutation.isPending ? "Yuklanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDealer} onOpenChange={(o) => { if (!o) setDeleteDealer(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Dillerni o'chirish
            </DialogTitle>
          </DialogHeader>
          {deleteDealer && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{deleteDealer.name}</strong> nomli dillerni o'chirishni tasdiqlaysizmi?
              </p>
              <p className="text-sm text-destructive">
                Barcha ma'lumotlar (ombor, tarix, to'lovlar) butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDealer(null)}>Bekor qilish</Button>
            <Button
              variant="destructive"
              onClick={() => deleteDealer && deleteMutation.mutate(deleteDealer.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-dealer"
            >
              {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrDealer} onOpenChange={(o) => { if (!o) setQrDealer(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Diller QR kodi
            </DialogTitle>
          </DialogHeader>
          {qrDealer && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium">{qrDealer.name}</p>
                {qrDealer.phone && <p className="text-muted-foreground">{qrDealer.phone}</p>}
              </div>
              <div className="flex justify-center" ref={qrRef}>
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <QRCodeSVG
                    value={`${window.location.origin}/dealer-portal?store=${user?.tenantId || ""}&phone=${encodeURIComponent(qrDealer.phone || "")}`}
                    size={200}
                    level="M"
                    imageSettings={{
                      src: logoImg,
                      height: 36,
                      width: 36,
                      excavate: true,
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Diller bu QR kodni skanerlab portalga kirishi mumkin
              </p>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  const svgEl = qrRef.current?.querySelector("svg");
                  if (!svgEl) return;
                  const serializer = new XMLSerializer();
                  const data = serializer.serializeToString(svgEl);
                  const canvas = document.createElement("canvas");
                  canvas.width = 400;
                  canvas.height = 460;
                  const ctx = canvas.getContext("2d")!;
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, 400, 460);
                  const img = new Image();
                  img.onload = () => {
                    ctx.drawImage(img, 68, 20, 264, 264);
                    ctx.fillStyle = "#333";
                    ctx.font = "bold 18px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText(qrDealer!.name, 200, 320);
                    if (qrDealer!.phone) {
                      ctx.font = "14px Arial";
                      ctx.fillStyle = "#666";
                      ctx.fillText(qrDealer!.phone, 200, 345);
                    }
                    ctx.font = "12px Arial";
                    ctx.fillStyle = "#999";
                    ctx.fillText("MARKET_LINE - Diller portali", 200, 380);
                    const link = document.createElement("a");
                    link.download = `diller-qr-${qrDealer!.name}.png`;
                    link.href = canvas.toDataURL("image/png");
                    link.click();
                  };
                  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
                }}
                data-testid="button-download-dealer-qr"
              >
                <Download className="h-4 w-4 mr-2" />
                QR kodni yuklab olish
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
