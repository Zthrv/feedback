// Use after authMiddleware, which loads the role fresh from the database on every request,
// so a demoted or deactivated admin loses access at once.
export const ROLES = Object.freeze({
  ADMIN: "Admin",
  EMPLOYEE: "Employee",
});

export function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to do this",
      });
    }

    next();
  };
}

export default requireRole;
