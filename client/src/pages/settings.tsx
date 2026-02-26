import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Setting } from "@shared/schema";
import { Settings as SettingsIcon, Save, Building2, MessageSquare, Webhook, Loader2 } from "lucide-react";

export default function Settings() {
  const [companyName, setCompanyName] = useState("");
  const [currency, setCurrency] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Setting[]>({ queryKey: ["/api/settings"] });

  useEffect(() => {
    if (settings) {
      const findVal = (key: string) => settings.find((s) => s.key === key)?.value || "";
      setCompanyName(findVal("company_name"));
      setCurrency(findVal("currency"));
      setTelegramToken(findVal("telegram_bot_token"));
      setTelegramChatId(findVal("telegram_chat_id"));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("POST", "/api/settings", { key, value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const handleSave = async () => {
    try {
      await Promise.all([
        saveMutation.mutateAsync({ key: "company_name", value: companyName }),
        saveMutation.mutateAsync({ key: "currency", value: currency }),
        saveMutation.mutateAsync({ key: "telegram_bot_token", value: telegramToken }),
        saveMutation.mutateAsync({ key: "telegram_chat_id", value: telegramChatId }),
      ]);
      toast({ title: "Sozlamalar saqlandi" });
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">Sozlamalar</h1>
          <p className="text-muted-foreground">Tizim sozlamalari</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Umumiy sozlamalar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Kompaniya nomi</label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} data-testid="input-company-name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Valyuta</label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="UZS" data-testid="input-currency" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Telegram bot sozlamalari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Telegram bot orqali OTP tasdiqlash va xabarnomalar uchun sozlang
            </p>
            <div>
              <label className="text-sm font-medium mb-1 block">Bot Token</label>
              <Input value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" data-testid="input-telegram-token" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Chat ID (xabarnomalar uchun)</label>
              <Input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="-1001234567890" data-testid="input-telegram-chat-id" />
            </div>
            <Separator />
            <WebhookSetup />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WebhookSetup() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const setupWebhook = async () => {
    setLoading(true);
    try {
      const webhookUrl = window.location.origin;
      const res = await apiRequest("POST", "/api/telegram/setup-webhook", { webhookUrl });
      const data = await res.json() as any;
      if (data.ok) {
        toast({ title: "Webhook o'rnatildi", description: "Telegram bot webhook muvaffaqiyatli sozlandi" });
      } else {
        toast({ title: "Xatolik", description: data.description || "Webhook o'rnatilmadi", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Telegram Webhook</p>
      <p className="text-xs text-muted-foreground">
        Mijozlar Telegram bot orqali telefon raqamini bog'lashi uchun webhook o'rnating. Bot tokenni saqlangandan keyin bosing.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={setupWebhook}
        disabled={loading}
        data-testid="button-setup-webhook"
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Webhook className="h-4 w-4 mr-2" />}
        Webhook o'rnatish
      </Button>
    </div>
  );
}
