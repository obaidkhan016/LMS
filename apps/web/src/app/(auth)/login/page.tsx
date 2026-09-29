"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, User } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { apiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Sign in failed. Please try again."));
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(201,169,97,0.28), transparent)",
          }}
        />

        <div className="relative z-10">
          <Logo onDark />
        </div>

        <div className="relative z-10 max-w-md">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-sand-400">
            Roots Garden Schools &amp; Colleges
          </p>
          <h1 className="text-4xl font-semibold leading-[1.15] tracking-[-0.02em] text-white">
            Attendance, without the paperwork.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            One platform for teachers, administrators, and students — with manual
            fallback, AI-assisted review, and a full audit trail.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-[12px] text-white/50">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sand-500" />
          <span>Rawalpindi · Pakistan</span>
        </div>
      </aside>

      <main className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-[380px] rgs-fade-in">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-fg">
            Sign in
          </h2>
          <p className="mt-1.5 text-sm text-fg-muted">
            Use your school-issued credentials to continue.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                leadingIcon={<User className="h-4 w-4" />}
                error={!!error}
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leadingIcon={<Lock className="h-4 w-4" />}
                error={!!error}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-[10px] border border-danger/30 bg-danger-bg px-3.5 py-3 text-[13px] text-danger rgs-fade-in">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-[12px] text-fg-subtle">
            Access is monitored and audited. Unauthorized use is prohibited.
          </p>
        </div>
      </main>
    </div>
  );
}