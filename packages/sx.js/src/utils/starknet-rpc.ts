type ExecutionError = {
  class_hash: string;
  contract_address: string;
  selector: string;
  error: ExecutionError | string;
};

function getFinalError(error: ExecutionError): string {
  if (typeof error.error === 'string') {
    return error.error;
  } else {
    return getFinalError(error.error);
  }
}

export function parseStarknetError(data: any): string | null {
  if (data?.error?.data?.baseError) {
    const baseError = data.error.data.baseError;
    const executionError = baseError?.data?.execution_error;
    if (executionError) {
      return getFinalError(executionError);
    } else if (baseError.message) {
      return baseError.message;
    }
  }

  return null;
}
