import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  formatDuration,
  formatPublishedAt,
  youtubeThumbnail,
  type VideoEntry,
} from "@/lib/videos/types";

interface Props {
  video: VideoEntry;
  onPlay: (v: VideoEntry) => void;
}

export function VideoCard({ video, onPlay }: Props) {
  return (
    <Card
      onClick={() => onPlay(video)}
      className={cn(
        "group cursor-pointer overflow-hidden border-border bg-card transition-all",
        "hover:border-primary/50 hover:shadow-lg",
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={youtubeThumbnail(video.youtubeId)}
          alt={video.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] text-white">
          {formatDuration(video.durationSec)}
        </div>
        {video.premium && (
          <div className="absolute left-2 top-2 rounded bg-yellow-500/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-950">
            Premium
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
            {CATEGORY_LABEL[video.category]}
          </span>
          <span>·</span>
          <span>{formatPublishedAt(video.publishedAt)}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {video.title}
        </h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">{video.description}</p>
      </div>
    </Card>
  );
}
