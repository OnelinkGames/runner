import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, FolderOpen, Info } from "lucide-react";
import type { ApplicationInput, PortConfig, RunMode, ServiceInput } from "@devdesk/shared";
import { api } from "@/api/client";
import { useGroups, useSettings } from "@/hooks/use-api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconField } from "@/components/icon-field";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ServiceForm {
  id?: number;
  name: string;
  directory: string;
  command: string;
  port: string;
  url: string;
  autoPort: boolean;
  portConfig: PortConfig;
  portConfigKey: string;
  autoStart: boolean;
  openInBrowser: boolean;
  envFile: string;
  syncEnvFile: boolean;
  envVars: { key: string; value: string }[];
}

interface FormState {
  name: string;
  description: string;
  groupId: string;
  runMode: RunMode;
  autoStart: boolean;
  iconPath: string | null;
  openAsApp: boolean;
  services: ServiceForm[];
}

function emptyService(name: string, port: number): ServiceForm {
  return {
    name,
    directory: "",
    command: "npm run dev",
    port: String(port),
    url: "",
    autoPort: false,
    portConfig: "env",
    portConfigKey: "PORT",
    autoStart: false,
    openInBrowser: true,
    envFile: ".env",
    syncEnvFile: true,
    envVars: [],
  };
}

const emptyForm = (defaultPort: number): FormState => ({
  name: "",
  description: "",
  groupId: "none",
  runMode: "single",
  autoStart: false,
  iconPath: null,
  openAsApp: true,
  services: [emptyService("Principal", defaultPort)],
});

