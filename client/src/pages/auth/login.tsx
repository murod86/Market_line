import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, Lock, Loader2, TrendingUp, Package, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoImg from "@assets/logo_clean.svg";
import shopImg from "@assets/shutterstock_2015463743-1_1775287750856.jpg";

export default function OwnerLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast({ title: "Xatolik", description: "Barcha maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login", { phone, password });
      setLocation("/dashboard");
    } catch (error: any) {
      const msg = error?.message || "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — image panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        <img
          src={shopImg}
          alt="Do'kon"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1e3d]/80 via-[#1d3a6e]/60 to-[#0a1628]/75" />

        {/* Content on image */}
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          {/* Logo top */}
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="MARKET_LINE" className="h-10 w-auto" />
            <span className="text-white font-black text-xl tracking-wider">
              MARKET<span className="text-blue-300">_LINE</span>
            </span>
          </div>

          {/* Center text */}
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-5xl font-black leading-tight mb-3">
                Biznesingizni<br />
                <span className="text-blue-300">aqlli boshqaring</span>
              </h2>
              <p className="text-white/70 text-lg leading-relaxed max-w-sm">
                Sotuvlardan tortib omborg'acha — hamma narsa bir joyda.
              </p>
            </div>

            {/* Feature badges */}
            <div className="flex flex-col gap-3">
              {[
                { icon: TrendingUp, text: "Sotuv va foyda tahlili" },
                { icon: Package, text: "Ombor va mahsulot boshqaruvi" },
                { icon: Users, text: "Mijozlar va dilerlar tizimi" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="w-4 h-4 text-blue-300" />
                  </div>
                  <span className="text-white/80 text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <p className="text-white/40 text-xs">
            © 2025 MARKET_LINE · Barcha huquqlar himoyalangan
          </p>
        </div>
      </div>

      {/* Right side — form panel */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={logoImg} alt="MARKET_LINE" className="h-14 w-auto mx-auto mb-2" />
            <h1 className="text-2xl font-black tracking-wide">
              MARKET<span className="text-blue-500">_LINE</span>
            </h1>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Xush kelibsiz 👋
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Hisobingizga kirish uchun ma'lumotlarni kiriting
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                Telefon raqam
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-12 border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                Parol
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs select-none"
                >
                  {showPass ? "Yashir" : "Ko'rsat"}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white border-0 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all"
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Kirilmoqda...</>
              ) : (
                "Kirish"
              )}
            </Button>
          </form>

          {/* Register link */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Hisobingiz yo'qmi?{" "}
              <button
                onClick={() => setLocation("/auth/register")}
                className="text-blue-600 hover:text-blue-500 font-semibold"
                data-testid="link-register"
              >
                Ro'yxatdan o'ting
              </button>
            </p>
          </div>

          {/* Back home */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setLocation("/")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
              data-testid="link-back-home"
            >
              ← Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
