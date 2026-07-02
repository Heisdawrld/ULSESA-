"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function EventsPage() {
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
          <h1 className="text-4xl font-bold text-white mb-4">Events</h1>
          <div className="h-1 w-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" />
        </motion.div>

        <div className="space-y-6">
          {[
            {
              title: "2026 General Elections",
              date: "July 9, 2026",
              description: "Annual ULSESA executive elections. Cast your vote for the next leadership team.",
              status: "upcoming",
            },
            {
              title: "Annual General Meeting",
              date: "TBD",
              description: "Year-end review and planning session for all staff members.",
              status: "upcoming",
            },
            {
              title: "Professional Development Workshop",
              date: "TBD",
              description: "Training session on modern educational practices and technology integration.",
              status: "upcoming",
            },
          ].map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1) }}
              className="glass p-6 rounded-2xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{event.title}</h3>
                  <p className="text-[#7a7a8e] text-sm">{event.date}</p>
                </div>
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs rounded-full border border-indigo-500/20">
                  {event.status}
                </span>
              </div>
              <p className="text-[#7a7a8e] mt-3 text-sm">{event.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
