import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  CATEGORY_LABEL,
  formatDuration,
  formatPublishedAt,
  type VideoEntry,
} from "@/lib/videos/types";

interface Props {
  video: VideoEntry | null;
  onClose: () => void;
}

/**
 * Üyeye özel video oynatıcı — YouTube embed (privacy-enhanced mode).
 * `youtube-nocookie.com` kullanılıyor — kullanıcı izleme verisi
 * Google'a gitmeden video sunulur.
 */
export function VideoPlayerDialog({ video, onClose }: Props) {
  return (
    <Dialog open={!!video} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl gap-0 p-0 overflow-hidden">
        {video && (
          <>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                key={video.id}
                src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            <div className="space-y-2 p-5">
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                  {CATEGORY_LABEL[video.category]}
                </span>
                <span>·</span>
                <span>{formatDuration(video.durationSec)}</span>
                <span>·</span>
                <span>{formatPublishedAt(video.publishedAt)}</span>
              </div>
              <h2 className="text-lg font-semibold text-foreground">{video.title}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {video.description}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
