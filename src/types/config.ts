import { z } from 'zod';

/**
 * Authentication method for RavenDB
 */
export enum AuthenticationMethod {
  ApiKey = 'apikey',
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
  }

  return validated;
}

/**
 * Create a configuration object from environment variables
 *
 * @returns The configuration object
 */
export function configFromEnv(): RavenDBConfig {
  const authMethod =
    process.env.RAVENDB_AUTH_METHOD?.toLowerCase() === 'apikey'
      ? AuthenticationMethod.ApiKey
      : AuthenticationMethod.ApiKey; // Default to API key auth for now

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
  }

  return config;
}
