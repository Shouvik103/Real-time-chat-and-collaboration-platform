import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

export const validate = (schema: AnyZodObject) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
                sendError(res, 'VALIDATION_ERROR', messages, 400);
                return;
            }
            next(err);
        }
    };
};
