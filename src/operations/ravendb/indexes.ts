import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { handleRavenDBError } from '../../common/errors.js';
import { safeLog } from '../../common/utils.js';
import { RavenDBConnection } from './connection.js';

/**
 * Interface for RavenDB index
 */
interface RavenDBIndex {
  name: string;
  type: string;
  maps: string[];
  reduce?: string;
  fields: Record<string, any>;
  collections?: string[];
  configuration?: Record<string, any>;
  isStale: boolean;
  priority: string;
  state: string;
  lockMode?: string;
  createdAt?: Date;
  [key: string]: any; // For other properties we might not know
}

/**
 * Interface for formatted index
 */
interface FormattedIndex {
  name: string;
  type: string;
  maps: string[];
  fields: string[];
  collections: string[];
  isStale: boolean;
  priority: string;
  state: string;
}

/**
 * Extract error message from any error type
 *
 * @param err The error to extract message from
 * @returns The error message string
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

/**
 * Show available indexes in the database
 *
 * @param connection The RavenDB connection
 * @returns The indexes in the database
 */
export async function showIndexes(
  connection: RavenDBConnection,
): Promise<{ indexes: FormattedIndex[] }> {
  try {
    // Ensure we're connected to a database
    connection.checkConnection();

    const database = connection.getCurrentDatabase();
    safeLog(`Listing indexes in database ${database}`);

    // Get document store and create a session
    const store = connection.getDocumentStore();

    try {
      // Get database operations
      const databaseName = database || '';

      // Start a session to work with the database
      const session = store.openSession(databaseName);

      // Use the session to query for indexes
      const indexResults = await session.advanced
        .documentQuery({ collection: '@indexes' })
        .waitForNonStaleResults()
        .all();

      // Format the indexes for easier consumption
      const formattedIndexes: FormattedIndex[] = [];

      if (Array.isArray(indexResults)) {
        for (const result of indexResults) {
          const index = result as unknown as RavenDBIndex;
          formattedIndexes.push({
            name: index.name || 'Unknown',
            type: index.type || 'Unknown',
            maps: Array.isArray(index.maps) ? index.maps : [],
            fields: Object.keys(index.fields || {}),
            collections: Array.isArray(index.collections)
              ? index.collections
              : [],
            isStale: Boolean(index.isStale),
            priority: index.priority || 'Normal',
            state: index.state || 'Normal',
          });
        }
      }

      safeLog(`Found ${formattedIndexes.length} indexes`);

      return { indexes: formattedIndexes };
    } catch (err) {
      // Properly handle and log the error, then return empty result
      safeLog(`Error listing indexes: ${getErrorMessage(err)}`);

      // Only throw if it's an expected type of error that handleRavenDBError can process
      if (err instanceof Error || err instanceof McpError) {
        handleRavenDBError(err, 'list indexes');
      }

      return { indexes: [] }; // Return empty array if error
    }
  } catch (err) {
    // Properly handle and log the error, then return empty result
    safeLog(`Error in showIndexes: ${getErrorMessage(err)}`);

    // Only throw if it's an expected type of error that handleRavenDBError can process
    if (err instanceof Error || err instanceof McpError) {
      handleRavenDBError(err, 'list indexes');
    }

    return { indexes: [] }; // Return empty array if error
  }
}

/**
 * Get index details
 *
 * @param connection The RavenDB connection
 * @param indexName The name of the index
 * @returns The index details
 */
export async function getIndexDetails(
  connection: RavenDBConnection,
  indexName: string,
): Promise<{ index?: any; error?: string }> {
  try {
    // Ensure we're connected to a database
    connection.checkConnection();

    const database = connection.getCurrentDatabase();
    safeLog(`Getting details for index ${indexName} in database ${database}`);

    // Get document store
    const store = connection.getDocumentStore();

    try {
      // Get database operations
      const databaseName = database || '';

      // Start a session to work with the database
      const session = store.openSession(databaseName);

      // Use the session to query for the specific index
      const indexDoc = await session.load(`@indexes/${indexName}`);

      if (!indexDoc) {
        return { error: `Index '${indexName}' not found` };
      }

      // Cast to our expected type for access
      const typedIndexDoc = indexDoc as unknown as RavenDBIndex;

      // Format the index for easier consumption
      const formattedIndex = {
        name: typedIndexDoc.name || indexName,
        type: typedIndexDoc.type || 'Unknown',
        maps: Array.isArray(typedIndexDoc.maps) ? typedIndexDoc.maps : [],
        reduces: typedIndexDoc.reduce,
        fields: typedIndexDoc.fields || {},
        collections: Array.isArray(typedIndexDoc.collections)
          ? typedIndexDoc.collections
          : [],
        configuration: typedIndexDoc.configuration || {},
        isStale: Boolean(typedIndexDoc.isStale),
        priority: typedIndexDoc.priority || 'Normal',
        state: typedIndexDoc.state || 'Normal',
        lockMode: typedIndexDoc.lockMode,
        createdAt: typedIndexDoc.createdAt,
      };

      return { index: formattedIndex };
    } catch (err) {
      // Log the error
      safeLog(`Error getting index details: ${getErrorMessage(err)}`);

      // Only throw if it's an expected type of error that handleRavenDBError can process
      if (err instanceof Error || err instanceof McpError) {
        handleRavenDBError(err, 'get index details');
      }

      return {
        error: `Error retrieving index: ${getErrorMessage(err)}`,
      };
    }
  } catch (err) {
    // Log the error
    safeLog(`Error in getIndexDetails: ${getErrorMessage(err)}`);

    // Only throw if it's an expected type of error that handleRavenDBError can process
    if (err instanceof Error || err instanceof McpError) {
      handleRavenDBError(err, 'get index details');
    }

    return {
      error: `Error retrieving index: ${getErrorMessage(err)}`,
    };
  }
}
