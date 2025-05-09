import { z } from 'zod';

/**
 * Authentication method for RavenDB
 */
export enum AuthenticationMethod {
  None = 'none',
}

/**
 * Configuration for the RavenDB MCP server
 */
export interface RavenDBConfig {
  /**
   * Authentication method to use for RavenDB (only 'none' supported)
   */
  authMethod: AuthenticationMethod;

  /**
   * Default server URL if not provided in the connection request
   */
  defaultUrl?: string;

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
  return validated;
}

/**
 * Create a configuration object from environment variables
 *
 * @returns The configuration object
 */
export function configFromEnv(): RavenDBConfig {
  // Always use 'none' authentication method regardless of environment variable
  const authMethod = AuthenticationMethod.None;

  const config: RavenDBConfig = {
    authMethod,
    defaultUrl: process.env.RAVENDB_URL,
    queryTimeout: process.env.RAVENDB_QUERY_TIMEOUT
      ? parseInt(process.env.RAVENDB_QUERY_TIMEOUT)
      : undefined,
  };

  return config;
}
