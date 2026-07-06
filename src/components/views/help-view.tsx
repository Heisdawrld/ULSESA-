'use client'

import { useState, useMemo } from 'react'
import type { ComponentType } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useNav } from '@/lib/stores/nav-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { WhatsAppIcon } from '@/components/shared/whatsapp-icon'
import {
  supportWhatsAppUrl,
  SUPPORT_MESSAGES,
  SUPPORT_PHONE_DISPLAY,
} from '@/lib/support'
import {
  Search,
  LifeBuoy,
  ShieldCheck,
  Vote,
  KeyRound,
  HeadphonesIcon,
  Clock,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Instagram,
  Twitter,
  Music2,
  MessageCircle,
} from 'lucide-react'

// ===================== Static data =====================

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>

type QuickHelpItem = {
  icon: IconType
  title: string
  desc: string
  tint: string
  action: string
  /** If present, clicking this card opens WhatsApp with this pre-filled message. */
  whatsapp?: string
}

const QUICK_HELP: readonly QuickHelpItem[] = [
  {
    icon: ShieldCheck,
    title: 'Account Verification',
    desc: 'Understand the matric → OTP → ID upload → admin approval flow.',
    tint: 'from-primary/15 to-primary/5 text-primary',
    action: 'faq-1',
  },
  {
    icon: Vote,
    title: 'Voting Guide',
    desc: 'Step-by-step instructions on how to cast your anonymous ballot.',
    tint: 'from-cyan-accent/20 to-cyan-accent/5 text-cyan-accent dark:text-cyan-accent',
    action: 'faq-3',
  },
  {
    icon: KeyRound,
    title: 'Password Reset',
    desc: 'Forgot your password? Chat with David on WhatsApp to reset it fast.',
    tint: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
    action: 'whatsapp-password',
    whatsapp: SUPPORT_MESSAGES.password,
  },
  {
    icon: WhatsAppIcon,
    title: 'Contact Support',
    desc: 'Chat directly with David on WhatsApp — usually replies in minutes.',
    tint: 'from-[#25D366]/20 to-[#25D366]/5 text-[#1FB855] dark:text-[#25D366]',
    action: 'whatsapp-general',
    whatsapp: SUPPORT_MESSAGES.general,
  },
]

type FaqItem = {
  id: string
  q: string
  a: string
  /** Optional WhatsApp link rendered at the end of the answer. */
  whatsapp?: { label: string; message: string }
}

const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    q: 'How do I sign in?',
    a: 'Signing in takes about a minute. (1) On the Auth page, enter your 9-digit matric number (numeric only, e.g. 200134567). (2) Enter your pre-set password — it is your matric number plus the last 4 letters of your surname (lowercase). (3) We verify you against the ULSESA voter register and let you in. If you are not sure of the exact spelling of your surname as it appears on your class attendance list, tap "Can\'t log in?" on the sign-in card to chat with us on WhatsApp.',
  },
  {
    id: 'faq-2',
    q: 'I can\'t log in — what should I check first?',
    a: 'Three things, in order: (1) Double-check your 9-digit matric number — type only the digits, no slashes or spaces. (2) Remember your password is your matric + the last 4 letters of your surname, all lowercase. For example, matric 200134567 with surname "Bello" gives 200134567ello. (3) Make sure your surname spelling matches exactly what is on your class attendance list (Nigerian convention: SURNAME is the first word). After 5 wrong attempts your matric is locked for 15 minutes. Still stuck? Tap "Can\'t log in?" on the sign-in card to chat with us on WhatsApp.',
    whatsapp: { label: 'Chat with us on WhatsApp', message: SUPPORT_MESSAGES.account },
  },
  {
    id: 'faq-3',
    q: 'How do I vote?',
    a: 'Once your account is verified and the election is active: (1) Go to the Elections page from the navigation. (2) Review the candidates for each position — read their manifestos by tapping "View Manifesto". (3) Choose "Vote" either from the Candidates tab or use the guided Vote Flow. (4) Select your preferred candidate and confirm. You will see a confirmation toast once your vote is recorded. You can vote for each position exactly once.',
  },
  {
    id: 'faq-4',
    q: 'Is my vote anonymous?',
    a: 'Yes — completely. The system records that you voted (to enforce one-vote-per-student) but never links your identity to your choice. Public results only show aggregate vote counts per candidate. Even administrators cannot see who voted for whom. This is enforced at the database level through our schema design.',
  },
  {
    id: 'faq-5',
    q: 'How do I download course materials?',
    a: 'There are two ways: (1) Head to the Resources page from the navigation bar — filter by type (notes, past questions, textbooks, slides, videos), filter by course, or search by title. Tap "Download" on any resource card. (2) On the Academics page, many courses have a dedicated Google Drive folder — tap "Open Materials" on the course card to access all official materials in one place. You can also tap "View Resources" on a course card to see resources specific to that course.',
  },
  {
    id: 'faq-6',
    q: 'What if I forgot my password?',
    a: 'For security reasons, self-service password reset is not currently available. Please chat with David on WhatsApp at 08117024699 — he will verify your identity and reset your password for you, usually within a few minutes during business hours (Mon–Fri, 9 AM – 4 PM WAT).',
    whatsapp: { label: 'Chat on WhatsApp • 08117024699', message: SUPPORT_MESSAGES.password },
  },
  {
    id: 'faq-7',
    q: 'How are election results calculated?',
    a: 'Results are calculated by counting every valid vote cast for each candidate. The count is performed automatically when a vote is submitted and is visible in real-time on the Results tab once you have voted (or after the election ends). The candidate with the most votes for each position wins. Ties are resolved by ULSESA electoral guidelines. Turnout percentage is calculated as: (total votes ÷ verified eligible students) × 100.',
  },
  {
    id: 'faq-8',
    q: 'Can I change my vote?',
    a: 'No. Once you confirm and submit your vote for a position, it is final and cannot be changed. This policy protects election integrity and prevents coercion. Please review each candidate carefully before confirming. You will see a confirmation dialog before your vote is recorded, giving you a chance to cancel if you change your mind.',
  },
  {
    id: 'faq-9',
    q: 'How do I join ULSESA WhatsApp groups?',
    a: 'Go to the Community page from the navigation bar and select the "WhatsApp Groups" tab. You will see all official ULSESA WhatsApp groups — general, level, department, sports, academic, and announcement channels. Filter by category using the pills, then tap "Join Group" on any card to open the invite in WhatsApp. Links open in a new tab.',
  },
]

