// In middleware/authorizeRole.js
export function authorizeRole(requiredRoles) {
    return (req, res, next) => {
      try {
        const userRole = req.user?.role; // Assuming req.user is populated after authentication
        if (!userRole) {
          return res.status(403).json({ message: "Unauthorized: No role assigned" });
        }
        if (!requiredRoles.includes(userRole)) {
          return res.status(403).json({ message: "Forbidden: Access denied" });
        }
        next();
      } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
      }
    };
  }
  