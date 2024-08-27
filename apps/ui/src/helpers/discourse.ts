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
  reply_count: number;
  views: number;
  pinned: boolean;
  closed: boolean;
  posts_count: number;
  url: string;
  user_url: string;
}

export const SPACES_DISCUSSIONS = {
  's:ens.eth': 'https://discuss.ens.domains/c/meta-governance/28',
  's:safe.eth': 'https://forum.safe.global/c/proposals/21',
  's:balancer.eth': 'https://forum.balancer.fi/c/governance/7',
  's:uniswapgovernance.eth': 'https://gov.uniswap.org/c/proposal-discussion/5',
  's:lido-snapshot.eth': 'https://research.lido.fi/c/proposals/9',
  's:apecoin.eth': 'https://forum.apecoin.com/c/active-proposals/72',
  'sn:0x009fedaf0d7a480d21a27683b0965c0f8ded35b3f1cac39827a25a06a8a682a4':
    'https://community.starknet.io/c/governance/15',
  's:aave.eth': 'https://governance.aave.com/c/governance/4',
  's:opcollective.eth': 'https://gov.optimism.io/c/technical-proposals/47',
  's:shutterdao0x36.eth':
    'https://shutternetwork.discourse.group/c/shutter-dao/14',
  's:arbitrumfoundation.eth': 'https://forum.arbitrum.foundation/c/proposals/7',
  's:gitcoindao.eth': 'https://gov.gitcoin.co/c/governance-proposals/5',
  's:g-dao.eth': 'https://forum.gravity.xyz/c/governance/5',
  's:graphprotocol.eth': 'https://forum.thegraph.com/c/governance-gips/17',
  's:shapeshiftdao.eth': 'https://forum.shapeshift.com/c/proposal-discussion/8',
  's:cow.eth': 'https://forum.cow.fi/c/cow-improvement-proposals-cip/6',
  's:badgerdao.eth':
    'https://forum.badger.finance/c/badger-improvement-proposals-bip/5'
};

export async function loadTopics(url: string): Promise<Topic[]> {
  const baseUrl = new URL(url).origin;

  const res = await fetch(`${PROXY_URL}/${encodeURIComponent(`${url}.json`)}`);
  const data = await res.json();

  return data.topic_list.topics.map(topic => {
    topic.posts_count--;
    topic.url = `${baseUrl}/t/${topic.id}`;
    topic.username = topic.last_poster_username;
    topic.user_url = `${baseUrl}/u/${topic.username}`;
    topic.created = Date.parse(topic.created_at) / 1000;

    return topic;
  });
}

export async function loadSingleTopic(url: string): Promise<Topic> {
  const baseUrl = new URL(url).origin;
  const topicId = new URL(url).pathname.split('/')[3];

  const res = await fetch(
    `${PROXY_URL}/${encodeURIComponent(`${baseUrl}/t/${topicId}.json`)}`
  );
  const topic = await res.json();

  topic.posts_count--;

  return topic;
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
