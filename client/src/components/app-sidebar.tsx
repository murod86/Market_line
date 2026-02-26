import { useLocation, Link } from "wouter";
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
  Store,
} from "lucide-react";
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

const mainItems = [
  { title: "Boshqaruv paneli", url: "/", icon: LayoutDashboard, color: "text-blue-400" },
  { title: "Sotuv (POS)", url: "/pos", icon: ShoppingCart, color: "text-emerald-400" },
  { title: "Ombor", url: "/warehouse", icon: Warehouse, color: "text-amber-400" },
  { title: "Mahsulotlar", url: "/products", icon: Package, color: "text-violet-400" },
  { title: "Mijozlar", url: "/customers", icon: Users, color: "text-cyan-400" },
  { title: "Yetkazib berish", url: "/deliveries", icon: Truck, color: "text-orange-400" },
  { title: "Ta'minotchilar", url: "/suppliers", icon: Building2, color: "text-rose-400" },
  { title: "Kirim (Xaridlar)", url: "/purchases", icon: ShoppingBasket, color: "text-teal-400" },
];

const managementItems = [
  { title: "Rollar", url: "/roles", icon: Shield, color: "text-indigo-400" },
  { title: "Hodimlar", url: "/employees", icon: UserCog, color: "text-pink-400" },
  { title: "Sozlamalar", url: "/settings", icon: Settings, color: "text-slate-400" },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r-0 glass-sidebar">
      <SidebarHeader className="p-4 glass-sidebar-header">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md shadow-lg border border-white/20">
            <Store className="h-6 w-6 text-white drop-shadow-sm" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-wide text-white drop-shadow-sm" data-testid="text-app-name">MARKET_LINE</h2>
            <p className="text-[11px] text-white/60 font-medium">Biznes boshqaruvi</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="glass-sidebar-content">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-4 mb-1">Asosiy</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
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
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-4 mb-1">Boshqaruv</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => {
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
      </SidebarContent>
      <SidebarFooter className="p-4 glass-sidebar-footer">
        <div className="text-[10px] text-white/30 text-center font-semibold tracking-wider uppercase">
          MARKET_LINE v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
