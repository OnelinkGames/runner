import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/aplicacoes": "Aplicações",
  "/aplicacoes/nova": "Nova aplicação",
  "/grupos": "Grupos",
  "/configuracoes": "Configurações",
};

export function AppShell() {
  const location = useLocation();
  const title =
    titles[location.pathname] ??
    (location.pathname.startsWith("/aplicacoes/") ? "Editar aplicação" : "DevDesk");

  return (
    <div className="app-canvas flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet context={{ title }} />
      </div>
    </div>
  );
}
