import { cloneVNode, Comment, Fragment } from 'vue';
import type { FunctionalComponent, VNode } from 'vue';

function firstElement(nodes: VNode[]): VNode | undefined {
  for (const node of nodes) {
    if (node.type === Comment) continue;
    if (node.type !== Fragment) return node;
    const child = firstElement(node.children as VNode[]);
    if (child) return child;
  }
}

/**
 * Renders the default slot's root with the given attributes merged in, like
 * Headless UI's `as="template"`. A ref on SlotRoot resolves to that root's
 * element, so a UI SDK part can bind to an element a consumer renders.
 */
const SlotRoot: FunctionalComponent = (_, { slots, attrs }) => {
  const root = firstElement(slots.default?.() ?? []);
  return root ? cloneVNode(root, attrs) : null;
};
SlotRoot.inheritAttrs = false;

export default SlotRoot;
