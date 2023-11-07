import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { validateAndParseAddress } from 'starknet';
import { isAddress } from '@ethersproject/address';
import { parseUnits } from '@ethersproject/units';
import { Zero, MinInt256, MaxInt256, MaxUint256 } from '@ethersproject/constants';
import { BigNumber } from '@ethersproject/bignumber';
import { Interface } from '@ethersproject/abi';
import { resolver } from '@/helpers/resolver';

type Opts = { skipEmptyOptionalFields: boolean };

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

ajv.addFormat('address', {
  validate: (value: string) => {
    if (!value) return false;

    try {
      return !!validateAndParseAddress(value);
    } catch (e) {
      return isAddress(value);
    }
  }
});

ajv.addFormat('ens-or-address', {
  async: true,
  validate: async (value: string) => {
    if (!value) return false;

    try {
      const resolved = await resolver.resolveName(value);
      if (resolved?.address) return true;

      return !!validateAndParseAddress(value);
    } catch (e) {
      return isAddress(value);
    }
  }
});

ajv.addFormat('abi', {
  validate: (value: string) => {
    if (!value) return false;

    try {
      const parsed = JSON.parse(value);
      if (parsed.length === 0) return false;

      new Interface(parsed);
      return true;
    } catch {
      return false;
    }
  }
});

ajv.addFormat('stamp', {
  validate: () => true
});

ajv.addFormat('twitter-handle', {
  validate: (value: string) => {
    if (!value) return false;

    return !!value.match(/^[a-zA-Z0-9_]+$/);
  }
});

ajv.addFormat('github-handle', {
  validate: (value: string) => {
    if (!value) return false;

    return !!value.match(/^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/);
  }
});

ajv.addFormat('discord-handle', {
  validate: (value: string) => {
    if (!value) return false;

    return !!value.match(/^[a-zA-Z0-9-]+$/);
  }
});

ajv.addFormat('long', {
  validate: () => true
});

ajv.addFormat('uint256', {
  validate: value => {
    if (!value.match(/^([0-9]|[1-9][0-9]+)$/)) return false;

    try {
      const number = BigNumber.from(value);
      return number.gte(Zero) && number.lte(MaxUint256);
    } catch {
      return false;
    }
  }
});

ajv.addFormat('ethValue', {
  validate: value => {
    if (!value.match(/^([0-9]|[1-9][0-9]+)(\.[0-9]+)?$/)) return false;

    try {
      parseUnits(value, 18);
      return true;
    } catch {
      return false;
    }
  }
});

ajv.addFormat('int256', {
  validate: value => {
    if (!value.match(/^-?([0-9]|[1-9][0-9]+)$/)) return false;

    try {
      const number = BigNumber.from(value);
      return number.gte(MinInt256) && number.lte(MaxInt256);
    } catch {
      return false;
    }
  }
});

ajv.addKeyword('options');

function getErrorMessage(errorObject: Partial<ErrorObject>): string {
  if (!errorObject.message) return 'Invalid field.';

  if (errorObject.keyword === 'format') {
    if (!errorObject.params) return 'Invalid format.';

    switch (errorObject.params.format) {
      case 'uri':
        return 'Must be a valid URL.';
      case 'address':
        return 'Must be a valid address.';
      case 'ens-or-address':
        return 'Must be a valid ENS domain or address.';
      case 'abi':
        return 'Must be a valid ABI.';
      case 'twitter-handle':
        return 'Must be a valid Twitter handle.';
      case 'github-handle':
        return 'Must be a valid GitHub handle.';
      case 'discord-handle':
        return 'Must be a valid Discord handle or invite code.';
      case 'uint256':
        return 'Must be a positive integer.';
      case 'int256':
        return 'Must be an integer.';
      case 'ethValue':
        return 'Must be a number.';
      default:
        return 'Invalid format.';
    }
  }

  return `${errorObject.message.charAt(0).toLocaleUpperCase()}${errorObject.message
    .slice(1)
    .toLocaleLowerCase()}.`;
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
      if (!current[subpath]) current[subpath] = {};
      current = current[subpath];
    }

    current[path[path.length - 1]] = getErrorMessage(error);
  }

  return output;
};

export const getValidator = (schema: any) => {
  const validate = ajv.compile(schema);

  return {
    validate: (form: any, opts: Opts = { skipEmptyOptionalFields: false }) => {
      validate(getFormValues(schema, form, opts));

      if (!validate.errors) return {};

      return getErrors(validate.errors);
    },
    validateAsync: async (form: any, opts: Opts = { skipEmptyOptionalFields: false }) => {
      try {
        await validate(getFormValues(schema, form, opts));

        return {};
      } catch (e) {
        if (!(e instanceof Ajv.ValidationError)) throw e;

        return getErrors(e.errors);
      }
    }
  };
};

/**
 * @deprecated Use getValidator instead.
 */
export function validateForm(
  schema,
  form,
  opts: { skipEmptyOptionalFields: boolean } = { skipEmptyOptionalFields: false }
): Record<string, string> {
  const processedForm = getFormValues(schema, form, opts);

  ajv.validate(schema, processedForm);

  if (!ajv.errors) return {};

  return getErrors(ajv.errors);
}
