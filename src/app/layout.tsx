import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";
import { AuthGate } from "@/components/shell/auth-gate";
import { ShellLayout } from "@/components/shell/shell-layout";
import { SWRegister } from "@/components/pwa/sw-register";

export const metadata: Metadata = {
  title: "Timii - 连线搞一切",
  description: "学习陪伴型社交App · 随时随地找人一起连线",
  appleWebApp: {
    capable: true,
    title: "Timii",
    statusBarStyle: "black-translucent",
  },
  other: {
    "format-detection": "telephone=no",
  },
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <noscript>
          <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F2F3F5",
            color: "#1A1A1A",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Timii
              </h1>
              <p style={{ color: "#66666B", fontSize: "0.875rem" }}>
                请启用 JavaScript 以使用 Timii
              </p>
            </div>
          </div>
        </noscript>
        <SWRegister />
        <AuthGate>
          <ShellLayout>{children}</ShellLayout>
        </AuthGate>
      </body>
    </html>
  );
}
