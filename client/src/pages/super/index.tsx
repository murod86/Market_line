import { useState, useEffect } from "react";
import SuperLogin from "./login";
import SuperDashboard from "./dashboard";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function SuperAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/super/me", { credentials: "include" })
      .then(r => { if (r.ok) setAuthed(true); else setAuthed(false); })
      .catch(() => setAuthed(false));
  }, []);

  const handleLogout = async () => {
    await apiRequest("POST", "/api/super/logout");
    setAuthed(false);
  };

  if (authed === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!authed) return <SuperLogin onLogin={() => setAuthed(true)} />;
  return <SuperDashboard onLogout={handleLogout} />;
}
