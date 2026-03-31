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
import logoImg from "@assets/logo_chosen_b.png";
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
      <SidebarHeader className="p-4 glass-sidebar-header">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="MARKET_LINE" className="h-12 w-auto rounded-xl" data-testid="text-app-name" />
          <div>
            <h2 className="text-lg font-bold tracking-wide text-white sidebar-text-shadow-strong">MARKET_LINE</h2>
            <p className="text-xs text-white/80 font-medium sidebar-text-shadow">Biznes boshqaruvi</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="glass-sidebar-content">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-widest text-white/55 px-4 mb-1 sidebar-text-shadow">Asosiy</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive}
                      data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                      className="data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-500/40 data-[active=true]:to-indigo-500/30 data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:border data-[active=true]:border-blue-400/30 data-[active=true]:shadow-blue-500/20 rounded-xl mx-2 py-2.5 transition-all duration-200 text-white/75 hover:text-white hover:bg-white/10 hover:border hover:border-white/10"
                    >
                      <Link href={item.url}>
                        <item.icon className={`h-5 w-5 drop-shadow ${isActive ? "text-white" : item.color}`} />
                        <span className="font-semibold text-[15px] sidebar-text-shadow">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {filteredManagementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-widest text-white/55 px-4 mb-1 sidebar-text-shadow">Boshqaruv</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredManagementItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        data-active={isActive}
                        data-testid={`nav-${item.url.replace("/", "")}`}
                        className="data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-500/40 data-[active=true]:to-indigo-500/30 data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:border data-[active=true]:border-blue-400/30 data-[active=true]:shadow-blue-500/20 rounded-xl mx-2 py-2.5 transition-all duration-200 text-white/75 hover:text-white hover:bg-white/10 hover:border hover:border-white/10"
                      >
                        <Link href={item.url}>
                          <item.icon className={`h-5 w-5 drop-shadow ${isActive ? "text-white" : item.color}`} />
                          <span className="font-semibold text-[15px] sidebar-text-shadow">{item.title}</span>
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
        <div className="px-3 pt-2 pb-1 space-y-1.5">
          {planDetails && (
            <div className="px-2.5 py-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-600/15 border border-blue-400/25" data-testid="plan-info-card">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest text-blue-200/50 font-bold">Joriy tarif</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-400/40 text-blue-100 bg-blue-500/20 font-semibold h-4" data-testid="badge-plan-name">
                  {planDetails.name}
                </Badge>
              </div>
              {trialEndsAt && (
                <div className="text-[10px] text-blue-200/40 mt-0.5" data-testid="text-plan-expiry">
                  Tugash: <span className="text-blue-100/80 font-medium">{new Date(trialEndsAt).toLocaleDateString("uz-UZ", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
              {planDetails.price > 0 && (
                <div className="text-[10px] text-blue-200/40">
                  <span className="text-blue-100/80 font-medium">{new Intl.NumberFormat("uz-UZ").format(planDetails.price)} UZS/oy</span>
                </div>
              )}
            </div>
          )}
          {isTrialActive && (
            <div className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-400/25">
              <div className="flex items-center gap-1.5 text-amber-100 text-[10px] font-semibold">
                <Clock className="h-3 w-3 text-amber-300 flex-shrink-0" />
                <span>Sinov: <span className="text-amber-300">{trialDaysLeft} kun</span> qoldi</span>
              </div>
            </div>
          )}
          {trialExpired && (
            <div className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-red-500/20 to-rose-500/10 border border-red-400/25">
              <div className="flex items-center gap-1.5 text-red-100 text-[10px] font-semibold">
                <AlertTriangle className="h-3 w-3 text-red-300 flex-shrink-0" />
                <span>Sinov tugadi! Yangilang.</span>
              </div>
            </div>
          )}
        </div>
        <div className="px-3 pb-3 pt-1">
          <button
            onClick={async () => {
              await apiRequest("POST", "/api/auth/logout");
              queryClient.clear();
              window.location.href = "/";
            }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/12 transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 drop-shadow" />
            <span className="text-[13px] font-medium sidebar-text-shadow">Chiqish</span>
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
