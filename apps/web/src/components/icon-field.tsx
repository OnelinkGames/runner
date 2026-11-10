import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Search, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { IconCandidate } from "@devdesk/shared";
import { api } from "@/api/client";
import { AppIcon } from "@/components/app-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function IconField({
  name,
  iconPath,
  directories,
  disabled = false,
  onChange,
}: {
  name: string;
  iconPath: string | null;
  directories: string[];
  disabled?: boolean;
  onChange: (path: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [icons, setIcons] = useState<IconCandidate[]>([]);
  const [scanning, setScanning] = useState(false);

  const folders = useMemo(
    () => [...new Set(directories.map((item) => item.trim()).filter(Boolean))],
    [directories.join("\n")],
  );

  useEffect(() => {
    if (disabled || !folders.length) {
      setIcons([]);
      return;
    }
    let active = true;
    void api
      .scanIcons(folders)
      .then((result) => {
        if (active) setIcons(result.icons);
      })
      .catch(() => {
        if (active) setIcons([]);
      });
    return () => {
      active = false;
    };
  }, [disabled, folders.join("\n")]);

  const autoIcon = icons[0]?.path ?? null;
  const previewPath = iconPath ?? autoIcon;
  const previewSrc = previewPath ? api.iconPreviewUrl(previewPath) : null;

  async function scanAndOpen() {
    if (disabled || !folders.length) {
      toast.error("Informe a pasta do projeto antes de buscar o ícone.");
      return;
    }
    setScanning(true);
    try {
      const result = await api.scanIcons(folders);
      setIcons(result.icons);
      setOpen(true);
      if (!result.icons.length) {
        toast.message("Nenhum ícone encontrado na pasta. Você pode escolher um arquivo.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível buscar ícones.");
    } finally {
      setScanning(false);
    }
  }

  async function pickFile() {
    if (disabled) return;
    try {
      toast.message("Uma janela do sistema vai abrir para escolher o ícone.");
      const result = await api.pickIcon(folders[0]);
      if (result.canceled || !result.path) return;
      onChange(result.path);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o seletor de arquivos.");
    }
  }

  return (
    <div className={cn("sm:col-span-2 space-y-2", disabled && "opacity-60")}>
      <Label>Ícone</Label>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border px-3 py-3">
        <AppIcon src={disabled ? null : previewSrc} alt={name || "Ícone"} className="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {disabled
              ? "Informe o diretório acima para buscar ou escolher o ícone."
              : iconPath
                ? "Ícone escolhido manualmente."
                : autoIcon
                  ? "Detectado automaticamente na pasta do projeto."
                  : "Nenhum ícone encontrado ainda. Informe a pasta ou busque um arquivo."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void scanAndOpen()}
              disabled={disabled || scanning}
            >
              <Search /> Buscar no projeto
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void pickFile()} disabled={disabled}>
              <ImagePlus /> Escolher arquivo
            </Button>
            {iconPath ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)} disabled={disabled}>
                <RotateCcw /> Usar automático
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl" onCloseAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Escolher ícone</DialogTitle>
          </DialogHeader>
          {icons.length ? (
            <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-auto sm:grid-cols-4">
              {icons.map((icon) => {
                const selected = iconPath === icon.path;
                return (
                  <button
                    key={icon.path}
                    type="button"
                    className={`rounded-xl border p-2 text-left transition-colors hover:border-primary/60 ${
                      selected ? "border-primary bg-primary/10" : "border-border"
                    }`}
                    onClick={() => {
                      onChange(icon.path);
                      setOpen(false);
                    }}
                  >
                    <AppIcon src={api.iconPreviewUrl(icon.path)} alt={icon.name} className="mx-auto h-10 w-10" />
                    <p className="mt-2 truncate text-xs text-muted-foreground" title={icon.relativePath}>
                      {icon.relativePath}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum ícone encontrado nessas pastas.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
