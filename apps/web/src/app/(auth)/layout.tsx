import Link from "next/link";
import { NexaLogo } from "@/components/layout/nexa-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(15,118,110,0.22),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.14),transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(13,148,136,0.2),transparent_45%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 nexa-grid opacity-70" />
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/">
          <NexaLogo />
        </Link>
        <p className="text-xs text-muted-foreground">
          Secure access · 2FA & passkeys ready
        </p>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-4">
        {children}
      </main>
    </div>
  );
}
