import Ajv from 'ajv';
import { isAddress } from '@ethersproject/address';
import {
  Zero,
  MinInt256,
  MaxInt256,
  MaxUint256
} from '@ethersproject/constants';
import { BigNumber } from '@ethersproject/bignumber';

export function validateForm(schema, form) {
  const ajv = new Ajv({ allErrors: true });

  ajv.addFormat('address', {
    validate: isAddress
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

  ajv.validate(schema, form);

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

    current[path[path.length - 1]] = 'Invalid field';
  }

  return output;
}
