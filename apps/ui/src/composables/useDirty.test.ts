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
      const { isDirty } = useDirty(model);

      expect(isDirty.value).toBe(false);

      model.value = 'changed';
      await nextTick();

      expect(isDirty.value).toBe(true);
    });

    it('should stay dirty after modification with no default', async () => {
      const model = ref('');
      const { isDirty } = useDirty(model);

      model.value = 'changed';
      await nextTick();

      expect(isDirty.value).toBe(true);

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

  describe('backward compatibility with type-based defaults', () => {
    it('should use empty string default for string type without explicit default', () => {
      const model = ref<string | null>(null);
      const { isDirty } = useDirty(model, { type: 'string' });

      expect(isDirty.value).toBe(true);

      model.value = '';
      expect(isDirty.value).toBe(false);
    });

    it('should use empty string default for undefined string values', async () => {
      const model = ref<string | undefined>(undefined);
      const { isDirty } = useDirty(model, { type: 'string' });

      expect(isDirty.value).toBe(true);

      model.value = '';
      await nextTick();
      expect(isDirty.value).toBe(false);
    });

    it('should use type-based defaults for number and boolean types', () => {
      const numberModel = ref<number | null>(null);
      const { isDirty: numberDirty } = useDirty(numberModel, {
        type: 'number'
      });

      expect(numberDirty.value).toBe(true);

      const booleanModel = ref<boolean | null>(null);
      const { isDirty: booleanDirty } = useDirty(booleanModel, {
        type: 'boolean'
      });

      expect(booleanDirty.value).toBe(true);
    });

    it('should maintain string type behavior after modification', async () => {
      const model = ref<string>('');
      const { isDirty } = useDirty(model, { type: 'string' });

      expect(isDirty.value).toBe(false);

      model.value = 'changed';
      await nextTick();
      expect(isDirty.value).toBe(true);

      model.value = '';
      await nextTick();
      expect(isDirty.value).toBe(false);
    });

    it('should prioritize explicit default over type-based default', () => {
      const model = ref<string>('custom');
      const { isDirty } = useDirty(model, {
        type: 'string',
        default: 'custom'
      });

      expect(isDirty.value).toBe(false);
    });

    it('should handle string type with non-empty explicit default', async () => {
      const model = ref<string>('');
      const { isDirty } = useDirty(model, {
        type: 'string',
        default: 'default value'
      });

      expect(isDirty.value).toBe(true);

      model.value = 'default value';
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

    it('should handle missing type field', () => {
      const model = ref<string | null>(null);
      const { isDirty } = useDirty(model, {});

      expect(isDirty.value).toBe(false);
    });

    it('should handle union types with string arrays', () => {
      const model = ref<string | null>(null);
      const { isDirty } = useDirty(model, { type: ['string', 'null'] });

      expect(isDirty.value).toBe(true); // null !== ''

      model.value = '';
      expect(isDirty.value).toBe(false); // '' === ''
    });

    it('should handle union types with number arrays', async () => {
      const model = ref<number | null>(null);
      const { isDirty } = useDirty(model, { type: ['number', 'null'] });

      expect(isDirty.value).toBe(true); // null !== 0

      model.value = 0;
      await nextTick();
      expect(isDirty.value).toBe(false); // 0 === 0
    });

    it('should handle mixed union types', () => {
      const model = ref<string | number | null>('test');
      const { isDirty } = useDirty(model, {
        type: ['string', 'number', 'null']
      });

      expect(isDirty.value).toBe(true);
    });
  });

  describe('all AJV types support', () => {
    it('should handle boolean type with false default', async () => {
      const model = ref<boolean>(true);
      const { isDirty } = useDirty(model, { type: 'boolean' });

      expect(isDirty.value).toBe(true); // true !== false

      model.value = false;
      await nextTick();
      expect(isDirty.value).toBe(false); // false === false
    });

    it('should handle array type with empty array default', async () => {
      const model = ref<string[]>(['item']);
      const { isDirty } = useDirty(model, { type: 'array' });

      expect(isDirty.value).toBe(true); // ['item'] !== []

      model.value = [];
      await nextTick();
      expect(isDirty.value).toBe(false); // [] === []
    });

    it('should handle object type with empty object default', async () => {
      const model = ref<Record<string, any>>({ key: 'value' });
      const { isDirty } = useDirty(model, { type: 'object' });

      expect(isDirty.value).toBe(true); // {key: 'value'} !== {}

      model.value = {};
      await nextTick();
      expect(isDirty.value).toBe(false); // {} === {}
    });

    it('should handle null type', async () => {
      const model = ref<string | null>('value');
      const { isDirty } = useDirty(model, { type: 'null' });

      expect(isDirty.value).toBe(true); // 'value' !== null

      model.value = null;
      await nextTick();
      expect(isDirty.value).toBe(false); // null === null
    });

    it('should handle integer type same as number', async () => {
      const model = ref<number>(5);
      const { isDirty } = useDirty(model, { type: 'integer' });

      expect(isDirty.value).toBe(true); // 5 !== 0

      model.value = 0;
      await nextTick();
      expect(isDirty.value).toBe(false); // 0 === 0
    });

    it('should handle complex union types with all AJV types', () => {
      const model = ref<any>('test');
      const { isDirty } = useDirty(model, {
        type: ['string', 'number', 'boolean', 'array', 'object', 'null']
      });

      expect(isDirty.value).toBe(true);
    });

    it('should prioritize types in logical order for unions', async () => {
      const stringModel = ref<string | boolean>('');
      const { isDirty: stringDirty } = useDirty(stringModel, {
        type: ['boolean', 'string']
      });
      expect(stringDirty.value).toBe(false);

      const numberModel = ref<number | boolean>(0);
      const { isDirty: numberDirty } = useDirty(numberModel, {
        type: ['boolean', 'number']
      });
      expect(numberDirty.value).toBe(false);
    });
  });
});
