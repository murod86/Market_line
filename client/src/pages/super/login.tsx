import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function SuperLogin({ onLogin }: { onLogin: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/super/login", { password });
      onLogin();
    } catch (error: any) {
      toast({ title: "Xatolik", description: error?.message || "Parol noto'g'ri", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
          <p className="text-white/50 text-sm mt-1">MARKET_LINE platformasini boshqarish</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white text-center text-base">Tizimga kirish</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70">Parol</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="password"
                    placeholder="Super admin parol"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-super-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                disabled={loading}
                data-testid="button-super-login"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Kirish
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
