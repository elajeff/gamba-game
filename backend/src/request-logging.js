function errorMessage(error) {
  const message = typeof error?.message === "string" ? error.message : "Unexpected error";
  return message.slice(0, 240);
}

function errorStack(error) {
  if (typeof error?.stack !== "string") return undefined;
  return error.stack.split("\n").slice(0, 10).join("\n");
}

function errorFields(error) {
  const fields = {
    errorName: typeof error?.name === "string" ? error.name.slice(0, 80) : "Error",
    errorMessage: errorMessage(error)
  };
  const stack = errorStack(error);
  if (stack) fields.errorStack = stack;
  return fields;
}

export function logUnexpectedRequestError({ requestId, method, path, error }) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    event: "unhandled_request_error",
    requestId,
    method,
    path,
    ...errorFields(error)
  }));
}

export function logOperationalError(event, details = {}, error = null) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    event,
    ...details,
    ...(error ? errorFields(error) : {})
  }));
}
