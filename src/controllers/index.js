import express from 'express';
import morgan from 'morgan';

import Router from 'express-promise-router';

import UserRoutes from './users.controller';
import AuthRoutes from './auth.controller';
import FileRoutes from './files.controller';

import { AuthGuard } from '../middlewares/auth-guard';

export function mount(app) {
  const router = Router();

  router.use(express.urlencoded({ extended: true }));
  router.use(express.json());
  router.use(morgan(':method :url :status :response-time ms'));

  app.use(router);

  // exemplo
  app.use('/users', UserRoutes);

  app.use('/auth', AuthRoutes);
  app.use('/files', AuthGuard, FileRoutes);
}
