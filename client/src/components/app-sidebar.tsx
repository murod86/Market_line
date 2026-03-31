import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Shield,
  UserCog,
  Settings,
  Warehouse,
  Building2,
  ShoppingBasket,
  FolderOpen,
  LogOut,
  ClipboardList,
  UserCheck,
  AlertTriangle,
  Clock,
  Receipt,
  History,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoImg from "@assets/logo_clean.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const mainItems = [
  { title: "Boshqaruv paneli", url: "/dashboard", icon: LayoutDashboard, color: "text-blue-400", moduleKey: "dashboard" },
  { title: "Sotuv (POS)", url: "/pos", icon: ShoppingCart, color: "text-emerald-400", moduleKey: "pos" },
  { title: "Sotuvlar tarixi", url: "/sales-history", icon: History, color: "text-green-400", moduleKey: "pos" },
  { title: "Ombor", url: "/warehouse", icon: Warehouse, color: "text-amber-400", moduleKey: "warehouse" },
  { title: "Kategoriyalar", url: "/categories", icon: FolderOpen, color: "text-purple-400", moduleKey: "categories" },
  { title: "Mahsulotlar", url: "/products", icon: Package, color: "text-violet-400", moduleKey: "products" },
  { title: "Mijozlar", url: "/customers", icon: Users, color: "text-cyan-400", moduleKey: "customers" },
  { title: "Yetkazib berish", url: "/deliveries", icon: Truck, color: "text-orange-400", moduleKey: "deliveries" },
  { title: "Ta'minotchilar", url: "/suppliers", icon: Building2, color: "text-rose-400", moduleKey: "suppliers" },
  { title: "Kirim (Xaridlar)", url: "/purchases", icon: ShoppingBasket, color: "text-teal-400", moduleKey: "purchases" },
  { title: "Buyurtmalar", url: "/orders", icon: ClipboardList, color: "text-lime-400", moduleKey: "orders" },
  { title: "Dillerlar", url: "/dealers", icon: UserCheck, color: "text-sky-400", moduleKey: "dealers" },
  { title: "Xarajatlar", url: "/expenses", icon: Receipt, color: "text-red-400", moduleKey: "expenses" },
];

