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
  { title: "Boshqaruv paneli", url: "/", icon: LayoutDashboard, color: "text-blue-500" },
  { title: "Sotuv (POS)", url: "/pos", icon: ShoppingCart, color: "text-emerald-500" },
  { title: "Ombor", url: "/warehouse", icon: Warehouse, color: "text-amber-500" },
  { title: "Mahsulotlar", url: "/products", icon: Package, color: "text-violet-500" },
  { title: "Mijozlar", url: "/customers", icon: Users, color: "text-cyan-500" },
  { title: "Yetkazib berish", url: "/deliveries", icon: Truck, color: "text-orange-500" },
  { title: "Ta'minotchilar", url: "/suppliers", icon: Building2, color: "text-rose-500" },
  { title: "Kirim (Xaridlar)", url: "/purchases", icon: ShoppingBasket, color: "text-teal-500" },
];

const managementItems = [
  { title: "Rollar", url: "/roles", icon: Shield, color: "text-indigo-500" },
  { title: "Hodimlar", url: "/employees", icon: UserCog, color: "text-pink-500" },
  { title: "Sozlamalar", url: "/settings", icon: Settings, color: "text-slate-500" },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 bg-gradient-to-b from-blue-600 to-indigo-700">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-wide text-white" data-testid="text-app-name">MARKET_LINE</h2>
            <p className="text-xs text-blue-200">Biznes boshqaruvi</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">Asosiy</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                    className="data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 dark:data-[active=true]:bg-blue-950 dark:data-[active=true]:text-blue-300 rounded-lg mx-1 transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className={`h-4 w-4 ${location === item.url ? "text-blue-600 dark:text-blue-400" : item.color}`} />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">Boshqaruv</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "")}`}
                    className="data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 dark:data-[active=true]:bg-blue-950 dark:data-[active=true]:text-blue-300 rounded-lg mx-1 transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className={`h-4 w-4 ${location === item.url ? "text-blue-600 dark:text-blue-400" : item.color}`} />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 bg-slate-100 dark:bg-slate-950">
        <div className="text-xs text-slate-400 text-center font-medium">
          MARKET_LINE v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
