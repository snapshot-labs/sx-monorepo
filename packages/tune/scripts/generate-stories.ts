import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(scriptDir, '../src/components/Ui');
const outDir = join(scriptDir, '../src/stories/auto');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

/** Known external types that can't be resolved from source. */
const externalTypes: Record<string, string> = {
  "Props['placement']":
    "'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end'",
  "Props['touch']": "'hold' | boolean"
};

/** Resolve type aliases from types.ts (e.g. NotificationType → 'error' | 'warning' | 'success'). */
const typeAliases: Record<string, string> = {};
const typesPath = join(scriptDir, '../src/types.ts');
if (existsSync(typesPath)) {
  const typesContent = readFileSync(typesPath, 'utf8');
  for (const m of typesContent.matchAll(
    /export\s+type\s+(\w+)\s*=\s*([^;]+)/g
  )) {
    typeAliases[m[1]] = m[2].trim();
  }
}

interface PropInfo {
  type: string;
  isRequired: boolean;
  defaultValue?: string;
}

interface ModelInfo {
  name: string;
  type: string;
}

/** Extract defineModel calls from a Vue SFC. */
function parseModels(src: string): ModelInfo[] {
  const models: ModelInfo[] = [];
  // Matches: defineModel<Type>('name', ...) or defineModel<Type>(...)
  const regex = /defineModel<(\w+)>\(\s*(?:'(\w+)')?\s*/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    models.push({
      name: match[2] ?? 'modelValue',
      type: match[1]
    });
  }
  return models;
}

/** Return a default value for a model type. */
function defaultForModel(type: string): string {
  if (type === 'boolean') return 'false';
  if (type === 'string') return "''";
  if (type === 'number') return '0';
  return 'undefined';
}

/** Extract all props and their TypeScript type from a Vue SFC. */
function parseProps(src: string): Record<string, PropInfo> {
  const propsMatch = src.match(/defineProps<\{([\s\S]*?)\}>/);
  if (propsMatch?.[1] == null) return {};
  const props: Record<string, PropInfo> = {};
  for (const line of propsMatch[1].split('\n')) {
    // Match both `name: type` (required) and `name?: type` (optional)
    const m = line.match(/^\s{1,4}(\w+)(\??)\s*:\s*(.+?)[\s;]*$/);
    if (m?.[1] != null && m[3] != null) {
      const raw = m[3].trim();
      const resolved = typeAliases[raw] ?? externalTypes[raw] ?? raw;
      props[m[1]] = { type: resolved, isRequired: m[2] !== '?' };
    }
  }

  // Parse withDefaults values
  const defaultsMatch = src.match(
    /withDefaults\s*\(\s*defineProps[\s\S]*?\(\s*\)\s*,\s*\{([\s\S]*?)\}\s*\)/
  );
  if (defaultsMatch?.[1]) {
    for (const m of defaultsMatch[1].matchAll(/(\w+)\s*:\s*([^,}\n]+)/g)) {
      if (props[m[1]]) {
        props[m[1]].defaultValue = m[2].trim();
      }
    }
  }

  return props;
}

/** Extract union values from a type like `'a' | 'b' | boolean`. */
function parseUnionValues(tsType: string): string[] | null {
  if (!tsType.includes('|')) return null;
  const parts = tsType.split('|').map(s => s.trim());
  const values: string[] = [];
  for (const part of parts) {
    const strMatch = part.match(/^'([^']+)'$/);
    if (strMatch) {
      values.push(strMatch[1]);
    } else if (part === 'boolean') {
      values.push('true', 'false');
    } else if (part === 'true' || part === 'false') {
      values.push(part);
    }
  }
  return values.length > 1 ? values : null;
}

