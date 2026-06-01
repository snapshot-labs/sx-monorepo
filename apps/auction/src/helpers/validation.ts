import { isAddress } from '@ethersproject/address';
import Ajv, { AnySchema, ErrorObject } from 'ajv';
import ajvErrors from 'ajv-errors';
import addFormats from 'ajv-formats';
import { validateAndParseAddress } from 'starknet';
import { parseUnits } from '@/helpers/token';
import { getAddresses as _getAddresses } from './stamp';
import { _n, memoize } from './utils';

const getAddresses = memoize(_getAddresses);

type Opts = { skipEmptyOptionalFields: boolean };

const ajv = new Ajv({
  allErrors: true,
  strictTuples: false,
  allowUnionTypes: true
});
ajvErrors(ajv);
addFormats(ajv);

ajv.addFormat('name-or-address', {
  async: true,
  validate: async (value: string) => {
    if (!value) return false;

    try {
      const resolved = value.includes('.')
        ? await getAddresses([value], 1)
        : null;
      if (resolved && resolved[value]) return true;

      return !!validateAndParseAddress(value);
    } catch {
      return isAddress(value);
    }
  }
});

ajv.addFormat('ethValue', {
  validate: (value: string) => {
    if (!value.match(/^([0-9]|[1-9][0-9]+)(\.[0-9]+)?$/)) return false;

    try {
      parseUnits(value, 18);
      return true;
    } catch {
      return false;
    }
  }
});

ajv.addKeyword('options');
ajv.addKeyword('tooltip');

function getErrorMessage(errorObject: Partial<ErrorObject>): string {
  if (!errorObject.message) return 'Invalid field.';

  if (errorObject.keyword === 'format') {
    if (!errorObject.params) return 'Invalid format.';

    switch (errorObject.params.format) {
      case 'name-or-address':
        return 'Must be a valid name or address.';
      case 'ethValue':
        return 'Must be a number.';
      default:
        return 'Invalid format.';
    }
  }

  if (errorObject.keyword === 'maxLength') {
    if (!errorObject.params) return 'Invalid format.';
    return `Must not have more than ${_n(errorObject.params.limit)} characters.`;
  }

  if (errorObject.keyword === 'minimum') {
    if (!errorObject.params) return 'Invalid format.';
    return `Must be at least ${_n(errorObject.params.limit)}.`;
  }

  if (errorObject.keyword === 'maximum') {
    if (!errorObject.params) return 'Invalid format.';
    return `Must be at most ${_n(errorObject.params.limit)}.`;
  }

  return `${errorObject.message.charAt(0).toUpperCase()}${errorObject.message
    .slice(1)
    .toLowerCase()}.`;
}

const getFormValues = (schema: any, form: any, opts: Opts) => {
  if (!opts.skipEmptyOptionalFields) return form;

  const requiredKeys = schema.required || [];

  return Object.fromEntries(
    Object.entries(form).filter(([key, value]) => {
      if (requiredKeys.includes(key)) return true;

      return value !== '';
    })
  );
};

const getErrors = (errors: Partial<ErrorObject>[]) => {
  const output: Record<string, any> = {};

  if (!errors) return output;

  for (const error of errors) {
    if (error.keyword === 'required' && error.params?.missingProperty) {
      output[error.params.missingProperty] = 'Required field.';
      continue;
    }

    if (!error.instancePath) continue;

    const path = error.instancePath.split('/').slice(1);

    let current = output;
    for (let i = 0; i < path.length - 1; i++) {
      const subpath = path[i];
      if (typeof current[subpath] !== 'object' || current[subpath] === null) {
        current[subpath] = {};
      }
      current = current[subpath];
    }

    current[path[path.length - 1]] = getErrorMessage(error);
  }

  return output;
};

export const getValidator = (schema: AnySchema) => {
  const validate = ajv.compile(schema);

  return {
    validate: (form: any, opts: Opts = { skipEmptyOptionalFields: false }) => {
      validate(getFormValues(schema, form, opts));

      if (!validate.errors) return {};

      return getErrors(validate.errors);
    },
    validateAsync: async (
      form: any,
      opts: Opts = { skipEmptyOptionalFields: false }
    ) => {
      try {
        await validate(getFormValues(schema, form, opts));

        return {};
      } catch (err) {
        if (!(err instanceof Ajv.ValidationError)) throw err;

        return getErrors(err.errors);
      }
    }
  };
};
