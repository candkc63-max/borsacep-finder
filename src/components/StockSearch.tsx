import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface StockSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function StockSearch({ value, onChange, className }: StockSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Hisse ara · THYAO, Garanti, banka"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border-border bg-background/80 pl-9 font-mono text-sm shadow-none"
      />
    </div>
  );
}
