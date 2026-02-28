import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Package, Users, Truck, BarChart3, Shield, Smartphone, Zap, Star, ArrowRight, CheckCircle2 } from "lucide-react";
import logoImg from "@assets/marketline_final_v1.png";

const features = [
  { icon: ShoppingCart, title: "POS Kassa", desc: "58mm chek chiqarish, chegirma, qarzga sotish", color: "text-blue-500 bg-blue-500/10" },
  { icon: Package, title: "Ombor boshqaruvi", desc: "Mahsulot, kategoriya, stok nazorati", color: "text-emerald-500 bg-emerald-500/10" },
  { icon: Users, title: "Mijozlar bazasi", desc: "Qarz hisobi, buyurtma tarixi", color: "text-purple-500 bg-purple-500/10" },
  { icon: Truck, title: "Yetkazib berish", desc: "Buyurtma holati kuzatuvi", color: "text-orange-500 bg-orange-500/10" },
  { icon: BarChart3, title: "Hisobotlar", desc: "Kunlik, oylik sotuv tahlili", color: "text-rose-500 bg-rose-500/10" },
  { icon: Shield, title: "Xodimlar va rollar", desc: "Huquqlarni boshqarish tizimi", color: "text-cyan-500 bg-cyan-500/10" },
  { icon: Smartphone, title: "Telegram OTP", desc: "Mijozlar uchun xavfsiz autentifikatsiya", color: "text-indigo-500 bg-indigo-500/10" },
  { icon: Zap, title: "Tez va qulay", desc: "Zamonaviy interfeys, oson foydalanish", color: "text-yellow-500 bg-yellow-500/10" },
];

const defaultPlans = [
  {
    name: "Free", slug: "free", price: "0",
    features: ["1 ta do'kon", "100 ta mahsulot", "POS kassa", "Ombor boshqaruvi", "3 ta xodim"],
    sortOrder: 0,
  },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { data: apiPlans, isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/plans/public"],
  });

  const plans = apiPlans && apiPlans.length > 0 ? apiPlans : defaultPlans;
  const popularIndex = plans.length > 1 ? 1 : -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="MARKET_LINE" className="h-10 w-auto" data-testid="text-brand" />
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setLocation("/auth/login")}
              data-testid="button-nav-login"
            >
              Kirish
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
              onClick={() => setLocation("/auth/register")}
              data-testid="button-nav-register"
            >
              Boshlash
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <img src={logoImg} alt="MARKET_LINE" className="h-32 sm:h-40 w-auto mx-auto drop-shadow-2xl" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm mb-8">
            <Star className="w-3.5 h-3.5" />
            <span>SaaS biznes boshqaruv tizimi</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold mb-6 leading-tight">
            Do'koningizni <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">zamonaviy</span> boshqaring
          </h1>
          <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-2xl mx-auto">
            POS kassa, ombor, mijozlar, yetkazib berish, xodimlar — barcha modullar bitta platformada. Ro'yxatdan o'ting va daqiqalarda boshlang.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 gap-2 text-base px-8"
              onClick={() => setLocation("/auth/register")}
              data-testid="button-hero-start"
            >
              Bepul boshlash <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 text-base px-8"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              data-testid="button-hero-features"
            >
              Ko'proq bilish
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Barcha kerakli vositalar</h2>
            <p className="text-white/50 text-lg">Biznesingizni samarali boshqarish uchun to'liq tizim</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <Card key={i} className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/8 transition-colors" data-testid={`card-feature-${i}`}>
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                  <p className="text-white/50 text-sm">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Obuna rejalari</h2>
            <p className="text-white/50 text-lg">Biznesingiz hajmiga mos rejani tanlang</p>
          </div>
          {plansLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 bg-white/5" />
              ))}
            </div>
          ) : (
            <div className={`grid grid-cols-1 gap-6 ${plans.length >= 3 ? "md:grid-cols-3" : plans.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "max-w-md mx-auto"}`}>
              {plans.map((plan: any, i: number) => {
                const isPopular = i === popularIndex;
                const priceNum = Number(plan.price);
                const priceFormatted = priceNum === 0 ? "0" : new Intl.NumberFormat("uz-UZ").format(priceNum);
                const periodText = priceNum === 0 ? "Bepul" : "oyiga";
                const planFeatures = Array.isArray(plan.features) ? plan.features : [];
                return (
                  <Card
                    key={plan.id || i}
                    className={`relative bg-white/5 border-white/10 backdrop-blur-sm ${isPopular ? "ring-2 ring-blue-500 bg-white/8" : ""}`}
                    data-testid={`card-plan-${(plan.slug || plan.name).toLowerCase()}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-xs font-semibold text-white">
                        Mashhur
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
                      <div className="pt-4">
                        <span className="text-4xl font-bold text-white">{priceFormatted}</span>
                        <span className="text-white/50 ml-1">UZS / {periodText}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {planFeatures.map((f: string, j: number) => (
                          <li key={j} className="flex items-center gap-2 text-white/70 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                        {plan.maxProducts && (
                          <li className="flex items-center gap-2 text-white/70 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            {plan.maxProducts >= 999999 ? "Cheksiz" : plan.maxProducts} mahsulot
                          </li>
                        )}
                        {plan.maxEmployees && (
                          <li className="flex items-center gap-2 text-white/70 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            {plan.maxEmployees >= 999999 ? "Cheksiz" : plan.maxEmployees} xodim
                          </li>
                        )}
                      </ul>
                      <Button
                        className={`w-full ${isPopular ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0" : "bg-white/10 hover:bg-white/15 text-white border-white/10"}`}
                        onClick={() => setLocation("/auth/register")}
                        data-testid={`button-plan-${(plan.slug || plan.name).toLowerCase()}`}
                      >
                        Boshlash
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="py-10 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="MARKET_LINE" className="h-8 w-auto" />
          </div>
          <p className="text-white/40 text-sm">© 2025 MARKET_LINE. Barcha huquqlar himoyalangan.</p>
        </div>
      </footer>
    </div>
  );
}
