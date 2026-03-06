# @snapshot-labs/tune

Vue 3 UI kit for Snapshot apps. Ships built components, an opinionated theme, and a Tailwind preset.

## Install

```bash
yarn add @snapshot-labs/tune
```

## Setup

### 1. Plugin

Register the Vue plugin (sets up tooltips):

```ts
import { createTune } from '@snapshot-labs/tune';

app.use(createTune());
```

### 2. Theme (optional)

Import the theme in your app's global stylesheet for CSS variables, fonts, typography resets, and base styles:

```scss
// style.scss
@import '@snapshot-labs/tune/theme';

@tailwind base;
@tailwind utilities;
```

### 3. Tailwind preset (optional)

Extend your Tailwind config with the shared design tokens (colors, spacing, fonts, breakpoints):

```ts
import tunePreset from '@snapshot-labs/tune/tailwind-preset';

export default {
  presets: [tunePreset],
  content: ['./src/**/*.{js,ts,vue}']
};
```

### 4. Component auto-import (optional)

Use the resolver with `unplugin-vue-components` to auto-import `Ui*` components in templates:

```ts
import { TuneResolver } from '@snapshot-labs/tune/resolver';
import Components from 'unplugin-vue-components/vite';

export default defineConfig({
  plugins: [
    Components({
      resolvers: [TuneResolver()]
    })
  ]
});
```

## Usage

```vue
<script setup lang="ts">
import { UiTooltip, UiSwitch } from '@snapshot-labs/tune';
</script>

<template>
  <UiTooltip title="Hello">Hover me</UiTooltip>
  <UiSwitch v-model="enabled" title="Toggle" />
</template>
```

With auto-import (step 4), the import is not needed — just use the components directly in templates.

## Components

| Component | Description |
| --- | --- |
| `UiCheckbox` | Checkbox built on Headless UI Switch |
| `UiLoading` | Loading spinner |
| `UiSwitch` | Toggle switch built on Headless UI Switch |
| `UiTooltip` | Tooltip built on tippy.js |
| `UiTooltipOnTruncate` | Tooltip that only shows when text is truncated |

## Development

```bash
yarn storybook     # Storybook dev server
yarn build         # Build the library
yarn typecheck     # Type check
yarn lint          # Lint
```
