import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Project Management API',
      version: '1.0.0',
      description: 'API for managing projects and project members with Microsoft Entra ID authentication and Cosmos DB',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your Microsoft Entra ID access token',
        },
      },
      schemas: {
        Project: {
          type: 'object',
          required: ['client_name', 'slug', 'name'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier',
            },
            client_name: {
              type: 'string',
              description: 'Client name (partition key part 1)',
            },
            slug: {
              type: 'string',
              description: 'Project slug (partition key part 2)',
            },
            name: {
              type: 'string',
              description: 'Project name',
            },
            projectNumber: {
              type: 'string',
              description: 'Project number',
            },
            address: {
              type: 'string',
              description: 'Project address',
            },
            icon: {
              type: 'string',
              description: 'Project icon',
            },
            lat: {
              type: 'number',
              description: 'Latitude',
            },
            lon: {
              type: 'number',
              description: 'Longitude',
            },
            client: {
              type: 'string',
              description: 'Client information',
            },
            author: {
              type: 'string',
              description: 'Project author',
            },
            buildingType: {
              type: 'string',
              description: 'Type of building',
            },
            constructionDate: {
              type: 'string',
              description: 'Construction date',
            },
            country: {
              type: 'string',
              description: 'Country code',
            },
          },
        },
        ProjectMember: {
          type: 'object',
          required: ['userId', 'email', 'userName', 'role'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier',
            },
            client_name: {
              type: 'string',
              description: 'Client name (partition key part 1)',
            },
            slug: {
              type: 'string',
              description: 'Project slug (partition key part 2)',
            },
            userId: {
              type: 'string',
              description: 'User ID from Microsoft Entra ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            userName: {
              type: 'string',
              description: 'User display name',
            },
            role: {
              type: 'string',
              enum: ['owner', 'editor', 'viewer'],
              description: 'User role in project',
            },
            addedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When user was added',
            },
            addedBy: {
              type: 'string',
              description: 'ID of user who added this member',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error code',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.ts', './app.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
