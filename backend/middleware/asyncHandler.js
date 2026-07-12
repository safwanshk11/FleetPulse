// asyncHandler.js — wraps an async route handler so a rejected promise
// (e.g. a failed pg query) gets passed to Express's error handler instead
// of crashing the process. Usage: router.get('/x', asyncHandler(async (req, res) => {...}))

module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
