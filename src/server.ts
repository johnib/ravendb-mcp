import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { isRavenDBMcpError } from './common/errors.js';
import { safeLog } from './common/utils.js';
import { RavenDBConnection } from './operations/ravendb/connection.js';
import {
  deleteDocument,
  getDocument,
  storeDocument,
} from './operations/ravendb/documents.js';
import { showIndexes } from './operations/ravendb/indexes.js';
import { executeQuery, showCollections } from './operations/ravendb/queries.js';
import { RavenDBConfig, validateConfig } from './types/config.js';

/**
 * Detailed description of the RavenDB MCP server for AI assistants
 */
const RAVENDB_TOOL_DESCRIPTION = `The assistant's goal is to help users interact with RavenDB databases effectively.
Start by establishing the connection and maintain a helpful, conversational tone throughout the interaction.

<mcp>
Tools:
- "initialize-connection": Connect to a RavenDB server
- "select-database": Switch to a specific database context
- "show-collections": List available collections in the current database
- "show-indexes": List available indexes in the current database
- "get-document": Retrieve a document by ID
- "store-document": Create or update a document
- "delete-document": Delete a document by ID
- "query-documents": Execute RQL queries with results handling
</mcp>

<workflow>
1. Connection Setup:
   - Ask for server URL and database name
   - Use API key authentication to connect
   - Store and display available databases

2. Database Exploration:
   - When user mentions data analysis needs, identify target database
   - Use show-collections to fetch collection information from the current database
   - Use show-indexes to fetch index information
   - Present schema details in user-friendly format

3. Document Operations:
   - Retrieve documents using get-document
   - Create or update documents using store-document
   - Delete documents using delete-document
   - Always provide clear feedback on the operations

4. Query Execution:
   - Parse user's analytical questions
   - Match questions to available data structures
   - Generate appropriate RQL queries
   - Execute queries and display results
   - Provide clear explanations of findings

5. Best Practices:
   - Cache schema information to avoid redundant calls
   - Use clear error handling and user feedback
   - Maintain context across multiple queries
   - Explain query logic when helpful
</workflow>

<conversation-flow>
1. Start with: "Would you like to connect to a RavenDB server? Please provide the server URL and database name."

2. After connection:
   - Acknowledge success/failure
   - Guide user toward data exploration

3. For each operation:
   - Confirm target database
   - Check/fetch schema if needed
   - Perform the requested operation
   - Present results clearly

4. Maintain awareness of:
   - Current database context
   - Previously fetched schemas
   - Document IDs and collections
</conversation-flow>

<error-handling>
- Connection failures: Verify API key and server URL
- Schema errors: Verify database/collection names
- Query errors: Provide clear explanation and correction steps
</error-handling>

Remember RavenDB Specifics:
- RavenDB is a NoSQL document database
- Document IDs are typically in the format 'collectionName/id'
- RQL (RavenDB Query Language) is similar to SQL but has differences
- Collections in RavenDB are like tables in SQL databases
- Indexes are used for querying in RavenDB`;

// Define schemas for tool parameters
const InitializeConnectionSchema = z.object({
  server_url: z.string().describe('The URL of the RavenDB server'),
  database: z.string().describe('The database to connect to'),
});

const SelectDatabaseSchema = z.object({
  database: z.string().describe('The database to select'),
});

const ShowCollectionsSchema = z.object({});

const ShowIndexesSchema = z.object({});

const GetDocumentSchema = z.object({
  id: z.string().describe('The ID of the document to retrieve'),
});

const StoreDocumentSchema = z.object({
  document: z.any().describe('The document to store'),
  id: z.string().optional().describe('Optional document ID'),
});

const DeleteDocumentSchema = z.object({
  id: z.string().describe('The ID of the document to delete'),
});

const QueryDocumentsSchema = z.object({
  query: z.string().describe('The RQL query to execute'),
});

/**
 * Create a RavenDB MCP server
 *
 * @param config The RavenDB configuration
 * @returns A configured MCP server instance
 */
