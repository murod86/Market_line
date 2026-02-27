import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import POS from "@/pages/pos";
import Warehouse from "@/pages/warehouse";
import Products from "@/pages/products";
import Customers from "@/pages/customers";
import Deliveries from "@/pages/deliveries";
import Roles from "@/pages/roles";
import Employees from "@/pages/employees";
import Settings from "@/pages/settings";
import Categories from "@/pages/categories";
import Suppliers from "@/pages/suppliers";
import Purchases from "@/pages/purchases";
import PortalLogin from "@/pages/portal/login";
import PortalLayout from "@/pages/portal/portal-layout";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pos" component={POS} />
      <Route path="/warehouse" component={Warehouse} />
      <Route path="/categories" component={Categories} />
      <Route path="/products" component={Products} />
      <Route path="/customers" component={Customers} />
      <Route path="/deliveries" component={Deliveries} />
      <Route path="/roles" component={Roles} />
      <Route path="/employees" component={Employees} />
      <Route path="/settings" component={Settings} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/purchases" component={Purchases} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
};

function AdminLayout() {
  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-3 px-4 py-3 shrink-0 glass-header">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="text-white/90 [&]:bg-transparent" />
            <div className="h-5 w-px bg-white/20" />
            <h1 className="text-sm font-bold text-white/90 tracking-wide drop-shadow-sm">MARKET_LINE</h1>
          </header>
          <main className="flex-1 overflow-hidden">
            <AdminRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function PortalApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/portal/me"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading) {
      setIsLoggedIn(!isError && !!data);
      setChecking(false);
    }
  }, [isLoading, isError, data]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <PortalLogin onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <PortalLayout onLogout={() => setIsLoggedIn(false)} />
  );
}

function App() {
  const [location] = useLocation();
  const isPortal = location.startsWith("/portal");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isPortal ? <PortalApp /> : <AdminLayout />}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
