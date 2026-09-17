import { SIDEKICK_URL } from '@/helpers/constants';

const PROXY_URL = `${SIDEKICK_URL}/api/proxy`;

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

export interface Topic {
  id: number;
  title: string;
  username: string;
  created: number;
  updated: number;
  reply_count: number;
  views: number;
  pinned: boolean;
  closed: boolean;
  posts_count: number;
  url: string;
  user_url: string;
  users: User[];
  latest_poster: User;
}

export interface TopicWithPosts
  extends Pick<Topic, 'id' | 'title' | 'posts_count'> {
  posts: Reply[];
}

export interface User {
  id: number;
  username: string;
  name: string;
  avatar_template: string;
  moderator: boolean;
}

type DiscourseTopic = Pick<
  Topic,
  'id' | 'title' | 'reply_count' | 'views' | 'pinned' | 'closed' | 'posts_count'
> & {
  created_at: string;
  last_posted_at: string;
  last_poster_username: string;
  posters: { user_id: number }[];
};

type DiscoursePost = Pick<
  Reply,
  'username' | 'name' | 'avatar_template' | 'cooked' | 'reply_count' | 'reads'
> & {
  display_username: string;
  created_at: string;
  post_number: number;
  actions_summary: { id: number; count: number }[];
};

export const SPACES_DISCUSSIONS: Record<string, string> = {
  's:ens.eth': 'https://discuss.ens.domains/c/meta-governance/28',
  's:safe.eth': 'https://forum.safe.global/c/proposals/21',
  's:balancer.eth': 'https://forum.balancer.fi/c/governance/7',
  's:uniswapgovernance.eth': 'https://gov.uniswap.org/c/proposal-discussion/5',
  's:lido-snapshot.eth': 'https://research.lido.fi/c/proposals/9',
  's:apecoin.eth': 'https://forum.apecoin.com/c/active-proposals/72',
  'sn:0x009fedaf0d7a480d21a27683b0965c0f8ded35b3f1cac39827a25a06a8a682a4':
    'https://community.starknet.io/c/governance/15',
  's:aavedao.eth': 'https://governance.aave.com/c/governance/4',
  's:opcollective.eth': 'https://gov.optimism.io/c/technical-proposals/47',
  's:shutterdao0x36.eth':
    'https://shutternetwork.discourse.group/c/shutter-dao/14',
  's:arbitrumfoundation.eth': 'https://forum.arbitrum.foundation/c/proposals/7',
  's:gitcoindao.eth': 'https://gov.gitcoin.co/c/governance-proposals/5',
  's:g-dao.eth': 'https://forum.gravity.xyz/c/governance/5',
  's:graphprotocol.eth': 'https://forum.thegraph.com/c/governance-gips/17',
  's:shapeshiftdao.eth': 'https://forum.shapeshift.com/c/proposal-discussion/8',
  's:cow.eth': 'https://forum.cow.fi/c/cow-improvement-proposals-cip/6',
  's:walletconnect.eth':
    'https://governance.walletconnect.network/c/proposals/6',
  's:badgerdao.eth':
    'https://forum.badger.finance/c/badger-improvement-proposals-bip/5',
  'sn:0x07c251045154318a2376a3bb65be47d3c90df1740d8e35c9b9d943aa3f240e50':
    'https://www.nostra.family/c/general/4',
  's:odos.eth': 'https://forum.odos.xyz/c/governance/5'
};

function formatAvatarTemplate(avatarTemplate: string, baseUrl: string) {
  const avatar = avatarTemplate.replace('{size}', '64');

  return avatar.startsWith('/') ? `${baseUrl}${avatar}` : avatar;
}

function formatUser(user: User, baseUrl: string): User {
  return {
    ...user,
    avatar_template: formatAvatarTemplate(user.avatar_template, baseUrl)
  };
}

function formatTopic(
  topic: DiscourseTopic,
  users: User[],
  baseUrl: string
): Topic {
  const posterUsers = topic.posters.flatMap(poster => {
    const user = users.find(user => user.id === poster.user_id);

    return user ? [formatUser(user, baseUrl)] : [];
  });

  const latestPoster = posterUsers.find(
    user => user.username === topic.last_poster_username
  );
  if (!latestPoster) throw new Error('Latest poster not found');

  return {
    id: topic.id,
    title: topic.title,
    username: topic.last_poster_username,
    created: Date.parse(topic.created_at) / 1000,
    updated: Date.parse(topic.last_posted_at) / 1000,
    reply_count: topic.reply_count,
    views: topic.views,
    pinned: topic.pinned,
    closed: topic.closed,
    posts_count: topic.posts_count - 1,
    url: `${baseUrl}/t/${topic.id}`,
    user_url: `${baseUrl}/u/${topic.last_poster_username}`,
    users: posterUsers,
    latest_poster: latestPoster
  };
}

function formatPost(post: DiscoursePost, baseUrl: string): Reply {
  return {
    username: post.username,
    name: post.display_username || post.name || post.username,
    created_at: Date.parse(post.created_at) / 1000,
    avatar_template: formatAvatarTemplate(post.avatar_template, baseUrl),
    cooked: post.cooked,
    like_count: post.actions_summary.find(a => a.id === 2)?.count || 0,
    reply_count: post.reply_count,
    reads: post.reads,
    user_url: `${baseUrl}/u/${post.username}`
  };
}

export async function loadTopics(url: string): Promise<Topic[]> {
  const baseUrl = new URL(url).origin;

  const res = await fetch(`${PROXY_URL}/${encodeURIComponent(`${url}.json`)}`);
  const data: { topic_list: { topics: DiscourseTopic[] }; users: User[] } =
    await res.json();

  return data.topic_list.topics.map(topic =>
    formatTopic(topic, data.users, baseUrl)
  );
}

export async function loadSingleTopic(url: string): Promise<TopicWithPosts> {
  const baseUrl = new URL(url).origin;
  const params = new URL(url).pathname.split('/').filter(Boolean);
  const lastParam = params[params.length - 1];
  const secondLastParam = params[params.length - 2];
  const hasPostNumber =
    secondLastParam && /^\d+$/.test(secondLastParam) && /^\d+$/.test(lastParam);

  const topicPath = hasPostNumber
    ? `${secondLastParam}/${lastParam}`
    : lastParam;

  const res = await fetch(
    `${PROXY_URL}/${encodeURIComponent(`${baseUrl}/t/${topicPath}.json`)}`
  );
  const topic: Pick<Topic, 'id' | 'title' | 'posts_count'> & {
    errors?: string[];
    error_type?: string;
    post_stream?: { posts: DiscoursePost[] };
  } = await res.json();

  if (topic.errors) {
    throw new Error(topic.error_type);
  }

  const posts = (topic.post_stream?.posts ?? []).filter(
    post => !hasPostNumber || post.post_number >= Number(lastParam)
  );

  return {
    id: topic.id,
    title: topic.title,
    posts_count: topic.posts_count - 1,
    posts: posts.map(post => formatPost(post, baseUrl))
  };
}
