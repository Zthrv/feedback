// Error the global handler turns into the given HTTP status
function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

export default httpError;
