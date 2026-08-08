import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'REMOTE OS API',
    version: '0.5.1',
    description:
      'Async video standups, transcription, summarization, and user management. Built for MEDINA OS.',
    contact: { name: 'MEDINA OS' },
  },
  servers: [
    {
      url: '/api',
      description: 'Base API path',
    },
  ],
  paths: {
    '/standups': {
      get: {
        operationId: 'listStandups',
        summary: 'List standups',
        description: 'Retrieve all standups for the authenticated user.',
        tags: ['Standups'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of standups',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandupListResponse' },
                example: {
                  standups: [
                    {
                      id: '550e8400-e29b-41d4-a716-446655440000',
                      user: { name: 'Alice', avatar: null },
                      timestamp: '2025-08-08T09:00:00Z',
                      status: 'Summarized',
                      transcript: 'Today I fixed the auth bug...',
                      summary: 'Fixed auth bug and deployed to staging.',
                      videoUrl: '/uploads/videos/123-recording.webm',
                      durationSeconds: 45,
                      blockers: ['Waiting for design review'],
                      action_items: ['Write tests'],
                      sentiment: 'positive',
                      key_achievements: ['Fixed auth bug'],
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
      post: {
        operationId: 'createStandup',
        summary: 'Create a standup',
        description: 'Submit a new standup video entry.',
        tags: ['Standups'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateStandupRequest' },
              example: {
                video_url: 'https://cdn.example.com/v/abc.webm',
                transcript: 'Optional transcript...',
                summary: 'Optional summary...',
                duration: 42,
                status: 'pending',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Standup created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Standup' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
      patch: {
        operationId: 'updateStandup',
        summary: 'Update a standup',
        description: 'Partially update an existing standup.',
        tags: ['Standups'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateStandupRequest' },
              example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                status: 'completed',
                transcript: 'Updated transcript...',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Standup updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Standup' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/transcribe': {
      post: {
        operationId: 'transcribeAudio',
        summary: 'Transcribe audio/video',
        description:
          'Send a video or audio file to OpenAI Whisper for transcription.',
        tags: ['AI'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Audio/video file (max 25MB)',
                  },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Transcription result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TranscriptionResponse' },
                example: {
                  transcript: 'Today I fixed the auth bug and deployed to staging.',
                  language: 'en',
                  duration: 45.2,
                  confidence: 0.94,
                  segments: [
                    {
                      id: 0,
                      start: 0.0,
                      end: 12.5,
                      text: 'Today I fixed the auth bug',
                      avg_logprob: -0.1,
                      no_speech_prob: 0.02,
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '413': { $ref: '#/components/responses/TooLarge' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/summarize': {
      post: {
        operationId: 'summarizeTranscript',
        summary: 'Summarize transcript',
        description:
          'Generate a structured summary, blockers, action items, sentiment, and key achievements from a transcript using OpenAI GPT-4o.',
        tags: ['AI'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SummarizeRequest' },
              example: {
                transcript: 'Today I fixed the auth bug...',
                user_id: '550e8400-e29b-41d4-a716-446655440000',
                standup_id: '660e8400-e29b-41d4-a716-446655440001',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Summary result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SummaryResult' },
                example: {
                  summary: 'Fixed auth bug and deployed to staging.',
                  blockers: ['Waiting for design review'],
                  action_items: ['Write tests', 'Update docs'],
                  sentiment: 'positive',
                  key_achievements: ['Fixed auth bug', 'Deployed to staging'],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/upload': {
      post: {
        operationId: 'uploadFile',
        summary: 'Upload video',
        description:
          'Upload a video file. Stores to S3/R2 if configured, otherwise saves locally.',
        tags: ['Storage'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Video file (webm, mp4, mov). Max 100MB.',
                  },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'File uploaded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadResponse' },
                example: {
                  success: true,
                  videoUrl: '/uploads/videos/1691234567890-recording.webm',
                  size: 12_345_678,
                  type: 'video/webm',
                  storage: 'local',
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '413': { $ref: '#/components/responses/TooLarge' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/auth/signup': {
      post: {
        operationId: 'signup',
        summary: 'Sign up',
        description: 'Create a new user account with email and password.',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SignupRequest' },
              example: {
                name: 'Alice',
                email: 'alice@example.com',
                password: 'securePassword123',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
                example: {
                  user: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Alice',
                    email: 'alice@example.com',
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '409': {
            description: 'Email already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { error: 'Email already registered' },
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/auth/signin': {
      post: {
        operationId: 'signin',
        summary: 'Sign in',
        description: 'Authenticate with email and password via NextAuth credentials provider.',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SigninRequest' },
              example: {
                email: 'alice@example.com',
                password: 'securePassword123',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Session cookie set on success (handled by NextAuth)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/auth/signout': {
      post: {
        operationId: 'signout',
        summary: 'Sign out',
        description: 'Clear the current session.',
        tags: ['Auth'],
        responses: {
          '200': {
            description: 'Signed out',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                  },
                },
                example: { success: true },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Standup: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          video_url: { type: 'string' },
          transcript: { type: 'string' },
          summary: { type: 'string' },
          duration: { type: 'number', nullable: true },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed'],
          },
          created_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'user_id', 'video_url', 'status', 'created_at'],
      },
      CreateStandupRequest: {
        type: 'object',
        properties: {
          video_url: { type: 'string', minLength: 1 },
          transcript: { type: 'string' },
          summary: { type: 'string' },
          duration: { type: 'number' },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed'],
          },
        },
        required: ['video_url'],
      },
      UpdateStandupRequest: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed'],
          },
          transcript: { type: 'string' },
          summary: { type: 'string' },
          duration: { type: 'number' },
        },
        required: ['id'],
      },
      StandupListResponse: {
        type: 'object',
        properties: {
          standups: {
            type: 'array',
            items: { $ref: '#/components/schemas/Standup' },
          },
        },
        required: ['standups'],
      },
      TranscriptionResponse: {
        type: 'object',
        properties: {
          transcript: { type: 'string' },
          language: { type: 'string' },
          duration: { type: 'number' },
          confidence: { type: 'number', nullable: true },
          segments: {
            type: 'array',
            items: { $ref: '#/components/schemas/WhisperSegment' },
          },
        },
        required: ['transcript', 'language', 'duration'],
      },
      WhisperSegment: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          start: { type: 'number' },
          end: { type: 'number' },
          text: { type: 'string' },
          avg_logprob: { type: 'number' },
          no_speech_prob: { type: 'number' },
        },
        required: ['id', 'start', 'end', 'text'],
      },
      SummarizeRequest: {
        type: 'object',
        properties: {
          transcript: { type: 'string' },
          user_id: { type: 'string' },
          standup_id: { type: 'string' },
        },
        required: ['transcript'],
      },
      SummaryResult: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          blockers: { type: 'array', items: { type: 'string' } },
          action_items: { type: 'array', items: { type: 'string' } },
          sentiment: { type: 'string', enum: ['positive', 'neutral', 'concerned'] },
          key_achievements: { type: 'array', items: { type: 'string' } },
        },
        required: ['summary', 'blockers', 'action_items', 'sentiment', 'key_achievements'],
      },
      UploadResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          videoUrl: { type: 'string' },
          size: { type: 'integer' },
          type: { type: 'string' },
          storage: { type: 'string', enum: ['s3', 'local'] },
        },
        required: ['success', 'videoUrl', 'size', 'type', 'storage'],
      },
      SignupRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
        required: ['name', 'email', 'password'],
      },
      SigninRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
        required: ['email', 'password'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          avatar_url: { type: 'string', nullable: true },
        },
        required: ['id', 'name', 'email'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          issues: { type: 'array' },
        },
        required: ['error'],
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { error: 'Validation failed' },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { error: 'Unauthorized' },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { error: 'Forbidden' },
          },
        },
      },
      NotFound: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { error: 'Standup not found' },
          },
        },
      },
      TooLarge: {
        description: 'Payload too large',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { error: 'File too large. Max 25MB.' },
          },
        },
      },
      InternalError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { error: 'Internal server error' },
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'NextAuth JWT session cookie (handled automatically by browser).',
      },
    },
  },
};

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
