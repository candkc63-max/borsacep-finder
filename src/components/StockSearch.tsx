import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface StockSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function StockSearch({ value, onChange }: StockSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder="Hisse ara... (örn: THYAO, Garanti)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 h-9 bg-card border-border font-mono text-sm"
      />
    </div>
  );
}