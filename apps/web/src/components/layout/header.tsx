import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Header({
  search,
  onSearchChange,
  title,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  title: string;
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-white/5 bg-black/20 px-6 backdrop-blur-xl">
      <h1 className="text-sm font-medium tracking-wide text-muted-foreground">{title}</h1>
      {onSearchChange ? (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar aplicações..."
            className="pl-9"
          />
        </div>
      ) : (
        <div />
      )}
    </header>
  );
}
