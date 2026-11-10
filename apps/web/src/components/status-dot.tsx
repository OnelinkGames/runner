import type { ApplicationStatus } from "@devdesk/shared";
import { STATUS_LABELS } from "@devdesk/shared";
import { cn } from "@/lib/utils";

const colors: Record<ApplicationStatus, string> = {
  running: "bg-primary shadow-[0_0_10px_rgba(57,255,20,0.85)]",
  stopped: "bg-zinc-600",
  starting: "bg-primary/70 animate-pulse shadow-[0_0_8px_rgba(57,255,20,0.45)]",
  stopping: "bg-amber-400 animate-pulse",
  error: "bg-red-500 shadow-[0_0_8px_rgba(255,77,77,0.55)]",
};

export function StatusDot({
  status,
  withLabel = false,
  className,
}: {
  status: ApplicationStatus;
  withLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span className={cn("h-2.5 w-2.5 rounded-full", colors[status])} />
      {withLabel ? STATUS_LABELS[status] : null}
    </span>
  );
}
