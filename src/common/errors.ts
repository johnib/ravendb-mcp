import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

/**
 * Interface for RavenDB MCP errors
 */
export interface RavenDBMcpError {
  name: string;
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

/**
 * Check if an error is a RavenDB MCP error
 *
 * @param error The error to check
 * @returns Whether the error is a RavenDB MCP error
 */
export function isRavenDBMcpError(error: any): error is RavenDBMcpError {
  return (
    error &&
    typeof error === 'object' &&
    typeof error.name === 'string' &&
    typeof error.message === 'string'
  );
}

/**
 * Format a RavenDB MCP error for display
 *
 * @param error The error to format
 * @returns A formatted error message
 */
export function formatRavenDBMcpError(error: RavenDBMcpError): string {
  let message = `RavenDB Error: ${error.message}`;

  if (error.code) {
    message += `\nCode: ${error.code}`;
  }

  if (error.statusCode) {
    message += `\nStatus: ${error.statusCode}`;
  }

  // Avoid exposing raw error details that might contain sensitive information
  if (
    error.details &&
    typeof error.details === 'object' &&
    !Array.isArray(error.details)
  ) {
    const safeDetails = { ...error.details };
    // Redact potentially sensitive fields
    delete safeDetails.stackTrace;
    delete safeDetails.authentication;
    delete safeDetails.password;
    delete safeDetails.apiKey;
    delete safeDetails.cert;
    delete safeDetails.certificate;

    if (Object.keys(safeDetails).length > 0) {
      message += `\nDetails: ${JSON.stringify(safeDetails)}`;
    }
  }

  return message;
}

/**
 * Convert RavenDB errors to MCP errors
 *
 * @param error The error to convert
 * @returns An MCP error
 */
export function convertToMcpError(error: any): McpError {
  if (error instanceof McpError) {
    return error;
  }

  if (isRavenDBMcpError(error)) {
    let errorCode = ErrorCode.InvalidRequest;

    // Map RavenDB status codes to MCP error codes
    if (error.statusCode) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        // For unauthorized or forbidden
        errorCode = ErrorCode.InvalidRequest;
      } else if (error.statusCode === 404) {
        // For not found
        errorCode = ErrorCode.InvalidParams;
      } else if (error.statusCode >= 500) {
        errorCode = ErrorCode.InternalError;
      }
    }

    return new McpError(errorCode, formatRavenDBMcpError(error));
  }

  // Default case for unknown errors
  const message = error instanceof Error ? error.message : String(error);
  return new McpError(ErrorCode.InternalError, `Error: ${message}`);
}

/**
 * Create a RavenDB MCP error from a message
 *
 * @param message The error message
 * @param code Optional error code
 * @param statusCode Optional HTTP status code
 * @param details Optional error details
 * @returns A RavenDB MCP error
 */
export function createRavenDBMcpError(
  message: string,
  code?: string,
  statusCode?: number,
  details?: any,
): RavenDBMcpError {
  return {
    name: 'RavenDBError',
    message,
    code,
    statusCode,
    details,
  };
}

/**
 * Handle errors in a consistent way
 *
 * @param error The error to handle
 * @param operation The operation that caused the error
 * @throws An MCP error
 */
export function handleRavenDBError(error: any, operation: string): never {
  // Create a more specific error message
  let mcpError: McpError;

  if (error instanceof McpError) {
    mcpError = error;
  } else {
    const message = error instanceof Error ? error.message : String(error);
    let errorCode = 'unknown';
    let statusCode = 500;
    let enhancedMessage = message;

    // Detect authentication-related errors based on error message patterns
    if (typeof message === 'string') {
      // Certificate authentication errors
      if (message.includes('certificate') || message.includes('cert')) {
        if (
          message.includes('not found') ||
          message.includes('could not find') ||
          message.includes('no such file')
        ) {
          errorCode = 'certificate_not_found';
          statusCode = 401;
          enhancedMessage = `Certificate file not found: ${message}. Please check the RAVENDB_CERT_PATH environment variable.`;
        } else if (
          message.includes('password') ||
          message.includes('passphrase')
        ) {
          errorCode = 'certificate_password_invalid';
          statusCode = 401;
          enhancedMessage = `Invalid certificate password: ${message}. Please check the RAVENDB_CERT_PASSWORD environment variable.`;
        } else if (
          message.includes('invalid') ||
          message.includes('malformed') ||
          message.includes('corrupt')
        ) {
          errorCode = 'certificate_invalid';
          statusCode = 401;
          enhancedMessage = `Invalid certificate: ${message}. Please ensure the certificate is in the correct format.`;
        } else if (message.includes('expired')) {
          errorCode = 'certificate_expired';
          statusCode = 401;
          enhancedMessage = `Certificate expired: ${message}. Please provide a valid, non-expired certificate.`;
        } else {
          errorCode = 'certificate_error';
          statusCode = 401;
          enhancedMessage = `Certificate error: ${message}. Please check your certificate configuration.`;
        }
      }
      // Username/password authentication errors
      else if (
        message.includes('username') ||
        message.includes('password') ||
        message.includes('credentials') ||
        message.includes('unauthorized')
      ) {
        errorCode = 'auth_failed';
        statusCode = 401;
        enhancedMessage = `Authentication failed: ${message}. Please check your username and password.`;
      }
      // API key authentication errors
      else if (message.includes('api key') || message.includes('apikey')) {
        errorCode = 'api_key_invalid';
        statusCode = 401;
        enhancedMessage = `API key authentication failed: ${message}. Please check your API key.`;
      }
    }

    const ravenDBError = createRavenDBMcpError(
      `Error during ${operation}: ${enhancedMessage}`,
      error.code || errorCode,
      error.statusCode || statusCode,
      error.details,
    );
    mcpError = convertToMcpError(ravenDBError);
  }

  throw mcpError;
}
