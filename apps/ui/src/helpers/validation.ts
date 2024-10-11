import { Interface } from '@ethersproject/abi';
import { isAddress } from '@ethersproject/address';
import { parseUnits } from '@ethersproject/units';
import Ajv, { ErrorObject } from 'ajv';
import ajvErrors from 'ajv-errors';
import addFormats from 'ajv-formats';
import { validateAndParseAddress } from 'starknet';
import { resolver } from '@/helpers/resolver';
import { _n } from './utils';

type Opts = { skipEmptyOptionalFields: boolean };

const ajv = new Ajv({
  allErrors: true,
  // https://github.com/ajv-validator/ajv/issues/1417
  strictTuples: false,
  allowUnionTypes: true
});
ajvErrors(ajv);
addFormats(ajv);

export const addressValidator = (value: string) => {
  try {
    return !!validateAndParseAddress(value);
  } catch (e) {
    return isAddress(value);
  }
};

export const ethAddressValidator = (value: string) => {
  return isAddress(value);
};

const validateType = (type: string, value: string) => {
  if (!value) return false;

  try {
    const iface = new Interface([`function test(${type})`]);
    iface.encodeFunctionData('test', [value]);
    return true;
  } catch (e) {
    return false;
  }
};

const bytesValidator = (value: string) => validateType('bytes', value);
const uint256Validator = (value: string) => validateType('uint256', value);
const int256Validator = (value: string) => validateType('int256', value);

const getArrayValidator =
  (valueValidator: (value: string) => boolean) => (value: string) => {
    if (!value) return false;

    try {
      const array = value.split(',').map(s => s.trim());
      return array.every((value: string) => valueValidator(value));
    } catch {
      return false;
    }
  };

ajv.addFormat('address', {
  validate: addressValidator
});

ajv.addFormat('ethAddress', {
  validate: ethAddressValidator
});

ajv.addFormat('uint256', {
  validate: uint256Validator
});

ajv.addFormat('int256', {
  validate: int256Validator
});

ajv.addFormat('bytes', {
  validate: bytesValidator
});

ajv.addFormat('ethAddress[]', {
  validate: getArrayValidator(ethAddressValidator)
});

ajv.addFormat('uint256[]', {
  validate: getArrayValidator(uint256Validator)
});

ajv.addFormat('int256[]', {
  validate: getArrayValidator(int256Validator)
});

ajv.addFormat('bytes[]', {
  validate: getArrayValidator(bytesValidator)
});

ajv.addFormat('long', {
  validate: () => true
});

ajv.addFormat('color', {
  validate: (value: string) => {
    if (!value) return false;
    return !!value.match(/^#[0-9A-F]{6}$/);
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

ajv.addFormat('addresses-with-voting-power', {
  validate: (value: string) => {
    if (!value) return false;

    return value
      .split(/[\n,]/)
      .filter(s => s.trim().length)
      .every(input => {
        const [address, vp] = input.split(':').map(s => s.trim());

        return (
          address.length &&
          addressValidator(address) &&
          uint256Validator(vp || '')
        );
      });
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

ajv.addFormat('coingecko-handle', {
  validate: (value: string) => {
    if (!value) return false;

    return !!value.match(/^[a-z0-9-]*$/);
  }
});

ajv.addFormat('lens-handle', {
  validate: (value: string) => {
    if (!value) return false;

    return !!value.match(/^[A-Za-z0-9_]+$/);
  }
});

ajv.addFormat('farcaster-handle', {
  validate: (value: string) => {
    if (!value) return false;

    return !!value.match(/^[a-z0-9-]+$/);
  }
});

ajv.addFormat('domain', {
  validate: (value: string) => {
    if (!value) return false;

    return !!value.match(/^[a-zA-Z0-9\-\.]+$/);
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

ajv.addKeyword({
  keyword: 'decimals',
  type: 'string',
  schemaType: 'number',
  validate: (schema: number, data: string) => {
    if (!data) return true;

    const regex = new RegExp(`^\\d+[.,]?\\d{0,${schema}}$`);
    return regex.test(data);
  },
  error: {
    message: ctx => {
      return `Can have at most ${ctx.schemaValue} decimals`;
    }
  }
});
ajv.addKeyword('options');
ajv.addKeyword('tooltip');

// UiSelectorNetwork
ajv.addFormat('network', {
  validate: () => true
});
ajv.addKeyword('networkId');

function getErrorMessage(errorObject: Partial<ErrorObject>): string {
  if (!errorObject.message) return 'Invalid field.';

  if (errorObject.keyword === 'format') {
    if (!errorObject.params) return 'Invalid format.';

    switch (errorObject.params.format) {
      case 'uri':
        return 'Must be a valid URL.';
      case 'domain':
        return 'Must be a valid domain.';
      case 'address':
      case 'ethAddress':
        return 'Must be a valid address.';
      case 'address[]':
      case 'ethAddress[]':
        return 'Must be comma separated list of valid addresses.';
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
      case 'coingecko-handle':
        return 'Must be a valid CoinGecko handle.';
      case 'uint256':
        return 'Must be a positive integer.';
      case 'int256':
        return 'Must be an integer.';
      case 'ethValue':
        return 'Must be a number.';
      case 'addresses-with-voting-power':
        return 'Must be a valid list of addresses with voting power.';
      case 'color':
        return 'Must be a valid hex color. ex: #EB4C5B';
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
      if (typeof current[subpath] !== 'object' || current[subpath] === null) {
        current[subpath] = {};
      }
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
    validateAsync: async (
      form: any,
      opts: Opts = { skipEmptyOptionalFields: false }
    ) => {
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
  opts: { skipEmptyOptionalFields: boolean } = {
    skipEmptyOptionalFields: false
  }
): Record<string, string> {
  const processedForm = getFormValues(schema, form, opts);

  ajv.validate(schema, processedForm);

  if (!ajv.errors) return {};

  return getErrors(ajv.errors);
}
