import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'abacaxilaranja';

export function Autenticacao(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function AutenticarAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

export function autorizarProprioOuAdmin(paramName = 'id') {
  return (req, res, next) => {
    const resourceId = req.params[paramName];

    if (req.user.role === 'ADMIN' || String(req.user.id) === String(resourceId)) {
      return next();
    }

    return res.status(403).json({ error: 'Acesso negado' });
  };
}
