import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { HOST, DEFAULT_LISTEN_PORT } from "./config.js";
import { initDatabase } from "./db/index.js";
import { isAppError } from "./errors.js";
import { connectPm2, disconnectPm2 } from "./lib/pm2.js";
import { registerApplicationRoutes } from "./routes/applications.js";
import { registerGroupRoutes } from "./routes/groups.js";
import { registerSettingsRoutes, registerUtilityRoutes } from "./routes/utility.js";
import { getSettings } from "./services/settings-service.js";
import { autoStartApplications } from "./services/process-manager.js";

async function main(): Promise<void> {
  initDatabase();
  const settings = getSettings();

  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: ["http://localhost:5174", "http://127.0.0.1:5174"],
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const path = issue?.path?.length ? `${issue.path.join(".")}: ` : "";
      const message = `${path}${issue?.message ?? "Dados inválidos."}`;
      return reply.code(400).send({ error: message, code: "VALIDATION_ERROR" });
    }
    if (isAppError(error)) {
      return reply.code(error.statusCode).send({ error: error.message, code: error.code });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "Erro interno do servidor.", code: "INTERNAL" });
  });

  await registerUtilityRoutes(app);
  await registerSettingsRoutes(app);
  await registerGroupRoutes(app);
  await registerApplicationRoutes(app);

  const port = settings.backendPort || DEFAULT_LISTEN_PORT;

  const shutdown = async () => {
    await app.close();
    await disconnectPm2();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ host: HOST, port });
  app.log.info(`DevDesk API em http://${HOST}:${port}`);

  try {
    await connectPm2();
    if (settings.autoStartEnabled) {
      await autoStartApplications();
    }
  } catch (error) {
    app.log.warn(error, "PM2 indisponível na inicialização");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
