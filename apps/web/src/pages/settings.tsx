import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Settings, Theme } from "@devdesk/shared";
import { api } from "@/api/client";
import { useSettings } from "@/hooks/use-api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useSettings();
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (settingsQuery.data) setForm(settingsQuery.data);
  }, [settingsQuery.data]);

  const saveMut = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: (data) => {
      setForm(data);
      applyTheme(data.theme);
      queryClient.setQueryData(["settings"], data);
      toast.success("Configurações salvas.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!form) {
    return (
      <>
        <Header title="Configurações" />
        <main className="p-6 text-sm text-muted-foreground">Carregando...</main>
      </>
    );
  }

  return (
    <>
      <Header title="Configurações" />
      <main className="flex-1 overflow-auto p-6">
        <form
          className="mx-auto max-w-2xl space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            saveMut.mutate(form);
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Geral</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="backendPort">Porta do backend</Label>
                <Input
                  id="backendPort"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.backendPort}
                  onChange={(e) => setForm({ ...form, backendPort: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Alterar esta porta exige reiniciar o backend do DevDesk.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultAppPort">Porta padrão para novas aplicações</Label>
                <Input
                  id="defaultAppPort"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.defaultAppPort}
                  onChange={(e) => setForm({ ...form, defaultAppPort: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll">Intervalo de atualização de status (ms)</Label>
                <Input
                  id="poll"
                  type="number"
                  min={1000}
                  max={60000}
                  value={form.statusPollIntervalMs}
                  onChange={(e) => setForm({ ...form, statusPollIntervalMs: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select
                  value={form.theme}
                  onValueChange={(value) => setForm({ ...form, theme: value as Theme })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="light">Claro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="sm:col-span-2 flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                Iniciar aplicações marcadas como auto-start ao abrir o DevDesk
                <Switch
                  checked={form.autoStartEnabled}
                  onCheckedChange={(checked) => setForm({ ...form, autoStartEnabled: checked })}
                />
              </label>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={saveMut.isPending}>
              Salvar configurações
            </Button>
          </div>
        </form>
      </main>
    </>
  );
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}
