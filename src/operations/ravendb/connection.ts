import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { DocumentStore, IAuthOptions } from 'ravendb';
import {
  createRavenDBMcpError,
  handleRavenDBError,
} from '../../common/errors.js';
import { safeLog } from '../../common/utils.js';
import { AuthenticationMethod, RavenDBConfig } from '../../types/config.js';

/**
 * RavenDB connection manager
 */
export class RavenDBConnection {
  /**
   * The RavenDB document store
   */
  private documentStore: DocumentStore | null = null;

  /**
   * Current database name
   */
  private currentDatabase: string | null = null;

  /**
   * Configuration for RavenDB
   */
  private config: RavenDBConfig;

  /**
   * Create a new RavenDB connection
   *
   * @param config Configuration for RavenDB
   */
  constructor(config: RavenDBConfig) {
    this.config = config;
  }

  /**
   * Get the current database name
   *
   * @returns The current database name
   */
  public getCurrentDatabase(): string | null {
    return this.currentDatabase;
  }

  /**
   * Initialize the connection to RavenDB
   *
   * @param serverUrl The URL of the RavenDB server
   * @param database The database to connect to
   * @returns Information about the connection
   */
  public async initialize(
    serverUrl: string,
    database: string,
  ): Promise<{ server: string; database: string }> {
    try {
      // Close any existing connection
      await this.close();

      // Use provided URL or default from config
      const url = serverUrl || this.config.defaultUrl;
      if (!url) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Server URL is required. Provide it in the request or set RAVENDB_URL environment variable.',
        );
      }

      // Create auth options based on the authentication method
      const authOptions = this.createAuthOptions();

      safeLog(`Initializing connection to RavenDB at ${url}`);

      // Create and initialize the document store
      this.documentStore = new DocumentStore(url, database, authOptions);
      this.documentStore.initialize();
      this.currentDatabase = database;

      safeLog(`Connected to RavenDB at ${url}, database: ${database}`);

      return {
        server: url,
        database,
      };
    } catch (error) {
      handleRavenDBError(error, 'connection initialization');
    }
  }

  /**
   * Select a different database
   *
   * @param database The database to select
   * @returns Information about the selected database
   */
  public async selectDatabase(database: string): Promise<{ database: string }> {
    try {
      if (!this.documentStore) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Not connected to RavenDB. Please call initialize-connection first.',
        );
      }

      if (!database) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Database name is required',
        );
      }

      // Simply store the database name for use in operations
      this.currentDatabase = database;

      safeLog(`Selected database: ${database}`);

      return { database };
    } catch (error) {
      handleRavenDBError(error, 'database selection');
    }
  }

  /**
   * Close the connection to RavenDB
   */
  public async close(): Promise<void> {
    if (this.documentStore) {
      safeLog('Closing RavenDB connection');
      await this.documentStore.dispose();
      this.documentStore = null;
      this.currentDatabase = null;
    }
  }

  /**
   * Get the document store
   *
   * @returns The document store
   * @throws If not connected
   */
  public getDocumentStore(): DocumentStore {
    if (!this.documentStore) {
      throw createRavenDBMcpError(
        'Not connected to RavenDB. Please call initialize-connection first.',
        'not_connected',
        400,
      );
    }
    return this.documentStore;
  }

  /**
   * Check if connected and a database is selected
   *
   * @throws If not connected or no database selected
   */
  public checkConnection(): void {
    if (!this.documentStore) {
      throw createRavenDBMcpError(
        'Not connected to RavenDB. Please call initialize-connection first.',
        'not_connected',
        400,
      );
    }

    if (!this.currentDatabase) {
      throw createRavenDBMcpError(
        'No database selected. Please call select-database first.',
        'no_database',
        400,
      );
    }
  }

  /**
   * Create authentication options based on the configuration
   *
   * @returns Authentication options
   */
  private createAuthOptions(): IAuthOptions {
    // Currently we only support API key authentication
    if (this.config.authMethod === AuthenticationMethod.ApiKey) {
      if (!this.config.apiKey) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'API key is required for API key authentication. Set RAVENDB_API_KEY environment variable.',
        );
      }

      return {
        type: 'api-key',
        apiKey: this.config.apiKey,
      };
    }

    // Default to no authentication (should not happen with our validation)
    return {};
  }
}
