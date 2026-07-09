/**
 * Typed errors so agents can react instead of retry-looping.
 * Every tool surfaces exactly these codes (docs/section-18-19 §18.3b).
 */
export type ToolErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN_FOR_ROLE'
  | 'APPROVAL_REQUIRED'
  | 'VALIDATION'
  | 'RATE_LIMITED';

export class ToolError extends Error {
  code: ToolErrorCode;
  constructor(code: ToolErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ToolError';
  }
}

export const notFound = (what: string) => new ToolError('NOT_FOUND', what);
export const forbidden = (what: string) => new ToolError('FORBIDDEN_FOR_ROLE', what);
export const approvalRequired = (what: string) => new ToolError('APPROVAL_REQUIRED', what);
export const validation = (what: string) => new ToolError('VALIDATION', what);
