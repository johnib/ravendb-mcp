# Technical Context: RavenDB MCP Server

## Technology Stack

### Core Technologies

- **Node.js (16+)**: Runtime environment for the server
- **TypeScript**: Programming language with static typing
- **RavenDB Client**: Official Node.js client for RavenDB 7.x
- **MCP SDK**: Model Context Protocol tools and interfaces
- **Zod**: Schema validation library

### Development Dependencies

- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **ts-node**: TypeScript execution environment
- **Jest/Mocha**: For testing (to be decided)

## Development Environment

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Access to a RavenDB 7.x instance for testing
- Authentication credentials (certificate for secure mode, or none for non-secured mode)

### Local Setup

```bash
# Clone repository
git clone <repository-url>

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Test with the MCP inspector
npm run inspector
```

## Configuration

### Environment Variables

The server is configured using environment variables or a `.env` file:

```env
# Authentication Method
RAVENDB_AUTH_METHOD=none  # Currently only 'none' is supported

# Connection
RAVENDB_URL=http://server:port  # Default RavenDB server URL

# Optional settings
RAVENDB_QUERY_TIMEOUT=30000  # Query timeout in milliseconds (optional)
```

### Cline MCP Configuration

For integration with Cline AI:

```json
{
  "mcpServers": {
    "github.com/johnib/ravendb-mcp": {
      "disabled": false,
      "timeout": 60,
      "command": "npx",
      "args": ["-y", "ravendb-mcp"],
      "env": {
        "RAVENDB_AUTH_METHOD": "none",
        "RAVENDB_URL": "http://your-ravendb-server:port"
      },
      "transportType": "stdio"
    }
  }
}
```

## Technical Constraints

### RavenDB 7.x Specific Requirements

- **Connection Initialization**:
  - For non-secured mode, do NOT provide auth options parameter to DocumentStore constructor
  - Example: `new DocumentStore(url, database)` instead of `new DocumentStore(url, database, {})`
  - Providing empty auth options triggers certificate validation even in non-secured mode
  - This is different from RavenDB 5.x/6.x behavior where empty auth objects were acceptable

- **RQL Syntax Requirements**:
  - Queries must follow strict clause ordering: FROM → WHERE → SELECT
  - Unlike SQL, RQL requires FROM clause first
  - Example: `FROM @all_docs WHERE property = value SELECT field`
  - ORDER BY clause may cause syntax errors in certain queries (especially collection listing)
  - Collection metadata must be accessed via `@metadata.@collection` pattern

- **Query Execution**:
  - RavenDB 7.x enforces stricter query parsing than previous versions
  - Error messages like "Expected FROM clause but got: SELECT" indicate syntax order issues
  - Collection listing requires special handling due to syntax constraints

### Performance Considerations

- Stateful connection management between calls
- JSON serialization and deserialization overhead
- Network latency between server and RavenDB instance
- Response size limitations in the MCP protocol

### Security Constraints

- Secure storage of authentication credentials
- Prevention of unauthorized access
- Protection against injection attacks in queries
- Proper error handling without exposing sensitive information

### Compatibility Requirements

- RavenDB 7.x API compatibility
- MCP protocol compliance
- Node.js version compatibility (16+)
- Cross-platform support (Windows, macOS, Linux)

## Dependencies and Integrations

### Primary Dependencies

- **ravendb**: Official RavenDB client for Node.js
- **model-context-protocol**: MCP server implementation
- **zod**: Schema validation
- **dotenv**: Environment variable management
- **typescript**: Type system and compiler

### External Systems

- **RavenDB Database Server**: The target database system
- **AI Assistant Platforms**: Systems using the MCP protocol

## Deployment and Distribution

### Packaging

- npm package with appropriate dependencies
- Executable via npx command
- Published to npm registry
- Docker container (future consideration)

### Installation

```bash
# Install globally
npm install -g ravendb-mcp

# Or run directly with npx
npx ravendb-mcp
```

## Technical Roadmap

### Current Phase

- Basic implementation with core functionality
- Non-secured mode authentication only
- Essential database operations

### Future Technical Enhancements

- Streaming capabilities for large result sets
- Advanced caching for better performance
- Connection pooling for multi-user scenarios
- Enhanced error recovery mechanisms
- Extended RavenDB feature support
