import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { TooManyRequestsException } from 'src/common/exceptions/too-many-requests.exception';

// Define a base interface for custom exceptions
interface CustomException extends Error {
  statusCode?: number;
  status?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = undefined;

    // Handle HTTP exceptions (NestJS built-in)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        const rawMessage = responseObj.message || exception.message;
        // ValidationPipe returns message as string[]; flatten for logs + clients
        message = Array.isArray(rawMessage) ? rawMessage.join('; ') : rawMessage;
        errors = responseObj.errors ?? (Array.isArray(rawMessage) ? rawMessage : undefined);
      }
    }
    // Handle custom domain exceptions
    else if (exception instanceof Error) {
      const customException = exception as CustomException;

      // Check if it's a custom exception with statusCode
      if (customException.statusCode) {
        status = customException.statusCode;
        message = customException.message;
      }
      // Check for common exception patterns
      else if (customException.name.includes('NotFoundException')) {
        status = HttpStatus.NOT_FOUND;
        message = customException.message;
      } else if (
        customException.name.includes('AlreadyExistsException') ||
        customException.name.includes('ConflictException')
      ) {
        status = HttpStatus.CONFLICT;
        message = customException.message;
      } else if (
        customException.name.includes('ValidationException') ||
        customException.name.includes('BadRequestException') ||
        customException.name.includes('CannotBeDeletedException')
      ) {
        status = HttpStatus.BAD_REQUEST;
        message = customException.message;
      } else if (customException.name.includes('UnauthorizedException')) {
        status = HttpStatus.UNAUTHORIZED;
        message = customException.message;
      } else if (customException.name.includes('ForbiddenException')) {
        status = HttpStatus.FORBIDDEN;
        message = customException.message;
      } else {
        // Generic error handling
        message = customException.message;
        this.logger.error(`Unhandled error: ${customException.message}`, customException.stack);
      }
    }

    // Skip logging and return plain 404 for Next.js HMR and other frontend dev requests
    const isNextJsRequest = request.path.startsWith('/_next/') || request.path.startsWith('/__nextjs');

    if (isNextJsRequest && status === HttpStatus.NOT_FOUND) {
      return response.status(status).end();
    }

    let retryAfter: number | undefined;
    if (exception instanceof TooManyRequestsException) {
      retryAfter = exception.retryAfterSeconds;
      response.setHeader('Retry-After', String(retryAfter));
    } else if (status === HttpStatus.TOO_MANY_REQUESTS && typeof exception === 'object' && exception !== null) {
      const body = exception instanceof HttpException ? exception.getResponse() : null;
      if (body && typeof body === 'object' && 'retryAfter' in body) {
        retryAfter = Number((body as { retryAfter?: number }).retryAfter);
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          response.setHeader('Retry-After', String(retryAfter));
        }
      }
    }

    const errorResponse = {
      statusCode: status,
      message,
      ...(errors && { errors }),
      ...(retryAfter ? { retryAfter } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Only log errors that are not Next.js dev requests
    if (!isNextJsRequest) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(errorResponse);
  }
}
