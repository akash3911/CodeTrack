import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginWithPassword, onAuthChange, registerWithPassword, signOutUser } from "@/lib/auth";

const SignIn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const redirectTo = useMemo(() => searchParams.get("from") || "/practice", [searchParams]);

  const [user, setUser] = useState<{ username: string } | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthChange(setUser), []);

  const handleAuth = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await loginWithPassword({ email, password });
      } else {
        await registerWithPassword({ username, email, password });
      }
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOutUser();
    } catch (err: any) {
      setError(err?.message || "Sign out failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131313] text-white">
      <div className="grid-noise min-h-screen">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#131313]/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
            <Link to="/" className="font-heading text-xl font-extrabold tracking-[-0.04em] text-[#ffc02e]">
              CodeTrack
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md px-6 py-10">
          <section className="ui-surface animate-rise p-6">
            {user ? (
              <div className="space-y-4">
                <h1 className="font-heading text-2xl font-black tracking-[-0.03em] text-white">You are signed in</h1>
                <p className="text-sm text-white/70">Signed in as {user.username}</p>
                <button
                  type="button"
                  onClick={() => navigate(redirectTo)}
                  className="w-full rounded-md bg-[#ffc02e] px-4 py-2 font-bold text-black transition-colors hover:bg-[#ffca49]"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={busy}
                  className="w-full rounded-md border border-white/20 bg-transparent px-4 py-2 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Please wait..." : "Sign out"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h1 className="font-heading text-2xl font-black tracking-[-0.03em] text-white">
                  {mode === "login" ? "Sign in" : "Create account"}
                </h1>

                {mode === "register" && (
                  <div>
                    <label htmlFor="signin-username" className="text-sm text-white/85">
                      Username
                    </label>
                    <input
                      id="signin-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-1 w-full rounded-md border border-white/20 bg-[#202020] px-3 py-2 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#ffc02e]/60"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="signin-email" className="text-sm text-white/85">
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-md border border-white/20 bg-[#202020] px-3 py-2 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#ffc02e]/60"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="signin-password" className="text-sm text-white/85">
                    Password
                  </label>
                  <input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-md border border-white/20 bg-[#202020] px-3 py-2 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#ffc02e]/60"
                    placeholder="Minimum 8 characters"
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="button"
                  onClick={handleAuth}
                  disabled={busy || !email || !password || (mode === "register" && !username)}
                  className="w-full rounded-md bg-[#ffc02e] px-4 py-2 font-bold text-black transition-colors hover:bg-[#ffca49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode((current) => (current === "login" ? "register" : "login"));
                    setError(null);
                  }}
                  className="w-full rounded-md px-4 py-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default SignIn;