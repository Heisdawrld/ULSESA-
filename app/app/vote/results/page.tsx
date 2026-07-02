"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Particles } from "@/components/ui";
import {
  Vote,
  ArrowLeft,
  RefreshCw,
  Users,
  BarChart3,
  Clock,
  Trophy,
} from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  votes: number;
  percentage: number;
}

interface Position {
  id: string;
  title: string;
  candidates: Candidate[];
}

interface ElectionResults {
  title: string;
  totalVoters: number;
  votesCast: number;
  positions: Position[];
  lastUpdated: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(10);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch("/api/vote/results");
      const data = await res.json();
      if (res.ok) {
        setResults(data);
        setError("");
      } else {
        setError(data.error || "Failed to load results");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchResults();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchResults]);

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
              <span className="text-lg font-bold text-white">Results</span>
            </div>
            <div className="flex items-center gap-2 text-[#7a7a8e] text-sm">
              <Clock className="w-4 h-4" />
              <span>Refresh in {countdown}s</span>
            </div>
          </div>
        </nav>

        <div className="pt-24 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass p-6">
                    <div className="skeleton h-6 w-48 mb-4" />
                    <div className="space-y-3">
                      {[1, 2].map((j) => (
                        <div key={j} className="skeleton h-16 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass p-8 text-center"
              >
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={() => { setLoading(true); fetchResults(); }}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm transition-all"
                >
                  Retry
                </button>
              </motion.div>
            ) : results ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="glass p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-white">{results.title}</h1>
                    <button
                      onClick={() => { fetchResults(); setCountdown(10); }}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                    >
                      <RefreshCw className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-white/[0.03] rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs text-[#7a7a8e]">Total Voters</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{results.totalVoters}</p>
                    </div>
                    <div className="p-4 bg-white/[0.03] rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-[#7a7a8e]">Votes Cast</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{results.votesCast}</p>
                    </div>
                    <div className="p-4 bg-white/[0.03] rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-[#7a7a8e]">Positions</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{results.positions.length}</p>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {results.positions.map((position, posIdx) => (
                    <motion.div
                      key={position.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: posIdx * 0.1 }}
                      className="glass p-6 mb-4"
                    >
                      <h2 className="text-lg font-semibold text-white mb-4">
                        {position.title}
                      </h2>
                      <div className="space-y-3">
                        {position.candidates
                          .sort((a, b) => b.votes - a.votes)
                          .map((candidate, candIdx) => (
                            <div
                              key={candidate.id}
                              className="relative p-4 bg-white/[0.03] rounded-xl overflow-hidden"
                            >
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${candidate.percentage}%` }}
                                transition={{
                                  duration: 1,
                                  delay: posIdx * 0.1 + candIdx * 0.05,
                                  ease: "easeOut",
                                }}
                                className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10"
                              />
                              <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {candIdx === 0 && position.candidates.length > 0 && (
                                    <Trophy className="w-5 h-5 text-amber-400" />
                                  )}
                                  <span className="text-white font-medium">
                                    {candidate.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-[#7a7a8e]">
                                    {candidate.votes} votes
                                  </span>
                                  <span className="text-sm font-semibold text-indigo-400">
                                    {candidate.percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <p className="text-center text-xs text-[#3a3a4e] mt-6">
                  Last updated: {new Date(results.lastUpdated).toLocaleTimeString()}
                </p>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
