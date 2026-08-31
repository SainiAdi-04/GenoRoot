import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GenoRoot • Hair & Scalp Clinical Intake",
  description:
    "WhatsApp-style conversational clinical intake powered by Indian AI stack.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#111814",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#111814] text-[#f3f0df] font-sans selection:bg-[#4e8766] selection:text-white">
        {/* Grain overlay for tactile warmth */}
        <div className="fixed inset-0 pointer-events-none z-50 bg-grain opacity-[0.035]" />
        {children}
      </body>
    </html>
  );
}
