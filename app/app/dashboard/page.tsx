"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User, Vote, Calendar, Bell, LogOut, CheckCircle,
  Clock, Shield, CreditCard, BarChart3,
} from "lucide-react";
import { Particles } from "@/components/ui";

interface UserData {
  id: string;
  name: string;
  email: string;
  matric: string;
  verificationStatus: string;
  membershipNumber?: string;
  department?: string;
  hasVoted: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) { router.push("/login"); return; }

    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/members/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("userToken");
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.success && data.user) {
          setUser({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            matric: data.user.matric,
            verificationStatus: data.user.verification_status || "pending",
            membershipNumber: data.user.membership_number,
            department: "Science Education",
            hasVoted: data.user.has_voted || false,
          });
        }
      } catch {
        const stored = localStorage.getItem("voter");
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser({
            id: parsed.id || "",
            name: parsed.name || "User",
            email: parsed.email || "",
            matric: parsed.matric || "",
            verificationStatus: parsed.isVerified ? "verified" : "pending",
            department: "Science Education",
            hasVoted: parsed.hasVoted || false,
          });
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("voter");
    router.push("/");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
      case "ai_verified":
      case "manual_approved":
      case "pre_registered":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">
            <CheckCircle className="w-3 h-3" />
            {status === "pre_registered" ? "Pre-Registered" : "Verified"}
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            Pending Verification
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full">
            <Shield className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-bg" />
        <div className="relative z-10 w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <div className="mesh-bg" />
      <Particles />
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#050510]/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <Vote className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">ULSESA</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-[#7a7a8e] hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button onClick={handleLogout} className="p-2 text-[#7a7a8e] hover:text-red-400 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">Welcome back, {user.name.split(" ")[0]}!</h1>
                  <p className="text-[#7a7a8e]">Your ULSESA membership dashboard</p>
                </div>
                {getStatusBadge(user.verificationStatus)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Matric", value: user.matric || "N/A", icon: User },
                  { label: "Department", value: user.department || "SED", icon: Shield },
                  { label: "Member ID", value: user.membershipNumber?.slice(0, 12) || "Pending", icon: CreditCard },
                  { label: "Vote Status", value: user.hasVoted ? "Completed" : "Not Voted", icon: CheckCircle },
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-white/[0.03] rounded-xl">
                    <stat.icon className="w-5 h-5 text-indigo-400 mb-2" />
                    <p className="text-[#7a7a8e] text-xs mb-1">{stat.label}</p>
                    <p className="text-white font-medium text-sm truncate">{stat.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6">
              <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Vote", icon: Vote, path: "/vote/ballot", color: "from-indigo-500 to-purple-500" },
                  { label: "Results", icon: BarChart3, path: "/vote/results", color: "from-purple-500 to-pink-500" },
                  { label: "Events", icon: Calendar, path: "/events", color: "from-pink-500 to-rose-500" },
                  { label: "About", icon: Shield, path: "/about", color: "from-slate-500 to-slate-600" },
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => router.push(action.path)}
                    className={`p-4 bg-gradient-to-br ${action.color} rounded-xl text-white font-medium flex items-center gap-3 hover:opacity-90 transition-all`}
                  >
                    <action.icon className="w-5 h-5" />
                    {action.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6">
              <h3 className="text-white font-semibold mb-4">Membership Card</h3>
              <div className="relative w-full aspect-[1.6/1] rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-[2px]">
                <div className="absolute inset-0 bg-slate-900 rounded-[14px]" />
                <div className="relative h-full p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[8px] text-indigo-400 tracking-widest uppercase font-bold">Member</p>
                      <p className="text-white font-bold text-sm leading-tight">{user.name}</p>
                      <p className="text-indigo-300 text-[10px]">{user.department}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-white text-lg font-bold">{user.name[0]}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] text-indigo-400/60 uppercase tracking-wider">Matric</p>
                    <p className="text-white/90 font-mono text-xs">{user.matric || "N/A"}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
