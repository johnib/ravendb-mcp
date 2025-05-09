# Active Context: RavenDB MCP Server

## Current Focus

The project is currently in the implementation phase. The foundation for the RavenDB MCP Server has been established, and the core functionality has been implemented.

Based on the code review, the current focus is on:

1. Refining the existing functionality
2. Ensuring robust error handling
3. Preparing for packaging and distribution
4. Documentation improvements

## Recent Changes

The project has progressed significantly with the following in place:

- Complete project structure established
- All core tools implemented
- Simplified to support only non-secured mode authentication
- Connection management system implemented
- Error handling utilities created
- Input validation with Zod schemas

## Recent Discoveries and Fixes

### RavenDB 7.x Connection Issues

We discovered a critical issue with RavenDB 7.x connection in non-secured mode:

- When passing an empty auth options object (`{}`) to the DocumentStore constructor, RavenDB tries to use certificate authentication and fails with "Certificate cannot be null"
- Fix: Omit the auth options parameter entirely when in non-secured mode
- Implementation: Changed `new DocumentStore(url, database, {})` to `new DocumentStore(url, database)`

### RQL Syntax Requirements in RavenDB 7.x

Found that RavenDB 7.x has stricter RQL syntax requirements:

- SQL-style queries (starting with SELECT) are not supported
- Correct order is FROM → WHERE → SELECT (opposite of SQL)
- ORDER BY causes syntax errors in certain query contexts
- Fix: Rewrote collection listing query to use proper RavenDB 7.x RQL syntax

Example of updated query:

```sql
# Original (SQL-style, doesn't work):
SELECT DISTINCT c.@metadata.@collection as collection 
FROM @all_docs as c 
WHERE c.@metadata.@collection != null 
ORDER BY collection

# Updated (RavenDB 7.x style, works):
FROM @all_docs as c 
WHERE c.@metadata.@collection != null 
SELECT DISTINCT c.@metadata.@collection as collection
```

## Current Progress

According to the implementation plan in the PRD, we've completed most of the planned phases:

- [x] Initial project setup
- [x] Core server configuration
- [x] Authentication implementation (non-secured mode only)
- [x] Connection management
- [x] Basic error handling
- [x] Tool schema definitions

## Active Decisions and Considerations

### Authentication Strategy

The authentication strategy has been simplified:

- Only non-secured mode (no authentication) is currently supported
- This simplification is temporary to focus on core functionality
- Future versions will re-implement certificate-based authentication

The authentication method is still configurable via environment variables, but currently only 'none' is supported.

### Connection Management

Deciding on the best approach for persistent connection management between tool calls:

- Using a singleton pattern for the connection instance
- Implementing state management in memory
- Handling potential connection timeouts and reconnection logic

### Error Handling

Developing a comprehensive error handling strategy:

- Categorizing errors appropriately (connection, authentication, query, etc.)
- Providing meaningful error messages
- Implementing recovery instructions
- Omitting stack traces from error responses

### Tool Implementation Priority

Following the phased approach outlined in the PRD:

1. First priority: Connection tools
   - initialize-connection
   - select-database

2. Second priority: Data exploration
   - show-collections
   - get-document
   - query-documents

3. Third priority: Data modification
   - store-document
   - delete-document
   - show-indexes

### Development Environment

Ensuring the development environment supports effective testing:

- RavenDB instance accessibility
- Environment variable configuration
- Testing tools and strategies

## Next Steps

### Immediate Tasks

1. Add unit testing
2. Improve error recovery instructions
3. Finalize NPM package configuration
4. Create example queries and operations for documentation

### Shortly After

1. Performance optimizations, especially for large query results
2. Consider adding streaming capabilities
3. Enhance documentation with more examples
4. Add CI/CD pipeline for automated testing and releases

## Key Challenges

1. Ensuring persistent and reliable connection state between tool calls
2. Implementing proper error handling with meaningful messages
3. Creating a clean abstraction over the RavenDB client
4. Balancing simplicity with functionality
5. Handling RavenDB 7.x specific syntax and connection requirements
6. Adapting to differences between RavenDB 7.x and previous versions

## Current Questions

1. What's the most efficient way to maintain connection state between tool invocations?
2. Should we implement connection pooling or a single persistent connection?
3. How to best structure error responses for optimal assistant understanding?
4. What query timeout defaults make sense for typical operations?
