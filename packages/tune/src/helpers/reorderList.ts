import { createChange, createReorder, definePrimitive } from '@ui-sdk/core';
import type { ChangeDetails, ReorderDraft, ReorderReason } from '@ui-sdk/core';

type ReorderListOptions = {
  value?: string[];
  /** A selector for the part of an item that drags it, else the whole item */
  handle?: string;
  /** How long a touch holds still before it drags, so a swipe still scrolls */
  touchDelay?: number;
  onValueChange?: (
    value: string[],
    details: ChangeDetails<ReorderReason>
  ) => void;
};

// How far a touch can move while it holds, like SortableJS's touchStartThreshold
const TOUCH_SLOP = 35;

/** A list whose items move with a pointer drag or with the keyboard */
export const reorderList = definePrimitive({
  name: 'reorder-list',
  options: {
    value: 'list',
    handle: 'string',
    touchDelay: 'number',
    onValueChange: 'callback'
  },
  controlled: ['value'],
  state: (options: ReorderListOptions) => ({
    value: options.value ?? [],
    draft: null as ReorderDraft | null
  }),
  sync: options =>
    options.value === undefined ? {} : { value: options.value },
  api: context => {
    const change = createChange(context);
    const reorder = createReorder(context, {
      slot: 'item',
      key: 'value',
      draft: 'draft',
      preview: true,
      set: (value, details) => change('value', value, details)
    });
    const inHandle = (event: Event) => {
      const { handle } = context.options();
      return !!handle && !!(event.target as Element).closest(handle);
    };

    function holdThenDrag(event: PointerEvent, key: string, delay: number) {
      const doc = (event.target as Element).ownerDocument;
      const moved = (e: PointerEvent) =>
        Math.hypot(e.clientX - event.clientX, e.clientY - event.clientY) >
          TOUCH_SLOP && stop();
      const stop = () => {
        clearTimeout(timer);
        doc.removeEventListener('pointermove', moved);
        doc.removeEventListener('pointerup', stop);
        doc.removeEventListener('pointercancel', stop);
      };
      // Once dragging, the touch moves the item instead of the page
      const block = (e: TouchEvent) => e.cancelable && e.preventDefault();
      const unblock = () => doc.removeEventListener('touchmove', block);
      const timer = setTimeout(() => {
        stop();
        doc.addEventListener('touchmove', block, { passive: false });
        doc.addEventListener('touchend', unblock, { once: true });
        doc.addEventListener('touchcancel', unblock, { once: true });
        reorder.pointerdown(event, key);
      }, delay);
      doc.addEventListener('pointermove', moved);
      doc.addEventListener('pointerup', stop);
      doc.addEventListener('pointercancel', stop);
    }

    const dragsFrom = (event: Event) =>
      !context.options().handle || inHandle(event);

    return {
      reorder,
      // A link or an image would start the browser's own drag instead
      dragstart(event: DragEvent) {
        if (dragsFrom(event)) event.preventDefault();
      },
      pointerdown(event: PointerEvent, key: string) {
        const { touchDelay } = context.options();
        if (!dragsFrom(event)) return;
        if (event.pointerType === 'touch' && touchDelay) {
          holdThenDrag(event, key, touchDelay);
        } else {
          reorder.pointerdown(event, key);
        }
      },
      // Without a handle, keys stay the item's own, like Enter on a link
      keydown(event: KeyboardEvent, key: string) {
        if (inHandle(event)) reorder.keydown(event, key);
      }
    };
  },
  slots: slot => ({
    root: slot<object, { order: string[]; moving: boolean }>({
      state: (state, { api }) => ({
        order: api.reorder.order(state),
        moving: !!state.draft
      })
    }),
    item: slot<{ value: string }>({
      props: { value: 'string' },
      on: {
        dragstart: (event, { api }) => api.dragstart(event),
        pointerdown: (event, { api, key }) => api.pointerdown(event, key),
        keydown: (event, { api, key }) => api.keydown(event, key)
      },
      bind: (el, part) => part.api.reorder.bind(el, part)
    })
  })
});
