import { z } from 'zod';

/**
 * Authentication method for RavenDB
 */
export enum AuthenticationMethod {
  ApiKey = 'apikey',
  Certificate = 'certificate',
  Username = 'username',
}

/**
 * Configuration for the RavenDB MCP server
 */
export interface RavenDBConfig {
  /**
   * Authentication method to use for RavenDB
   */
  authMethod: AuthenticationMethod;

  /**
   * Default server URL if not provided in the connection request
   */
  defaultUrl?: string;

  /**
   * API key for authentication if using API key authentication
   */
  apiKey?: string;

  /**
   * Certificate path for certificate-based authentication
   */
  certPath?: string;

  /**
   * Certificate password for certificate-based authentication
   */
  certPassword?: string;

  /**
   * Username for username/password authentication
   */
  username?: string;

  /**
   * Password for username/password authentication
   */
  password?: string;

  /**
   * Query timeout in milliseconds
   */
  queryTimeout?: number;
}

/**
 * Schema for validating configuration
 */
const ConfigSchema = z.object({
  authMethod: z.nativeEnum(AuthenticationMethod),
  defaultUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  certPath: z.string().optional(),
  certPassword: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  queryTimeout: z.number().positive().optional(),
});

/**
 * Validate the RavenDB configuration
 *
 * @param config The configuration to validate
 * @returns The validated configuration
 * @throws If the configuration is invalid
 */
export function validateConfig(config: RavenDBConfig): RavenDBConfig {
  // Validate basic structure
  const validated = ConfigSchema.parse(config);

  // Validate authentication method-specific requirements
  if (
    validated.authMethod === AuthenticationMethod.ApiKey &&
    !validated.apiKey
  ) {
    throw new Error('API key is required for API key authentication');
  } else if (validated.authMethod === AuthenticationMethod.Certificate) {
    if (!validated.certPath) {
      throw new Error(
        'Certificate path is required for certificate authentication',
      );
    }
    // Certificate password can be optional if the certificate is not password-protected
  } else if (validated.authMethod === AuthenticationMethod.Username) {
    if (!validated.username || !validated.password) {
      throw new Error(
        'Username and password are required for username authentication',
      );
    }
  }

  return validated;
}

/**
 * Create a configuration object from environment variables
 *
 * @returns The configuration object
 */
export function configFromEnv(): RavenDBConfig {
  const authMethodStr = process.env.RAVENDB_AUTH_METHOD?.toLowerCase();
  let authMethod = AuthenticationMethod.ApiKey; // Default

  if (authMethodStr === 'certificate') {
    authMethod = AuthenticationMethod.Certificate;
  } else if (authMethodStr === 'username') {
    authMethod = AuthenticationMethod.Username;
  }

  const config: RavenDBConfig = {
    authMethod,
    defaultUrl: process.env.RAVENDB_URL,
    queryTimeout: process.env.RAVENDB_QUERY_TIMEOUT
      ? parseInt(process.env.RAVENDB_QUERY_TIMEOUT)
      : undefined,
  };

  // Add authentication method-specific config
  if (authMethod === AuthenticationMethod.ApiKey) {
    config.apiKey = process.env.RAVENDB_API_KEY;
  } else if (authMethod === AuthenticationMethod.Certificate) {
    config.certPath = process.env.RAVENDB_CERT_PATH;
    config.certPassword = process.env.RAVENDB_CERT_PASSWORD;
  } else if (authMethod === AuthenticationMethod.Username) {
    config.username = process.env.RAVENDB_USERNAME;
    config.password = process.env.RAVENDB_PASSWORD;
  }

  return config;
}
