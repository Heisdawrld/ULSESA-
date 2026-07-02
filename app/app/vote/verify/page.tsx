"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Particles } from "@/components/ui";
import {
  Vote,
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Hash,
  Shield,
  Loader2,
  Copy,
  FileText,
} from "lucide-react";

interface VerifyResult {
  valid: boolean;
  vote?: {
    position: string;
    candidate: string;
    timestamp: string;
    receiptToken: string;
    hashVerified: boolean;
  };
  error?: string;
}

export default function VerifyPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleVerify = async () => {
    if (!token.trim()) {
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/vote/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, error: "Network error" });
    }
    setLoading(false);
  };

  const copyToken = () => {
    if (result?.vote?.receiptToken) {
      navigator.clipboard.writeText(result.vote.receiptToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="mesh-bg" />
      <Particles />
      <div className="relative z-10 min-h-screen">
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-[#7a7a8e] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Home</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <Vote className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Verify Vote</span>
            </div>
            <div className="w-16" />
          </div>
        </nav>

        <div className="pt-24 pb-12 px-6">
          <div className="max-w-lg mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Verify Your Vote</h1>
                <p className="text-[#7a7a8e] text-sm">
                  Enter your receipt token to verify your vote was recorded correctly.
                </p>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a3a4e]" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => { setToken(e.target.value); setResult(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  placeholder="Enter receipt token"
                  className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-sm"
                />
              </div>

              <motion.button
                onClick={handleVerify}
                disabled={loading || !token.trim()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Verify Vote
                  </>
                )}
              </motion.button>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  {result.valid ? (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                        <div>
                          <p className="text-green-400 font-semibold">Vote Verified</p>
                          <p className="text-xs text-green-400/70">Your vote has been cryptographically verified</p>
                        </div>
                      </div>

                      {result.vote && (
                        <div className="space-y-3 mt-4">
                          <div className="p-3 bg-white/[0.03] rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-[#7a7a8e]" />
                              <span className="text-xs text-[#7a7a8e]">Position</span>
                            </div>
                            <p className="text-white text-sm">{result.vote.position}</p>
                          </div>

                          <div className="p-3 bg-white/[0.03] rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Vote className="w-4 h-4 text-[#7a7a8e]" />
                              <span className="text-xs text-[#7a7a8e]">Candidate</span>
                            </div>
                            <p className="text-white text-sm">{result.vote.candidate}</p>
                          </div>

                          <div className="p-3 bg-white/[0.03] rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-4 h-4 text-[#7a7a8e]" />
                              <span className="text-xs text-[#7a7a8e]">Timestamp</span>
                            </div>
                            <p className="text-white text-sm">
                              {new Date(result.vote.timestamp).toLocaleString()}
                            </p>
                          </div>

                          <div className="p-3 bg-white/[0.03] rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-[#7a7a8e]" />
                                <span className="text-xs text-[#7a7a8e]">Receipt Token</span>
                              </div>
                              <button
                                onClick={copyToken}
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                {copied ? "Copied!" : "Copy"}
                              </button>
                            </div>
                            <p className="text-white text-xs font-mono break-all">
                              {result.vote.receiptToken}
                            </p>
                          </div>

                          <div className="p-3 bg-white/[0.03] rounded-lg">
                            <div className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-[#7a7a8e]" />
                              <span className="text-xs text-[#7a7a8e]">Hash Status</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {result.vote.hashVerified ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                  <span className="text-sm text-green-400">Integrity verified</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 text-red-400" />
                                  <span className="text-sm text-red-400">Hash mismatch</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-6 h-6 text-red-400" />
                        <div>
                          <p className="text-red-400 font-semibold">Invalid Receipt</p>
                          <p className="text-xs text-red-400/70">
                            {result.error || "No vote found with this receipt token"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
