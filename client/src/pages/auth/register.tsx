import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Phone, Lock, User, Store, ArrowLeft, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoImg from "@assets/marketline_pro_logo_1.png";

export default function OwnerRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerName || !phone || !password) {
      toast({ title: "Xatolik", description: "Barcha maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Xatolik", description: "Parollar mos kelmaydi", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Xatolik", description: "Parol kamida 6 ta belgidan iborat bo'lishi kerak", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/register", { name, ownerName, phone, password });
      toast({ title: "Muvaffaqiyatli", description: "Do'koningiz yaratildi!" });
      setLocation("/dashboard");
    } catch (error: any) {
      const msg = error?.message || "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-2">
            <img src={logoImg} alt="MARKET_LINE" className="h-20 w-auto mx-auto" />
          </div>
          <p className="text-white/50">Yangi do'kon yarating va daqiqalarda boshlang</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white text-center text-lg">Ro'yxatdan o'tish</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70">Do'kon nomi</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="text"
                    placeholder="Market Sardor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-store-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Egasi ismi</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="text"
                    placeholder="Sardor Aliyev"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-owner-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Telefon raqam</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="tel"
                    placeholder="+998901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Parol</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="password"
                    placeholder="Kamida 6 ta belgi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Parolni tasdiqlang</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="password"
                    placeholder="Parolni qayta kiriting"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                disabled={loading}
                data-testid="button-register"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Do'kon yaratish
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/40 text-sm">
                Hisobingiz bormi?{" "}
                <button
                  onClick={() => setLocation("/auth/login")}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                  data-testid="link-login"
                >
                  Tizimga kiring
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <button
            onClick={() => setLocation("/")}
            className="text-white/40 hover:text-white/60 text-sm inline-flex items-center gap-1"
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-3 h-3" /> Bosh sahifaga
          </button>
        </div>
      </div>
    </div>
  );
}
