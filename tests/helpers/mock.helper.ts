export class MockHelper {
  static mockResponse(): any {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.header = jest.fn().mockReturnValue(res);
    return res;
  }

  static mockRequest(overrides: any = {}): any {
    return {
      headers: {},
      body: {},
      params: {},
      query: {},
      user: null,
      apiKey: null,
      ...overrides
    };
  }

  static mockNext(): any {
    return jest.fn();
  }

  static mockTwitterClient(): any {
    return {
      v2: {
        tweet: jest.fn().mockResolvedValue({
          data: {
            id: '1234567890',
            text: 'Test tweet'
          }
        }),
        tweetThread: jest.fn().mockResolvedValue({
          data: [
            { id: '1234567890', text: 'Tweet 1' },
            { id: '1234567891', text: 'Tweet 2' }
          ]
        }),
        tweets: jest.fn().mockResolvedValue({
          data: [
            {
              id: '1234567890',
              text: 'Test tweet',
              public_metrics: {
                retweet_count: 5,
                like_count: 10,
                reply_count: 3,
                quote_count: 1,
                impression_count: 200
              }
            }
          ]
        })
      }
    };
  }

  static mockGoogleSheets(): any {
    return {
      spreadsheets: {
        values: {
          get: jest.fn().mockResolvedValue({
            data: {
              values: [
                ['ID', 'Content', 'Status', 'Published Time', 'Views', 'Likes', 'Retweets', 'Replies'],
                ['test-id', 'Test content', 'published', '2024-01-01', '100', '10', '5', '3']
              ]
            }
          }),
          update: jest.fn().mockResolvedValue({
            data: {
              updatedCells: 1
            }
          }),
          append: jest.fn().mockResolvedValue({
            data: {
              updates: {
                updatedCells: 1
              }
            }
          })
        }
      }
    };
  }

  static mockCronJob(): any {
    return {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn()
    };
  }

  static expectSuccess(response: any, expectedData?: any): void {
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        ...(expectedData && { data: expectedData })
      })
    );
  }

  static expectCreated(response: any, expectedData?: any): void {
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        ...(expectedData && { data: expectedData })
      })
    );
  }

  static expectError(response: any, statusCode: number, errorMessage?: string): void {
    expect(response.status).toHaveBeenCalledWith(statusCode);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        ...(errorMessage && { error: errorMessage })
      })
    );
  }

  static expectUnauthorized(response: any): void {
    this.expectError(response, 401);
  }

  static expectForbidden(response: any): void {
    this.expectError(response, 403);
  }

  static expectBadRequest(response: any): void {
    this.expectError(response, 400);
  }

  static expectNotFound(response: any): void {
    this.expectError(response, 404);
  }

  static expectInternalServerError(response: any): void {
    this.expectError(response, 500);
  }
}