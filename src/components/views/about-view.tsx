'use client'

import { motion } from 'framer-motion'
import { toast } from 'sonner'
import Image from 'next/image'
import { useNav } from '@/lib/stores/nav-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { WhatsAppIcon } from '@/components/shared/whatsapp-icon'
import {
  supportWhatsAppUrl,
  SUPPORT_MESSAGES,
  SUPPORT_PHONE_DISPLAY,
} from '@/lib/support'
import {
  Target,
  Eye,
  Award,
  Lightbulb,
  ShieldCheck,
  Users2,
  TrendingUp,
  GraduationCap,
  FlaskConical,
  Mail,
  MapPin,
  ArrowRight,
  Quote,
  Building2,
  Atom,
  Leaf,
  Calculator,
  Beaker,
  Microscope,
  Instagram,
  Twitter,
  Music2,
} from 'lucide-react'

// ===================== Static data =====================

const OVERVIEW_PARAGRAPHS = [
  'The University of Lagos Science Education Students’ Association (ULSESA) is the largest departmental student body in UNILAG’s Faculty of Education. We bring together future science educators across five distinct cohorts — Biology, Chemistry, Mathematics, Physics, and Integrated Science Education.',
  'ULSESA exists to shape tomorrow’s scientific innovators by nurturing teachers, researchers, and education leaders. Beyond the classroom, we host teaching competitions, entrepreneurship programmes, departmental sports, and a vibrant academic community that supports every student’s growth.',
  'This Digital Platform is our latest initiative — a transparent, secure space where ULSESA members vote, learn, connect, and grow, all backed by verified identities and auditable records.',
]

