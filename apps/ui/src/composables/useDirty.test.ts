import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { useDirty } from './useDirty';

describe('useDirty', () => {
  describe('initial state', () => {
    it('should not be dirty for falsy values with no default', () => {
      const model = ref('');
      const { isDirty } = useDirty(model);
      expect(isDirty.value).toBe(false);
    });

    it('should be dirty for truthy values with no default', () => {
      const model = ref('hello');
      const { isDirty } = useDirty(model);
      expect(isDirty.value).toBe(true);
    });

    it('should be dirty when model differs from default', () => {
      const model = ref('different');
      const { isDirty } = useDirty(model, { default: 'default' });
      expect(isDirty.value).toBe(true);
    });

    it('should not be dirty when model equals default', () => {
      const model = ref('same');
      const { isDirty } = useDirty(model, { default: 'same' });
      expect(isDirty.value).toBe(false);
    });
  });

  describe('after modification', () => {
    it('should become dirty when model changes from initial value', async () => {
      const model = ref('');
      const { isDirty, modelModified } = useDirty(model);

      expect(isDirty.value).toBe(false);
      expect(modelModified.value).toBe(false);

      model.value = 'changed';
      await nextTick();

      expect(modelModified.value).toBe(true);
      expect(isDirty.value).toBe(true);
    });

    it('should stay dirty after modification with no default', async () => {
      const model = ref('');
      const { isDirty } = useDirty(model);

      model.value = 'changed';
      await nextTick();

      expect(isDirty.value).toBe(true);

      // Even if we set back to empty
      model.value = '';
      await nextTick();

      expect(isDirty.value).toBe(true);
    });

    it('should become clean when reverting to default after modification', async () => {
      const model = ref('default');
      const { isDirty } = useDirty(model, { default: 'default' });

      expect(isDirty.value).toBe(false);

      model.value = 'changed';
      await nextTick();
      expect(isDirty.value).toBe(true);

      // Revert to default
      model.value = 'default';
      await nextTick();
      expect(isDirty.value).toBe(false);
    });
  });

  describe('type-specific behavior', () => {
    it('should handle boolean values correctly', async () => {
      const model = ref(false);
      const { isDirty } = useDirty(model, { default: false });

      expect(isDirty.value).toBe(false);

      model.value = true;
      await nextTick();
      expect(isDirty.value).toBe(true);

      model.value = false;
      await nextTick();
      expect(isDirty.value).toBe(false);
    });

    it('should handle number values correctly', async () => {
      const model = ref(0);
      const { isDirty } = useDirty(model, { default: 0 });

      expect(isDirty.value).toBe(false);

      model.value = 42;
      await nextTick();
      expect(isDirty.value).toBe(true);

      model.value = 0;
      await nextTick();
      expect(isDirty.value).toBe(false);
    });

    it('should handle null values correctly', async () => {
      const model = ref<string | null>(null);
      const { isDirty } = useDirty(model, { default: null });

      expect(isDirty.value).toBe(false);

      model.value = 'value';
      await nextTick();
      expect(isDirty.value).toBe(true);

      model.value = null;
      await nextTick();
      expect(isDirty.value).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined vs explicit undefined default', () => {
      const model1 = ref('test');
      const model2 = ref('test');

      const { isDirty: isDirty1 } = useDirty(model1);
      const { isDirty: isDirty2 } = useDirty(model2, { default: undefined });

      expect(isDirty1.value).toBe(true);
      expect(isDirty2.value).toBe(true);
    });
  });
});
