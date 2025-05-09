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
      // Get maintenance operations
      const maintenance = store.maintenance.forDatabase(database || undefined);

      // Get all indexes
      const indexes = await maintenance.send(
        new store.maintenance.getIndexesOperation(),
      );

      // Format the indexes for easier consumption
      const formattedIndexes = indexes.map((index: RavenDBIndex) => {
        // Simplify the index object to avoid exposing internal details
        return {
          name: index.name,
          type: index.type,
          maps: index.maps,
          fields: Object.keys(index.fields || {}),
          collections: index.collections || [],
          isStale: index.isStale,
          priority: index.priority,
          state: index.state,
        };
      });

      safeLog(`Found ${formattedIndexes.length} indexes`);

      return { indexes: formattedIndexes };
    } catch (error) {
      handleRavenDBError(error, 'list indexes');
    }
  } catch (error) {
    handleRavenDBError(error, 'list indexes');
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

    // Get document store and create a session
    const store = connection.getDocumentStore();

    try {
      // Get maintenance operations
      const maintenance = store.maintenance.forDatabase(database || undefined);

      // Get all indexes
      const indexes = await maintenance.send(
        new store.maintenance.getIndexesOperation(),
      );

      // Find the requested index
      const index = indexes.find((idx: RavenDBIndex) => idx.name === indexName);

      if (!index) {
        return { error: `Index '${indexName}' not found` };
      }

      // Format the index for easier consumption
      const formattedIndex = {
        name: index.name,
        type: index.type,
        maps: index.maps,
        reduces: index.reduce,
        fields: index.fields || {},
        collections: index.collections || [],
        configuration: index.configuration || {},
        isStale: index.isStale,
        priority: index.priority,
        state: index.state,
        lockMode: index.lockMode,
        createdAt: index.createdAt,
      };

      return { index: formattedIndex };
    } catch (error) {
      handleRavenDBError(error, 'get index details');
    }
  } catch (error) {
    handleRavenDBError(error, 'get index details');
  }
}