/** Return a JS literal placeholder for a given prop. */
function defaultForProp(prop: PropInfo): string {
  // Use withDefaults value if available
  if (prop.defaultValue != null) {
    const d = prop.defaultValue;
    if (d === 'true' || d === 'false') return d;
    const num = Number(d);
    if (!isNaN(num) && d !== '') return d;
    const strMatch = d.match(/^['"](.+)['"]$/);
    if (strMatch) return `'${strMatch[1]}'`;
    return d;
  }

  const tsType = prop.type;
  if (tsType === 'string') return "'Example'";
  if (tsType === 'number') return '0';
  if (tsType === 'boolean') return 'false';
  if (tsType === 'string | number') return "'Example'";
  if (tsType.startsWith("'")) {
    const first = tsType.match(/'([^']+)'/);
    return first?.[1] != null ? `'${first[1]}'` : "''";
  }
  return 'undefined';
}

const files = readdirSync(componentsDir).filter(f => f.endsWith('.vue'));
let generated = 0;
let skipped = 0;

for (const file of files) {
  const name = basename(file, '.vue');

  // Skip if a manual story exists alongside the component
  const manualStoryPath = join(componentsDir, `${name}.stories.ts`);
  if (existsSync(manualStoryPath)) {
    skipped++;
    continue;
  }

  const src = readFileSync(join(componentsDir, file), 'utf8');
  const allProps = parseProps(src);
  const models = parseModels(src);
  const hasSlot = /<slot/.test(src);

  // Args: models + all props with known defaults (ensures Storybook controls are reactive)
  const argsLines: string[] = [];
  for (const model of models) {
    const val = defaultForModel(model.type);
    if (val !== 'undefined') argsLines.push(`    ${model.name}: ${val}`);
  }
  for (const [name, p] of Object.entries(allProps)) {
    const val = defaultForProp(p);
    if (val !== 'undefined') argsLines.push(`    ${name}: ${val}`);
  }
  const hasLabelProp = 'label' in allProps || 'content' in allProps;
  if (hasSlot && !hasLabelProp) argsLines.push(`    default: 'Example'`);
  const argsBlock =
    argsLines.length > 0 ? `  args: {\n${argsLines.join(',\n')}\n  }` : '';

  // ArgTypes: all props with union types get select controls
  const argTypeEntries: string[] = [];
  for (const [prop, { type }] of Object.entries(allProps)) {
    // string | number → text control
    if (type === 'string | number') {
      argTypeEntries.push(`    ${prop}: { control: 'text' }`);
      continue;
    }

    const values = parseUnionValues(type);
    if (values) {
      const formatted = values.map(v =>
        v === 'true' || v === 'false' ? v : `'${v}'`
      );
      const optionsInline = `[${formatted.join(', ')}]`;
      // Wrap long options arrays across multiple lines (prettier line limit)
      if (
        `    ${prop}: { control: 'select', options: ${optionsInline} }`.length >
        80
      ) {
        const optionsMultiline = `[\n${formatted.map(v => `        ${v}`).join(',\n')}\n      ]`;
        argTypeEntries.push(
          `    ${prop}: {\n      control: 'select',\n      options: ${optionsMultiline}\n    }`
        );
      } else {
        argTypeEntries.push(
          `    ${prop}: { control: 'select', options: ${optionsInline} }`
        );
      }
    }
  }
  const argTypesBlock =
    argTypeEntries.length > 0
      ? `  argTypes: {\n${argTypeEntries.join(',\n')}\n  }`
      : '';

  const renderBlock =
    hasSlot && !hasLabelProp
      ? `  render: (args: Record<string, unknown>) => ({
    components: { Component },
    setup: () => ({ args }),
    template: \`<Component v-bind="args">{{ args.default }}</Component>\`
  })`
      : '';

  // Build meta fields and story fields, join with commas
  const metaFields = [
    `  title: 'Ui/${name}'`,
    `  component: Component`,
    `  tags: ['autodocs']`
  ];
  if (argTypesBlock) metaFields.push(argTypesBlock);

  const storyFields: string[] = [];
  if (argsBlock) storyFields.push(argsBlock);
  if (renderBlock) storyFields.push(renderBlock);

  const content = `import Component from '../../components/Ui/${file}';

export default {
${metaFields.join(',\n')}
};

export const Default = {
${storyFields.join(',\n')}
};
`;

  writeFileSync(join(outDir, `${name}.stories.ts`), content);
  generated++;
}

console.log(
  `Generated ${generated} auto-stories, skipped ${skipped} with manual stories`
);
