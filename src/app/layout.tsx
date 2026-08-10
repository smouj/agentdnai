import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "AgentDNAI — Identity Control Plane for AI Agents",
  description: "Infrastructure-grade identity, authorization, temporary credentials and tamper-evident audit trails for autonomous AI agents.",
  keywords: [
    "AgentDNAI",
    "AI agents",
    "agent identity",
    "agent security",
    "AI governance",
    "access control",
    "authorization",
    "permissions",
    "audit trail",
    "zero trust",
    "RBAC",
    "temporary credentials",
    "security control plane",
  ],
  authors: [{ name: "AgentDNAI" }],
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo-symbol-dark.png", type: "image/png", sizes: "1254x1254" },
    ],
    apple: "/logo-symbol-dark.png",
  },
  openGraph: {
    title: "AgentDNAI — Identity Control Plane for AI Agents",
    description: "Infrastructure-grade identity, authorization, temporary credentials and audit trails for autonomous AI agents.",
    images: ["/hero-dna.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentDNAI — Identity Control Plane for AI Agents",
    description: "Infrastructure-grade identity, authorization, temporary credentials and audit trails for autonomous AI agents.",
    images: ["/hero-dna.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
