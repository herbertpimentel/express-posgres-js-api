import 'dotenv/config';

import express from 'express';

import { mount } from './controllers';
import { registerDefaultErrorHandler } from './middlewares/default-error-handler';

const app = express();
const port = process.env.PORT || 4000;

mount(app);

registerDefaultErrorHandler(app);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running on port: ${port}`);
});
