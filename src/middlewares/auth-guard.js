import { authService } from '../services/auth.service';
import { UnauthorizedException } from '../lib/exceptions/UnauthorizedException';
import { safeGetValue, verifySignature } from '../lib/util/misc';

export const AuthGuard = async (req, res, next) => {
  const authHeader =
    safeGetValue(req, 'headers.authorization') ||
    safeGetValue(req, 'headers.Authorization');

  let sessionId = null;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    sessionId = verifySignature(token);

    const message = 'A sessão de usuário é inválida ou expirou';

    if (!sessionId) {
      return next(new UnauthorizedException(message));
    }

    const me = await authService.me(sessionId);

    if (!me) {
      return next(new UnauthorizedException(message));
    }

    // appends session data to the request
    // for futher usage no needing to hit db again
    req.sessionId = sessionId;
    req.sessionData = me;
  }

  return next();
};
