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
import PortalLogin from "@/pages/portal/login";
import PortalLayout from "@/pages/portal/portal-layout";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pos" component={POS} />
      <Route path="/warehouse" component={Warehouse} />
      <Route path="/products" component={Products} />
      <Route path="/customers" component={Customers} />
      <Route path="/deliveries" component={Deliveries} />
      <Route path="/roles" component={Roles} />
      <Route path="/employees" component={Employees} />
      <Route path="/settings" component={Settings} />
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
          <header className="flex items-center gap-2 p-2 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
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
