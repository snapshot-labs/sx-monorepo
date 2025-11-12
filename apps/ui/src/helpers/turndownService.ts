import TurndownService from 'turndown';

const turndownService = new TurndownService({
  linkStyle: 'referenced',
  headingStyle: 'atx'
});

export default function (options: { discussion?: string } = {}) {
  turndownService.addRule('table', {
    filter: ['table'],
    replacement: function (content, node) {
      const headers = Array.from(node.querySelectorAll('thead th')).map(
        (th: any) => th.textContent
      );
      const rows = Array.from(node.querySelectorAll('tbody tr')).map(
        (tr: any) =>
          Array.from(tr.querySelectorAll('td')).map((td: any) => td.textContent)
      );
      return `
        | ${headers.join(' | ')} |
        | ${headers.map(() => '---').join(' | ')} |
        | ${rows.map(row => row.join(' | ')).join('| \n |')} |
      `;
    }
  });
  turndownService.addRule('handleQuote', {
    filter: ['aside'],
    replacement: function (content, node) {
      if (node.classList.contains('quote')) {
        const image = node.querySelector('.title img');
        node.querySelector('.title img')?.remove();
        return `> ### ![discourse-emoji](${image?.src}) ${turndownService.turndown(node.querySelector('.title')?.innerHTML)}
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
        const classList: string[] = Array.from(node.classList);
        if (classList.includes('anchor')) return '';
        if (classList.includes('mention')) {
          const baseUrl = options.discussion?.match(
            /^(https?:\/\/[^\/]+\/)/
          )?.[1];
          const username = node.href.match(/\/u\/(.*)/)?.[1];
          return `[${node.textContent}](${baseUrl}u/${username})`;
        }
        if (classList.includes('mention-group')) {
          const baseUrl = options.discussion?.match(
            /^(https?:\/\/[^\/]+\/)/
          )?.[1];
          const groupIdentifier = node.href.match(/\/(groups|g)\/(.*)/)?.[2];
          return `[${node.textContent}](${baseUrl}g/${groupIdentifier})`;
        }
        if (classList.includes('badge-category__wrapper')) {
          return `- [${node.textContent}](${node.href})`;
        }

        if (node.querySelector('img')) {
          return `[![${node.querySelector('img').alt}](${node.querySelector('img').src}) ${node.textContent}](${node.href})`;
        }

        return `[${node.textContent}](${node.href})`;
      }
    });
  }

  turndownService.escape = string => string;
  return turndownService.turndown.bind(turndownService);
}
