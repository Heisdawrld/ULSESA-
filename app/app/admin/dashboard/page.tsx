"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Particles } from "@/components/ui";
import {
  Shield,
  Users,
  UserCheck,
  Vote,
  Calendar,
  Upload,
  ClipboardList,
  Settings,
  BarChart3,
  LogOut,
  Loader2,
} from "lucide-react";

interface AdminStats {
  totalVoters: number;
  verifiedUsers: number;
  votesCast: number;
  activeElections: number;
}

const quickLinks = [
  { label: "Upload Voters", icon: <Upload className="w-5 h-5" />, href: "/admin/upload", color: "indigo" },
  { label: "Verification Queue", icon: <ClipboardList className="w-5 h-5" />, href: "/admin/verification-queue", color: "amber" },
  { label: "Manage Elections", icon: <Calendar className="w-5 h-5" />, href: "/admin/elections", color: "purple" },
  { label: "Manage Candidates", icon: <Settings className="w-5 h-5" />, href: "/admin/candidates", color: "pink" },
  { label: "Results", icon: <BarChart3 className="w-5 h-5" />, href: "/admin/results", color: "emerald" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin");
      return;
    }
    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    router.push("/admin");
  };

  const statCards = stats
    ? [
        { label: "Total Voters", value: stats.totalVoters, icon: <Users className="w-5 h-5" />, color: "indigo" },
        { label: "Verified Users", value: stats.verifiedUsers, icon: <UserCheck className="w-5 h-5" />, color: "emerald" },
        { label: "Votes Cast", value: stats.votesCast, icon: <Vote className="w-5 h-5" />, color: "purple" },
        { label: "Active Elections", value: stats.activeElections, icon: <Calendar className="w-5 h-5" />, color: "amber" },
      ]
    : [];

  return (
    <>
      <div className="mesh-bg" />
      <Particles />
      <div className="relative z-10 min-h-screen">
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Admin Dashboard</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </nav>

        <div className="pt-24 pb-12 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2">Welcome, Admin</h1>
              <p className="text-[#7a7a8e] mb-8">Manage your election portal</p>
            </motion.div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="glass p-6">
                    <div className="skeleton h-10 w-10 mb-4" />
                    <div className="skeleton h-8 w-20 mb-2" />
                    <div className="skeleton h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass p-6 hover:bg-white/[0.03] transition-all"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-${card.color}-500/20 flex items-center justify-center mb-4 text-${card.color}-400`}>
                      {card.icon}
                    </div>
                    <p className="text-3xl font-bold text-white">{card.value}</p>
                    <p className="text-sm text-[#7a7a8e]">{card.label}</p>
                  </motion.div>
                ))}
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickLinks.map((link, i) => (
                  <motion.button
                    key={i}
                    onClick={() => router.push(link.href)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="glass p-6 flex items-center gap-4 hover:bg-white/[0.03] transition-all text-left group"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-${link.color}-500/20 flex items-center justify-center text-${link.color}-400 group-hover:scale-110 transition-transform`}>
                      {link.icon}
                    </div>
                    <span className="text-white font-medium">{link.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
