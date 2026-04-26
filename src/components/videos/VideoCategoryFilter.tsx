import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, CATEGORY_ORDER, type VideoCategory } from "@/lib/videos/types";

interface Props {
  active: VideoCategory | "all";
  counts: Record<VideoCategory | "all", number>;
  onChange: (cat: VideoCategory | "all") => void;
}

export function VideoCategoryFilter({ active, counts, onChange }: Props) {
  const items: Array<{ id: VideoCategory | "all"; label: string }> = [
    { id: "all", label: "Tümü" },
    ...CATEGORY_ORDER.map((c) => ({ id: c, label: CATEGORY_LABEL[c] })),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const isActive = active === it.id;
        const count = counts[it.id] ?? 0;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            disabled={count === 0 && it.id !== "all"}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-muted",
              count === 0 && it.id !== "all" && "opacity-40 cursor-not-allowed",
            )}
          >
            {it.label}
            {count > 0 && (
              <span
                className={cn(
                  "ml-1.5 inline-block min-w-[18px] rounded-full px-1 text-[10px] font-mono",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
