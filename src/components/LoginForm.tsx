'use client';

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm({
  onToggle,
}: {
  onToggle: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (res?.error) {
        setError(res.error === "CredentialsSignin" ? "Invalid email or password" : res.error);
      } else {
        window.location.reload();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#F9F7F2] mb-1">Welcome back</h2>
        <p className="text-sm text-[#6B7280]">Sign in to REMOTE OS</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-[#E8634B]/10 border border-[#E8634B]/20 px-4 py-3 text-sm text-[#E8634B]">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-medium text-[#6B7280] mb-1.5">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-describedby="email-help"
            className="w-full px-4 py-2.5 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/10 text-sm text-[#F9F7F2] placeholder:text-[#6B7280]/60 focus:outline-none focus:border-[#2A6FBB]/40 focus:ring-1 focus:ring-[#2A6FBB]/20 transition-all"
          />
          <p id="email-help" className="sr-only">Enter the email address associated with your account.</p>
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-[#6B7280] mb-1.5">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            aria-describedby="password-help"
            className="w-full px-4 py-2.5 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/10 text-sm text-[#F9F7F2] placeholder:text-[#6B7280]/60 focus:outline-none focus:border-[#2A6FBB]/40 focus:ring-1 focus:ring-[#2A6FBB]/20 transition-all"
          />
          <p id="password-help" className="sr-only">Enter your password.</p>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-[#2A6FBB]/30 bg-[#1A1D2E] text-[#2A6FBB] focus:ring-[#2A6FBB]/20"
            />
            <span className="text-xs text-[#6B7280]">Remember me</span>
          </label>
          <button
            type="button"
            className="text-xs text-[#2A6FBB] hover:text-[#F9F7F2] transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2A6FBB] text-white text-sm font-semibold hover:bg-[#1f5a9c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#2A6FBB]/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#0B0D17] px-3 text-[#6B7280]">or continue with</span>
        </div>
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#2A6FBB]/15 bg-[#1A1D2E] text-sm text-[#F9F7F2] hover:bg-[#1A1D2E]/80 hover:border-[#2A6FBB]/30 transition-all disabled:opacity-50"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google
      </button>

      <p className="mt-6 text-center text-xs text-[#6B7280]">
        Don&apos;t have an account?{" "}
        <button
          onClick={onToggle}
          className="text-[#2A6FBB] hover:text-[#F9F7F2] font-medium transition-colors"
        >
          Sign up
        </button>
      </p>
    </div>
  );
}
