import Router from 'express-promise-router';
import multer from 'multer';

import { fileService } from '../services/file.service';
import { InvalidArgumentException } from '../lib/exceptions/InvalidArgumentException';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

const implementations = ['updateUserProfileImage', 'updateUserCoverImage'];

router.post('/', upload.single('file'), async (req, res) => {
  const implementation = req.body.implementation;
  const file = req.file;
  const session = req.sessionData;

  if (!implementations.includes(implementation)) {
    throw new InvalidArgumentException(
      'Parâmetro de manipução do arquivo inválido'
    );
  }

  const updaloadResponse = await fileService[implementation](
    session.user,
    file
  );

  res.json(updaloadResponse);
});

export default router;
