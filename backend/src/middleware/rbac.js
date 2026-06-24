function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(430).json({ message: 'Access denied. Administrator privileges required.' });
  }
  if (req.user.is_view_admin && req.method !== 'GET') {
    return res.status(403).json({ message: 'Access denied. Read-only Admin cannot perform this action.' });
  }
  next();
}

function requireManager(req, res, next) {
  if (!req.user || req.user.role !== 'MANAGER') {
    return res.status(430).json({ message: 'Access denied. Manager privileges required.' });
  }
  next();
}

function requireAny(req, res, next) {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER')) {
    return res.status(430).json({ message: 'Access denied. Invalid role.' });
  }
  if (req.user.role === 'ADMIN' && req.user.is_view_admin && req.method !== 'GET') {
    return res.status(403).json({ message: 'Access denied. Read-only Admin cannot perform this action.' });
  }
  next();
}

module.exports = {
  requireAdmin,
  requireManager,
  requireAny
};
