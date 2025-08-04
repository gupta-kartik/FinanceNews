// Swagger Documentation Configuration
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Open Banking API',
      version: '1.0.0',
      description: `
# Open Banking API Documentation

This API provides open banking services including:
- Third Party Provider (TPP) management and authentication
- Consent management for secure data sharing
- Account Information Services (AIS)
- Payment Initiation Services (PIS)
- Funds Confirmation Services

## Authentication

All API endpoints (except TPP registration and authentication) require:
1. **Bearer Token**: Obtained from \`/openbanking/v1/tpp/auth\`
2. **Consent ID**: Passed in \`x-consent-id\` header for data access

## Rate Limiting

- 100 requests per minute per client
- Rate limit headers included in responses
- HTTP 429 status code when limit exceeded

## Error Handling

All errors follow the OAuth 2.0 error response format:
\`\`\`json
{
  "error": "error_code",
  "error_description": "Human readable description",
  "request_id": "unique-request-id"
}
\`\`\`

## Consent Flow

1. Register as TPP (if not already registered)
2. Authenticate and get access token
3. Create consent request for specific user and permissions
4. User grants/rejects consent (usually via web interface)
5. Use granted consent to access user data

## Demo Data

This implementation uses mock data for demonstration. Sample users and accounts are pre-configured.

**Sample TPP Credentials:**
- Client ID: \`demo_client_001\`
- Client Secret: \`demo_secret_001\`
- Scopes: \`["account_info", "payment_initiation"]\`

**Sample User ID:** \`user_001\`
      `,
      contact: {
        name: 'API Support',
        email: 'api-support@financeNews.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.financenews.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error code'
            },
            error_description: {
              type: 'string',
              description: 'Human readable error description'
            },
            request_id: {
              type: 'string',
              description: 'Unique request identifier'
            }
          }
        },
        Account: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'Unique account identifier'
            },
            accountType: {
              type: 'string',
              enum: ['current', 'savings', 'credit'],
              description: 'Type of account'
            },
            accountNumber: {
              type: 'string',
              description: 'Masked account number'
            },
            accountName: {
              type: 'string',
              description: 'Account name or description'
            },
            currency: {
              type: 'string',
              description: 'Account currency (ISO 4217)',
              example: 'INR'
            },
            balance: {
              $ref: '#/components/schemas/Amount'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'blocked'],
              description: 'Account status'
            }
          }
        },
        Amount: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Amount value'
            },
            currency: {
              type: 'string',
              description: 'Currency code (ISO 4217)',
              example: 'INR'
            }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            transactionId: {
              type: 'string',
              description: 'Unique transaction identifier'
            },
            accountId: {
              type: 'string',
              description: 'Account identifier'
            },
            amount: {
              $ref: '#/components/schemas/Amount'
            },
            creditDebitIndicator: {
              type: 'string',
              enum: ['CREDIT', 'DEBIT'],
              description: 'Transaction direction'
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed'],
              description: 'Transaction status'
            },
            bookingDateTime: {
              type: 'string',
              format: 'date-time',
              description: 'Transaction booking date and time'
            },
            transactionInformation: {
              type: 'string',
              description: 'Transaction description'
            },
            transactionReference: {
              type: 'string',
              description: 'Transaction reference number'
            }
          }
        },
        Consent: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'Unique consent identifier'
            },
            tppId: {
              type: 'string',
              description: 'Third Party Provider identifier'
            },
            userId: {
              type: 'string',
              description: 'User identifier'
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of granted permissions'
            },
            status: {
              type: 'string',
              enum: ['pending', 'granted', 'rejected', 'revoked', 'expired'],
              description: 'Consent status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Consent creation timestamp'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Consent expiration timestamp'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'TPP Management',
        description: 'Third Party Provider registration and authentication'
      },
      {
        name: 'Consent Management',
        description: 'User consent creation, granting, and management'
      },
      {
        name: 'Account Information',
        description: 'Access to user account details, balances, and transactions'
      },
      {
        name: 'Funds Confirmation',
        description: 'Check availability of funds in user accounts'
      },
      {
        name: 'Payment Initiation',
        description: 'Initiate payments on behalf of users'
      }
    ]
  },
  apis: ['./openbanking/routes.js'], // Path to the API routes file
};

const specs = swaggerJsdoc(options);

module.exports = specs;