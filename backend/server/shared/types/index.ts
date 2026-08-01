export type AppErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR';

export interface AppErrorShape {
  code: AppErrorCode;
  message: string;
}
