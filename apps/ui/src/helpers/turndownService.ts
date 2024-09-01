import TurndownService from 'turndown';

const turndownService = new TurndownService({
  linkStyle: 'referenced',
  headingStyle: 'atx'
});

export default function (options: { discussion?: string } = {}) {
  turndownService.addRule('handleQuote', {
    filter: ['aside'],
    replacement: function (content, node) {
      if (node.classList.contains('quote')) {
        const image = node.querySelector('.title img');
        return `> ### ![discourse-emoji](${image?.src}) ${node.querySelector('.title')?.textContent}
        > ${node.querySelector('blockquote')?.textContent}
         `;
      } else if (node.classList.contains('twitterstatus')) {
        const image = node.querySelector('.thumbnail')?.src;
        const displayName = node.querySelector('article h4 a')?.textContent;
        const screenName = node.querySelector('.twitter-screen-name a');
        const date = node.querySelector('.date')?.textContent;
        const tweet = node.querySelector('.tweet')?.innerHTML;
        return `
        > ### [${date}](${screenName?.href})
        > ![discourse-thumbnail](${image}) ${displayName} ([${screenName?.textContent}](${screenName?.href}))
        >
        > ${turndownService.turndown(tweet)}
        `;
      }
      return content;
    }
  });

  turndownService.addRule('emoji', {
    filter: ['img'],
    replacement: function (content, node) {
      if (node.classList.contains('emoji')) {
        return `![discourse-emoji-${node.alt}](${node.src})`;
      }
      return `![${node.alt}](${node.src})`;
    }
  });

  if (options.discussion) {
    turndownService.addRule('mention', {
      filter: ['a'],
      replacement: function (content, node) {
        if (node.classList.contains('mention')) {
          return `[${node.textContent}](${options.discussion?.match(/^(https?:\/\/[^\/]+\/)/)?.[1]}u/${node.textContent.replace('@', '')})`;
        }
        if (node.querySelector('img')) {
          return `[![${node.querySelector('img').alt}](${node.querySelector('img').src}) ${node.textContent}](${node.href})`;
        }

        return `[${node.textContent}](${node.href})`;
      }
    });
  }
  return turndownService.turndown.bind(turndownService);
}
