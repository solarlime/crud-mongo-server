import assert from 'node:assert';
import type { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string | number | undefined>;
  data: string | null;
}

export class HttpClient {
  private server: any;

  constructor(server: any) {
    this.server = server;
  }

  async request(options: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<HttpResponse> {
    const { method, url, headers = {}, body } = options;

    return new Promise((resolve) => {
      let mockReq: IncomingMessage;

      if (body) {
        // Create a readable stream from the body
        const bodyStream = Readable.from([body]);
        mockReq = Object.assign(bodyStream, {
          url,
          method,
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(body).toString(),
            ...headers,
          },
        }) as IncomingMessage;
      } else {
        // Create empty stream for GET requests
        mockReq = Object.assign(Readable.from([]), {
          url,
          method,
          headers: {
            'content-type': 'application/json',
            'content-length': '0',
            ...headers,
          },
        }) as IncomingMessage;
      }

      const responseData: HttpResponse = {
        statusCode: 0,
        headers: {},
        data: null,
      };

      const mockRes = {
        setHeader: (name: string, value: string) => {
          responseData.headers[name] = value;
        },
        writeHead: (statusCode: number) => {
          responseData.statusCode = statusCode;
        },
        end: (data?: string) => {
          responseData.data = data || null;
          resolve(responseData);
        },
      };

      // Emit request to server
      this.server.emit('request', mockReq, mockRes);
    });
  }

  async get(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ method: 'GET', url, headers });
  }

  async post(url: string, body: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ method: 'POST', url, body, headers });
  }

  async put(url: string, body: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ method: 'PUT', url, body, headers });
  }

  async delete(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ method: 'DELETE', url, headers });
  }
}

export function assertJsonResponse(response: HttpResponse): any {
  assert.strictEqual(response.statusCode, 200, `Expected status 200, got ${response.statusCode}`);
  assert.ok(response.data, 'Response data should not be null');

  try {
    return JSON.parse(response.data!);
  } catch (_error) {
    assert.fail(`Response is not valid JSON: ${response.data}`);
  }
}

export function assertErrorResponse(response: HttpResponse, expectedStatus: number = 400): any {
  assert.strictEqual(
    response.statusCode,
    expectedStatus,
    `Expected status ${expectedStatus}, got ${response.statusCode}`,
  );
  assert.ok(response.data, 'Response data should not be null');

  try {
    return JSON.parse(response.data!);
  } catch (_error) {
    assert.fail(`Response is not valid JSON: ${response.data}`);
  }
}
