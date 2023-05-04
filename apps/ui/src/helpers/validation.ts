import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { validateAndParseAddress } from 'starknet';
import { isAddress } from '@ethersproject/address';
import { parseUnits } from '@ethersproject/units';
import { Zero, MinInt256, MaxInt256, MaxUint256 } from '@ethersproject/constants';
import { BigNumber } from '@ethersproject/bignumber';

function getErrorMessage(errorObject: ErrorObject): string {
  if (!errorObject.message) return 'Invalid field.';

  if (errorObject.keyword === 'format') {
    switch (errorObject.params.format) {
      case 'uri':
        return 'Must be a valid URL.';
      case 'address':
        return 'Must be a valid address.';
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

export function validateForm(
  schema,
  form,
  opts: { skipEmptyOptionalFields: boolean } = { skipEmptyOptionalFields: false }
): Record<string, string> {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  ajv.addFormat('address', {
    validate: (value: string) => {
      if (!value) return false;

      try {
        return !!validateAndParseAddress(value);
      } catch (err) {
        return isAddress(value);
      }
    }
  });

  ajv.addFormat('stamp', {
    validate: () => true
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

  const requiredKeys = schema.required || [];
  const processedForm = !opts.skipEmptyOptionalFields
    ? form
    : Object.fromEntries(
        Object.entries(form).filter(([key, value]) => {
          if (requiredKeys.includes(key)) return true;

          return value !== '';
        })
      );

  ajv.validate(schema, processedForm);

  const output = {};
  if (!ajv.errors) {
    return output;
  }

  for (const error of ajv.errors) {
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
}