const FAQ_KEYWORDS: Record<string, string[]> = {
  'faq-1': ['sign in', 'login', 'account', 'register', 'matric', 'password', '200134567'],
  'faq-2': ['verified', 'verification', 'pending', 'approved', 'rejected', 'status'],
  'faq-3': ['vote', 'voting', 'cast', 'ballot', 'how to vote'],
  'faq-4': ['anonymous', 'privacy', 'secret', 'identity'],
  'faq-5': ['download', 'resource', 'materials', 'notes', 'past questions', 'google drive', 'drive'],
  'faq-6': ['forgot', 'password', 'reset', 'locked out'],
  'faq-7': ['results', 'counted', 'calculated', 'winner', 'turnout'],
  'faq-8': ['change', 'edit', 'undo', 'revoke'],
  'faq-9': ['whatsapp', 'group', 'join', 'community', 'chat'],
}

const SOCIALS = [
  { icon: Instagram, label: 'Instagram', handle: '@ulsesa01', url: 'https://instagram.com/ulsesa01', tint: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15' },
  { icon: Twitter, label: 'X / Twitter', handle: '@ulsesa01', url: 'https://x.com/ulsesa01', tint: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/15' },
  { icon: Music2, label: 'TikTok', handle: '@ulsesa01', url: 'https://tiktok.com/@ulsesa01', tint: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15' },
  { icon: MessageCircle, label: 'WhatsApp', handle: 'Community Groups', url: '#community', tint: 'bg-[#25D366]/10 text-[#1FB855] hover:bg-[#25D366]/15' },
]

// ===================== Main view =====================

export function HelpView() {
  const { navigate } = useNav()
  const [search, setSearch] = useState('')
  const [openItem, setOpenItem] = useState<string>('')

  const filteredFaqs = useMemo(() => {
    if (!search.trim()) return FAQS
    const q = search.toLowerCase()
    return FAQS.filter((f) => {
      const text = (f.q + ' ' + f.a).toLowerCase()
      const keywords = FAQ_KEYWORDS[f.id] || []
      return text.includes(q) || keywords.some((k) => k.includes(q) || q.includes(k))
    })
  }, [search])

  function handleQuickAction(action: string, whatsapp?: string) {
    if (whatsapp) {
      if (typeof window !== 'undefined') {
        window.open(supportWhatsAppUrl(whatsapp), '_blank', 'noopener,noreferrer')
      }
      toast.message('Opening WhatsApp', {
        description: `Direct chat with David • ${SUPPORT_PHONE_DISPLAY}`,
      })
      return
    }
    if (action === 'contact') {
      document.getElementById('contact-support')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (action === 'faq-5') {
      navigate('resources')
      return
    }
    if (action === 'faq-9') {
      navigate('community')
      return
    }
    setOpenItem(action)
    document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function copyToClipboard(value: string, label: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).then(() => {
        toast.success(`${label} copied`, { description: value })
      }).catch(() => {
        toast.message(`${label}: ${value}`)
      })
    }
  }

  function handleSocialClick(url: string, label: string) {
    if (url === '#community') {
      navigate('community')
      return
    }
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    toast.message(`Opening ${label}`, { description: 'External link opens in a new tab.' })
  }

  return (
    <div className="animate-fade-in">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[60rem] rounded-full bg-primary/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute top-32 right-12 h-40 w-40 rounded-full bg-cyan-accent/20 blur-3xl pointer-events-none" aria-hidden />

        <div className="container mx-auto px-4 lg:px-6 relative py-14 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge variant="outline" className="mb-5 rounded-full bg-background/70 backdrop-blur px-4 py-1.5 text-xs font-medium border-primary/20">
              <LifeBuoy className="h-3.5 w-3.5 text-primary mr-1.5" />
              ULSESA Help Center
            </Badge>
            <h1 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl leading-tight">
              How can we <span className="text-gradient-brand">help</span>?
            </h1>
            <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Find answers about your ULSESA account, voting, course materials, WhatsApp groups, and more.
            </p>

            {/* Decorative search */}
            <div className="mt-7 relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search the help center…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-full pl-11 pr-4 h-12 text-base shadow-md bg-background/80 backdrop-blur"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================== QUICK HELP ===================== */}
      <section className="container mx-auto px-4 lg:px-6 py-10 md:py-14">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">Quick help</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Jump to the most common topics.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_HELP.map((q, i) => {
            const Icon = q.icon
            return (
              <motion.button
                key={q.title}
                onClick={() => handleQuickAction(q.action, q.whatsapp)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="text-left"
              >
                <Card className={cn(
                  'h-full rounded-2xl hover:shadow-lg transition-all duration-300',
                  q.whatsapp ? 'hover:shadow-[#25D366]/15 border-[#25D366]/20' : 'hover:shadow-primary/5'
                )}>
                  <CardContent className="flex flex-col gap-3">
                    <div className={cn('inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br', q.tint)}>
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-semibold text-base leading-snug">{q.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">{q.desc}</p>
                    <div className={cn(
                      'flex items-center gap-1 text-xs font-medium mt-1',
                      q.whatsapp ? 'text-[#1FB855] dark:text-[#25D366]' : 'text-primary'
                    )}>
                      {q.whatsapp ? 'Chat' : 'Open'}
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </motion.button>
            )
          })}
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq-section" className="container mx-auto px-4 lg:px-6 pb-12 md:pb-16 scroll-mt-6">
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="border-b pb-4">
            <CardTitle className="font-display flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              {filteredFaqs.length === FAQS.length
                ? 'Tap a question to expand its answer.'
                : `${filteredFaqs.length} of ${FAQS.length} questions match "${search}".`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredFaqs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-40" />
                No FAQs match your search. Try different keywords or contact support.
              </div>
            ) : (
              <Accordion
                type="single"
                collapsible
                value={openItem}
                onValueChange={setOpenItem}
                className="w-full"
              >
                {filteredFaqs.map((f) => (
                  <AccordionItem key={f.id} value={f.id} className="px-1">
                    <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      <p>{f.a}</p>
                      {f.whatsapp && (
                        <a
                          href={supportWhatsAppUrl(f.whatsapp.message)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1FB855] dark:text-[#25D366] hover:underline"
                        >
                          <WhatsAppIcon className="h-3.5 w-3.5" />
                          {f.whatsapp.label}
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ===================== CONTACT SUPPORT + STATUS ===================== */}
      <section className="container mx-auto px-4 lg:px-6 pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Contact support */}
          <Card id="contact-support" className="rounded-2xl scroll-mt-6">
            <CardHeader className="border-b pb-4">
              <CardTitle className="font-display flex items-center gap-2">
                <HeadphonesIcon className="h-5 w-5 text-primary" />
                Contact Support
              </CardTitle>
              <CardDescription>Can&apos;t find what you need? Reach ULSESA directly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Premium WhatsApp CTA */}
              <a
                href={supportWhatsAppUrl(SUPPORT_MESSAGES.general)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  toast.message('Opening WhatsApp', {
                    description: `Direct chat with David • ${SUPPORT_PHONE_DISPLAY}`,
                  })
                }
                className="group relative block overflow-hidden rounded-2xl p-[1.5px] bg-gradient-to-br from-[#25D366] via-[#1FB855] to-[#128C7E] shadow-lg shadow-[#25D366]/25 transition-transform hover:scale-[1.01] active:scale-[0.99]"
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

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold">Response time:</span>{' '}
                  <span className="text-muted-foreground">Usually within minutes during business hours (Mon–Fri, 9 AM – 4 PM WAT).</span>
                </div>
              </div>

              {/* Socials */}
              <div className="pt-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Follow ULSESA</div>
                <div className="grid grid-cols-2 gap-2">
                  {SOCIALS.map((s) => {
                    const Icon = s.icon
                    return (
                      <button
                        key={s.label}
                        onClick={() => handleSocialClick(s.url, s.label)}
                        className={cn(
                          'flex items-center gap-2 p-2.5 rounded-xl border transition-colors text-left',
                          s.tint
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold leading-tight">{s.label}</div>
                          <div className="text-[10px] opacity-80 truncate">{s.handle}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System status */}
          <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="border-b pb-4">
              <CardTitle className="font-display flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                System Status
              </CardTitle>
              <CardDescription>Live availability of ULSESA platform services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    All systems operational
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Authentication, elections, resources, and community are running normally.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Authentication', status: 'Online' },
                  { label: 'Elections', status: 'Online' },
                  { label: 'Resources', status: 'Online' },
                  { label: 'Community', status: 'Online' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-xs font-medium">{s.label}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-3 w-3" />
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('about')}
                className="w-full rounded-full mt-2"
              >
                <BookOpen className="h-4 w-4" />
                Learn about ULSESA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default HelpView
