export type ForumPost = {
  id: string;
  user_id: string;
  author_name: string | null;
  title: string;
  body: string;
  ticker: string | null;
  created_at: string;
  updated_at: string;
};

export type ForumComment = {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
};

export type ForumPostWithStats = ForumPost & {
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};
