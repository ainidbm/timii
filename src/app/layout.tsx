import type { Metadata } from "next";
import type { Viewport } from "next";
import { Space_Grotesk, DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { AuthGate } from "@/components/shell/auth-gate";
import { ShellLayout } from "@/components/shell/shell-layout";
import { SWRegister } from "@/components/pwa/sw-register";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "optional",
});

export const metadata: Metadata = {
  title: "Timii - 连线搞一切",
  description: "学习陪伴型社交App · 随时随地找人一起连线",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F3F5" },
    { media: "(prefers-color-scheme: dark)", color: "#080D0F" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${dmSans.variable} ${inter.variable} antialiased`}
      >
        <SWRegister />
        <AuthGate>
          <ShellLayout>{children}</ShellLayout>
        </AuthGate>
      </body>
    </html>
  );
}
