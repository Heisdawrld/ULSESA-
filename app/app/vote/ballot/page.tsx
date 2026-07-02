"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Particles } from "@/components/ui";

interface Candidate { id: string; name: string; position_id: string; }
interface Position { id: string; title: string; }
interface Election { id: string; title: string; status: string; }

export default function BallotPage() {
  const [token, setToken] = useState<string | null>(null);
  const [voter, setVoter] = useState<{ name: string; matric: string; isVerified: boolean } | null>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("userToken");
    const storedVoter = localStorage.getItem("voter");

    if (!storedToken && !storedVoter) {
      router.push("/");
      return;
    }

    if (storedVoter) {
      const v = JSON.parse(storedVoter);
      setVoter(v);
      if (!v.isVerified) { router.push("/"); return; }
      if (v.hasVoted) { router.push("/vote/results"); return; }
    }

    if (storedToken) {
      setToken(storedToken);
    }

    loadBallot();
  }, [router]);

  const loadBallot = async () => {
    try {
      const res = await fetch("/api/vote/results");
      const data = await res.json();
      if (data.success && data.election) {
        setElection(data.election);
        if (data.election.status !== "active") {
          setError("No active election");
          setLoading(false);
          return;
        }
        const pos = data.positions.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title }));
        setPositions(pos);
        const allCands: Candidate[] = [];
        for (const p of data.positions) {
          for (const c of p.candidates) {
            allCands.push({ id: c.id, name: c.name, position_id: p.id });
          }
        }
        setCandidates(allCands);
      } else {
        setError("No active election");
      }
    } catch {
      setError("Failed to load ballot");
    }
    setLoading(false);
  };

  const handleSelect = (candidateId: string) => {
    if (!positions[currentStep]) return;
    const posId = positions[currentStep].id;
    setSelections((prev) => ({ ...prev, [posId]: prev[posId] === candidateId ? "" : candidateId }));
  };

  const goNext = () => {
    if (currentStep < positions.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setCurrentStep(positions.length);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const submitVote = async () => {
    const authToken = token || localStorage.getItem("userToken");
    if (!authToken) {
      setError("Please login to submit your vote");
      router.push("/login");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const votes = Object.entries(selections)
        .filter(([, c]) => c)
        .map(([positionId, candidateId]) => ({ positionId, candidateId }));

      const res = await fetch("/api/vote/cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ electionId: election?.id, votes }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("userToken");
          setError("Session expired. Please login again.");
          router.push("/login");
          return;
        }
        setError(data.error);
        setSubmitting(false);
        return;
      }

      setShowSuccess(true);
      localStorage.removeItem("voter");
      setTimeout(() => {
        router.push("/vote/results");
      }, 2500);
    } catch {
      setError("Failed to submit vote");
      setSubmitting(false);
    }
  };

  const totalSelections = Object.values(selections).filter(Boolean).length;
  const currentPosition = positions[currentStep];
  const positionCandidates = currentPosition ? candidates.filter((c) => c.position_id === currentPosition.id) : [];
  const isReview = currentStep === positions.length && positions.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-bg" />
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#7a7a8e] text-sm">Loading ballot...</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-bg" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6">
            <svg viewBox="0 0 80 80" className="w-full h-full">
              <motion.circle
                cx="40" cy="40" r="36"
                fill="none" stroke="#10b981" strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <motion.path
                d="M24 40 L35 51 L56 30"
                fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
              />
            </svg>
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-2xl font-bold text-white mt-6 mb-2"
          >
            Vote Submitted!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-[#7a7a8e]"
          >
            Redirecting to results...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="mesh-bg" />
      <Particles />

      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#050510]/80 border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white text-sm">ULSESA Ballot</h1>
            <p className="text-[#7a7a8e] text-[11px]">{voter?.name || "Voter"}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-sm font-bold text-white">{totalSelections}</span>
              <span className="text-[#3a3a4e]">/{positions.length}</span>
            </div>
            <div className="flex gap-1">
              {positions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < currentStep ? "bg-emerald-500" : i === currentStep ? "bg-indigo-500 scale-125" : selections[positions[i]?.id] ? "bg-indigo-500/50" : "bg-white/10"
                  }`}
                />
              ))}
              <div className={`w-2 h-2 rounded-full transition-all ${isReview ? "bg-indigo-500 scale-125" : "bg-white/10"}`} />
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-white/[0.03]">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            animate={{ width: `${((currentStep + 1) / (positions.length + 1)) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {!election && !error && (
          <div className="text-center py-20">
            <p className="text-[#7a7a8e] text-lg font-medium">No Active Election</p>
            <button onClick={() => router.push("/")} className="mt-4 text-indigo-400 text-sm font-medium">Go Back</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!isReview && currentPosition && (
            <motion.div
              key={`pos-${currentStep}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                  {currentStep + 1}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{currentPosition.title}</h2>
                  <p className="text-[#7a7a8e] text-xs">Select one candidate</p>
                </div>
              </div>

              <div className="space-y-3">
                {positionCandidates.map((candidate, idx) => {
                  const isSelected = selections[currentPosition.id] === candidate.id;
                  return (
                    <motion.button
                      key={candidate.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.4 }}
                      onClick={() => handleSelect(candidate.id)}
                      className={`vote-card w-full p-5 rounded-2xl text-left border ${
                        isSelected
                          ? "selected border-emerald-500/30"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                          isSelected ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-white/[0.06] text-[#7a7a8e]"
                        }`}>
                          {isSelected ? (
                            <motion.svg
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </motion.svg>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold text-base ${isSelected ? "text-emerald-400" : "text-white"}`}>
                            {candidate.name}
                          </p>
                        </div>
                        {isSelected && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="px-3 py-1 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20"
                          >
                            Selected
                          </motion.span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {isReview && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Review Your Votes</h2>
                <p className="text-[#7a7a8e] text-sm">Confirm before submitting</p>
              </div>

              <div className="space-y-3">
                {positions.map((pos, idx) => {
                  const cid = selections[pos.id];
                  const cand = cid ? candidates.find((c) => c.id === cid) : null;
                  return (
                    <motion.div
                      key={pos.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="glass p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-xs font-bold text-[#7a7a8e]">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-[#7a7a8e] text-xs uppercase tracking-wider">{pos.title}</p>
                          <p className={`font-semibold text-sm ${cand ? "text-white" : "text-[#3a3a4e]"}`}>
                            {cand ? cand.name : "No selection"}
                          </p>
                        </div>
                      </div>
                      {cand && (
                        <button
                          onClick={() => setCurrentStep(idx)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Change
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {positions.length > 0 && (
          <div className="flex gap-3 mt-8">
            {currentStep > 0 && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={goPrev}
                className="flex-1 py-4 rounded-2xl border border-white/[0.08] text-[#7a7a8e] font-semibold hover:bg-white/[0.03] transition-all"
              >
                Back
              </motion.button>
            )}

            {isReview ? (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={submitVote}
                disabled={submitting}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold disabled:opacity-30 transition-all shadow-lg shadow-emerald-500/20"
              >
                {submitting ? "Submitting..." : "Submit Vote"}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={goNext}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                {currentStep === positions.length - 1 ? "Review" : "Next"}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
