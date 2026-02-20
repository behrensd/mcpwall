import type { Metadata } from "next";
import { Syne, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mcpwall.dev"),
  title: {
    default: "mcpwall — Firewall for MCP Tool Calls",
    template: "%s — mcpwall",
  },
  description:
    "Deterministic security proxy for MCP tool calls. Blocks dangerous requests, scans for secrets, logs everything. Works with Claude Code, Cursor, and any MCP client.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    siteName: "mcpwall",
    type: "website",
    url: "https://mcpwall.dev",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${syne.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body className="dot-grid">{children}</body>
    </html>
  );
}
