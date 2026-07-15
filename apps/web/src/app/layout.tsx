import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NEXA — AI Operating System",
    template: "%s · NEXA",
  },
  description:
    "NEXA is the AI Operating System for teams — chat, agents, automations, and integrations in one workspace.",
  applicationName: "NEXA",
  keywords: [
    "NEXA",
    "AI Operating System",
    "AI agents",
    "automations",
    "workspace",
  ],
  authors: [{ name: "NEXA" }],
  openGraph: {
    title: "NEXA — AI Operating System",
    description:
      "Chat, agents, automations, and integrations in one AI-native workspace.",
    siteName: "NEXA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXA — AI Operating System",
    description:
      "Chat, agents, automations, and integrations in one AI-native workspace.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster
              richColors
              position="top-right"
              theme="system"
              closeButton
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