const VALUES = [
  { icon: Award, title: 'Excellence', desc: 'We hold ourselves to the highest academic and professional standards in everything we do.', tint: 'from-primary/15 to-primary/5 text-primary' },
  { icon: Lightbulb, title: 'Innovation', desc: 'We embrace new tools, ideas, and teaching methods to advance science education.', tint: 'from-cyan-accent/20 to-cyan-accent/5 text-cyan-accent dark:text-cyan-accent' },
  { icon: ShieldCheck, title: 'Integrity', desc: 'Honesty, transparency, and accountability guide every decision and action.', tint: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
  { icon: Users2, title: 'Community', desc: 'We foster an inclusive environment where every voice matters and every student thrives.', tint: 'from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400' },
  { icon: TrendingUp, title: 'Transparency', desc: 'Open processes — from elections to results — that students can trust and verify.', tint: 'from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400' },
  { icon: GraduationCap, title: 'Growth', desc: 'We invest in continuous learning for students, faculty, and the wider community.', tint: 'from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400' },
]

const DEPARTMENTS = [
  { icon: Leaf, title: 'Biology Education', code: 'BED', desc: 'Cell biology, genetics, ecology, and evolution — preparing future biology teachers for secondary schools.', tint: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
  { icon: Beaker, title: 'Chemistry Education', code: 'CED', desc: 'Organic, physical, and analytical chemistry with pedagogical training for chemistry educators.', tint: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400' },
  { icon: Calculator, title: 'Mathematics Education', code: 'MED', desc: 'Calculus, algebra, and geometry for future mathematics teachers, with modern teaching methods.', tint: 'from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400' },
  { icon: Atom, title: 'Physics Education', code: 'PED', desc: 'Classical mechanics, quantum physics, and electromagnetism for tomorrow’s physics teachers.', tint: 'from-primary/15 to-primary/5 text-primary' },
  { icon: Microscope, title: 'Integrated Science Education', code: 'IED', desc: 'A multidisciplinary blend of all sciences with teaching strategies for integrated science curricula.', tint: 'from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400' },
]

const SOCIALS = [
  { icon: Instagram, label: 'Instagram', handle: '@ulsesa01', url: 'https://instagram.com/ulsesa01', tint: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15' },
  { icon: Twitter, label: 'X / Twitter', handle: '@ulsesa01', url: 'https://x.com/ulsesa01', tint: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/15' },
  { icon: Music2, label: 'TikTok', handle: '@ulsesa01', url: 'https://tiktok.com/@ulsesa01', tint: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15' },
  { icon: Mail, label: 'Email', handle: 'ulsesa01@gmail.com', url: 'mailto:ulsesa01@gmail.com', tint: 'bg-primary/10 text-primary hover:bg-primary/15' },
]

// ===================== Main view =====================

export function AboutView() {
  const { navigate } = useNav()

  function copyToClipboard(value: string, label: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).then(() => {
        toast.success(`${label} copied`, { description: value })
      }).catch(() => {
        toast.message(`${label}: ${value}`)
      })
    }
  }

  return (
    <div className="animate-fade-in">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[60rem] rounded-full bg-primary/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute top-32 right-12 h-40 w-40 rounded-full bg-cyan-accent/20 blur-3xl pointer-events-none" aria-hidden />

        <div className="container mx-auto px-4 lg:px-6 relative py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex mb-6"
            >
              <div className="relative h-20 w-20 rounded-2xl overflow-hidden ring-2 ring-primary/20 shadow-lg shadow-primary/20 glow-primary">
                <Image
                  src="/ulsesa-logo.jpg"
                  alt="ULSESA Logo"
                  fill
                  className="object-cover"
                  sizes="80px"
                  priority
                />
              </div>
            </motion.div>

            <Badge variant="outline" className="mb-6 rounded-full bg-background/70 backdrop-blur px-4 py-1.5 text-xs font-medium border-primary/20">
              <Building2 className="h-3.5 w-3.5 text-primary mr-1.5" />
              University of Lagos • Faculty of Education
            </Badge>

            <h1 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl md:text-6xl leading-[1.05]">
              About <span className="text-gradient-brand">ULSESA</span>
            </h1>

            <p className="mt-4 text-base md:text-lg font-medium text-foreground/80">
              University of Lagos Science Education Students&apos; Association
            </p>
            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Shaping tomorrow&apos;s scientific innovators — the largest department in UNILAG&apos;s Faculty of Education, uniting 5 Science Education cohorts.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate('academics')}
                className="w-full sm:w-auto rounded-full px-7 h-11 shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all"
              >
                <GraduationCap className="h-4.5 w-4.5" />
                Explore Academics
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('help')}
                className="w-full sm:w-auto rounded-full px-7 h-11 bg-background/60 backdrop-blur hover:bg-accent"
              >
                Get Help
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================== OVERVIEW ===================== */}
      <section className="container mx-auto px-4 lg:px-6 py-12 md:py-16">
        <div className="grid lg:grid-cols-[1fr_320px] gap-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/20 mb-3">
              Our Story
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight mb-5">
              A legacy of scientific education
            </h2>
            <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
              {OVERVIEW_PARAGRAPHS.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </motion.div>

          {/* Quote card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Card className="rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground overflow-hidden sticky top-6">
              <div className="absolute -top-12 -right-8 h-40 w-40 rounded-full bg-cyan-accent/30 blur-3xl pointer-events-none" aria-hidden />
              <CardContent className="relative">
                <Quote className="h-8 w-8 text-cyan-accent mb-3" />
                <p className="text-base font-medium leading-relaxed">
                  &ldquo;Shaping tomorrow&apos;s scientific innovators — one classroom at a time.&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-cyan-accent/40">
                    <Image
                      src="/ulsesa-logo.jpg"
                      alt="ULSESA"
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">ULSESA</div>
                    <div className="text-xs text-primary-foreground/70">Shaping Tomorrow&apos;s Scientific Innovators</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ===================== VISION & MISSION ===================== */}
      <section className="container mx-auto px-4 lg:px-6 pb-12 md:pb-16">
        <div className="grid md:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
          >
            <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardContent className="flex flex-col gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                  <Eye className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <h3 className="font-display font-bold text-xl">Our Vision</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To be Africa&apos;s leading centre for science education — producing graduates who drive scientific, technological, and educational innovation in their classrooms and communities.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardContent className="flex flex-col gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-accent/20 to-cyan-accent/5 text-cyan-accent dark:text-cyan-accent">
                  <Target className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <h3 className="font-display font-bold text-xl">Our Mission</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To deliver world-class science education through rigorous coursework, hands-on teaching practice, and cutting-edge research — while fostering an inclusive, transparent, and supportive community for every ULSESA member.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ===================== CORE VALUES ===================== */}
      <section className="container mx-auto px-4 lg:px-6 pb-12 md:pb-16">
        <div className="text-center mb-8">
          <Badge variant="outline" className="rounded-full bg-cyan-accent/10 text-cyan-accent dark:text-cyan-accent border-cyan-accent/30 mb-3">
            What we stand for
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight">Core Values</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            The principles that shape our culture, our teaching, and our community.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VALUES.map((v, i) => {
            const Icon = v.icon
            return (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                  <CardContent className="flex flex-col gap-3">
                    <div className={cn('inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br', v.tint)}>
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-semibold text-base">{v.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ===================== 5 DEPARTMENTS ===================== */}
      <section className="container mx-auto px-4 lg:px-6 pb-12 md:pb-16">
        <div className="text-center mb-8">
          <Badge variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/20 mb-3">
            Our 5 Cohorts
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight">Science Education Departments</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            ULSESA unites five distinct science education programmes under one vibrant community.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEPARTMENTS.map((d, i) => {
            const Icon = d.icon
            return (
              <motion.div
                key={d.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 group">
                  <CardContent className="flex flex-col gap-3 h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br', d.tint)}>
                        <Icon className="h-6 w-6" strokeWidth={1.75} />
                      </div>
                      <Badge variant="outline" className="rounded-md font-mono font-bold text-[11px]">
                        {d.code}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors">{d.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">{d.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ===================== SOCIALS + CONTACT ===================== */}
      <section className="container mx-auto px-4 lg:px-6 pb-16 md:pb-24">
        {/* Socials row */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="rounded-full bg-cyan-accent/10 text-cyan-accent dark:text-cyan-accent border-cyan-accent/30 mb-3">
            Connect with us
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight">Follow ULSESA</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            Stay updated on events, elections, and ULSESA news across our social platforms.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {SOCIALS.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                whileHover={{ y: -4 }}
              >
                <Card className="rounded-2xl h-full hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                  <CardContent className="flex flex-col items-center gap-2 text-center">
                    <div className={cn('inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-colors', s.tint)}>
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground">{s.handle}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.a>
            )
          })}
        </div>

        {/* Contact card */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="border-b pb-4">
            <CardTitle className="font-display flex items-center gap-2">
              <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
              Contact ULSESA
            </CardTitle>
            <CardDescription>
              Reach out for enquiries, collaborations, or to get involved — WhatsApp is the fastest way.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Premium WhatsApp CTA */}
            <a
              href={supportWhatsAppUrl(SUPPORT_MESSAGES.question)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                toast.message('Opening WhatsApp', {
                  description: `Direct chat with David • ${SUPPORT_PHONE_DISPLAY}`,
                })
              }
              className="group relative block overflow-hidden rounded-2xl p-[1.5px] bg-gradient-to-br from-[#25D366] via-[#1FB855] to-[#128C7E] shadow-lg shadow-[#25D366]/25 transition-transform hover:scale-[1.005] active:scale-[0.99]"
            >
              <div className="flex items-center gap-4 rounded-[14px] bg-gradient-to-br from-[#25D366] to-[#1FB855] p-4 text-white">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/30">
                  <WhatsAppIcon className="h-7 w-7" />
                  <span className="absolute -inset-1 rounded-2xl bg-[#25D366]/40 blur-md -z-10" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold font-display leading-tight">Chat on WhatsApp</div>
                  <div className="text-xs text-white/85 mt-0.5 tabular-nums">
                    Direct line to David • {SUPPORT_PHONE_DISPLAY}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 opacity-90 transition-transform group-hover:translate-x-0.5" />
              </div>
            </a>

            {/* Secondary contact options */}
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => copyToClipboard('ulsesa01@gmail.com', 'Email')}
                className="flex items-start gap-3 p-4 rounded-xl border hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-sm font-medium truncate">ulsesa01@gmail.com</div>
                  <div className="text-[11px] text-primary mt-0.5">Tap to copy</div>
                </div>
              </button>

              <div className="flex items-start gap-3 p-4 rounded-xl border">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-accent/15 text-cyan-accent dark:text-cyan-accent shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Location</div>
                  <div className="text-sm font-medium leading-snug">Department of Science Education</div>
                  <div className="text-xs text-muted-foreground">Faculty of Education, UNILAG, Akoka, Yaba, Lagos</div>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export default AboutView
