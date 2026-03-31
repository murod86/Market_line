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
} from "@/components/ui/sidebar";

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
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40 px-4 mb-1">Asosiy</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-px px-2">
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
                          ? "bg-white/20 text-white shadow-sm"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Link href={item.url}>
                        <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-white/60"}`} />
                        <span className="font-medium text-[13px]">{item.title}</span>
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
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40 px-4 mb-1">Boshqaruv</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-px px-2">
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
                            ? "bg-white/20 text-white shadow-sm"
                            : "text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <Link href={item.url}>
                          <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-white/60"}`} />
                          <span className="font-medium text-[13px]">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <div className="mt-auto px-4 pb-4 pt-2">
          <button
            onClick={async () => {
              await apiRequest("POST", "/api/auth/logout");
              queryClient.clear();
              window.location.href = "/";
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all duration-150"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[13px] font-medium">Chiqish</span>
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
