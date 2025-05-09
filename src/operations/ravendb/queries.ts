import { handleRavenDBError } from '../../common/errors.js';
import { safeLog } from '../../common/utils.js';
import { RavenDBConnection } from './connection.js';

/**
 * Execute a RQL query
 *
 * @param connection The RavenDB connection
 * @param query The RQL query to execute
 * @returns The query results
 */
export async function executeQuery(
  connection: RavenDBConnection,
  query: string,
): Promise<any> {
  try {
    // Ensure we're connected to a database
    connection.checkConnection();

    const database = connection.getCurrentDatabase();
    safeLog(`Executing query in database ${database}: ${query}`);

    // Get document store and create a session
    const store = connection.getDocumentStore();
    const session = store.openSession({
      database: database || undefined,
    });

    try {
      // Execute the query
      const queryResults = await session.advanced.rawQuery(query).all();

      safeLog(`Query executed, returned ${queryResults.length} results`);

      return {
        totalResults: queryResults.length,
        results: queryResults,
      };
    } finally {
      // Always close the session
      await session.dispose();
    }
  } catch (error) {
    handleRavenDBError(error, 'execute query');
  }
}

/**
 * List collections in the database
 *
 * @param connection The RavenDB connection
 * @returns The collections in the database
 */
export async function showCollections(
  connection: RavenDBConnection,
): Promise<{ collections: string[] }> {
  try {
    // Ensure we're connected to a database
    connection.checkConnection();

    const database = connection.getCurrentDatabase();
    safeLog(`Listing collections in database ${database}`);

    // Get document store and create a session
    const store = connection.getDocumentStore();
    const session = store.openSession({
      database: database || undefined,
    });

    try {
      // Get collection info
      const collections = await session.advanced
        .rawQuery(
          'FROM @all_docs as c ' +
            'WHERE c.@metadata.@collection != null ' +
            'SELECT DISTINCT c.@metadata.@collection as collection',
        )
        .all();

      // Extract collection names
      const collectionNames = collections
        .map((doc: any) => doc.collection)
        .filter(Boolean);

      safeLog(`Found ${collectionNames.length} collections`);

      return { collections: collectionNames };
    } finally {
      // Always close the session
      await session.dispose();
    }
  } catch (error) {
    handleRavenDBError(error, 'list collections');
  }
}
