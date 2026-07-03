import type { Metadata } from "next";
import { Sora, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ULSESA | University of Lagos Science Education Students' Association",
  description: "One Identity • One Community • One Platform — The official digital home of ULSESA. Shaping Tomorrow's Scientific Innovators.",
  keywords: ["ULSESA", "UNILAG", "Science Education", "Faculty of Education", "Student Association", "Election"],
  authors: [{ name: "ULSESA" }],
  icons: {
    icon: "/ulsesa-logo.jpg",
    apple: "/ulsesa-logo.jpg",
  },
  openGraph: {
    title: "ULSESA Digital Portal",
    description: "One Identity • One Community • One Platform — Shaping Tomorrow's Scientific Innovators",
    siteName: "ULSESA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sora.variable} ${jakarta.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
