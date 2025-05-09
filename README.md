# RavenDB MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with RavenDB databases through a standardized interface.

## Overview

This MCP server allows AI assistants to perform common RavenDB operations including:

- Connection management
- Database selection
- Collection listing
- Index management
- Document operations (get, store, delete)
- RQL queries

## Requirements

- Node.js 16+
- RavenDB 7.x
- One of the following authentication methods:
  - Certificate (.pfx or .pem file)
  - Non-secured mode (no authentication)

## Installation

```bash
# Install globally
npm install -g ravendb-mcp

# Or run directly with npx
npx ravendb-mcp
```

## Configuration

### Server Configuration

Configure the server using environment variables or a `.env` file:

```
# Authentication Method
# Options: certificate, none
RAVENDB_AUTH_METHOD=certificate

# Certificate Authentication
RAVENDB_CERT_PATH=/path/to/certificate.pfx
RAVENDB_CERT_PASSWORD=certificate_password

# Non-secured Mode (no authentication)
# RAVENDB_AUTH_METHOD=none

# Connection
RAVENDB_URL=https://your-ravendb-server:port

# Optional settings
RAVENDB_QUERY_TIMEOUT=30000  # Query timeout in milliseconds (optional)
```

### Cline MCP Configuration

To configure this MCP server for use with Cline AI, add the following to your MCP configuration:

#### Certificate Authentication (Default)

```json
{
  "mcpServers": {
    "github.com/johnib/ravendb-mcp": {
      "disabled": false,
      "timeout": 60,
      "command": "npx",
      "args": ["-y", "ravendb-mcp"],
      "env": {
        "RAVENDB_AUTH_METHOD": "certificate",
        "RAVENDB_CERT_PATH": "/path/to/certificate.pfx",
        "RAVENDB_CERT_PASSWORD": "certificate_password",
        "RAVENDB_URL": "https://your-ravendb-server:port"
      },
      "transportType": "stdio"
    }
  }
}
```

#### Non-secured Mode

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

You can customize the environment variables based on your specific RavenDB setup.

## Available Tools

### Connection Tools

#### initialize-connection

Establishes a connection to a RavenDB server.

```json
{
  "server_url": "https://your-ravendb-server:port",
  "database": "YourDatabase"
}
```

#### select-database

Switches to a specific database context.

```json
{
  "database": "AnotherDatabase"
}
```

### Exploration Tools

#### show-collections

Lists all collections in the current database.

```json
{}
```

#### show-indexes

Lists all indexes in the current database.

```json
{}
```

### Document Operations

#### get-document

Retrieves a document by ID.

```json
{
  "id": "employees/1"
}
```

#### store-document

Creates or updates a document.

```json
{
  "document": {
    "name": "John Doe",
    "email": "john@example.com",
    "department": "Engineering"
  },
  "id": "employees/1"  // Optional, will be generated if not provided
}
```

#### delete-document

Deletes a document by ID.

```json
{
  "id": "employees/1"
}
```

### Query Operations

#### query-documents

Executes RQL queries with results handling.

```json
{
  "query": "from Employees where department = 'Engineering'"
}
```

## Example Usage

Here's a typical workflow for interacting with the RavenDB MCP server through an AI assistant:

1. **Connect to the database**

   ```
   Use the initialize-connection tool to connect to your RavenDB server
   ```

2. **Explore the database structure**

   ```
   Use show-collections to see what collections are available
   ```

3. **Retrieve documents**

   ```
   Use get-document to fetch specific documents by ID
   ```

4. **Run queries**

   ```
   Use query-documents to execute RQL queries
   ```

5. **Modify data**

   ```
   Use store-document to create or update documents
   Use delete-document to remove documents
   ```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Test with the MCP inspector
npm run inspector
```

## License

MIT
