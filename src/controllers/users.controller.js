import Router from 'express-promise-router';
import { authService } from '../services/auth.service';

const router = Router();

// exemplo
router.get('/', async (req, res) => {
  const nome = req.query.nome;

  const lista = await authService.listarUsuariosPorNome(nome);

  return res.json(lista);
});

export default router;
