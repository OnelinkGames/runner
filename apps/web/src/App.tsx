import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/dashboard";
import { ApplicationsPage } from "@/pages/applications";
import { ApplicationFormPage } from "@/pages/application-form";
import { GroupsPage } from "@/pages/groups";
import { SettingsPage } from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/aplicacoes" element={<ApplicationsPage />} />
              <Route path="/aplicacoes/nova" element={<ApplicationFormPage />} />
              <Route path="/aplicacoes/:id" element={<ApplicationFormPage />} />
              <Route path="/grupos" element={<GroupsPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" richColors position="bottom-right" toastOptions={{ className: "rounded-2xl" }} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
