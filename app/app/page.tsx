"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Particles } from "@/components/ui";
import {
  Vote,
  Users,
  Shield,
  Calendar,
  ChevronRight,
  Star,
  CheckCircle,
  Zap,
  Lock,
  BarChart3,
  Globe,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [matric, setMatric] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCastVote = async () => {
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
        setError(data.error || "Not found");
        setLoading(false);
        return;
      }
      const voter = data.voter;
      if (voter.hasVoted) {
        router.push("/vote/results");
      } else if (voter.isVerified) {
        localStorage.setItem("voter", JSON.stringify(voter));
        router.push("/vote/ballot");
      } else {
        localStorage.setItem("pendingVoter", JSON.stringify(voter));
        router.push("/register");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure Verification",
      description: "Document verification ensures only eligible voters participate.",
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Cryptographic Receipts",
      description: "Your vote is hashed and verifiable without revealing your choice.",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Real-Time Results",
      description: "Watch results update live as votes come in.",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Accessible Anywhere",
      description: "Vote from any device, anywhere. Mobile-first design.",
    },
  ];

  const stats = [
    { value: "100%", label: "Transparent" },
    { value: "24/7", label: "Available" },
    { value: "256-bit", label: "Encrypted" },
    { value: "< 1s", label: "Vote Confirm" },
  ];

  return (
    <>
      <div className="mesh-bg" />
      <Particles />
      <div className="relative z-10">
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <Vote className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ULSESA</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => router.push("/vote/results")}
                className="text-sm text-[#7a7a8e] hover:text-white transition-colors"
              >
                Results
              </button>
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm transition-all"
              >
                Login
              </button>
              <button
                onClick={() => router.push("/register")}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-all"
              >
                Join Now
              </button>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#7a7a8e] hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden mt-4 pb-4 border-t border-white/[0.05] pt-4 space-y-3"
            >
              <button
                onClick={() => { router.push("/vote/results"); setMobileMenuOpen(false); }}
                className="block w-full text-left text-sm text-[#7a7a8e] hover:text-white transition-colors py-2"
              >
                Results
              </button>
              <button
                onClick={() => { router.push("/login"); setMobileMenuOpen(false); }}
                className="block w-full text-left text-sm text-[#7a7a8e] hover:text-white transition-colors py-2"
              >
                Login
              </button>
              <button
                onClick={() => { router.push("/register"); setMobileMenuOpen(false); }}
                className="block w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white text-sm font-medium text-center"
              >
                Join Now
              </button>
            </motion.div>
          )}
        </nav>

        <section className="min-h-screen flex items-center justify-center px-6 pt-20">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full mb-8 border border-white/10">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-[#7a7a8e]">University of Lagos</span>
              </div>

              <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                Your Vote,<br />
                <span className="gradient-text">Your Future</span>
              </h1>

              <p className="text-xl text-[#7a7a8e] max-w-2xl mx-auto mb-12">
                The Science Education Students&apos; Association elections, powered by cutting-edge technology for absolute transparency.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <div className="relative w-full max-w-sm">
                  <input
                    type="text"
                    value={matric}
                    onChange={(e) => { setMatric(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleCastVote()}
                    placeholder="Enter your matric number"
                    className="w-full px-6 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all text-center font-mono"
                  />
                </div>
                <motion.button
                  onClick={handleCastVote}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl font-bold text-base transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {loading ? "Checking..." : "Cast Vote"}
                </motion.button>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-sm mb-8"
                >
                  {error}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center justify-center gap-8 md:gap-16"
              >
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-xs text-[#7a7a8e] uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8"
            >
              <ChevronDown className="w-6 h-6 text-[#3a3a4e] mx-auto animate-bounce" />
            </motion.div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Why ULSESA Voting?</h2>
              <p className="text-[#7a7a8e] max-w-xl mx-auto">
                Built with security and transparency at its core. Your voice matters, and so does the integrity of every vote.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass p-6 hover:bg-white/[0.03] transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 text-indigo-400 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-[#7a7a8e] text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full mb-6">
                  <Star className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400 text-xs font-medium">Department Association</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-6">About ULSESA</h2>
                <p className="text-[#7a7a8e] mb-8">
                  The University of Lagos Science Education Students&apos; Association is dedicated to representing and uplifting every member of the department.
                </p>

                <div className="space-y-4">
                  {[
                    { icon: <Users className="w-4 h-4" />, color: "emerald", text: "Transparent leadership elections" },
                    { icon: <Shield className="w-4 h-4" />, color: "indigo", text: "Secure, verifiable voting system" },
                    { icon: <BarChart3 className="w-4 h-4" />, color: "purple", text: "Real-time result updates" },
                    { icon: <Calendar className="w-4 h-4" />, color: "amber", text: "Regular departmental events" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-${item.color}-500/20 flex items-center justify-center`}>
                        <span className={`text-${item.color}-400`}>{item.icon}</span>
                      </div>
                      <span className="text-white">{item.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="glass p-8 rounded-3xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">How It Works</h3>
                      <p className="text-emerald-400 text-sm">Simple & Secure</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      "Admin uploads eligible student list",
                      "Students claim account with student ID",
                      "Document verified by admin team",
                      "Login and cast your vote securely",
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-xs font-bold text-indigo-400">
                          {i + 1}
                        </div>
                        <span className="text-white text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Calendar className="w-12 h-12 text-indigo-400 mx-auto mb-6" />
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Vote?</h2>
              <p className="text-[#7a7a8e] mb-12">
                Enter your matric number above or register to get started.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Positions", value: "5+" },
                  { label: "Secure", value: "256-bit" },
                  { label: "Transparent", value: "100%" },
                  { label: "Real-Time", value: "Live" },
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-white/[0.03] rounded-xl">
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-[#7a7a8e]">{stat.label}</div>
                  </div>
                ))}
              </div>

              <motion.button
                onClick={() => router.push("/register")}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                Register to Vote
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>
        </section>

        <footer className="py-12 px-6 border-t border-white/[0.05]">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <Vote className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">ULSESA</span>
              </div>

              <div className="flex items-center gap-6">
                <button onClick={() => router.push("/login")} className="text-sm text-[#7a7a8e] hover:text-white transition-colors">Login</button>
                <button onClick={() => router.push("/register")} className="text-sm text-[#7a7a8e] hover:text-white transition-colors">Register</button>
                <button onClick={() => router.push("/vote/results")} className="text-sm text-[#7a7a8e] hover:text-white transition-colors">Results</button>
                <button onClick={() => router.push("/admin")} className="text-sm text-[#3a3a4e] hover:text-[#7a7a8e] transition-colors">Admin</button>
              </div>

              <p className="text-sm text-[#3a3a4e]">
                &copy; 2026 ULSESA. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
