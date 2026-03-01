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
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoImg from "@assets/marketline_final_v1.png";
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
  { title: "Ombor", url: "/warehouse", icon: Warehouse, color: "text-amber-400", moduleKey: "warehouse" },
  { title: "Kategoriyalar", url: "/categories", icon: FolderOpen, color: "text-purple-400", moduleKey: "categories" },
  { title: "Mahsulotlar", url: "/products", icon: Package, color: "text-violet-400", moduleKey: "products" },
  { title: "Mijozlar", url: "/customers", icon: Users, color: "text-cyan-400", moduleKey: "customers" },
  { title: "Yetkazib berish", url: "/deliveries", icon: Truck, color: "text-orange-400", moduleKey: "deliveries" },
  { title: "Ta'minotchilar", url: "/suppliers", icon: Building2, color: "text-rose-400", moduleKey: "suppliers" },
  { title: "Kirim (Xaridlar)", url: "/purchases", icon: ShoppingBasket, color: "text-teal-400", moduleKey: "purchases" },
  { title: "Buyurtmalar", url: "/orders", icon: ClipboardList, color: "text-lime-400", moduleKey: "orders" },
  { title: "Dillerlar", url: "/dealers", icon: UserCheck, color: "text-sky-400", moduleKey: "dealers" },
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
          <img src={logoImg} alt="MARKET_LINE" className="h-11 w-auto rounded-xl" data-testid="text-app-name" />
          <div>
            <h2 className="text-base font-bold tracking-wide text-white drop-shadow-sm">MARKET_LINE</h2>
            <p className="text-[11px] text-white/60 font-medium">Biznes boshqaruvi</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="glass-sidebar-content">
        {isTrialActive && (
          <div className="mx-3 mt-2 p-2.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-200 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>Sinov muddati: {trialDaysLeft} kun qoldi</span>
            </div>
          </div>
        )}
        {trialExpired && (
          <div className="mx-3 mt-2 p-2.5 rounded-lg bg-red-500/20 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-200 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Sinov muddati tugadi! Tarifni yangilang.</span>
            </div>
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-4 mb-1">Asosiy</SidebarGroupLabel>
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
                      className="data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:shadow-sm data-[active=true]:border-white/10 rounded-lg mx-2 transition-all duration-200 text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Link href={item.url}>
                        <item.icon className={`h-4 w-4 ${isActive ? "text-white drop-shadow-sm" : item.color}`} />
                        <span className="font-medium text-sm">{item.title}</span>
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
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-4 mb-1">Boshqaruv</SidebarGroupLabel>
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
                        className="data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:shadow-sm rounded-lg mx-2 transition-all duration-200 text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <Link href={item.url}>
                          <item.icon className={`h-4 w-4 ${isActive ? "text-white drop-shadow-sm" : item.color}`} />
                          <span className="font-medium text-sm">{item.title}</span>
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
      <SidebarFooter className="p-4 glass-sidebar-footer">
        <button
          onClick={async () => {
            await apiRequest("POST", "/api/auth/logout");
            queryClient.clear();
            window.location.href = "/";
          }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          <span>Chiqish</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
