export function parseCommand(command: string): { script: string; args: string[] } {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new Error("O comando não pode estar vazio.");
  }

  const parts: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (const char of trimmed) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) parts.push(current);
  if (parts.length === 0) {
    throw new Error("O comando não pode estar vazio.");
  }

  return { script: parts[0], args: parts.slice(1) };
}

export function pm2NameFor(serviceId: number): string {
  return `devdesk-svc-${serviceId}`;
}
