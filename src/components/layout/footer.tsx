'use client'

import Image from 'next/image'
import { Mail, Phone, MapPin, Instagram, Twitter, Music2 } from 'lucide-react'
import { useNav } from '@/lib/stores/nav-store'

export function Footer() {
  const { navigate } = useNav()

  return (
    <footer className="mt-auto border-t border-border/40 bg-card/30">
      <div className="container mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="relative h-11 w-11 rounded-xl overflow-hidden ring-1 ring-primary/20">
                <Image src="/ulsesa-logo.jpg" alt="ULSESA" fill className="object-cover" sizes="44px" />
              </div>
              <div>
                <p className="text-sm font-bold font-display">ULSESA</p>
                <p className="text-[10px] text-muted-foreground">UNILAG • Faculty of Education</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              University of Lagos Science Education Students&apos; Association — the largest department in the Faculty of Education.
            </p>
            <p className="text-xs font-medium text-gradient-brand italic">
              &ldquo;Shaping Tomorrow&apos;s Scientific Innovators&rdquo;
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4 font-display">Platform</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><button onClick={() => navigate('home')} className="hover:text-primary transition-colors">Home</button></li>
              <li><button onClick={() => navigate('academics')} className="hover:text-primary transition-colors">Academics</button></li>
              <li><button onClick={() => navigate('elections')} className="hover:text-primary transition-colors">Elections</button></li>
              <li><button onClick={() => navigate('resources')} className="hover:text-primary transition-colors">Resources</button></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold mb-4 font-display">Community</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><button onClick={() => navigate('about')} className="hover:text-primary transition-colors">About ULSESA</button></li>
              <li><button onClick={() => navigate('help')} className="hover:text-primary transition-colors">Help Center</button></li>
              <li><button onClick={() => navigate('community')} className="hover:text-primary transition-colors">WhatsApp Groups</button></li>
              <li><button onClick={() => navigate('auth')} className="hover:text-primary transition-colors">Claim Account</button></li>
            </ul>
          </div>

          {/* Contact + Socials */}
          <div>
            <h4 className="text-sm font-semibold mb-4 font-display">Connect</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground mb-4">
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" /> ulsesa01@gmail.com</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Faculty of Education, UNILAG</li>
            </ul>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/ulsesa01/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ULSESA on Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/ulsesa01"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ULSESA on X (Twitter)"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://www.tiktok.com/@ulsesa01"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ULSESA on TikTok"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Music2 className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © 2026 ULSESA — University of Lagos Science Education Students&apos; Association. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with transparency, security &amp; anonymity.
          </p>
        </div>
      </div>
    </footer>
  )
}
