import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Layers3, FolderKanban, Settings, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api/client";
import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/aplicacoes", label: "Aplicações", icon: Layers3 },
  { to: "/grupos", label: "Grupos", icon: FolderKanban },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  async function shutdown() {
    setExiting(true);
    try {
      await api.shutdown();
    } catch {
      // a API pode encerrar antes da resposta chegar
    }
    window.setTimeout(() => {
      window.close();
    }, 400);
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="glow-primary flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl">
          <LogoMark className="h-9 w-9" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">
            Dev<span className="text-primary">Desk</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Control Center</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
        {items.map((item) => {
          const active =
            item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                "flex items-center gap-2.5 rounded-full px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground glow-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-primary",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="space-y-3 px-3 py-4">
        <Button
          variant="outline"
          className="w-full justify-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={exiting}
        >
          <Power />
          {exiting ? "Encerrando..." : "Encerrar DevDesk"}
        </Button>
        <p className="px-2 text-[11px] text-muted-foreground">Local · SQLite · PM2</p>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar o DevDesk?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso fecha o painel e para o serviço local. As aplicações que você iniciou pelo
              DevDesk continuam rodando.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void shutdown()}
            >
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {exiting ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 text-center">
          <div>
            <p className="text-lg font-semibold">DevDesk encerrado</p>
            <p className="mt-2 text-sm text-muted-foreground">Pode fechar esta janela.</p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
