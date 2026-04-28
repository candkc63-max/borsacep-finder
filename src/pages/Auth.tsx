import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Mail, Lock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { hasBackend, supabase } from "@/lib/backend";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasBackend) {
      toast.error("Giriş sistemi şu anda kullanılamıyor.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast.error("E-posta ve şifre gerekli");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Geçerli bir e-posta adresi girin");
      return;
    }
    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Giriş başarılı!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: displayName || undefined },
          },
        });
        if (error) throw error;
        toast.success("Kayıt başarılı! E-postanızı kontrol edin.");
      }
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!hasBackend) {
      toast.error("Google ile giriş şu anda kullanılamıyor.");
      return;
    }

    setLoading(true);
    try {
      // Native Supabase OAuth — Vercel'de düzgün çalışır, Lovable cloud-auth'a bağımlı değil
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message || "Google ile giriş başarısız");
        return;
      }
      // signInWithOAuth tarayıcıyı Google'a yönlendirir; başarılıysa otomatik dönüş yapar
    } catch (err: any) {
      toast.error(err?.message || "Google ile giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            BORSACEP<span className="text-muted-foreground text-sm">.COM</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Hesabınıza giriş yapın" : "Yeni hesap oluşturun"}
          </p>
        </div>

        {/* Google Button */}
        <Button
          variant="outline"
          className="w-full h-11 font-medium"
          onClick={handleGoogleLogin}
          disabled={loading || !hasBackend}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-label="Google logo" role="img">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google ile {isLogin ? "Giriş Yap" : "Üye Ol"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">veya</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-mono text-muted-foreground">
                Ad Soyad
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="İsminiz"
                  className="pl-10"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-mono text-muted-foreground">
              E-posta
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-mono text-muted-foreground">
              Şifre
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="pl-10"
                minLength={6}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-11 font-semibold" disabled={loading || !hasBackend}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLogin ? "Giriş Yap" : "Üye Ol"}
          </Button>
        </form>

        {!hasBackend && (
          <p className="text-center text-xs text-muted-foreground">
            Kimlik doğrulama geçici olarak devre dışı.
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Hesabınız yok mu?" : "Zaten üye misiniz?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? "Üye Ol" : "Giriş Yap"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
