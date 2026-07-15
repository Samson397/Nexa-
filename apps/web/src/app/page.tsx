"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  FolderOpen,
  Mail,
  MessageSquare,
  Puzzle,
  Smartphone,
  Users,
  Workflow,
} from "lucide-react";
import { NexaLogo } from "@/components/layout/nexa-logo";
import { Button } from "@/components/ui/button";

const modules = [
  { title: "AI Chat", icon: MessageSquare },
  { title: "AI Employees", icon: Users },
  { title: "Knowledge", icon: BookOpen },
  { title: "Tasks", icon: CheckSquare },
  { title: "Calendar", icon: Calendar },
  { title: "Files", icon: FolderOpen },
  { title: "Email", icon: Mail },
  { title: "Automations", icon: Workflow },
  { title: "Integrations", icon: Puzzle },
  { title: "Devices", icon: Smartphone },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-950 text-slate-50">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(34,211,238,0.28),transparent_42%),radial-gradient(ellipse_at_80%_0%,rgba(20,184,166,0.22),transparent_40%),radial-gradient(ellipse_at_50%_100%,rgba(8,47,73,0.9),transparent_55%),linear-gradient(180deg,#020617_0%,#0b1220_45%,#020617_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 nexa-grid [background-size:56px_56px]"
      />
      <div
        aria-hidden
        className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl"
      />
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-[18%] mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <NexaLogo className="text-slate-50 [&_span]:text-slate-50" />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="text-slate-200 hover:text-white">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center px-6 pb-20 pt-8 text-center md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <h1 className="font-display text-6xl font-bold tracking-[0.22em] text-white sm:text-7xl md:text-8xl">
            NEXA
          </h1>
          <motion.p
            className="mt-6 max-w-xl font-display text-xl font-medium text-cyan-100/95 sm:text-2xl md:text-3xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            Your AI Operating System.
          </motion.p>
          <motion.p
            className="mt-4 max-w-lg text-base leading-relaxed text-slate-300/90 sm:text-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.6 }}
          >
            One command center for agents, knowledge, and connected work — with
            approvals, audit trails, and device bridges built in.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.55 }}
          >
            <Button asChild size="lg" className="nexa-glow min-w-[160px]">
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-w-[160px] border-cyan-400/30 bg-white/5 text-cyan-50 hover:bg-cyan-400/10 hover:text-white"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 bottom-8 top-[42%] rounded-[2rem] border border-cyan-400/10 bg-gradient-to-b from-cyan-400/5 via-transparent to-transparent md:inset-x-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 1 }}
        />
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/60 px-6 py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Every module. One OS.
          </h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            From AI employees to automations, NEXA keeps strategy, execution, and
            integrations in a single secure surface.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <motion.li
                  key={module.title}
                  className="flex items-center gap-3 text-sm text-slate-200"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: index * 0.04 }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  {module.title}
                </motion.li>
              );
            })}
          </ul>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-6 py-8 text-center text-xs text-slate-500 md:px-10">
        <p>
          NEXA never stores third-party passwords. Integrations use OAuth.
          Sensitive actions require approval. Audit logs ship with every workspace.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} NEXA. All rights reserved.</p>
      </footer>
    </div>
  );
}
