import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/customErrors';
import { logger } from '../logger/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, path: req.path, method: req.method }, 'Non-operational AppError occurred');
    } else {
      logger.warn({ message: err.message, statusCode: err.statusCode, path: req.path }, 'Operational AppError');
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        details: err.details ?? null,
      },
    });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled Exception');

  res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected error occurred on the server',
      statusCode: 500,
    },
  });
};