export function createRavenDBServer(config: RavenDBConfig): Server {
  // Validate the configuration
  const validatedConfig = validateConfig(config);

  // Initialize the MCP server
  const server = new Server(
    {
      name: 'ravendb-mcp',
      version: '1.0.0',
      description: RAVENDB_TOOL_DESCRIPTION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Declare a variable to store the connection when it's initialized
  let connection: RavenDBConnection | null = null;

  // Register the ListTools request handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'initialize-connection',
          description: 'Connect to a RavenDB server',
          inputSchema: zodToJsonSchema(InitializeConnectionSchema),
        },
        {
          name: 'select-database',
          description: 'Switch to a specific database context',
          inputSchema: zodToJsonSchema(SelectDatabaseSchema),
        },
        {
          name: 'show-collections',
          description: 'List available collections in the current database',
          inputSchema: zodToJsonSchema(ShowCollectionsSchema),
        },
        {
          name: 'show-indexes',
          description: 'List available indexes in the current database',
          inputSchema: zodToJsonSchema(ShowIndexesSchema),
        },
        {
          name: 'get-document',
          description: 'Retrieve a document by ID',
          inputSchema: zodToJsonSchema(GetDocumentSchema),
        },
        {
          name: 'store-document',
          description: 'Create or update a document',
          inputSchema: zodToJsonSchema(StoreDocumentSchema),
        },
        {
          name: 'delete-document',
          description: 'Delete a document by ID',
          inputSchema: zodToJsonSchema(DeleteDocumentSchema),
        },
        {
          name: 'query-documents',
          description: 'Execute RQL queries with results handling',
          inputSchema: zodToJsonSchema(QueryDocumentsSchema),
        },
      ],
    };
  });

  // Register the CallTool request handler
  server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Arguments are required');
      }

      switch (request.params.name) {
        case 'initialize-connection': {
          const args = InitializeConnectionSchema.parse(
            request.params.arguments,
          );

          // Create a new connection each time initialize-connection is called
          // This will override any existing connection
          connection = new RavenDBConnection(validatedConfig);

          // Initialize the connection
          const result = await connection.initialize(
            args.server_url,
            args.database,
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'select-database': {
          const args = SelectDatabaseSchema.parse(request.params.arguments);

          // Check if the connection is initialized
          if (!connection) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'Connection not initialized. Please call initialize-connection first.',
            );
          }

          const result = await connection.selectDatabase(args.database);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'show-collections': {
          ShowCollectionsSchema.parse(request.params.arguments);

          // Check if the connection is initialized
          if (!connection) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'Connection not initialized. Please call initialize-connection first.',
            );
          }

          const result = await showCollections(connection);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'show-indexes': {
          ShowIndexesSchema.parse(request.params.arguments);

          // Check if the connection is initialized
          if (!connection) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'Connection not initialized. Please call initialize-connection first.',
            );
          }

          const result = await showIndexes(connection);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'get-document': {
          const args = GetDocumentSchema.parse(request.params.arguments);

          // Check if the connection is initialized
          if (!connection) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'Connection not initialized. Please call initialize-connection first.',
            );
          }

          const result = await getDocument(connection, args.id);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'store-document': {
          const args = StoreDocumentSchema.parse(request.params.arguments);

          // Check if the connection is initialized
          if (!connection) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'Connection not initialized. Please call initialize-connection first.',
            );
          }

          const result = await storeDocument(
            connection,
            args.document,
            args.id,
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'delete-document': {
          const args = DeleteDocumentSchema.parse(request.params.arguments);

          // Check if the connection is initialized
          if (!connection) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'Connection not initialized. Please call initialize-connection first.',
            );
          }

          const result = await deleteDocument(connection, args.id);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'query-documents': {
          const args = QueryDocumentsSchema.parse(request.params.arguments);

          // Check if the connection is initialized
          if (!connection) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'Connection not initialized. Please call initialize-connection first.',
            );
          }

          const result = await executeQuery(connection, args.query);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`,
          );
      }
    } catch (error: unknown) {
      safeLog(`Error handling tool call: ${error}`);

      // Format the error message
      let errorMessage: string;

      if (error instanceof McpError) {
        errorMessage = `MCP Error: ${error.message}`;
      } else if (isRavenDBMcpError(error)) {
        errorMessage = `${error.message}`;
      } else {
        errorMessage = `Error: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }

      return {
        content: [{ type: 'text', text: errorMessage }],
        isError: true,
      };
    }
  });

  return server;
}
