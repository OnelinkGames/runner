import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { RUN_MODE_LABELS } from "@devdesk/shared";
import { useApplications } from "@/hooks/use-api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/status-dot";
import { AppIcon } from "@/components/app-icon";
import { Card } from "@/components/ui/card";

export function ApplicationsPage() {
  const appsQuery = useApplications();
  const apps = appsQuery.data ?? [];

  return (
    <>
      <Header title="Aplicações" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Cadastro</h2>
          <Button asChild>
            <Link to="/aplicacoes/nova">
              <Plus /> Nova aplicação
            </Link>
          </Button>
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Modo</th>
                <th className="px-4 py-3 font-medium">Serviços</th>
                <th className="px-4 py-3 font-medium">Grupo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <AppIcon src={app.iconUrl} alt={app.name} className="h-6 w-6" />
                      {app.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{RUN_MODE_LABELS[app.runMode]}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {app.services.map((service) => service.name).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{app.groupName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusDot status={app.status} withLabel />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/aplicacoes/${app.id}`}>Editar</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma aplicação cadastrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
