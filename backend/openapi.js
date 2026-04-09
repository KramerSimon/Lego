const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Lego API',
    version: '1.0.0',
    description: 'Backend API for Lego Collection Manager'
  },
  servers: [
    {
      url: 'http://localhost:3000'
    }
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Sets' },
    { name: 'User Sets' },
    { name: 'Users' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: { type: 'string', example: 'simon' },
          password: { type: 'string', example: 'x&#XtZ4l,6eTm3ZaD3R1' }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', example: 'simon' },
          email: { type: 'string', example: 'simon@example.com' },
          full_name: { type: 'string', nullable: true, example: 'Simon Builder' },
          password: { type: 'string', example: 'x&#XtZ4l,6eTm3ZaD3R1' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              user_id: { type: 'integer', example: 1 },
              username: { type: 'string', example: 'simon' },
              email: { type: 'string', nullable: true },
              full_name: { type: 'string', nullable: true },
              onboarding_guide_required: { type: 'boolean' },
              onboarding_completed: { type: 'boolean' },
              onboarding_completed_at: { type: 'string', format: 'date-time', nullable: true }
            }
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      },
      PagedResult: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { type: 'object', additionalProperties: true }
          },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' }
        }
      },
      UserSetWithPartsRequest: {
        type: 'object',
        required: ['user_set', 'parts'],
        properties: {
          user_set: {
            type: 'object',
            required: ['user_id', 'set_num', 'quantity'],
            properties: {
              user_id: { type: 'integer', example: 1 },
              set_num: { type: 'string', example: '7922-1' },
              quantity: { type: 'integer', example: 1 },
              condition_public: { type: 'string', nullable: true },
              purchase_price: { type: 'number', nullable: true }
            }
          },
          parts: {
            type: 'array',
            items: {
              type: 'object',
              required: ['part_num', 'color_id', 'required_quantity'],
              properties: {
                part_num: { type: 'string' },
                color_id: { type: 'integer' },
                required_quantity: { type: 'integer' },
                has_part: { type: 'boolean' },
                owned_quantity: { type: 'number' }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate by username/email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Authenticated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' }
              }
            }
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Registered and authenticated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '409': {
            description: 'Duplicate username or email',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user from bearer token',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current authenticated user'
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/onboarding/complete': {
      post: {
        tags: ['Auth'],
        summary: 'Mark onboarding guide as completed for the current user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Onboarding status updated'
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/sets': {
      get: {
        tags: ['Sets'],
        summary: 'Get sets with pagination, search and optional theme filter',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'themeId', in: 'query', schema: { type: 'integer' } }
        ],
        responses: {
          '200': {
            description: 'Sets list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PagedResult' }
              }
            }
          }
        }
      }
    },
    '/sets/{id}/parts': {
      get: {
        tags: ['Sets'],
        summary: 'Get set inventory parts',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Set parts data' }
        }
      }
    },
    '/sets/{id}/instructions': {
      get: {
        tags: ['Sets'],
        summary: 'Get instruction links for a set',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Set instruction links' }
        }
      }
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Get users',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 25 } }
        ],
        responses: {
          '200': {
            description: 'Users list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PagedResult' }
              }
            }
          }
        }
      }
    },
    '/user_sets': {
      get: {
        tags: ['User Sets'],
        summary: 'Get user sets',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 25 } }
        ],
        responses: {
          '200': {
            description: 'User sets list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PagedResult' }
              }
            }
          }
        }
      }
    },
    '/user_sets/with-parts': {
      post: {
        tags: ['User Sets'],
        summary: 'Create user set and auto-create available/missing rows',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserSetWithPartsRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Created' },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/user_sets/{id}': {
      delete: {
        tags: ['User Sets'],
        summary: 'Delete a whole user set and linked generated rows',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Deleted' },
          '404': { description: 'Not found' }
        }
      }
    },
    '/user_sets/{id}/breakdown': {
      get: {
        tags: ['User Sets'],
        summary: 'Get available and missing parts linked to a user set',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Breakdown returned' },
          '404': { description: 'User set not found' }
        }
      }
    },
    '/user_sets/{id}/parts/{kind}/{rowId}': {
      put: {
        tags: ['User Sets'],
        summary: 'Update part quantity inside user set breakdown row',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'kind', in: 'path', required: true, schema: { type: 'string', enum: ['available', 'missing'] } },
          { name: 'rowId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['quantity'],
                properties: {
                  quantity: { type: 'number', minimum: 0 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Updated' }
        }
      }
    }
  }
};

export default openApiSpec;
