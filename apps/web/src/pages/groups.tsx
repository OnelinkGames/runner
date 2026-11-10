import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useApplications, useGroups } from "@/hooks/use-api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function GroupsPage() {
  const queryClient = useQueryClient();
  const groupsQuery = useGroups();
  const appsQuery = useApplications();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["groups"] });
    await queryClient.invalidateQueries({ queryKey: ["applications"] });
  };

  const createMut = useMutation({
    mutationFn: api.createGroup,
    onSuccess: async () => {
      setName("");
      toast.success("Grupo criado.");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.updateGroup(id, name),
    onSuccess: async () => {
      setEditing(null);
      toast.success("Grupo atualizado.");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMut = useMutation({
    mutationFn: api.deleteGroup,
    onSuccess: async () => {
      toast.success("Grupo excluído.");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const groups = groupsQuery.data ?? [];
  const apps = appsQuery.data ?? [];

  return (
    <>
      <Header title="Grupos" />
      <main className="flex-1 overflow-auto p-6">
        <form
          className="mb-6 flex max-w-lg gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) createMut.mutate(name.trim());
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do grupo"
          />
          <Button type="submit" disabled={createMut.isPending}>
            <Plus /> Criar
          </Button>
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => {
            const members = apps.filter((app) => app.groupId === group.id);
            return (
              <Card key={group.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {members.length} {members.length === 1 ? "aplicação" : "aplicações"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(group)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(group.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {members.map((app) => (
                      <li key={app.id}>{app.name}</li>
                    ))}
                    {members.length === 0 ? <li>Nenhuma aplicação neste grupo.</li> : null}
                  </ul>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await api.startGroup(group.id);
                        toast.success("Grupo iniciado.");
                        await invalidate();
                      }}
                      disabled={!members.length}
                    >
                      <Play /> Iniciar grupo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await api.stopGroup(group.id);
                        toast.success("Grupo parado.");
                        await invalidate();
                      }}
                      disabled={!members.length}
                    >
                      <Square /> Parar grupo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear grupo</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (editing) updateMut.mutate(editing);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="group-name">Nome</Label>
              <Input
                id="group-name"
                value={editing?.name ?? ""}
                onChange={(event) =>
                  setEditing((current) => (current ? { ...current, name: event.target.value } : current))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
