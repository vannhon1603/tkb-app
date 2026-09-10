import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import "@/app/globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hệ Thống Quản Lý & Thời Khóa Biểu",
  description: "Khung ứng dụng hiện đại với Next.js 16, Tailwind CSS v4, Shadcn UI và FastAPI Backend.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${beVietnam.variable} ${jetbrainsMono.variable} min-h-screen bg-background text-foreground antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <Script
              src="https://accounts.google.com/gsi/client"
              strategy="afterInteractive"
            />
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                className: "!bg-white !text-slate-800 dark:!bg-[#161b22] dark:!text-slate-100 !border !border-[#d0d7de] dark:!border-[#30363d] !text-xs",
                duration: 2500,
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