const managementItems = [
  { title: "Rollar", url: "/roles", icon: Shield, color: "text-indigo-400", moduleKey: "roles" },
  { title: "Hodimlar", url: "/employees", icon: UserCog, color: "text-pink-400", moduleKey: "employees" },
  { title: "Sozlamalar", url: "/settings", icon: Settings, color: "text-slate-400", moduleKey: "settings" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { data: me } = useQuery<any>({ queryKey: ["/api/auth/me"] });

  const allowedModules: string[] = me?.allowedModules || [];
  const isTrialActive = me?.isTrialActive;
  const trialExpired = me?.trialExpired;
  const trialDaysLeft = me?.trialDaysLeft || 0;
  const planDetails = me?.planDetails;
  const trialEndsAt = me?.trialEndsAt;

  const filteredMainItems = mainItems.filter(item =>
    item.moduleKey === "dashboard" || allowedModules.includes(item.moduleKey)
  );
  const filteredManagementItems = managementItems.filter(item =>
    allowedModules.includes(item.moduleKey)
  );

  return (
    <Sidebar className="border-r-0 glass-sidebar">
      <SidebarHeader className="px-4 py-3.5 glass-sidebar-header">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="MARKET_LINE" className="h-11 w-11 rounded-xl shadow-lg shadow-black/30 flex-shrink-0" data-testid="text-app-name" />
          <div className="min-w-0">
            <h2 className="text-base font-black tracking-wider text-white leading-tight sidebar-text-shadow-strong">
              MARKET<span className="text-blue-200">_LINE</span>
            </h2>
            <p className="text-[11px] text-white/65 font-medium sidebar-text-shadow tracking-wide">Biznes boshqaruvi</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="glass-sidebar-content">
        <SidebarGroup className="pt-3">
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35 px-5 mb-1.5">Asosiy</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {filteredMainItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive}
                      data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                      className={`rounded-lg py-2 px-3 transition-all duration-150 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500/38 to-indigo-500/22 text-white shadow-md border border-blue-400/25 border-l-[3px] border-l-blue-400"
                          : "text-white/70 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/8"
                      }`}
                    >
                      <Link href={item.url}>
                        <div className={`flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 ${isActive ? "bg-white/15" : "bg-white/5"}`}>
                          <item.icon className={`h-4 w-4 ${isActive ? "text-white" : item.color}`} />
                        </div>
                        <span className={`font-semibold text-[13.5px] sidebar-text-shadow ${isActive ? "text-white" : ""}`}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {filteredManagementItems.length > 0 && (
          <SidebarGroup className="pt-2">
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35 px-5 mb-1.5">Boshqaruv</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5 px-2">
                {filteredManagementItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        data-active={isActive}
                        data-testid={`nav-${item.url.replace("/", "")}`}
                        className={`rounded-lg py-2 px-3 transition-all duration-150 ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500/38 to-indigo-500/22 text-white shadow-md border border-blue-400/25 border-l-[3px] border-l-blue-400"
                            : "text-white/70 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/8"
                        }`}
                      >
                        <Link href={item.url}>
                          <div className={`flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 ${isActive ? "bg-white/15" : "bg-white/5"}`}>
                            <item.icon className={`h-4 w-4 ${isActive ? "text-white" : item.color}`} />
                          </div>
                          <span className={`font-semibold text-[13.5px] sidebar-text-shadow ${isActive ? "text-white" : ""}`}>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="glass-sidebar-footer">
        <div className="px-2.5 pt-2.5 pb-1 space-y-1.5">
          {planDetails && (
            <div className="px-3 py-2 rounded-xl bg-gradient-to-br from-blue-500/18 to-indigo-600/12 border border-blue-400/20 backdrop-blur-sm" data-testid="plan-info-card">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] uppercase tracking-[0.15em] text-blue-200/45 font-black">Joriy tarif</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-400/35 text-blue-100/90 bg-blue-500/18 font-bold h-4" data-testid="badge-plan-name">
                  {planDetails.name}
                </Badge>
              </div>
              {trialEndsAt && (
                <div className="text-[10px] text-blue-200/40" data-testid="text-plan-expiry">
                  Tugash: <span className="text-blue-100/75 font-semibold">{new Date(trialEndsAt).toLocaleDateString("uz-UZ", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
              {planDetails.price > 0 && (
                <div className="text-[10px] text-blue-200/40">
                  <span className="text-blue-100/75 font-semibold">{new Intl.NumberFormat("uz-UZ").format(planDetails.price)} UZS/oy</span>
                </div>
              )}
            </div>
          )}
          {isTrialActive && (
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/18 to-orange-500/10 border border-amber-400/22">
              <div className="flex items-center gap-2 text-amber-100 text-[10px] font-bold">
                <Clock className="h-3 w-3 text-amber-300/90 flex-shrink-0" />
                <span>Sinov: <span className="text-amber-300">{trialDaysLeft} kun</span> qoldi</span>
              </div>
            </div>
          )}
          {trialExpired && (
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-500/18 to-rose-500/10 border border-red-400/22">
              <div className="flex items-center gap-2 text-red-100 text-[10px] font-bold">
                <AlertTriangle className="h-3 w-3 text-red-300/90 flex-shrink-0" />
                <span>Sinov tugadi! Yangilang.</span>
              </div>
            </div>
          )}
        </div>
        <div className="px-2.5 pb-3 pt-1">
          <button
            onClick={async () => {
              await apiRequest("POST", "/api/auth/logout");
              queryClient.clear();
              window.location.href = "/";
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-red-500/15 hover:border-red-400/25 border border-transparent transition-all duration-150"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[13px] font-semibold sidebar-text-shadow">Chiqish</span>
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
