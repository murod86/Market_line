import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Store, Phone, Lock, User, MapPin, MessageCircle, ArrowLeft, KeyRound, Shield } from "lucide-react";
import logoImg from "@assets/ChatGPT_Image_Feb_27,_2026,_05_36_53_PM_1772195868435.png";

interface PortalLoginProps {
  onLogin: () => void;
}

type View = "main" | "register-otp" | "reset-password";
type OtpStep = "phone" | "code" | "details";

export default function PortalLogin({ onLogin }: PortalLoginProps) {
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [view, setView] = useState<View>("main");
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
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

  const sendOtpMutation = useMutation({
    mutationFn: async (data: { phone: string }) => {
      const res = await apiRequest("POST", "/api/portal/send-otp", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "OTP yuborildi", description: "Telegram orqali kod olasiz" });
      setOtpStep("code");
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const sendRegisterOtpMutation = useMutation({
    mutationFn: async (data: { phone: string }) => {
      const res = await apiRequest("POST", "/api/portal/send-register-otp", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "OTP yuborildi", description: "Telegram orqali kod olasiz" });
      setOtpStep("code");
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { phone: string; code: string }) => {
      const res = await apiRequest("POST", "/api/portal/verify-otp", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tasdiqlandi", description: "OTP kod muvaffaqiyatli tasdiqlandi" });
      setOtpStep("details");
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const registerOtpMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/portal/register-otp", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
      onLogin();
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/portal/reset-password", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
      toast({ title: "Parol yangilandi", description: "Yangi parol bilan kiring" });
      onLogin();
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const handleLogin = () => {
    if (!loginPhone || !loginPassword) {
      toast({ title: "Telefon va parol majburiy", variant: "destructive" });
      return;
    }
    loginMutation.mutate({ phone: loginPhone, password: loginPassword });
  };

  const handleSendOtp = () => {
    if (!otpPhone) {
      toast({ title: "Telefon raqam majburiy", variant: "destructive" });
      return;
    }
    if (view === "register-otp") {
      sendRegisterOtpMutation.mutate({ phone: otpPhone });
    } else {
      sendOtpMutation.mutate({ phone: otpPhone });
    }
  };

  const handleVerifyOtp = () => {
    if (!otpCode) {
      toast({ title: "OTP kodni kiriting", variant: "destructive" });
      return;
    }
    verifyOtpMutation.mutate({ phone: otpPhone, code: otpCode });
  };

  const handleRegisterOtp = () => {
    if (!regName || !regPassword) {
      toast({ title: "Ism va parolni kiriting", variant: "destructive" });
      return;
    }
    registerOtpMutation.mutate({
      phone: otpPhone,
      code: otpCode,
      fullName: regName,
      password: regPassword,
      address: regAddress || undefined,
    });
  };

  const handleResetPassword = () => {
    if (!resetPassword || !resetPasswordConfirm) {
      toast({ title: "Yangi parolni kiriting", variant: "destructive" });
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      toast({ title: "Parollar mos emas", variant: "destructive" });
      return;
    }
    resetPasswordMutation.mutate({
      phone: otpPhone,
      code: otpCode,
      newPassword: resetPassword,
    });
  };

  const resetOtpFlow = () => {
    setView("main");
    setOtpStep("phone");
    setOtpPhone("");
    setOtpCode("");
    setRegName("");
    setRegPassword("");
    setRegAddress("");
    setResetPassword("");
    setResetPasswordConfirm("");
  };

  if (view === "register-otp" || view === "reset-password") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logoImg} alt="MARKET_LINE" className="h-16 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold tracking-tight">MARKET_LINE</h1>
            <p className="text-muted-foreground mt-1">
              {view === "register-otp" ? "Telegram OTP orqali ro'yxatdan o'tish" : "Parolni tiklash"}
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetOtpFlow}
                className="mb-4 -ml-2"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Orqaga
              </Button>

              {otpStep === "phone" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm">
                    <MessageCircle className="h-5 w-5 flex-shrink-0" />
                    <span>
                      {view === "register-otp"
                        ? "Telegram botga telefon raqamingizni yuborib, keyin shu raqamni kiriting"
                        : "Ro'yxatdan o'tgan telefon raqamingizni kiriting. OTP kod Telegramga yuboriladi"}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Telefon raqam</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={otpPhone}
                        onChange={(e) => setOtpPhone(e.target.value)}
                        placeholder="+998901234567"
                        className="pl-10"
                        data-testid="input-otp-phone"
                        onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSendOtp}
                    disabled={sendOtpMutation.isPending || sendRegisterOtpMutation.isPending}
                    data-testid="button-send-otp"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {sendOtpMutation.isPending || sendRegisterOtpMutation.isPending
                      ? "Yuborilmoqda..."
                      : "OTP kod yuborish"}
                  </Button>
                </div>
              )}

              {otpStep === "code" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm">
                    <Shield className="h-5 w-5 flex-shrink-0" />
                    <span>Telegramga yuborilgan 4 xonali kodni kiriting</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Kod yuborildi:</p>
                    <p className="font-mono font-bold text-lg" data-testid="text-otp-phone">{otpPhone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">OTP kod</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="1234"
                        className="pl-10 text-center text-2xl tracking-[0.5em] font-mono"
                        maxLength={4}
                        data-testid="input-otp-code"
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleVerifyOtp}
                    disabled={verifyOtpMutation.isPending || otpCode.length !== 4}
                    data-testid="button-verify-otp"
                  >
                    {verifyOtpMutation.isPending ? "Tekshirilmoqda..." : "Tasdiqlash"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => {
                      setOtpCode("");
                      handleSendOtp();
                    }}
                    disabled={sendOtpMutation.isPending || sendRegisterOtpMutation.isPending}
                    data-testid="button-resend-otp"
                  >
                    Qayta yuborish
                  </Button>
                </div>
              )}

              {otpStep === "details" && view === "register-otp" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm">
                    <Shield className="h-5 w-5 flex-shrink-0" />
                    <span>OTP tasdiqlandi! Ma'lumotlaringizni kiriting</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">To'liq ism *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ismingiz"
                        className="pl-10"
                        data-testid="input-otp-reg-name"
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
                        data-testid="input-otp-reg-password"
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
                        data-testid="input-otp-reg-address"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleRegisterOtp}
                    disabled={registerOtpMutation.isPending}
                    data-testid="button-otp-register"
                  >
                    {registerOtpMutation.isPending ? "Yuklanmoqda..." : "Ro'yxatdan o'tish"}
                  </Button>
                </div>
              )}

              {otpStep === "details" && view === "reset-password" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm">
                    <Shield className="h-5 w-5 flex-shrink-0" />
                    <span>OTP tasdiqlandi! Yangi parolni kiriting</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Yangi parol *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Yangi parol"
                        className="pl-10"
                        data-testid="input-reset-password"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Parolni tasdiqlash *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={resetPasswordConfirm}
                        onChange={(e) => setResetPasswordConfirm(e.target.value)}
                        placeholder="Parolni takrorlang"
                        className="pl-10"
                        data-testid="input-reset-password-confirm"
                        onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleResetPassword}
                    disabled={resetPasswordMutation.isPending}
                    data-testid="button-reset-password"
                  >
                    {resetPasswordMutation.isPending ? "Yuklanmoqda..." : "Parolni yangilash"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="MARKET_LINE" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-portal-title">MARKET_LINE</h1>
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
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">yoki</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
                  onClick={() => { setView("reset-password"); setOtpStep("phone"); }}
                  data-testid="button-forgot-password"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Parolni unutdingizmi? (Telegram OTP)
                </Button>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm">
                  <MessageCircle className="h-5 w-5 flex-shrink-0" />
                  <span>Ro'yxatdan o'tish uchun Telegram bot orqali telefon raqamingizni bog'lang</span>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  onClick={() => { setView("register-otp"); setOtpStep("phone"); }}
                  data-testid="button-register-otp"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Telegram OTP orqali ro'yxatdan o'tish
                </Button>
                <div className="text-xs text-muted-foreground space-y-2 mt-4">
                  <p className="font-medium">Qanday ishlaydi:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Telegram botga /start yuboring</li>
                    <li>Telefon raqamingizni ulang</li>
                    <li>Portalda telefon raqamni kiriting</li>
                    <li>Telegramga kelgan OTP kodni kiriting</li>
                    <li>Ma'lumotlaringizni to'ldiring va ro'yxatdan o'ting</li>
                  </ol>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
