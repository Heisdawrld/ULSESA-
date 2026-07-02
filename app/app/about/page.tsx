"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="mesh-bg" />
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#050510]/80 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <span className="text-white font-bold">ULSESA</span>
          </Link>
          <Link href="/" className="text-sm text-[#7a7a8e] hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">About ULSESA</h1>
          <div className="h-1 w-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" />
        </motion.div>

        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-8 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-[#7a7a8e] leading-relaxed">
              The University of Lagos Staff School Employees Association (ULSESA) is dedicated to fostering unity,
              professionalism, and excellence among staff members. We advocate for fair workplace policies,
              organize professional development events, and ensure transparent governance through democratic elections.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-8 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Leadership</h2>
            <p className="text-[#7a7a8e] leading-relaxed mb-4">
              Our executive team works tirelessly to represent the interests of all staff members.
              Elections are held annually to ensure democratic leadership and accountability.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { role: "President", name: "TBD" },
                { role: "Vice President", name: "TBD" },
                { role: "General Secretary", name: "TBD" },
                { role: "Treasurer", name: "TBD" },
              ].map((pos) => (
                <div key={pos.role} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-[#3a3a4e] text-xs uppercase tracking-wider">{pos.role}</p>
                  <p className="text-white font-semibold mt-1">{pos.name}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass p-8 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Contact</h2>
            <p className="text-[#7a7a8e]">University of Lagos, Akoka, Yaba, Lagos, Nigeria</p>
            <p className="text-[#7a7a8e] mt-2">Email: ulsesa@unilag.edu.ng</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
