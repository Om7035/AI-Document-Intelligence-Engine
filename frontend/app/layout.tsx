import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DocMatrix AI — Local Document Intelligence",
  description:
    "Privacy-first AI document engine. Upload PDFs, get mindmaps, summaries, and chat — all 100% local with Ollama and FAISS. No cloud. No API keys.",
  keywords: ["PDF", "AI", "mindmap", "RAG", "local LLM", "Ollama", "document intelligence"],
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
