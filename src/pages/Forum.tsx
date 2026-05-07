import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { fetchPosts, toggleLike } from "@/lib/forum/api";
import type { ForumPostWithStats } from "@/lib/forum/types";
import { ArrowLeft, Heart, MessageCircle, PenSquare, RefreshCw, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün`;
  return new Date(iso).toLocaleDateString("tr-TR");
}

export default function Forum() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPosts({ limit: 100 });
      setPosts(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Yüklenemedi";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLike = async (id: string) => {
    if (!user) {
      toast.info("Beğenmek için giriş yap.");
      navigate("/auth");
      return;
    }
    setPosts((cur) =>
      cur.map((p) =>
        p.id === id
          ? {
              ...p,
              liked_by_me: !p.liked_by_me,
              like_count: p.like_count + (p.liked_by_me ? -1 : 1),
            }
          : p
      )
    );
    try {
      await toggleLike(id);
    } catch (e) {
      // revert
      setPosts((cur) =>
        cur.map((p) =>
          p.id === id
            ? {
                ...p,
                liked_by_me: !p.liked_by_me,
                like_count: p.like_count + (p.liked_by_me ? -1 : 1),
              }
            : p
        )
      );
      const msg = e instanceof Error ? e.message : "Beğeni kaydedilemedi";
      toast.error(msg);
    }
  };

  const filtered = search.trim()
    ? posts.filter((p) => {
        const q = search.toLowerCase().trim();
        return (
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.ticker?.toLowerCase().includes(q) ||
          p.author_name?.toLowerCase().includes(q)
        );
      })
    : posts;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-bold flex-1">Forum — Üye Sohbeti</h1>
          <Button variant="ghost" size="sm" onClick={load} className="h-8 w-8 p-0" title="Yenile">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          {user ? (
            <Button size="sm" onClick={() => navigate("/forum/yeni")} className="h-8 gap-1.5">
              <PenSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Yeni Konu</span>
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")} className="h-8">
              Giriş Yap
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Konu, hisse veya yazar ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {!user && (
          <Card className="p-4 border-primary/30 bg-primary/5">
            <p className="text-sm">
              Forumda yazmak ve beğenmek için{" "}
              <Link to="/auth" className="text-primary font-semibold underline-offset-2 hover:underline">
                üye ol veya giriş yap
              </Link>
              . Okumak serbesttir.
            </p>
          </Card>
        )}

        {loading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {search ? "Aramanla eşleşen konu yok." : "Henüz konu yok. İlk yazan sen ol!"}
            </p>
            {user && !search && (
              <Button size="sm" onClick={() => navigate("/forum/yeni")} className="gap-1.5">
                <PenSquare className="w-4 h-4" /> İlk Konuyu Aç
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <Card key={p.id} className="p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link to={`/forum/${p.id}`} className="flex-1 group">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                      {p.title}
                    </h3>
                  </Link>
                  {p.ticker && (
                    <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                      {p.ticker}
                    </Badge>
                  )}
                </div>

                <Link to={`/forum/${p.id}`}>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.body}</p>
                </Link>

                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="font-mono">@{p.author_name ?? "üye"}</span>
                  <span>·</span>
                  <span>{timeAgo(p.created_at)}</span>
                  <div className="flex-1" />

                  <button
                    onClick={() => handleLike(p.id)}
                    className={cn(
                      "flex items-center gap-1 hover:text-primary transition-colors",
                      p.liked_by_me && "text-primary"
                    )}
                  >
                    <Heart className={cn("w-3.5 h-3.5", p.liked_by_me && "fill-current")} />
                    <span>{p.like_count}</span>
                  </button>

                  <Link
                    to={`/forum/${p.id}`}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{p.comment_count}</span>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
