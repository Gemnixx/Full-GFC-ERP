import { Response } from 'express';

export const ok = (res: Response, data: any = {}, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });

export const fail = (res: Response, message = 'Error', status = 400, errors?: any) =>
  res.status(status).json({ success: false, message, errors });