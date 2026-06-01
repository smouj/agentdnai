/**
 * AgentDNAI Standardized API Error Handling
 *
 * Provides consistent error responses across all API endpoints.
 * Follows OWASP best practices for API error handling.
 */

import { NextResponse } from 'next/server';

// ─── Error Codes ──────────────────────────────────────────────────────────────

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ─── ApiError Class ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /**
   * Convert to a standard JSON response
   */
  toResponse(): NextResponse {
    const body: ApiErrorResponse = {
      error: {
        code: this.code,
        message: this.message,
      },
    };

    if (this.details !== undefined) {
      body.error.details = this.details;
    }

    return NextResponse.json(body, { status: this.status });
  }
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}

// ─── Factory Methods ──────────────────────────────────────────────────────────

export function unauthorized(message: string = 'Authentication required', details?: unknown): ApiError {
  return new ApiError(401, ErrorCodes.UNAUTHORIZED, message, details);
}

export function forbidden(message: string = 'Access denied', details?: unknown): ApiError {
  return new ApiError(403, ErrorCodes.FORBIDDEN, message, details);
}

export function notFound(message: string = 'Resource not found', details?: unknown): ApiError {
  return new ApiError(404, ErrorCodes.NOT_FOUND, message, details);
}

export function validationError(message: string, details?: unknown): ApiError {
  return new ApiError(400, ErrorCodes.VALIDATION_ERROR, message, details);
}

export function rateLimited(message: string = 'Too many requests', details?: unknown): ApiError {
  return new ApiError(429, ErrorCodes.RATE_LIMITED, message, details);
}

export function conflict(message: string, details?: unknown): ApiError {
  return new ApiError(409, ErrorCodes.CONFLICT, message, details);
}

export function internalError(message: string = 'Internal server error', details?: unknown): ApiError {
  return new ApiError(500, ErrorCodes.INTERNAL_ERROR, message, details);
}

export function invalidCredentials(message: string = 'Invalid email or password'): ApiError {
  return new ApiError(401, ErrorCodes.INVALID_CREDENTIALS, message);
}

export function sessionExpired(message: string = 'Session has expired'): ApiError {
  return new ApiError(401, ErrorCodes.SESSION_EXPIRED, message);
}

export function insufficientRole(message: string = 'Insufficient role permissions', details?: unknown): ApiError {
  return new ApiError(403, ErrorCodes.INSUFFICIENT_ROLE, message, details);
}

// ─── Error Handler Wrapper ────────────────────────────────────────────────────

type HandlerFunction = (request: Request, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;

/**
 * Wrap an API route handler with standardized error handling
 */
export function errorHandler(handler: HandlerFunction): HandlerFunction {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return error.toResponse();
      }

      // Log unexpected errors
      console.error('Unhandled API error:', error);

      return internalError('An unexpected error occurred').toResponse();
    }
  };
}

// ─── Helper: Success Response ─────────────────────────────────────────────────

export function successResponse<T>(data: T, meta?: Record<string, unknown>, status: number = 200): NextResponse {
  const body: ApiSuccessResponse<T> = { data };
  if (meta) {
    body.meta = meta;
  }
  return NextResponse.json(body, { status });
}
