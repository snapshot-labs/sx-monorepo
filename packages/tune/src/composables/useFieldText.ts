import { ref, watch } from 'vue';
import type { Ref } from 'vue';

// The field's text, kept apart from its model: the model can be the text
// trimmed or parsed, while the field keeps what was typed
export function useFieldText<T>(
  model: Ref<T | undefined>,
  parse: (text: string) => T
) {
  const toText = (value?: T) => (value == null ? '' : String(value));
  const text = ref(toText(model.value));

  watch(model, value => {
    if (value !== parse(text.value)) text.value = toText(value);
  });

  return text;
}
