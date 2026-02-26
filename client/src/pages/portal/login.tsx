import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, Phone, Lock, User, MapPin } from "lucide-react";

interface PortalLoginProps {
  onLogin: () => void;
}

export default function PortalLogin({ onLogin }: PortalLoginProps) {
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (data: { phone: string; password: string }) => {
      const res = await apiRequest("POST", "/api/portal/login", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
      onLogin();
    },
    onError: (error: Error) => {
      toast({ title: "Kirish xatosi", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/portal/register", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
      onLogin();
    },
    onError: (error: Error) => {
      toast({ title: "Ro'yxatdan o'tish xatosi", description: error.message, variant: "destructive" });
    },
  });

  const handleLogin = () => {
    if (!loginPhone || !loginPassword) {
      toast({ title: "Telefon va parol majburiy", variant: "destructive" });
      return;
    }
    loginMutation.mutate({ phone: loginPhone, password: loginPassword });
  };

  const handleRegister = () => {
    if (!regName || !regPhone || !regPassword) {
      toast({ title: "Barcha majburiy maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    registerMutation.mutate({
      fullName: regName,
      phone: regPhone,
      password: regPassword,
      address: regAddress || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-portal-title">Smart POS</h1>
          <p className="text-muted-foreground mt-1">Mijoz portali</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="login" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Kirish</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Ro'yxatdan o'tish</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Telefon raqam</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="+998901234567"
                      className="pl-10"
                      data-testid="input-login-phone"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Parol</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Parolingiz"
                      className="pl-10"
                      data-testid="input-login-password"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleLogin}
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Kirish..." : "Tizimga kirish"}
                </Button>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">To'liq ism *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ismingiz"
                      className="pl-10"
                      data-testid="input-reg-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Telefon raqam *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+998901234567"
                      className="pl-10"
                      data-testid="input-reg-phone"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Parol *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Parol yarating"
                      className="pl-10"
                      data-testid="input-reg-password"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Manzil</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Manzilingiz"
                      className="pl-10"
                      data-testid="input-reg-address"
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleRegister}
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? "Yuklanmoqda..." : "Ro'yxatdan o'tish"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
