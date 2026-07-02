"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Particles } from "@/components/ui";
import {
  Shield,
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface Election {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function AdminElectionsPage() {
  const router = useRouter();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin");
      return;
    }
    fetchElections();
  }, [router]);

  const fetchElections = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/elections", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setElections(data.elections || []);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title || !form.startDate || !form.endDate) {
      setError("Please fill in all required fields");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/elections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create election");
        setSaving(false);
        return;
      }
      setSuccess("Election created successfully");
      setShowForm(false);
      setForm({ title: "", description: "", startDate: "", endDate: "" });
      fetchElections();
    } catch {
      setError("Network error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this election?")) return;
    try {
      const token = localStorage.getItem("adminToken");
      await fetch(`/api/admin/elections/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchElections();
    } catch {
      // silently fail
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
              <span className="text-lg font-bold text-white">Elections</span>
            </div>
            <div className="w-24" />
          </div>
        </nav>

        <div className="pt-24 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">Elections</h1>
                <p className="text-[#7a7a8e]">Manage election periods</p>
              </div>
              <motion.button
                onClick={() => setShowForm(!showForm)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Election
              </motion.button>
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
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-6 mb-6"
              >
                <h2 className="text-lg font-semibold text-white mb-4">Create Election</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#7a7a8e] mb-2">Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. 2026 ULSESA Election"
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#7a7a8e] mb-2">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#7a7a8e] mb-2">Start Date</label>
                      <input
                        type="datetime-local"
                        value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#7a7a8e] mb-2">End Date</label>
                      <input
                        type="datetime-local"
                        value={form.endDate}
                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-6 py-3 bg-white/[0.06] text-white rounded-xl hover:bg-white/[0.1] transition-all"
                    >
                      Cancel
                    </button>
                    <motion.button
                      onClick={handleCreate}
                      disabled={saving}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Election"}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="glass p-6">
                    <div className="skeleton h-6 w-48 mb-3" />
                    <div className="skeleton h-4 w-full mb-2" />
                    <div className="skeleton h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : elections.length === 0 ? (
              <div className="glass p-12 text-center">
                <Calendar className="w-12 h-12 text-[#3a3a4e] mx-auto mb-4" />
                <p className="text-[#7a7a8e]">No elections created yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {elections.map((election, i) => (
                  <motion.div
                    key={election.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{election.title}</h3>
                          {election.isActive ? (
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-lg flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-white/[0.06] text-[#7a7a8e] text-xs rounded-lg flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Ended
                            </span>
                          )}
                        </div>
                        {election.description && (
                          <p className="text-[#7a7a8e] text-sm mb-3">{election.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-[#3a3a4e]">
                          <span>Start: {new Date(election.startDate).toLocaleDateString()}</span>
                          <span>End: {new Date(election.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(election.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
