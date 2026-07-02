"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Particles } from "@/components/ui";
import {
  Shield,
  ArrowLeft,
  UserPlus,
  Trash2,
  Loader2,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  matric: string;
  position: string;
}

interface Position {
  title: string;
  candidates: Candidate[];
}

export default function AdminCandidatesPage() {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [newCandidate, setNewCandidate] = useState({ name: "", matric: "", position: "" });
  const [positionOptions, setPositionOptions] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin");
      return;
    }
    fetchCandidates();
    fetchPositions();
  }, [router]);

  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/candidates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const fetchPositions = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/positions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPositionOptions(data.positions || []);
      }
    } catch {
      // silently fail
    }
  };

  const handleAdd = async (position: string) => {
    if (!newCandidate.name || !newCandidate.matric) {
      setError("Please fill in all fields");
      return;
    }
    setAdding(true);
    setError("");
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newCandidate, position }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add candidate");
        setAdding(false);
        return;
      }
      setNewCandidate({ name: "", matric: "", position: "" });
      setShowAdd(null);
      fetchCandidates();
    } catch {
      setError("Network error");
    }
    setAdding(false);
  };

  const handleRemove = async (candidateId: string) => {
    if (!confirm("Remove this candidate?")) return;
    try {
      const token = localStorage.getItem("adminToken");
      await fetch(`/api/admin/candidates/${candidateId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCandidates();
    } catch {
      // silently fail
    }
  };

  const togglePosition = (title: string) => {
    setExpandedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <>
      <div className="mesh-bg" />
      <Particles />
      <div className="relative z-10 min-h-screen">
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="flex items-center gap-2 text-[#7a7a8e] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Dashboard</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Candidates</span>
            </div>
            <div className="w-24" />
          </div>
        </nav>

        <div className="pt-24 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">Candidates</h1>
              <p className="text-[#7a7a8e]">Manage candidates by position</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass p-6">
                    <div className="skeleton h-6 w-48 mb-3" />
                    <div className="skeleton h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : positions.length === 0 ? (
              <div className="glass p-12 text-center">
                <Users className="w-12 h-12 text-[#3a3a4e] mx-auto mb-4" />
                <p className="text-[#7a7a8e]">No positions configured yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {positions.map((position, i) => {
                  const isExpanded = expandedPositions.has(position.title);
                  return (
                    <motion.div
                      key={position.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass overflow-hidden"
                    >
                      <button
                        onClick={() => togglePosition(position.title)}
                        className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{position.title}</h3>
                          <span className="px-2 py-1 bg-white/[0.06] text-[#7a7a8e] text-xs rounded-lg">
                            {position.candidates.length} candidates
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-[#7a7a8e]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#7a7a8e]" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/[0.05]"
                          >
                            <div className="p-6 space-y-3">
                              {position.candidates.map((candidate) => (
                                <div
                                  key={candidate.id}
                                  className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl"
                                >
                                  <div>
                                    <p className="text-white font-medium">{candidate.name}</p>
                                    <p className="text-xs text-[#7a7a8e] font-mono">{candidate.matric}</p>
                                  </div>
                                  <button
                                    onClick={() => handleRemove(candidate.id)}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}

                              {showAdd === position.title ? (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="p-4 bg-white/[0.03] rounded-xl space-y-3"
                                >
                                  <input
                                    type="text"
                                    value={newCandidate.name}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                                    placeholder="Candidate name"
                                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                                  />
                                  <input
                                    type="text"
                                    value={newCandidate.matric}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, matric: e.target.value })}
                                    placeholder="Matric number"
                                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all text-sm font-mono"
                                  />
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => setShowAdd(null)}
                                      className="px-4 py-2 bg-white/[0.06] text-white rounded-xl text-sm hover:bg-white/[0.1] transition-all"
                                    >
                                      Cancel
                                    </button>
                                    <motion.button
                                      onClick={() => handleAdd(position.title)}
                                      disabled={adding}
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.99 }}
                                      className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                                    >
                                      {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                                    </motion.button>
                                  </div>
                                </motion.div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setShowAdd(position.title);
                                    setNewCandidate({ ...newCandidate, position: position.title });
                                  }}
                                  className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-[#7a7a8e] hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Add Candidate
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
