"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Particles } from "@/components/ui";
import {
  Vote,
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Phone,
  BookOpen,
  Lock,
  Upload,
  X,
  CheckCircle,
  Loader2,
  FileText,
  Image,
} from "lucide-react";

const DEPARTMENTS = [
  "Science Education",
  "Physics Education",
  "Chemistry Education",
  "Biology Education",
  "Mathematics Education",
  "Computer Science Education",
];

interface RegistrationData {
  name: string;
  matric: string;
  email: string;
  phone: string;
  department: string;
  password: string;
  document: File | null;
}

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"matric" | "form" | "success">("matric");
  const [matric, setMatric] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<RegistrationData>({
    name: "",
    matric: "",
    email: "",
    phone: "",
    department: "",
    password: "",
    document: null,
  });

  const handleVerifyMatric = async () => {
    if (!matric.trim()) {
      setError("Please enter your matric number");
      return;
    }
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-matric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matric: matric.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Matric number not found");
        setChecking(false);
        return;
      }
      if (data.voter?.isVerified) {
        setError("This matric number is already registered");
        setChecking(false);
        return;
      }
      setForm((prev) => ({ ...prev, matric: matric.trim() }));
      setStep("form");
    } catch {
      setError("Network error. Please try again.");
    }
    setChecking(false);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.match(/image\/.*/) && file.type !== "application/pdf") {
      setError("Please upload an image or PDF file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }
    setForm((prev) => ({ ...prev, document: file }));
    setError("");
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setDocumentPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setDocumentPreview("pdf");
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("matric", form.matric);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("department", form.department);
      formData.append("password", form.password);
      if (form.document) {
        formData.append("document", form.document);
      }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        setSubmitting(false);
        return;
      }
      setStep("success");
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  const updateForm = (field: keyof RegistrationData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  return (
    <>
      <div className="mesh-bg" />
      <Particles />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-[#7a7a8e] hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </button>

          <div className="glass p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <Vote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Register</h1>
                <p className="text-[#7a7a8e] text-sm">Create your voting account</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-8">
              <div className={`step-dot ${step === "matric" ? "active" : "completed"}`} />
              <div className="flex-1 h-px bg-white/10" />
              <div className={`step-dot ${step === "form" ? "active" : step === "success" ? "completed" : ""}`} />
              <div className="flex-1 h-px bg-white/10" />
              <div className={`step-dot ${step === "success" ? "active" : ""}`} />
            </div>

            <AnimatePresence mode="wait">
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

            {step === "matric" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <label className="block text-sm text-[#7a7a8e] mb-2">
                  Enter your matric number to get started
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a3a4e]" />
                  <input
                    type="text"
                    value={matric}
                    onChange={(e) => { setMatric(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyMatric()}
                    placeholder="e.g. 20/25/0001"
                    className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                  />
                </div>

                <motion.button
                  onClick={handleVerifyMatric}
                  disabled={checking}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {checking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Check Matric
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            {step === "form" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm text-[#7a7a8e] mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a3a4e]" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#7a7a8e] mb-2">Matric Number</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a3a4e]" />
                    <input
                      type="text"
                      value={form.matric}
                      disabled
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-white/50 font-mono cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#7a7a8e] mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a3a4e]" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      placeholder="you@unilag.edu.ng"
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#7a7a8e] mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a3a4e]" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                      placeholder="+234 xxx xxx xxxx"
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#7a7a8e] mb-2">Department</label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a3a4e]" />
                    <select
                      value={form.department}
                      onChange={(e) => updateForm("department", e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-[#0a0a1a]">Select department</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d} className="bg-[#0a0a1a]">{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#7a7a8e] mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3a3a4e]" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      placeholder="Create a password"
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-[#3a3a4e] focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#7a7a8e] mb-2">
                    Student ID / Biodata Document
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      dragActive
                        ? "border-indigo-500/50 bg-indigo-500/5"
                        : documentPreview
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                      className="hidden"
                    />
                    {documentPreview ? (
                      <div className="space-y-3">
                        {documentPreview === "pdf" ? (
                          <FileText className="w-10 h-10 text-indigo-400 mx-auto" />
                        ) : (
                          <img
                            src={documentPreview}
                            alt="Document preview"
                            className="w-20 h-20 object-cover rounded-lg mx-auto"
                          />
                        )}
                        <p className="text-sm text-green-400">{form.document?.name}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocumentPreview(null);
                            setForm((prev) => ({ ...prev, document: null }));
                          }}
                          className="text-sm text-[#7a7a8e] hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="w-10 h-10 text-[#3a3a4e] mx-auto" />
                        <div>
                          <p className="text-sm text-white">Drop your document here</p>
                          <p className="text-xs text-[#3a3a4e] mt-1">
                            Image or PDF, max 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep("matric")}
                    className="px-6 py-3 bg-white/[0.06] text-white rounded-xl hover:bg-white/[0.1] transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <motion.button
                    onClick={handleSubmit}
                    disabled={submitting}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Submit Registration"
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-3">
                  Registration Submitted!
                </h2>
                <p className="text-[#7a7a8e] mb-8 max-w-sm mx-auto">
                  Check your email for next steps. Your account will be activated once your documents are verified.
                </p>
                <motion.button
                  onClick={() => router.push("/")}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold"
                >
                  Back to Home
                </motion.button>
              </motion.div>
            )}

            {step !== "success" && (
              <div className="mt-6 text-center">
                <p className="text-sm text-[#7a7a8e]">
                  Already have an account?{" "}
                  <button
                    onClick={() => router.push("/login")}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
