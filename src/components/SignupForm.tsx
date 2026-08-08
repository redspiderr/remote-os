'use client';

import { useState } from "react";
import { signIn } from "next-auth/react";

function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-[#E8634B]",
    "bg-[#E8634B]/70",
    "bg-[#5A7D3F]/70",
    "bg-[#5A7D3F]",
  ];

  return (
    <div className="mt-2">
      <div className="flex gap-1 h-1 rounded-full overflow-hidden bg-[#0B0D17]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 transition-all ${i < score ? colors[score - 1] : "bg-[#0B0D17]"}`}
          />
        ))}
      </div>
      <p className="text-[10px] text-[#6B7280] mt-1">
        {password.length > 0 ? labels[Math.max(0, score - 1)] : "Password strength"}
      </p>
    </div>
  );
}

export default function SignupForm({
  onToggle,
  onSuccess,
}: {
  onToggle: () => void;
  onSuccess?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
      } else {
        onSuccess?.();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#F9F7F2] mb-1">Create account</h2>
        <p className="text-sm text-[#6B7280]">Join REMOTE OS</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-[#E8634B]/10 border border-[#E8634B]/20 px-4 py-3 text-sm text-[#E8634B]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Full name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Elliot Alderson"
            aria-describedby="signup-name-help"
            className="w-full px-4 py-2.5 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/10 text-sm text-[#F9F7F2] placeholder:text-[#6B7280]/60 focus:outline-none focus:border-[#2A6FBB]/40 focus:ring-1 focus:ring-[#2A6FBB]/20 transition-all"
          />
          <p id="signup-name-help" className="sr-only">Enter your full name.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-describedby="signup-email-help"
            className="w-full px-4 py-2.5 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/10 text-sm text-[#F9F7F2] placeholder:text-[#6B7280]/60 focus:outline-none focus:border-[#2A6FBB]/40 focus:ring-1 focus:ring-[#2A6FBB]/20 transition-all"
          />
          <p id="signup-email-help" className="sr-only">Enter your email address.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            aria-describedby="signup-password-help"
            className="w-full px-4 py-2.5 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/10 text-sm text-[#F9F7F2] placeholder:text-[#6B7280]/60 focus:outline-none focus:border-[#2A6FBB]/40 focus:ring-1 focus:ring-[#2A6FBB]/20 transition-all"
          />
          <p id="signup-password-help" className="sr-only">Password must be at least 6 characters and include uppercase, numbers, and symbols for best strength.</p>
          <PasswordStrength password={password} />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Confirm password</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            aria-describedby="signup-confirm-help"
            className="w-full px-4 py-2.5 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/10 text-sm text-[#F9F7F2] placeholder:text-[#6B7280]/60 focus:outline-none focus:border-[#2A6FBB]/40 focus:ring-1 focus:ring-[#2A6FBB]/20 transition-all"
          />
          <p id="signup-confirm-help" className="sr-only">Re-enter your password to confirm.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2A6FBB] text-white text-sm font-semibold hover:bg-[#1f5a9c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[#6B7280]">
        Already have an account?{" "}
        <button
          onClick={onToggle}
          className="text-[#2A6FBB] hover:text-[#F9F7F2] font-medium transition-colors"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
