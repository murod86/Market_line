import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Store, Phone, Lock, Truck } from "lucide-react";
import logoImg from "@assets/marketline_final_v1.png";

interface DealerLoginProps {
  onLogin: () => void;
}

export default function DealerLogin({ onLogin }: DealerLoginProps) {
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const { toast } = useToast();

  const { data: tenantsList, isLoading: tenantsLoading } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/tenants/public"],
  });

  useEffect(() => {
    if (tenantsList && !selectedTenantId && tenantsList.length === 1) {
      setSelectedTenantId(tenantsList[0].id);
    }
  }, [tenantsList, selectedTenantId]);

  const loginMutation = useMutation({
    mutationFn: async (data: { phone: string; password: string; tenantId: string }) => {
      const res = await apiRequest("POST", "/api/dealer-portal/login", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dealer-portal/me"] });
      onLogin();
    },
    onError: (error: Error) => {
      toast({ title: "Kirish xatosi", description: error.message, variant: "destructive" });
    },
  });

  const handleLogin = () => {
    if (!loginPhone || !loginPassword) {
      toast({ title: "Telefon va parolni kiriting", variant: "destructive" });
      return;
    }
    if (!selectedTenantId) {
      toast({ title: "Do'konni tanlang", variant: "destructive" });
      return;
    }
    loginMutation.mutate({ phone: loginPhone, password: loginPassword, tenantId: selectedTenantId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20">
        <CardContent className="pt-8 pb-6 px-6 space-y-6">
          <div className="text-center space-y-3">
            <img src={logoImg} alt="MARKET_LINE" className="h-12 mx-auto" />
            <div className="flex items-center justify-center gap-2">
              <Truck className="h-5 w-5 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Diller portali</h1>
            </div>
            <p className="text-white/60 text-sm">Tizimga kirish uchun ma'lumotlarni kiriting</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-white/70 text-sm mb-1 block">
                <Store className="h-3.5 w-3.5 inline mr-1" />
                Do'konni tanlang
              </label>
              {tenantsLoading ? (
                <Skeleton className="h-10 w-full bg-white/10" />
              ) : (
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-dealer-tenant">
                    <SelectValue placeholder="Do'konni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantsList?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">
                <Phone className="h-3.5 w-3.5 inline mr-1" />
                Telefon raqam
              </label>
              <Input
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="+998..."
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                data-testid="input-dealer-login-phone"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">
                <Lock className="h-3.5 w-3.5 inline mr-1" />
                Parol
              </label>
              <Input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Parolni kiriting"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                data-testid="input-dealer-login-password"
              />
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleLogin}
              disabled={loginMutation.isPending}
              data-testid="button-dealer-login"
            >
              {loginMutation.isPending ? "Yuklanmoqda..." : "Kirish"}
            </Button>
          </div>

          <p className="text-center text-white/40 text-xs">
            Parol admin tomonidan beriladi
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
