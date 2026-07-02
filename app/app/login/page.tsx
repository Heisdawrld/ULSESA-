"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Particles } from "@/components/ui";
import {
  Vote,
  ArrowLeft,
  ArrowRight,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"matric" | "password">("matric");
  const [matric, setMatric] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerifyMatric = async () => {
    if (!matric.trim()) {
      setError("Please enter your matric number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-matric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matric: matric.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Matric number not found");
        setLoading(false);
        return;
      }
      setStep("password");
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matric: matric.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        setLoading(false);
        return;
      }
      localStorage.setItem("userToken", data.token);
      localStorage.setItem("voter", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="mesh-bg" />
      <Particles />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-[#7a7a8e] hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </button>

          <div className="glass p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <Vote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                <p className="text-[#7a7a8e] text-sm">Sign in to your account</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-8">
              <div className={`step-dot ${step === "matric" ? "active" : "completed"}`} />
              <div className="flex-1 h-px bg-white/10" />
              <div className={`step-dot ${step === "password" ? "active" : ""}`} />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            {step === "matric" ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <label className="block text-sm text-[#7a7a8e] mb-2">
                  Matric Number
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a3a4e]" />
                  <input
                    type="text"
                    value={matric}
                    onChange={(e) => { setMatric(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyMatric()}
                    placeholder="e.g. 20/25/0001"
                    className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                  />
                </div>

                <motion.button
                  onClick={handleVerifyMatric}
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="mb-4 p-3 bg-white/[0.03] rounded-xl">
                  <p className="text-xs text-[#7a7a8e]">Matric Number</p>
                  <p className="text-white font-mono">{matric}</p>
                </div>

                <label className="block text-sm text-[#7a7a8e] mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a3a4e]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-12 py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3a3a4e] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <motion.button
                  onClick={handleLogin}
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </motion.button>

                <button
                  onClick={() => { setStep("matric"); setPassword(""); setError(""); }}
                  className="w-full mt-4 py-2 text-sm text-[#7a7a8e] hover:text-white transition-colors"
                >
                  Change matric number
                </button>
              </motion.div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-[#7a7a8e]">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => router.push("/register")}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Register
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
