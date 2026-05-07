import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchPost,
  fetchComments,
  addComment,
  toggleLike,
  deletePost,
  deleteComment,
} from "@/lib/forum/api";
import type { ForumComment, ForumPostWithStats } from "@/lib/forum/types";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
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

export default function ForumPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<ForumPostWithStats | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, c] = await Promise.all([fetchPost(id), fetchComments(id)]);
      if (!p) {
        toast.error("Konu bulunamadı.");
        navigate("/forum");
        return;
      }
      setPost(p);
      setComments(c);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Yüklenemedi";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleLike = async () => {
    if (!user) {
      toast.info("Beğenmek için giriş yap.");
      navigate("/auth");
      return;
    }
    if (!post) return;
    setPost({
      ...post,
      liked_by_me: !post.liked_by_me,
      like_count: post.like_count + (post.liked_by_me ? -1 : 1),
    });
    try {
      await toggleLike(post.id);
    } catch (e) {
      setPost({
        ...post,
        liked_by_me: !post.liked_by_me,
        like_count: post.like_count + (post.liked_by_me ? -1 : 1),
      });
      const msg = e instanceof Error ? e.message : "Beğeni kaydedilemedi";
      toast.error(msg);
    }
  };

  const submitComment = async () => {
    if (!post) return;
    if (!user) {
      toast.info("Yorum için giriş yap.");
      navigate("/auth");
      return;
    }
    if (reply.trim().length < 1) return;
    setSubmitting(true);
    try {
      const c = await addComment(post.id, reply);
      setComments([...comments, c]);
      setPost({ ...post, comment_count: post.comment_count + 1 });
      setReply("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Yorum eklenemedi";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!confirm("Bu konuyu silmek istediğine emin misin?")) return;
    try {
      await deletePost(post.id);
      toast.success("Silindi.");
      navigate("/forum");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Silinemedi";
      toast.error(msg);
    }
  };

  const handleDeleteComment = async (cid: string) => {
    try {
      await deleteComment(cid);
      setComments(comments.filter((c) => c.id !== cid));
      if (post) setPost({ ...post, comment_count: Math.max(0, post.comment_count - 1) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Silinemedi";
      toast.error(msg);
    }
  };

  if (loading || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const myPost = user?.id === post.user_id;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/forum")} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-sm font-bold flex-1 truncate">{post.title}</h1>
          {myPost && (
            <Button variant="ghost" size="sm" onClick={handleDeletePost} className="h-8 w-8 p-0 text-bearish hover:text-bearish">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        {/* Post */}
        <Card className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold flex-1">{post.title}</h2>
            {post.ticker && (
              <Badge variant="secondary" className="font-mono">
                {post.ticker}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">@{post.author_name ?? "üye"}</span>
            <span>·</span>
            <span>{timeAgo(post.created_at)}</span>
          </div>

          <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.body}</p>

          <div className="flex items-center gap-4 pt-2 border-t border-border text-sm">
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 hover:text-primary transition-colors",
                post.liked_by_me && "text-primary"
              )}
            >
              <Heart className={cn("w-4 h-4", post.liked_by_me && "fill-current")} />
              <span>{post.like_count}</span>
            </button>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comment_count}</span>
            </div>
          </div>
        </Card>

        {/* Yorum yazma */}
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Yorum yaz</h3>
          {!user ? (
            <p className="text-xs text-muted-foreground">
              Yorum yazmak için{" "}
              <button onClick={() => navigate("/auth")} className="text-primary underline-offset-2 hover:underline">
                giriş yap
              </button>
              .
            </p>
          ) : (
            <>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Düşünceni yaz..."
                rows={3}
                maxLength={2000}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={submitComment} disabled={submitting || reply.trim().length === 0} className="gap-1.5">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Gönder
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Yorumlar */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground px-1">
            {comments.length} yorum
          </h3>
          {comments.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Henüz yorum yok. İlk sen ol.
            </Card>
          ) : (
            comments.map((c) => {
              const myComment = user?.id === c.user_id;
              return (
                <Card key={c.id} className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-mono">@{c.author_name ?? "üye"}</span>
                      <span>·</span>
                      <span>{timeAgo(c.created_at)}</span>
                    </div>
                    {myComment && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-muted-foreground hover:text-bearish"
                        aria-label="Yorumu sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
