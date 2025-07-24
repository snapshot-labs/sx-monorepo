import { Meta, StoryObj } from '@storybook/vue3-vite';
import Markdown from './Markdown.vue';

const meta = {
  title: 'Ui/Markdown',
  component: Markdown,
  tags: ['autodocs'],
  argTypes: {
    body: { control: 'text' }
  }
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    body: 'This is a simple markdown text with **bold** and *italic* formatting.'
  }
};

export const WithHeadings: Story = {
  args: {
    body: `# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

This is a paragraph with some text to demonstrate how headings look in the markdown component.`
  }
};

export const WithCodeBlock: Story = {
  args: {
    body: `Here's some code examples:

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
  return true;
}
\`\`\`

\`\`\`json
{
  "name": "example",
  "version": "1.0.0",
  "description": "A sample JSON object"
}
\`\`\`

\`\`\`solidity
pragma solidity ^0.8.0;

contract HelloWorld {
    string public message = "Hello, World!";

    function setMessage(string memory _message) public {
        message = _message;
    }
}
\`\`\``
  }
};

export const WithLists: Story = {
  args: {
    body: `## Unordered List
- Item 1
- Item 2
- Item 3
  - Nested item 1
  - Nested item 2

## Ordered List
1. First item
2. Second item
3. Third item
   1. Nested first
   2. Nested second`
  }
};

export const WithLinks: Story = {
  args: {
    body: `Here are some links:
- [External link](https://example.com)
- [Another link](https://github.com)

And some IPFS links:
- ipfs://QmHash123456789
- ipfs://QmAnotherHash987654321`
  }
};

export const WithBlockquote: Story = {
  args: {
    body: `> This is a blockquote.
> It can span multiple lines and provides
> a way to highlight important text or quotes.

Regular paragraph after the blockquote.`
  }
};

export const WithTable: Story = {
  args: {
    body: `| Feature | Status | Description |
|---------|--------|-------------|
| Syntax highlighting | ✅ | Supports multiple languages |
| Copy button | ✅ | Click to copy code blocks |
| IPFS links | ✅ | Automatically converts IPFS URLs |
| Tables | ✅ | Supports markdown tables |`
  }
};

export const WithInlineCode: Story = {
  args: {
    body: `This paragraph contains \`inline code\` examples like \`npm install\` and \`const variable = "value"\`.

You can also use inline code for \`function names\`, \`file.extension\`, and other code-related terms.`
  }
};

export const ComplexExample: Story = {
  args: {
    body: `# Proposal: Implement New Feature

## Overview
This proposal outlines the implementation of a new feature that will enhance user experience.

### Technical Details

The implementation will include:
1. **Frontend changes** - Update the UI components
2. **Backend modifications** - Add new API endpoints
3. **Database updates** - Create new tables

#### Code Example

\`\`\`typescript
interface ProposalData {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
};

class ProposalManager {
  async createProposal(data: ProposalData): Promise<void> {
    // Implementation here
  }
}
\`\`\`

### Benefits
- Improved user experience
- Better performance
- Enhanced security

> **Note**: This feature requires careful testing before deployment.

For more information, visit [our documentation](https://docs.example.com).

### Resources
- IPFS documentation: ipfs://QmDocumentationHash
- API reference: ipfs://QmApiReferenceHash`
  }
};
