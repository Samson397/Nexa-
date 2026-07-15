import { cn } from "@/lib/utils";

export function NexaLogo({
  className,
  showWordmark = true,
  size = "md",
}: {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const mark = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-teal-400 to-cyan-600 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.35)]",
          mark,
        )}
        aria-hidden
      >
        <span className="font-display text-[0.7em] font-bold tracking-tight">N</span>
        <span className="absolute inset-0 rounded-xl ring-1 ring-white/30" />
      </div>
      {showWordmark ? (
        <span
          className={cn(
            "font-display font-bold tracking-[0.18em] text-foreground",
            text,
          )}
        >
          NEXA
        </span>
      ) : null}
    </div>
  );
}
