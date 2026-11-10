import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Plus } from "lucide-react";
import { toast } from "sonner";
import type {
  ApplicationStatus,
  ApplicationWithStatus,
  ServiceWithStatus,
} from "@devdesk/shared";
import { api } from "@/api/client";
import { useApplications, useGroups } from "@/hooks/use-api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApplicationCard } from "@/components/application-card";
import { LogsDialog } from "@/components/logs-dialog";
import emptyApps from "@/assets/empty-apps.svg";
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

export function DashboardPage() {
  const queryClient = useQueryClient();
  const appsQuery = useApplications();
  const groupsQuery = useGroups();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [logsTarget, setLogsTarget] = useState<{ id: number; title: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const apps = appsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return apps.filter((app) => {
      const matchesTerm =
        !term ||
        app.name.toLowerCase().includes(term) ||
        (app.description ?? "").toLowerCase().includes(term) ||
        (app.groupName ?? "").toLowerCase().includes(term) ||
        app.services.some((service) => service.name.toLowerCase().includes(term));
      const matchesGroup = groupFilter === "all" || String(app.groupId) === groupFilter;
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      return matchesTerm && matchesGroup && matchesStatus;
    });
  }, [apps, search, groupFilter, statusFilter]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["applications"] });

  const startMut = useMutation({
    mutationFn: api.startApplication,
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });
  const stopMut = useMutation({
    mutationFn: api.stopApplication,
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });
  const restartMut = useMutation({
    mutationFn: api.restartApplication,
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteMut = useMutation({
    mutationFn: api.deleteApplication,
    onSuccess: () => {
      toast.success("Aplicação excluída.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function openApp(app: ApplicationWithStatus) {
    try {
      await api.openApplication(app.id);
    } catch (error) {
      if (app.urlResolved) window.open(app.urlResolved, "_blank", "noopener,noreferrer");
      if (error instanceof Error) toast.error(error.message);
    }
  }

  async function openFolder(service: ServiceWithStatus) {
    try {
      await api.openServiceFolder(service.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a pasta.");
    }
  }

  async function runBulk(action: "start" | "stop" | "start-all" | "stop-all") {
    try {
      if (action === "start") await api.startMany(selected);
      if (action === "stop") await api.stopMany(selected);
      if (action === "start-all") await api.startAll();
      if (action === "stop-all") await api.stopAll();
      toast.success("Operação concluída.");
      await invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na operação.");
    }
  }

  return (
    <>
      <Header title="Dashboard" search={search} onSearchChange={setSearch} />
      <main className="min-w-0 flex-1 overflow-auto p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Minhas <span className="text-primary">Aplicações</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {apps.length} cadastrada{apps.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button asChild>
            <Link to="/aplicacoes/nova">
              <Plus /> Adicionar
            </Link>
          </Button>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={String(group.id)}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(["running", "stopped", "starting", "stopping", "error"] as ApplicationStatus[]).map(
                (status) => (
                  <SelectItem key={status} value={status}>
                    {status === "running"
                      ? "Rodando"
                      : status === "stopped"
                        ? "Parado"
                        : status === "starting"
                          ? "Iniciando"
                          : status === "stopping"
                            ? "Parando"
                            : "Erro"}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => runBulk("start")} disabled={!selected.length}>
              <Play /> Iniciar selecionadas
            </Button>
            <Button variant="outline" size="sm" onClick={() => runBulk("stop")} disabled={!selected.length}>
              <Square /> Parar selecionadas
            </Button>
            <Button variant="secondary" size="sm" onClick={() => runBulk("start-all")} disabled={!apps.length}>
              <Play /> Iniciar todas
            </Button>
            <Button variant="secondary" size="sm" onClick={() => runBulk("stop-all")} disabled={!apps.length}>
              <Square /> Parar todas
            </Button>
          </div>
        </div>

        {appsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando aplicações...</p>
        ) : apps.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md rounded-3xl border border-dashed border-primary/35 bg-card/50 p-10 text-center glow-primary-soft">
            <img src={emptyApps} alt="" className="mx-auto mb-5 h-28 w-auto" />
            <h3 className="text-lg font-semibold">Bem-vindo ao DevDesk</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Você ainda não possui aplicações cadastradas.
            </p>
            <Button className="mt-5" asChild>
              <Link to="/aplicacoes/nova">
                <Plus /> Adicionar aplicação
              </Link>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma aplicação encontrada para este filtro.</p>
        ) : (
          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                selected={selected.includes(app.id)}
                onSelectedChange={(value) =>
                  setSelected((current) =>
                    value ? [...current, app.id] : current.filter((id) => id !== app.id),
                  )
                }
                onStart={() => startMut.mutate(app.id)}
                onStop={() => stopMut.mutate(app.id)}
                onRestart={() => restartMut.mutate(app.id)}
                onOpen={() => openApp(app)}
                onDelete={() => setDeleteId(app.id)}
                onLogsService={(service) =>
                  setLogsTarget({ id: service.id, title: `${app.name} · ${service.name}` })
                }
                onOpenFolder={(service) => void openFolder(service)}
                busy={startMut.isPending || stopMut.isPending || restartMut.isPending}
              />
            ))}
          </div>
        )}
      </main>

      <LogsDialog
        serviceId={logsTarget?.id ?? null}
        title={logsTarget?.title ?? ""}
        open={Boolean(logsTarget)}
        onOpenChange={(open) => !open && setLogsTarget(null)}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aplicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o cadastro. O processo será encerrado se estiver em execução.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMut.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
