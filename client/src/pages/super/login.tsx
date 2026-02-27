import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Loader2, Send, KeyRound, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type Tab = "password" | "otp" | "reset";

export default function SuperLogin({ onLogin }: { onLogin: () => void }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("password");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetStep, setResetStep] = useState<"send" | "verify" | "newpass">("send");
  const [resetCode, setResetCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/super/login", { password });
      onLogin();
    } catch (error: any) {
      toast({ title: "Xatolik", description: error?.message || "Parol noto'g'ri", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (purpose: string = "login") => {
    setLoading(true);
    try {
      await apiRequest("POST", "/api/super/send-otp", { purpose });
      if (purpose === "login") {
        setOtpSent(true);
      } else {
        setResetStep("verify");
      }
      toast({ title: "OTP yuborildi", description: "Telegram botga OTP kod yuborildi" });
    } catch (error: any) {
      toast({ title: "Xatolik", description: error?.message || "OTP yuborilmadi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/super/verify-otp", { code: otpCode, purpose: "login" });
      onLogin();
    } catch (error: any) {
      toast({ title: "Xatolik", description: error?.message || "OTP noto'g'ri", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/super/verify-reset-otp", { code: resetCode });
      const data = await res.json();
      setResetToken(data.resetToken);
      setResetStep("newpass");
      toast({ title: "Tasdiqlandi", description: "Yangi parolni kiriting" });
    } catch (error: any) {
      toast({ title: "Xatolik", description: error?.message || "OTP noto'g'ri", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      toast({ title: "Xatolik", description: "Parol kamida 4 ta belgidan iborat bo'lishi kerak", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Xatolik", description: "Parollar mos kelmadi", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/super/reset-password", { resetToken, newPassword });
      toast({ title: "Muvaffaqiyat", description: "Parol o'zgartirildi. Yangi parol bilan kiring." });
      setTab("password");
      setResetStep("send");
      setResetCode("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Xatolik", description: error?.message || "Parol o'zgartirilmadi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setOtpSent(false);
    setOtpCode("");
    setResetStep("send");
    setResetCode("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setPassword("");
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => switchTab(t)}
      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
        tab === t
          ? "bg-white/10 text-white"
          : "text-white/40 hover:text-white/60"
      }`}
      data-testid={`tab-${t}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
          <p className="text-white/50 text-sm mt-1">MARKET_LINE platformasini boshqarish</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
              {tabBtn("password", "Parol")}
              {tabBtn("otp", "Telegram OTP")}
              {tabBtn("reset", "Tiklash")}
            </div>
          </CardHeader>
          <CardContent>
            {tab === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Parol</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      type="password"
                      placeholder="Super admin parol"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      data-testid="input-super-password"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                  disabled={loading}
                  data-testid="button-super-login"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  Kirish
                </Button>
              </form>
            )}

            {tab === "otp" && !otpSent && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                    <Send className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-white/60 text-sm">
                    Telegram botingizga bir martalik kod yuboriladi
                  </p>
                </div>
                <Button
                  onClick={() => handleSendOtp("login")}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                  disabled={loading}
                  data-testid="button-send-otp"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  OTP kod yuborish
                </Button>
              </div>
            )}

            {tab === "otp" && otpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">OTP kod</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      type="text"
                      placeholder="4 xonali kod"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      maxLength={4}
                      className="pl-10 bg-white/5 border-white/10 text-white text-center text-lg tracking-[0.5em] placeholder:text-white/30 placeholder:tracking-normal placeholder:text-sm"
                      data-testid="input-otp-code"
                    />
                  </div>
                  <p className="text-white/40 text-xs text-center">Telegram botga yuborilgan kodni kiriting</p>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                  disabled={loading}
                  data-testid="button-verify-otp"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  Tasdiqlash
                </Button>
                <button
                  type="button"
                  onClick={() => handleSendOtp("login")}
                  className="w-full text-xs text-white/40 hover:text-white/60 py-1"
                  data-testid="button-resend-otp"
                >
                  Qayta yuborish
                </button>
              </form>
            )}

            {tab === "reset" && resetStep === "send" && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-white/60 text-sm">
                    Parolni tiklash uchun Telegramga tasdiqlash kodi yuboriladi
                  </p>
                </div>
                <Button
                  onClick={() => handleSendOtp("reset")}
                  className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white border-0"
                  disabled={loading}
                  data-testid="button-send-reset-otp"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Tiklash kodini yuborish
                </Button>
              </div>
            )}

            {tab === "reset" && resetStep === "verify" && (
              <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Tasdiqlash kodi</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      type="text"
                      placeholder="4 xonali kod"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      maxLength={4}
                      className="pl-10 bg-white/5 border-white/10 text-white text-center text-lg tracking-[0.5em] placeholder:text-white/30 placeholder:tracking-normal placeholder:text-sm"
                      data-testid="input-reset-otp"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white border-0"
                  disabled={loading}
                  data-testid="button-verify-reset-otp"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Tasdiqlash
                </Button>
                <button
                  type="button"
                  onClick={() => setResetStep("send")}
                  className="w-full text-xs text-white/40 hover:text-white/60 py-1 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Orqaga
                </button>
              </form>
            )}

            {tab === "reset" && resetStep === "newpass" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Yangi parol</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      type="password"
                      placeholder="Yangi parol"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      data-testid="input-new-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Parolni tasdiqlash</Label>
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
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0"
                  disabled={loading}
                  data-testid="button-save-new-password"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  Parolni saqlash
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
