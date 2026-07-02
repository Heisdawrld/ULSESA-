import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ULSESA Election Portal",
  description: "Science Education Department Online Voting System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
