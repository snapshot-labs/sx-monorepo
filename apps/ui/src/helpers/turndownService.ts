import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full'
});

export default function (options: { discussion?: string } = {}) {
  turndownService.addRule('table', {
    filter: ['table'],
    replacement: function (content, node) {
      // Get headers from thead or first row with th elements
      let headers = Array.from(node.querySelectorAll('thead th')).map(
        (th: any) => turndownService.turndown(th.innerHTML)
      );
      let headerCells = Array.from(node.querySelectorAll('thead th'));

      // If no thead, check for th elements in tbody (first row)
      if (headers.length === 0) {
        const firstRow = node.querySelector('tbody tr');
        if (firstRow) {
          const thElements = firstRow.querySelectorAll('th');
          if (thElements.length > 0) {
            headers = Array.from(thElements).map((th: any) =>
              turndownService.turndown(th.innerHTML)
            );
            headerCells = Array.from(thElements);
          }
        }
      }

      // If no headers found, create empty headers based on first row cell count
      if (headers.length === 0) {
        const firstDataRow =
          node.querySelector('tbody tr') || node.querySelector('tr');
        if (firstDataRow) {
          const cells = firstDataRow.querySelectorAll('td, th');
          headers = Array.from(cells).map(() => '');
          headerCells = Array.from(cells);
        }
      }

      // Get alignment from header cells
      const alignments = headerCells.map((th: any) => {
        const style = th.style.textAlign || th.getAttribute('align') || '';
        switch (style.toLowerCase()) {
          case 'left':
            return ':---';
          case 'right':
            return '---:';
          case 'center':
            return ':---:';
          default:
            return '---';
        }
      });

      // Get data rows, excluding the header row if it's in tbody
      const bodyRows = Array.from(node.querySelectorAll('tbody tr'));
      const allRows =
        bodyRows.length > 0
          ? bodyRows
          : Array.from(node.querySelectorAll('tr'));
      let dataRows = allRows;

      // If headers were found in first tbody row, skip it for data
      if (headers.length > 0 && allRows.length > 0) {
        const firstRow = allRows[0] as HTMLTableRowElement;
        if (firstRow.querySelectorAll('th').length > 0) {
          dataRows = allRows.slice(1);
        }
      }

      const rows = dataRows.map((tr: any) =>
        Array.from(tr.querySelectorAll('td, th')).map((cell: any) =>
          turndownService.turndown(cell.innerHTML)
        )
      );

      return `| ${headers.join(' | ')} |
| ${alignments.join(' | ')} |
| ${rows.map(row => row.join(' | ')).join(' |\n| ')} |`;
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

  turndownService.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement: function (content) {
      return `~~${content}~~`;
    }
  });

  turndownService.escape = string => string;
  return turndownService.turndown.bind(turndownService);
}
