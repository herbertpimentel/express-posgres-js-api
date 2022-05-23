import { InvalidArgumentException } from '../lib/exceptions/InvalidArgumentException';
import { UnauthorizedException } from '../lib/exceptions/UnauthorizedException';
import { InvalidRequestException } from '../lib/exceptions/InvalidRequestException';

export const registerDefaultErrorHandler = (app) => {
  app.use(function (err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }

    let statusCode = err.code || 500;

    if (err instanceof UnauthorizedException) {
      statusCode = 401;
    } else if (
      err instanceof InvalidRequestException ||
      err instanceof InvalidArgumentException
    ) {
      statusCode = 400;
    } else {
      statusCode = 500;
    }

    res.status(statusCode).json({ status: 'error', message: err.message });
  });
};
