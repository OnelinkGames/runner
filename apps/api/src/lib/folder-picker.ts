import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import fs from "node:fs";
import { AppError } from "../errors.js";

const execFileAsync = promisify(execFile);

export async function pickDirectory(initialDir?: string): Promise<string | null> {
  const start = initialDir && fs.existsSync(initialDir) ? initialDir : os.homedir();

  try {
    if (process.platform === "linux") {
      return await pickLinux(start);
    }
    if (process.platform === "darwin") {
      return await pickMac(start);
    }
    if (process.platform === "win32") {
      return await pickWindows(start);
    }
  } catch (error) {
    if (isCanceled(error)) return null;
    throw error;
  }

  throw new AppError(
    501,
    "Seleção de pasta não suportada neste sistema. Informe o caminho manualmente.",
    "PICKER_UNSUPPORTED",
  );
}

export async function pickImageFile(initialDir?: string): Promise<string | null> {
  const start = initialDir && fs.existsSync(initialDir) ? initialDir : os.homedir();

  try {
    if (process.platform === "linux") {
      return await pickLinuxFile(start);
    }
    if (process.platform === "darwin") {
      return await pickMacFile(start);
    }
    if (process.platform === "win32") {
      return await pickWindowsFile(start);
    }
  } catch (error) {
    if (isCanceled(error)) return null;
    throw error;
  }

  throw new AppError(
    501,
    "Seleção de arquivo não suportada neste sistema. Informe o caminho manualmente.",
    "PICKER_UNSUPPORTED",
  );
}

async function pickLinux(start: string): Promise<string | null> {
  const tools: Array<() => Promise<string | null>> = [
    () => run(["zenity", "--file-selection", "--directory", `--filename=${start}/`, "--title=Selecionar pasta"]),
    () => run(["kdialog", "--getexistingdirectory", start, "--title", "Selecionar pasta"]),
    () => run(["yad", "--file-selection", "--directory", `--filename=${start}/`, "--title=Selecionar pasta"]),
    () => runPython(start),
  ];

  for (const tool of tools) {
    try {
      return await tool();
    } catch (error) {
      if (isCanceled(error)) return null;
    }
  }

  throw new AppError(
    501,
    "Não foi possível abrir o seletor de pastas. No Linux, instale o zenity (`sudo apt install zenity`) ou informe o caminho manualmente.",
    "PICKER_UNAVAILABLE",
  );
}

async function pickLinuxFile(start: string): Promise<string | null> {
  const tools: Array<() => Promise<string | null>> = [
    () =>
      run([
        "zenity",
        "--file-selection",
        `--filename=${start}/`,
        "--title=Selecionar ícone",
        "--file-filter=Imagens | *.png *.svg *.ico *.webp *.jpg *.jpeg *.gif",
      ]),
    () =>
      run([
        "kdialog",
        "--getopenfilename",
        start,
        "Imagens (*.png *.svg *.ico *.webp *.jpg *.jpeg *.gif)",
        "--title",
        "Selecionar ícone",
      ]),
    () =>
      run([
        "yad",
        "--file-selection",
        `--filename=${start}/`,
        "--title=Selecionar ícone",
        "--file-filter=Imagens | *.png *.svg *.ico *.webp *.jpg *.jpeg *.gif",
      ]),
    () => runPythonFile(start),
  ];

  for (const tool of tools) {
    try {
      return await tool();
    } catch (error) {
      if (isCanceled(error)) return null;
    }
  }

  throw new AppError(
    501,
    "Não foi possível abrir o seletor de arquivos. No Linux, instale o zenity (`sudo apt install zenity`) ou informe o caminho manualmente.",
    "PICKER_UNAVAILABLE",
  );
}

async function pickMac(start: string): Promise<string | null> {
  const script = `
    set defaultPath to POSIX file ${JSON.stringify(start)}
    try
      POSIX path of (choose folder with prompt "Selecionar pasta" default location defaultPath)
    on error number -128
      return ""
    end try
  `;
  const { stdout } = await execFileAsync("osascript", ["-e", script], { timeout: 180_000 });
  const path = stdout.trim();
  return path || null;
}

async function pickMacFile(start: string): Promise<string | null> {
  const script = `
    set defaultPath to POSIX file ${JSON.stringify(start)}
    try
      POSIX path of (choose file with prompt "Selecionar ícone" default location defaultPath of type {"public.png", "public.jpeg", "public.svg-image", "public.webp", "com.microsoft.ico", "public.gif"})
    on error number -128
      return ""
    end try
  `;
  const { stdout } = await execFileAsync("osascript", ["-e", script], { timeout: 180_000 });
  const path = stdout.trim();
  return path || null;
}

async function pickWindows(start: string): Promise<string | null> {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Selecionar pasta'
$dialog.SelectedPath = ${JSON.stringify(start)}
$dialog.ShowNewFolderButton = $true
$origin = New-Object System.Windows.Forms.Form
$origin.TopMost = $true
$origin.StartPosition = 'CenterScreen'
if ($dialog.ShowDialog($origin) -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.SelectedPath
}
`;
  const { stdout } = await execFileAsync(
    "powershell",
    ["-NoProfile", "-STA", "-Command", script],
    { timeout: 180_000, windowsHide: true },
  );
  const path = stdout.trim();
  return path || null;
}

async function pickWindowsFile(start: string): Promise<string | null> {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Selecionar ícone'
$dialog.InitialDirectory = ${JSON.stringify(start)}
$dialog.Filter = 'Imagens|*.png;*.svg;*.ico;*.webp;*.jpg;*.jpeg;*.gif|Todos|*.*'
$origin = New-Object System.Windows.Forms.Form
$origin.TopMost = $true
$origin.StartPosition = 'CenterScreen'
if ($dialog.ShowDialog($origin) -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.FileName
}
`;
  const { stdout } = await execFileAsync(
    "powershell",
    ["-NoProfile", "-STA", "-Command", script],
    { timeout: 180_000, windowsHide: true },
  );
  const path = stdout.trim();
  return path || null;
}

async function runPython(start: string): Promise<string | null> {
  const script = `
import os, sys
try:
    import tkinter as tk
    from tkinter import filedialog
except Exception:
    sys.exit(2)
root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)
path = filedialog.askdirectory(title="Selecionar pasta", initialdir=${JSON.stringify(start)})
if path:
    print(path)
`;
  const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 180_000 });
  const path = stdout.trim();
  return path || null;
}

async function runPythonFile(start: string): Promise<string | null> {
  const script = `
import os, sys
try:
    import tkinter as tk
    from tkinter import filedialog
except Exception:
    sys.exit(2)
root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)
path = filedialog.askopenfilename(
    title="Selecionar ícone",
    initialdir=${JSON.stringify(start)},
    filetypes=[("Imagens", "*.png *.svg *.ico *.webp *.jpg *.jpeg *.gif"), ("Todos", "*.*")],
)
if path:
    print(path)
`;
  const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 180_000 });
  const path = stdout.trim();
  return path || null;
}

async function run(argv: string[]): Promise<string | null> {
  const [bin, ...args] = argv;
  try {
    const { stdout } = await execFileAsync(bin, args, { timeout: 180_000 });
    const path = stdout.trim();
    return path || null;
  } catch (error) {
    if (isCanceled(error)) return null;
    throw error;
  }
}

function isCanceled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: number | string; killed?: boolean };
  return err.code === 1 || err.code === "1";
}
