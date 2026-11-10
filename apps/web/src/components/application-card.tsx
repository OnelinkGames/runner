import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  MoreVertical,
  Play,
  RotateCcw,
  Square,
  ScrollText,
  FolderOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ApplicationWithStatus, ServiceWithStatus } from "@devdesk/shared";
import { serviceStatusLabel } from "@devdesk/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusDot } from "@/components/status-dot";
import { AppIcon } from "@/components/app-icon";
import { cn } from "@/lib/utils";

const DESCRIPTION_LIMIT = 100;

function HoverTooltip({
  content,
  children,
}: {
  content: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="whitespace-pre-wrap">{content}</TooltipContent>
    </Tooltip>
  );
}

function DescriptionPreview({ name, description }: { name: string; description: string }) {
  const [open, setOpen] = useState(false);
  const truncated = description.length > DESCRIPTION_LIMIT;
  const preview = truncated ? `${description.slice(0, DESCRIPTION_LIMIT).trimEnd()}...` : description;

  const text = (
    <p
      className={cn(
        "mt-1 line-clamp-2 min-h-[2.5rem] break-words text-left text-sm text-muted-foreground",
        truncated && "cursor-pointer hover:text-foreground",
      )}
    >
      {preview}
    </p>
  );

  if (!truncated) return text;

  return (
    <>
      <HoverTooltip content={description}>
        <button type="button" className="block w-full" onClick={() => setOpen(true)}>
          {text}
        </button>
      </HoverTooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap text-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ApplicationCard({
  app,
  selected,
  onSelectedChange,
  onStart,
  onStop,
  onRestart,
  onOpen,
  onDelete,
  onLogsService,
  onOpenFolder,
  busy,
}: {
  app: ApplicationWithStatus;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onLogsService: (service: ServiceWithStatus) => void;
  onOpenFolder: (service: ServiceWithStatus) => void;
  busy?: boolean;
}) {
  const running = app.status === "running";

  return (
    <Card className="min-w-0 overflow-hidden transition-all hover:border-primary/40">
      <CardContent className="min-w-0 overflow-hidden p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Checkbox
              checked={selected}
              onCheckedChange={(value) => onSelectedChange(Boolean(value))}
              className="mt-1 shrink-0"
            />
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex min-w-0 items-center gap-2">
                <AppIcon src={app.iconUrl} alt={app.name} className="h-7 w-7 shrink-0" />
                <StatusDot status={app.status} className="shrink-0" />
                <HoverTooltip content={app.name}>
                  <h3 className="min-w-0 truncate font-semibold">{app.name}</h3>
                </HoverTooltip>
              </div>
              {app.description?.trim() ? (
                <DescriptionPreview name={app.name} description={app.description.trim()} />
              ) : (
                <p className="mt-1 min-h-[2.5rem]" />
              )}
            </div>
          </div>
          <div className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Mais opções">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {running ? (
                <>
                  <DropdownMenuItem onClick={onOpen}>
                    <ExternalLink /> Abrir
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onRestart}>
                    <RotateCcw /> Reiniciar tudo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onStop}>
                    <Square /> Parar tudo
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={onStart}>
                  <Play /> Iniciar tudo
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/aplicacoes/${app.id}`}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {app.groupName ? (
          <HoverTooltip content={app.groupName}>
            <p className="mt-3 truncate text-sm text-muted-foreground">
              Grupo: <span className="text-foreground">{app.groupName}</span>
            </p>
          </HoverTooltip>
        ) : null}

        <div className="mt-4 min-w-0 space-y-2">
          {app.services.map((service) => (
            <div
              key={service.id}
              className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-black/30 px-3 py-2"
            >
              <div className="flex min-w-0 items-start gap-2">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex min-w-0 items-center gap-2">
                    <AppIcon src={service.iconUrl} alt={service.name} className="h-5 w-5 shrink-0" />
                    <StatusDot status={service.status} className="shrink-0" />
                    <HoverTooltip content={service.name}>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{service.name}</span>
                    </HoverTooltip>
                  </div>
                  <p className="mt-0.5 truncate pl-7 text-xs text-muted-foreground">
                    {serviceStatusLabel(service.status)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <HoverTooltip content="Abrir pasta">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onOpenFolder(service)}
                      aria-label="Abrir pasta"
                    >
                      <FolderOpen />
                    </Button>
                  </HoverTooltip>
                  <HoverTooltip content="Logs">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onLogsService(service)}
                      aria-label="Logs"
                    >
                      <ScrollText />
                    </Button>
                  </HoverTooltip>
                </div>
              </div>
              {service.status === "error" && service.errorMessage ? (
                <p className="mt-1 text-xs text-destructive">{service.errorMessage}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {running ? (
            <>
              <Button size="sm" onClick={onOpen} disabled={busy}>
                <ExternalLink /> Abrir
              </Button>
              <Button size="sm" variant="outline" onClick={onRestart} disabled={busy}>
                <RotateCcw /> Reiniciar
              </Button>
              <Button size="sm" variant="outline" onClick={onStop} disabled={busy}>
                <Square /> Parar
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={onStart} disabled={busy}>
                <Play /> Iniciar
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/aplicacoes/${app.id}`}>Editar</Link>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
