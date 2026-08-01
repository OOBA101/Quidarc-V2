export class AppError extends Error {
  constructor(message: string, readonly code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR' = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
  }
}
