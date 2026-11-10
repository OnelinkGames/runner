import type { FastifyInstance } from "fastify";
import { groupInputSchema } from "../services/group-service.js";
import * as groupService from "../services/group-service.js";
import * as processManager from "../services/process-manager.js";

export async function registerGroupRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/groups", async () => groupService.listGroups());

  app.post("/api/groups", async (request, reply) => {
    const parsed = groupInputSchema.parse(request.body);
    const created = groupService.createGroup(parsed.name);
    return reply.code(201).send(created);
  });

  app.put("/api/groups/:id", async (request) => {
    const id = Number((request.params as { id: string }).id);
    const parsed = groupInputSchema.parse(request.body);
    return groupService.updateGroup(id, parsed.name);
  });

  app.delete("/api/groups/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    groupService.removeGroup(id);
    return reply.code(204).send();
  });

  app.post("/api/groups/:id/start", async (request) => {
    const id = Number((request.params as { id: string }).id);
    groupService.getGroupOrThrow(id);
    return processManager.startGroup(id);
  });

  app.post("/api/groups/:id/stop", async (request) => {
    const id = Number((request.params as { id: string }).id);
    groupService.getGroupOrThrow(id);
    return processManager.stopGroup(id);
  });
}
