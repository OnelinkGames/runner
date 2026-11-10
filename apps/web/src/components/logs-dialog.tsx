import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function LogsDialog({
  serviceId,
  title,
  open,
  onOpenChange,
}: {
  serviceId: number | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const scroller = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!open || !serviceId) return;
    setLines([]);
    const source = new EventSource(`/api/services/${serviceId}/logs/stream`);
    source.onmessage = (event) => {
      try {
        const line = JSON.parse(event.data) as string;
        setLines((current) => [...current.slice(-400), line]);
      } catch {
        setLines((current) => [...current.slice(-400), event.data]);
      }
    };
    source.onerror = () => {
      setLines((current) =>
        current.length ? current : ["Nenhum log disponível ainda. Inicie o serviço para gerar logs."],
      );
    };
    return () => source.close();
  }, [open, serviceId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Logs · {title}</DialogTitle>
        </DialogHeader>
        <pre
          ref={scroller}
          className="h-[420px] overflow-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-5 text-muted-foreground"
        >
          {lines.join("\n") || "Aguardando logs..."}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
