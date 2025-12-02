# Azure Cosmos DB NoSQL Node.js Quickstart

> **Note**: This is a sample code demonstrating how to use Azure Cosmos DB NoSQL API with Node.js and TypeScript. It is intended for learning and reference purposes.

## Solution Overview

This quickstart implements a **multi-entity building management system** with the following features:

- **Generic Repository Pattern**: Type-safe repository implementation for CRUD operations
- **Multiple Entity Types**: Manages Projects, Floors, and Structural Layouts in a single container
- **Azure Authentication**: Uses DefaultAzureCredential for secure authentication
- **TypeScript Support**: Fully typed models and interfaces
- **Environment Configuration**: Uses dotenv for configuration management

### Data Models

The solution includes three main entity types:

1. **Project**: Building projects with details like client name, address, location coordinates, building type, and construction information
2. **Floor**: Individual floors within projects, including floor number, type, area, and dimensions
3. **Structural Layout**: Detailed structural information for floors, including foundation types, wall specifications, and material details

All entities use a `docType` field as a discriminator for queries and are partitioned by `client_name` for efficient data access.

## Required Packages

### Dependencies

- **@azure/cosmos** (^4.9.0) - Azure Cosmos DB SDK for NoSQL API operations
- **@azure/identity** (^4.13.0) - Azure authentication library supporting managed identities and service principals
- **dotenv** (^17.2.3) - Loads environment variables from .env file

### Dev Dependencies

- **@types/node** (^24.10.1) - TypeScript type definitions for Node.js
- **tsx** (^4.21.0) - TypeScript execution engine for running .ts files directly

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root with the following variables:

```env
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_DATABASE_ID=your-database-name
COSMOS_CONTAINER_ID=your-container-name
```

## Usage

Run the example usage script:

```bash
npm run dev
```

Or using tsx directly:

```bash
npx tsx examples/usage.ts
```

## Project Structure

```
├── examples/
│   └── usage.ts          # Example usage demonstrating CRUD operations
├── models/
│   ├── Floor.ts          # Floor entity model
│   ├── Project.ts        # Project entity model
│   └── StructuralLayout.ts # Structural layout entity model
└── repositories/
    ├── index.ts          # Repository exports
    └── Repository.ts     # Generic repository implementation
```

## Reference

For more information, see the [Azure Cosmos DB NoSQL Node.js Quickstart](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/quickstart-nodejs?pivots=programming-language-ts) documentation.