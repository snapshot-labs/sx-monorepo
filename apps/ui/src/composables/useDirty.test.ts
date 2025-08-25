import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { useDirty } from './useDirty';

describe('useDirty', () => {
  describe('initial state without default', () => {
    it('should be dirty for truthy values (string)', () => {
      const model = ref('hello');
      const { isDirty } = useDirty(model);
      expect(isDirty.value).toBe(true);
    });

    it('should be dirty for truthy values (true)', () => {
      const model = ref(true);
      const { isDirty } = useDirty(model);
      expect(isDirty.value).toBe(true);
    });

    it('should not be dirty for falsy values (empty string)', () => {
      const model = ref('');
      const { isDirty } = useDirty(model);
      expect(isDirty.value).toBe(false);
    });

    it('should not be dirty for falsy values (zero)', () => {
      const model = ref(0);
      const { isDirty } = useDirty(model);
      expect(isDirty.value).toBe(false);
    });

    it('should not be dirty for falsy values (false)', () => {
      const model = ref(false);
      const { isDirty } = useDirty(model);
      expect(isDirty.value).toBe(false);
    });

    it('should not be dirty for null values', () => {
      const model = ref(null);
      const { isDirty } = useDirty(model);
      expect(isDirty.value).toBe(false);
    });

    it('should not be dirty for undefined values', () => {
      const model = ref(undefined);
      const { isDirty } = useDirty(model);
      expect(isDirty.value).toBe(false);
    });
  });

  describe('initial state with default', () => {
    it('should not be dirty when model equals default', () => {
      const model = ref('same');
      const { isDirty } = useDirty(model, { default: 'same' });
      expect(isDirty.value).toBe(false);
    });

    it('should be dirty when model differs from default', () => {
      const model = ref('different');
      const { isDirty } = useDirty(model, { default: 'default' });
      expect(isDirty.value).toBe(true);
    });

    it('should not be dirty for falsy model matching falsy default', () => {
      const model = ref(0);
      const { isDirty } = useDirty(model, { default: 0 });
      expect(isDirty.value).toBe(false);
    });
  });

  describe('after modification', () => {
    it('should always be dirty once model is modified', async () => {
      const model = ref('initial');
      const { isDirty } = useDirty(model, { default: 'initial' });

      expect(isDirty.value).toBe(false);

      model.value = 'changed';
      await nextTick();
      expect(isDirty.value).toBe(true);

      model.value = 'initial';
      await nextTick();
      expect(isDirty.value).toBe(true);
    });

    it('should stay dirty even when reverted to original value without default', async () => {
      const model = ref('');
      const { isDirty } = useDirty(model);

      model.value = 'changed';
      await nextTick();
      expect(isDirty.value).toBe(true);

      model.value = '';
      await nextTick();
      expect(isDirty.value).toBe(true);
    });

    it('should be dirty when modifying from falsy to truthy', async () => {
      const model = ref('');
      const { isDirty } = useDirty(model);

      model.value = 'hello';
      await nextTick();
      expect(isDirty.value).toBe(true);
    });

    it('should be dirty when modifying from truthy to falsy', async () => {
      const model = ref('hello');
      const { isDirty } = useDirty(model);

      model.value = '';
      await nextTick();
      expect(isDirty.value).toBe(true);
    });
  });

  describe('undefined default handling', () => {
    it('should not compare with undefined default', () => {
      const model = ref('test');
      const { isDirty } = useDirty(model, { default: undefined });
      expect(isDirty.value).toBe(true);
    });

    it('should treat undefined default same as no default', () => {
      const model1 = ref(null);
      const model2 = ref(null);

      const { isDirty: isDirty1 } = useDirty(model1);
      const { isDirty: isDirty2 } = useDirty(model2, { default: undefined });

      expect(isDirty1.value).toBe(false);
      expect(isDirty2.value).toBe(false);
    });
  });

  describe('type handling', () => {
    it('should handle string type without affecting logic', () => {
      const model = ref('test');
      const { isDirty } = useDirty(model, { type: 'string' });
      expect(isDirty.value).toBe(true);
    });

    it('should handle number type without affecting logic', () => {
      const model = ref(42);
      const { isDirty } = useDirty(model, { type: 'number' });
      expect(isDirty.value).toBe(true);
    });

    it('should handle boolean type without affecting logic', () => {
      const model = ref(true);
      const { isDirty } = useDirty(model, { type: 'boolean' });
      expect(isDirty.value).toBe(true);
    });

    it('should handle array type without affecting logic', () => {
      const model = ref([1, 2, 3]);
      const { isDirty } = useDirty(model, { type: 'array' });
      expect(isDirty.value).toBe(true);
    });

    it('should handle object type without affecting logic', () => {
      const model = ref({ key: 'value' });
      const { isDirty } = useDirty(model, { type: 'object' });
      expect(isDirty.value).toBe(true);
    });
  });
});
