# UI — AGENTS.md

Vue 3 frontend for the governance platform. Fetches data from **API** (GraphQL), submits transactions via **Mana** (JSON-RPC). See root `AGENTS.md` for architecture and repo-wide tooling.

## Commands

```bash
yarn dev           # Vite dev server on port 8080
yarn codegen       # GraphQL codegen from 3 schemas
yarn storybook     # Storybook dev on port 6006
```

## Auto-Imports

Source of truth: `vite.config.ts`. Do **not** manually import these — they are auto-imported.

**Vue APIs**: `ref`, `computed`, `watch`, `onMounted`, `reactive`, `nextTick`, etc. (all `vue` exports)

**Vue Router**: `useRoute`, `useRouter`, `onBeforeRouteLeave`, etc. (all `vue-router` exports)

**VueUse**: `useEventListener`, `useLocalStorage`, `useClipboard`, etc. (all `@vueuse/core` exports)

**Composables**: all files in `src/composables/` — e.g. `useWeb3()`, `useModal()`, `useActions()`, `useBalances()`

**Stores**: all files in `src/stores/` — e.g. `useUiStore()`, `useContactsStore()`, `useMetaStore()`

**Components**: all in `src/components/` using directory-as-namespace:

- `src/components/Ui/Button.vue` → `<UiButton />`
- `src/components/Modal/Vote.vue` → `<ModalVote />`
- `src/components/App/TopNavigation.vue` → `<AppTopNavigation />`

**Icons**: auto-resolved via `unplugin-icons`:

- `IH-` prefix → `heroicons-outline` (e.g. `<IH-search />`)
- `IS-` prefix → `heroicons-solid`
- `IC-` prefix → custom icons from `src/assets/icons/`

## Component Conventions

- Always use `<script lang="ts" setup>`
- Define props/emits with TypeScript: `defineProps<{ title: string }>()`, `defineEmits<{ (e: 'close'): void }>()`
- Directory layout under `src/components/`:

| Directory  | Purpose                                              |
| ---------- | ---------------------------------------------------- |
| `Ui/`      | Base reusable components (Button, Modal, Form, etc.) |
| `Modal/`   | Specialized modal components                         |
| `App/`     | App-level components (navigation, sidebars)          |
| `Layout/`  | Page layout wrappers                                 |
| `Site/`    | Site-wide elements                                   |
| `Landing/` | Landing page components                              |
| `Widget/`  | Embeddable widget components                         |

## State Management

### Pinia Stores (`src/stores/`)

- Options API style with `defineStore`
- Auto-imported (no manual import needed)
- Used for client-side state: UI state, contacts, followed spaces, user preferences

### Vue Query (`src/queries/`)

- TanStack Query (`@tanstack/vue-query`) for server state
- Use `MaybeRefOrGetter` params for reactive query keys
- Keys must be reactive arrays: `["proposals", spaceId, "list"]`
- Key factory pattern for consistent key generation
- Always handle `isPending`, `isError`, `data` states in templates

## File Structure

```
src/
  assets/        Static assets and custom icons (src/assets/icons/)
  components/    Vue components (auto-imported, directory-as-namespace)
  composables/   Reusable composition functions (auto-imported)
  docs/          In-app documentation content
  helpers/       Pure utility functions and business logic
  networks/      Network implementations (EVM, Starknet, Offchain)
  queries/       Vue Query composables for server state
  routes/        Vue Router route definitions
  stores/        Pinia stores (auto-imported)
  views/         Page-level view components
```

## Styling

**TailwindCSS** with fully custom scales (not default Tailwind values):

**Spacing** (non-standard): `0`=0px, `0.5`=2px, `1`=4px, `1.5`=6px, `2`=8px, `2.5`=12px, `3`=16px, `3.5`=20px, `4`=24px, `5`=32px, `6`=40px, `7`=48px, `8`=64px, `9`=72px, `10`=80px, `11`=88px, `12`=96px

**Font sizes**: `xs`=14px, `sm`=16px, `base`=18px, `md`=20px, `lg`=22px, `xl`=28px

**Breakpoints**: `minimum`=320px, `xs`=420px, `sm`=544px, `md`=768px, `lg`=1012px, `xl`=1280px, `2xl`=1536px, `3xl`=1844px, `maximum`=1900px

**Colors** — use `skin-*` classes backed by CSS variables for theming:

- Backgrounds: `skin-bg`, `skin-border`
- Text: `skin-heading`, `skin-link`, `skin-text`, `skin-content`
- Accents: `skin-primary`, `skin-accent-foreground`, `skin-danger`, `skin-success`
- Interactive states: `skin-accent-hover`, `skin-accent-active`, `skin-danger-hover`, etc.

**Dark mode**: `class` strategy (Tailwind `darkMode: 'class'`)

Source of truth: `tailwind.config.ts`

## Testing

- **Vitest** + **happy-dom** + **@vue/test-utils**
- Tests are colocated next to source files
- **Storybook 9** for component documentation and visual testing

## GraphQL Codegen

`yarn codegen` generates typed clients from 3 schemas:

| Output dir                            | Schema source                   |
| ------------------------------------- | ------------------------------- |
| `src/networks/common/graphqlApi/gql/` | `../api/.checkpoint/schema.gql` |
| `src/helpers/auction/gql/`            | Subgraph endpoint               |
| `src/helpers/auction/referral/gql/`   | Brokester API                   |

Generated `gql/` directories are gitignored. **Never edit generated files.**

Config: `codegen.ts`

## Path Alias

`@` → `./src` (configured in `vite.config.ts` resolve.alias)

## Conventions

- Use `<script lang="ts" setup>` for all components
- Use `skin-*` color classes for theming — no hardcoded colors
- Put queries in `src/queries/` using Vue Query patterns
- Use the custom Tailwind spacing scale — not default Tailwind values
- Do not manually import Vue/VueRouter/VueUse APIs — they are auto-imported
- Do not manually import composables or stores — they are auto-imported
- Do not edit files in `gql/` directories — they are generated by `yarn codegen`
- When adding new GraphQL queries put them in propery queries.ts file so codegen can generate types for them.
