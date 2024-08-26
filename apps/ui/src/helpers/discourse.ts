import { SIDEKICK_URL } from '@/helpers/constants';

const PROXY_URL = `${SIDEKICK_URL}/api/proxy`;

export interface Post {
  posts_count: number;
}

export interface Reply {
  username: string;
  name: string;
  created_at: number;
  avatar_template: string;
  cooked: string;
  like_count: number;
  reply_count: number;
  reads: number;
  user_url: string;
}

export async function loadSinglePost(url: string): Promise<Post> {
  const baseUrl = new URL(url).origin;
  const topicId = new URL(url).pathname.split('/')[3];

  const res = await fetch(
    `${PROXY_URL}/${encodeURIComponent(`${baseUrl}/t/${topicId}.json`)}`
  );
  return await res.json();
}

export async function loadReplies(url: string): Promise<Reply[]> {
  const baseUrl = new URL(url).origin;
  const topicId = new URL(url).pathname.split('/')[3];

  const res = await fetch(
    `${PROXY_URL}/${encodeURIComponent(`${baseUrl}/t/${topicId}/posts.json`)}`
  );
  const data = await res.json();

  return data.post_stream.posts.map(post => {
    post.avatar_template = post.avatar_template.replace('{size}', '64');
    if (post.avatar_template.startsWith('/'))
      post.avatar_template = `${baseUrl}${post.avatar_template}`;

    post.name = post.display_username || post.name || post.username;
    post.like_count = post.actions_summary.find(a => a.id === 2)?.count || 0;
    post.created_at = Date.parse(post.created_at) / 1000;
    post.user_url = `${baseUrl}/u/${post.username}`;

    return post;
  });
}
