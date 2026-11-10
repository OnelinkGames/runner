import net from "node:net";

export function isPortAvailable(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

export async function findAvailablePort(startPort: number): Promise<number> {
  const begin = Math.min(Math.max(startPort, 1), 65535);
  for (let port = begin; port <= 65535; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error("Nenhuma porta disponível foi encontrada.");
}
