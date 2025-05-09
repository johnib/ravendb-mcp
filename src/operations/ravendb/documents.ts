import { handleRavenDBError } from '../../common/errors.js';
import { safeLog } from '../../common/utils.js';
import { RavenDBConnection } from './connection.js';

/**
 * Get a document by ID
 *
 * @param connection The RavenDB connection
 * @param id The document ID
 * @returns The document
 */
export async function getDocument(
  connection: RavenDBConnection,
  id: string,
): Promise<any> {
  try {
    // Ensure we're connected to a database
    connection.checkConnection();

    const database = connection.getCurrentDatabase();
    safeLog(`Getting document with ID ${id} from database ${database}`);

    // Get document store and create a session
    const store = connection.getDocumentStore();
    const session = store.openSession({
      database: database || undefined,
    });

    try {
      // Load the document
      const document = await session.load(id);

      if (!document) {
        return { error: `Document with ID '${id}' not found` };
      }

      return { document };
    } finally {
      // Always close the session
      await session.dispose();
    }
  } catch (error) {
    handleRavenDBError(error, 'get document');
  }
}

/**
 * Store a document
 *
 * @param connection The RavenDB connection
 * @param document The document to store
 * @param id Optional document ID
 * @returns The stored document ID
 */
export async function storeDocument(
  connection: RavenDBConnection,
  document: any,
  id?: string,
): Promise<{ id: string }> {
  try {
    // Ensure we're connected to a database
    connection.checkConnection();

    const database = connection.getCurrentDatabase();
    safeLog(`Storing document in database ${database}`);

    // Get document store and create a session
    const store = connection.getDocumentStore();
    const session = store.openSession({
      database: database || undefined,
    });

    try {
      // Store the document
      if (id) {
        await session.store(document, id);
        safeLog(`Stored document with ID ${id}`);
      } else {
        await session.store(document);
        id = session.advanced.getDocumentId(document);
        safeLog(`Stored document with generated ID ${id}`);
      }

      // Save changes
      await session.saveChanges();

      return { id: id || 'unknown' };
    } finally {
      // Always close the session
      await session.dispose();
    }
  } catch (error) {
    handleRavenDBError(error, 'store document');
  }
}

/**
 * Delete a document by ID
 *
 * @param connection The RavenDB connection
 * @param id The document ID
 * @returns Success status
 */
export async function deleteDocument(
  connection: RavenDBConnection,
  id: string,
): Promise<{ success: boolean }> {
  try {
    // Ensure we're connected to a database
    connection.checkConnection();

    const database = connection.getCurrentDatabase();
    safeLog(`Deleting document with ID ${id} from database ${database}`);

    // Get document store and create a session
    const store = connection.getDocumentStore();
    const session = store.openSession({
      database: database || undefined,
    });

    try {
      // Delete the document
      await session.delete(id);

      // Save changes
      await session.saveChanges();

      safeLog(`Deleted document with ID ${id}`);

      return { success: true };
    } finally {
      // Always close the session
      await session.dispose();
    }
  } catch (error) {
    handleRavenDBError(error, 'delete document');
  }
}
