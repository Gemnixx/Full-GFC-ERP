export class AppError extends Error {
  status: number;
  errors?: any;
  constructor(message: string, status = 400, errors?: any) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}