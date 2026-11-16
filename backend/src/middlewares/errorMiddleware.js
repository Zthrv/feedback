function notFound(req, res) {
  // The URL is not echoed back, so it cannot be used to reflect content
  res.status(404).json({ success: false, message: "Route not found" });
}

function errorHandler(error, req, res, next) {
  // Malformed or oversized bodies carry their own status
  const statusCode = error.statusCode || error.status || 500;

  if (statusCode >= 500) console.error(error);

  // Only our own errors (httpError) have a message that is safe to show
  const safe = statusCode < 500 && !error.type;

  res.status(statusCode).json({
    success: false,
    message: safe ? error.message : statusCode < 500 ? "Invalid request" : "Internal Server Error",
  });
}

export { notFound, errorHandler };
