import { supabase } from "@/lib/backend";
import type { ForumPost, ForumComment, ForumPostWithStats } from "./types";

// TS schema'sında forum tabloları yok — cast hilesi.
const sb = supabase as unknown as {
  from: (t: string) => any;
  auth: typeof supabase.auth;
};

export async function fetchPosts(opts?: { ticker?: string; limit?: number }): Promise<ForumPostWithStats[]> {
  const limit = opts?.limit ?? 50;
  let q = sb.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(limit);
  if (opts?.ticker) q = q.eq("ticker", opts.ticker);
  const { data: posts, error } = await q;
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const ids = posts.map((p: ForumPost) => p.id);
  const { data: stats } = await sb.from("forum_post_stats").select("*").in("post_id", ids);

  const me = (await sb.auth.getUser()).data.user?.id;
  let likedSet = new Set<string>();
  if (me) {
    const { data: likes } = await sb.from("forum_likes").select("post_id").eq("user_id", me).in("post_id", ids);
    likedSet = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
  }

  const statMap = new Map<string, { like_count: number; comment_count: number }>();
  (stats ?? []).forEach((s: { post_id: string; like_count: number; comment_count: number }) => {
    statMap.set(s.post_id, { like_count: s.like_count, comment_count: s.comment_count });
  });

  return posts.map((p: ForumPost) => ({
    ...p,
    like_count: statMap.get(p.id)?.like_count ?? 0,
    comment_count: statMap.get(p.id)?.comment_count ?? 0,
    liked_by_me: likedSet.has(p.id),
  }));
}

export async function fetchPost(id: string): Promise<ForumPostWithStats | null> {
  const { data, error } = await sb.from("forum_posts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: stat } = await sb.from("forum_post_stats").select("*").eq("post_id", id).maybeSingle();
  const me = (await sb.auth.getUser()).data.user?.id;
  let liked = false;
  if (me) {
    const { data: likeRow } = await sb.from("forum_likes").select("post_id").eq("user_id", me).eq("post_id", id).maybeSingle();
    liked = !!likeRow;
  }

  return {
    ...(data as ForumPost),
    like_count: stat?.like_count ?? 0,
    comment_count: stat?.comment_count ?? 0,
    liked_by_me: liked,
  };
}

export async function createPost(input: { title: string; body: string; ticker?: string | null; author_name?: string | null }) {
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Giriş yapman gerekiyor.");

  const { data, error } = await sb
    .from("forum_posts")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      body: input.body.trim(),
      ticker: input.ticker?.trim().toUpperCase() || null,
      author_name: input.author_name ?? user.email?.split("@")[0] ?? "üye",
    })
    .select()
    .single();

  if (error) throw error;
  return data as ForumPost;
}

export async function deletePost(id: string) {
  const { error } = await sb.from("forum_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchComments(postId: string): Promise<ForumComment[]> {
  const { data, error } = await sb
    .from("forum_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ForumComment[];
}

export async function addComment(postId: string, body: string) {
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Giriş yapman gerekiyor.");

  const { data, error } = await sb
    .from("forum_comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      author_name: user.email?.split("@")[0] ?? "üye",
      body: body.trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as ForumComment;
}

export async function deleteComment(id: string) {
  const { error } = await sb.from("forum_comments").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleLike(postId: string): Promise<{ liked: boolean }> {
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Giriş yapman gerekiyor.");

  const { data: existing } = await sb
    .from("forum_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from("forum_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    if (error) throw error;
    return { liked: false };
  } else {
    const { error } = await sb.from("forum_likes").insert({ post_id: postId, user_id: user.id });
    if (error) throw error;
    return { liked: true };
  }
}
