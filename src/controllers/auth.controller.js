import Router from 'express-promise-router';

import { authService } from '../services/auth.service';

const router = Router();

router.get('/me', async (req, res) => {
  const me = await authService.me(req.sessionId);

  res.json(me);
});

router.post('/login', function (req, res) {
  const { user, password } = req.body;
  const token = authService.login(user, password);

  res.json({ auth_token: token });
});

export default router;
