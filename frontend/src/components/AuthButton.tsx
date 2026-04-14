import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { onAuthChange, signOutUser, loginWithPassword, registerWithPassword } from "@/lib/auth";

type AuthButtonProps = {
  className?: string;
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive" | "link";
};

const AuthButton = ({ className, variant = "ghost" }: AuthButtonProps) => {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onAuthChange(setUser);
  }, []);

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setError(null);
  };

  const handleAuth = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await loginWithPassword({ email, password });
      } else {
        await registerWithPassword({ username, email, password });
      }
      setOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOutUser();
    } catch (err) {
      console.warn(err);
    } finally {
      setBusy(false);
    }
  };

  return user ? (
    <Button variant={variant} className={className} onClick={handleSignOut} disabled={busy}>
      {user.username || "Sign out"}
    </Button>
  ) : (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          Sign in
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-[#151515] text-white">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Sign in" : "Create account"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {mode === "register" && (
            <div className="space-y-1">
              <Label htmlFor="auth-username">Username</Label>
              <Input
                id="auth-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="border-white/20 bg-[#202020]"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="border-white/20 bg-[#202020]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="border-white/20 bg-[#202020]"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            onClick={handleAuth}
            disabled={busy || !email || !password || (mode === "register" && !username)}
            className="w-full bg-[#ffc02e] font-bold text-black hover:bg-[#ffca49]"
          >
            {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              setMode((current) => (current === "login" ? "register" : "login"));
              setError(null);
            }}
            className="w-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthButton;