export function ApplicationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const settings = useSettings();
  const groups = useGroups();
  const defaultPort = settings.data?.defaultAppPort ?? 3000;
  const [form, setForm] = useState<FormState>(emptyForm(defaultPort));

  const existing = useQuery({
    queryKey: ["applications", id],
    queryFn: () => api.getApplication(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (settings.data && !isEdit) {
      setForm(emptyForm(settings.data.defaultAppPort));
    }
  }, [settings.data, isEdit]);

  useEffect(() => {
    if (!existing.data) return;
    const app = existing.data;
    setForm({
      name: app.name,
      description: app.description ?? "",
      groupId: app.groupId ? String(app.groupId) : "none",
      runMode: app.runMode,
      autoStart: app.autoStart,
      iconPath: app.iconPath,
      openAsApp: app.openAsApp ?? true,
      services: app.services.map((service) => ({
        id: service.id,
        name: service.name,
        directory: service.directory,
        command: service.command,
        port: String(service.port),
        url: service.url ?? "",
        autoPort: service.autoPort,
        portConfig: service.portConfig,
        portConfigKey: service.portConfigKey,
        autoStart: service.autoStart,
        openInBrowser: service.openInBrowser,
        envFile: service.envFile,
        syncEnvFile: service.syncEnvFile,
        envVars: service.envVars.map((item) => ({ key: item.key, value: item.value })),
      })),
    });
  }, [existing.data?.id]);

  const saveMut = useMutation({
    mutationFn: async (input: ApplicationInput) => {
      if (isEdit) return api.updateApplication(Number(id), input);
      return api.createApplication(input);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Aplicação atualizada." : "Aplicação cadastrada.");
      navigate("/");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setRunMode(runMode: RunMode) {
    setForm((current) => {
      if (runMode === "single") {
        return {
          ...current,
          runMode,
          services: [current.services[0] ?? emptyService("Principal", defaultPort)].map((service) => ({
            ...service,
            name: service.name || "Principal",
          })),
        };
      }
      const services =
        current.services.length >= 2
          ? current.services
          : [
              { ...current.services[0], name: current.services[0]?.name || "Frontend" },
              emptyService("Backend", defaultPort + 1),
            ];
      return { ...current, runMode, services };
    });
  }

  function updateService(index: number, patch: Partial<ServiceForm>) {
    setForm((current) => ({
      ...current,
      services: current.services.map((service, i) => (i === index ? { ...service, ...patch } : service)),
    }));
  }

  function toPayload(): ApplicationInput {
    const groupId = Number(form.groupId);
    const services: ServiceInput[] = form.services.map((service) => ({
      ...(typeof service.id === "number" && service.id > 0 ? { id: service.id } : {}),
      name: form.runMode === "single" ? service.name || "Principal" : service.name,
      directory: service.directory,
      command: service.command,
      port: Number(service.port),
      url: service.url || null,
      autoPort: service.autoPort,
      portConfig: service.portConfig,
      portConfigKey: service.portConfigKey,
      autoStart: service.autoStart,
      openInBrowser: service.openInBrowser,
      envFile: service.envFile || ".env",
      syncEnvFile: service.syncEnvFile,
      envVars: service.envVars.filter((item) => item.key.trim()),
    }));
    return {
      name: form.name,
      description: form.description || null,
      groupId: form.groupId === "none" || !Number.isInteger(groupId) || groupId <= 0 ? null : groupId,
      runMode: form.runMode,
      autoStart: form.autoStart,
      iconPath: form.iconPath?.trim() || null,
      openAsApp: form.openAsApp,
      services,
    };
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    saveMut.mutate(toPayload());
  }

  return (
    <>
      <Header title={isEdit ? "Editar aplicação" : "Nova aplicação"} />
      <main className="flex-1 overflow-auto p-6">
        <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Dados básicos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="name">Nome da aplicação</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Loja"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select
                  value={form.groupId || "none"}
                  onValueChange={(value) => {
                    if (value === "none" || /^\d+$/.test(value)) update("groupId", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem grupo</SelectItem>
                    {(groups.data ?? []).map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                Iniciar automaticamente
                <Switch checked={form.autoStart} onCheckedChange={(checked) => update("autoStart", checked)} />
              </label>
              <div className="sm:col-span-2 space-y-2">
                <label className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  Abrir como aplicação web
                  <Switch checked={form.openAsApp} onCheckedChange={(checked) => update("openAsApp", checked)} />
                </label>
                <p className="text-xs text-muted-foreground">
                  O botão Abrir usa uma janela do Chrome sem abas, como em “Instalar aplicação”. Desligue para abrir
                  numa aba normal do navegador.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como esta aplicação sobe?</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRunMode("single")}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition-all",
                  form.runMode === "single"
                    ? "border-primary bg-primary/10 glow-primary-soft"
                    : "border-border hover:border-primary/40 hover:bg-accent/40",
                )}
              >
                <div className="font-medium">Um comando</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Uma pasta e um comando já sobem frontend e backend juntos.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setRunMode("services")}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition-all",
                  form.runMode === "services"
                    ? "border-primary bg-primary/10 glow-primary-soft"
                    : "border-border hover:border-primary/40 hover:bg-accent/40",
                )}
              >
                <div className="font-medium">Vários serviços</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Frontend, backend e outros, cada um com pasta, porta e comando.
                </p>
              </button>
            </CardContent>
          </Card>

          {form.services.map((service, index) => (
            <ServiceFields
              key={service.id ?? `new-${index}`}
              index={index}
              service={service}
              showName={form.runMode === "services"}
              canRemove={form.runMode === "services" && form.services.length > 1}
              icon={
                index === 0
                  ? {
                      name: form.name,
                      path: form.iconPath,
                      directories: form.services.map((item) => item.directory),
                      onChange: (path) => update("iconPath", path),
                    }
                  : null
              }
              onChange={(patch) => updateService(index, patch)}
              onRemove={() =>
                update(
                  "services",
                  form.services.filter((_, i) => i !== index),
                )
              }
            />
          ))}

          {form.runMode === "services" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                update("services", [
                  ...form.services,
                  emptyService(
                    form.services.length === 1 ? "Backend" : `Serviço ${form.services.length + 1}`,
                    defaultPort + form.services.length,
                  ),
                ])
              }
            >
              <Plus /> Adicionar serviço
            </Button>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={saveMut.isPending}>
              {isEdit ? "Salvar alterações" : "Cadastrar aplicação"}
            </Button>
          </div>
        </form>
      </main>
    </>
  );
}

function ServiceFields({
  index,
  service,
  showName,
  canRemove,
  icon,
  onChange,
  onRemove,
}: {
  index: number;
  service: ServiceForm;
  showName: boolean;
  canRemove: boolean;
  icon: {
    name: string;
    path: string | null;
    directories: string[];
    onChange: (path: string | null) => void;
  } | null;
  onChange: (patch: Partial<ServiceForm>) => void;
  onRemove: () => void;
}) {
  const [dirMessage, setDirMessage] = useState<string | null>(null);

  async function validateDir() {
    if (!service.directory.trim()) return;
    const result = await api.validateDirectory(service.directory.trim());
    setDirMessage(result.valid ? "Pasta encontrada." : result.message ?? "Pasta inválida.");
  }

  async function pickFolder() {
    try {
      toast.message("Uma janela do sistema vai abrir para escolher a pasta.");
      const result = await api.pickDirectory(service.directory.trim() || undefined);
      if (result.canceled || !result.path) return;
      onChange({ directory: result.path });
      const check = await api.validateDirectory(result.path);
      setDirMessage(check.valid ? "Pasta encontrada." : check.message ?? "Pasta inválida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o seletor de pastas.");
    }
  }

  async function loadEnvFile() {
    if (!service.directory.trim()) {
      toast.error("Informe a pasta do serviço antes de ler o .env.");
      return;
    }
    try {
      const file = await api.previewEnvFile(service.directory.trim(), service.envFile || ".env");
      if (!file.exists) {
        toast.message(`Arquivo ${service.envFile || ".env"} ainda não existe nessa pasta.`);
        return;
      }
      const portEntry = file.entries.find(
        (item) => item.key === (service.portConfigKey || "PORT") || item.key === "PORT",
      );
      onChange({
        envVars: file.entries.length ? file.entries : service.envVars,
        ...(portEntry && Number(portEntry.value) ? { port: portEntry.value } : {}),
      });
      toast.success("Variáveis carregadas do arquivo .env.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao ler o .env.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{showName ? service.name || `Serviço ${index + 1}` : "Comando e pasta"}</CardTitle>
          {canRemove ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 /> Remover
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {showName ? (
          <div className="sm:col-span-2 space-y-2">
            <Label>Nome do serviço</Label>
            <Input
              required
              value={service.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Frontend"
            />
          </div>
        ) : null}
        <div className="sm:col-span-2 space-y-2">
          <Label>Diretório</Label>
          <div className="flex gap-2">
            <Input
              required
              value={service.directory}
              onBlur={() => void validateDir()}
              onChange={(e) => onChange({ directory: e.target.value })}
              placeholder="/home/voce/projetos/loja/web"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => void pickFolder()}
            >
              <FolderOpen /> Buscar pasta
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {dirMessage ?? "Escolha a pasta no computador ou informe o caminho absoluto."}
          </p>
        </div>
        {icon ? (
          <IconField
            name={icon.name}
            iconPath={icon.path}
            directories={icon.directories}
            disabled={!service.directory.trim()}
            onChange={icon.onChange}
          />
        ) : null}
        <div className="space-y-2">
          <Label>Comando</Label>
          <Input
            required
            value={service.command}
            onChange={(e) => onChange({ command: e.target.value })}
            placeholder="npm run dev"
          />
        </div>
        <div className="space-y-2">
          <Label>Porta</Label>
          <Input
            required={service.portConfig === "arg"}
            type="number"
            min={1}
            max={65535}
            value={service.port}
            disabled={service.portConfig !== "arg"}
            onChange={(e) => onChange({ port: e.target.value })}
          />
          {service.portConfig !== "arg" ? (
            <p className="text-xs text-muted-foreground">
              {service.portConfig === "env"
                ? "A porta vem da variável de ambiente / .env."
                : "A aplicação define a porta sozinha."}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>URL</Label>
          <Input
            value={service.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="http://localhost:3000"
          />
        </div>
        <div className="space-y-2">
          <Label>Como recebe a porta</Label>
          <Select
            value={service.portConfig}
            onValueChange={(value) => {
              const portConfig = value as PortConfig;
              onChange({
                portConfig,
                portConfigKey: portConfig === "arg" ? "--port" : "PORT",
                syncEnvFile: portConfig === "env" ? true : service.syncEnvFile,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não configura porta</SelectItem>
              <SelectItem value="env">Variável de ambiente / .env</SelectItem>
              <SelectItem value="arg">Argumento de linha de comando</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor={`portConfigKey-${index}`}>Nome da variável</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Sobre o nome da variável"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="whitespace-pre-wrap">
                Essa variável é lida do arquivo .env. O valor encontrado é usado pelo botão Abrir
                como porta da aplicação, por exemplo http://localhost:5173.
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id={`portConfigKey-${index}`}
            value={service.portConfig === "env" ? service.portConfigKey : "PORT"}
            disabled={service.portConfig !== "env"}
            onChange={(e) => onChange({ portConfigKey: e.target.value })}
            placeholder="PORT"
          />
        </div>
        {service.portConfig === "arg" ? (
          <div className="space-y-2">
            <Label>Argumento</Label>
            <Input
              value={service.portConfigKey}
              onChange={(e) => onChange({ portConfigKey: e.target.value })}
              placeholder="--port"
            />
            <p className="text-xs text-muted-foreground">
              Flag passada no comando junto com a porta, por exemplo --port 3000.
            </p>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label>Arquivo .env</Label>
          <Input
            value={service.envFile}
            disabled={service.portConfig !== "env"}
            onChange={(e) => onChange({ envFile: e.target.value })}
            placeholder=".env"
          />
        </div>
        <label className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
          Atualizar .env ao iniciar
          <Switch
            checked={service.syncEnvFile}
            onCheckedChange={(checked) => onChange({ syncEnvFile: checked })}
          />
        </label>
        <label className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
          Porta automática
          <Switch
            checked={service.autoPort}
            onCheckedChange={(checked) => onChange({ autoPort: checked })}
            disabled={service.portConfig === "none"}
          />
        </label>
        <label className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
          Abrir no navegador
          <Switch
            checked={service.openInBrowser}
            onCheckedChange={(checked) => onChange({ openInBrowser: checked })}
          />
        </label>
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          Ao iniciar, o DevDesk injeta a porta no processo. Se “Atualizar .env ao iniciar” estiver ligado,
          também grava {service.portConfigKey || "PORT"} no arquivo sem apagar as outras chaves.
        </p>

        <div className="sm:col-span-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Variáveis extras</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void loadEnvFile()}>
                <FolderOpen /> Carregar do .env
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange({ envVars: [...service.envVars, { key: "", value: "" }] })}
              >
                <Plus /> Adicionar
              </Button>
            </div>
          </div>
          {service.envVars.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma variável extra. Use “Carregar do .env” para importar o arquivo do projeto.</p>
          ) : (
            service.envVars.map((item, envIndex) => (
              <div key={envIndex} className="flex gap-2">
                <Input
                  placeholder="PORT"
                  value={item.key}
                  onChange={(e) => {
                    const next = [...service.envVars];
                    next[envIndex] = { ...item, key: e.target.value };
                    onChange({ envVars: next });
                  }}
                />
                <Input
                  placeholder="3000"
                  value={item.value}
                  onChange={(e) => {
                    const next = [...service.envVars];
                    next[envIndex] = { ...item, value: e.target.value };
                    onChange({ envVars: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange({ envVars: service.envVars.filter((_, i) => i !== envIndex) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
