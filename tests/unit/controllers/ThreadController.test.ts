import { ThreadController } from '../../../src/controllers/threadController';
import { ThreadService } from '../../../src/services/ThreadService';
import { MockHelper } from '../../helpers/mock.helper';
import { AuthHelper } from '../../helpers/auth.helper';

// Mock ThreadService
jest.mock('../../../src/services/ThreadService');
const MockedThreadService = ThreadService as jest.MockedClass<typeof ThreadService>;

describe('ThreadController', () => {
  let threadController: ThreadController;
  let threadService: jest.Mocked<ThreadService>;
  let req: any;
  let res: any;

  beforeEach(() => {
    threadService = new MockedThreadService() as jest.Mocked<ThreadService>;
    threadController = new ThreadController();
    (threadController as any).threadService = threadService;
    
    req = MockHelper.mockRequest();
    res = MockHelper.mockResponse();
    
    jest.clearAllMocks();
  });

  describe('Create Thread', () => {
    it('should create thread successfully', async () => {
      const testUser = AuthHelper.generateTestUser();
      const threadData = {
        content: ['First tweet', 'Second tweet'],
        scheduledTime: new Date('2024-12-31T23:59:59Z')
      };
      
      const createdThread = {
        id: 'thread-123',
        userId: testUser.id,
        content: threadData.content,
        scheduledTime: threadData.scheduledTime,
        status: 'scheduled',
        createdAt: new Date()
      };

      req.user = testUser;
      req.body = threadData;
      threadService.createThread.mockResolvedValue(createdThread);

      await threadController.createThread(req, res);

      expect(threadService.createThread).toHaveBeenCalledWith({
        ...threadData,
        userId: testUser.id
      });
      
      MockHelper.expectCreated(res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Thread created successfully',
        data: createdThread
      });
    });

    it('should handle missing content', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.body = {}; // Missing content

      await threadController.createThread(req, res);

      MockHelper.expectBadRequest(res);
      expect(threadService.createThread).not.toHaveBeenCalled();
    });

    it('should handle empty content array', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.body = { content: [] };

      await threadController.createThread(req, res);

      MockHelper.expectBadRequest(res);
      expect(threadService.createThread).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.body = { content: ['Test thread'] };
      
      threadService.createThread.mockRejectedValue(new Error('Database error'));

      await threadController.createThread(req, res);

      MockHelper.expectInternalServerError(res);
    });
  });

  describe('Get All Threads', () => {
    it('should return all threads for user', async () => {
      const testUser = AuthHelper.generateTestUser();
      const threads = [
        {
          id: 'thread-1',
          userId: testUser.id,
          content: ['Thread 1'],
          status: 'published'
        },
        {
          id: 'thread-2',
          userId: testUser.id,
          content: ['Thread 2'],
          status: 'draft'
        }
      ];

      req.user = testUser;
      threadService.getAllThreads.mockResolvedValue(threads);

      await threadController.getAllThreads(req, res);

      expect(threadService.getAllThreads).toHaveBeenCalledWith(testUser.id);
      MockHelper.expectSuccess(res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: threads
      });
    });

    it('should return empty array when no threads exist', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      threadService.getAllThreads.mockResolvedValue([]);

      await threadController.getAllThreads(req, res);

      MockHelper.expectSuccess(res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });

    it('should handle service errors', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      threadService.getAllThreads.mockRejectedValue(new Error('Database error'));

      await threadController.getAllThreads(req, res);

      MockHelper.expectInternalServerError(res);
    });
  });

  describe('Get Single Thread', () => {
    it('should return specific thread', async () => {
      const testUser = AuthHelper.generateTestUser();
      const thread = {
        id: 'thread-123',
        userId: testUser.id,
        content: ['Test thread'],
        status: 'draft'
      };

      req.user = testUser;
      req.params = { id: 'thread-123' };
      threadService.getThread.mockResolvedValue(thread);

      await threadController.getThread(req, res);

      expect(threadService.getThread).toHaveBeenCalledWith('thread-123', testUser.id);
      MockHelper.expectSuccess(res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: thread
      });
    });

    it('should handle non-existent thread', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = { id: 'non-existent' };
      threadService.getThread.mockResolvedValue(null);

      await threadController.getThread(req, res);

      MockHelper.expectNotFound(res);
    });

    it('should handle missing thread ID', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = {}; // Missing ID

      await threadController.getThread(req, res);

      MockHelper.expectBadRequest(res);
      expect(threadService.getThread).not.toHaveBeenCalled();
    });
  });

  describe('Update Thread', () => {
    it('should update thread successfully', async () => {
      const testUser = AuthHelper.generateTestUser();
      const updateData = {
        content: ['Updated thread content'],
        status: 'published'
      };
      
      const updatedThread = {
        id: 'thread-123',
        userId: testUser.id,
        ...updateData,
        updatedAt: new Date()
      };

      req.user = testUser;
      req.params = { id: 'thread-123' };
      req.body = updateData;
      threadService.updateThread.mockResolvedValue(updatedThread);

      await threadController.updateThread(req, res);

      expect(threadService.updateThread).toHaveBeenCalledWith('thread-123', updateData, testUser.id);
      MockHelper.expectSuccess(res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Thread updated successfully',
        data: updatedThread
      });
    });

    it('should handle non-existent thread update', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = { id: 'non-existent' };
      req.body = { content: ['Updated content'] };
      threadService.updateThread.mockResolvedValue(null);

      await threadController.updateThread(req, res);

      MockHelper.expectNotFound(res);
    });

    it('should handle empty update data', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = { id: 'thread-123' };
      req.body = {}; // Empty update

      await threadController.updateThread(req, res);

      MockHelper.expectBadRequest(res);
      expect(threadService.updateThread).not.toHaveBeenCalled();
    });
  });

  describe('Delete Thread', () => {
    it('should delete thread successfully', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = { id: 'thread-123' };
      threadService.deleteThread.mockResolvedValue(true);

      await threadController.deleteThread(req, res);

      expect(threadService.deleteThread).toHaveBeenCalledWith('thread-123', testUser.id);
      MockHelper.expectSuccess(res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Thread deleted successfully'
      });
    });

    it('should handle non-existent thread deletion', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = { id: 'non-existent' };
      threadService.deleteThread.mockResolvedValue(false);

      await threadController.deleteThread(req, res);

      MockHelper.expectNotFound(res);
    });

    it('should handle missing thread ID', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = {}; // Missing ID

      await threadController.deleteThread(req, res);

      MockHelper.expectBadRequest(res);
      expect(threadService.deleteThread).not.toHaveBeenCalled();
    });
  });

  describe('Publish Thread', () => {
    it('should publish thread successfully', async () => {
      const testUser = AuthHelper.generateTestUser();
      const publishResult = {
        success: true,
        thread: {
          id: 'thread-123',
          userId: testUser.id,
          status: 'published',
          publishedTime: new Date()
        },
        tweetIds: ['tweet-1', 'tweet-2']
      };

      req.user = testUser;
      req.params = { id: 'thread-123' };
      threadService.publishThread.mockResolvedValue(publishResult);

      await threadController.publishThread(req, res);

      expect(threadService.publishThread).toHaveBeenCalledWith('thread-123', testUser.id);
      MockHelper.expectSuccess(res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Thread published successfully',
        data: publishResult
      });
    });

    it('should handle publish failures', async () => {
      const testUser = AuthHelper.generateTestUser();
      const publishResult = {
        success: false,
        error: 'Twitter API error'
      };

      req.user = testUser;
      req.params = { id: 'thread-123' };
      threadService.publishThread.mockResolvedValue(publishResult);

      await threadController.publishThread(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to publish thread: Twitter API error'
      });
    });

    it('should handle non-existent thread', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = { id: 'non-existent' };
      threadService.publishThread.mockResolvedValue(null);

      await threadController.publishThread(req, res);

      MockHelper.expectNotFound(res);
    });
  });

  describe('Schedule Thread', () => {
    it('should schedule thread successfully', async () => {
      const testUser = AuthHelper.generateTestUser();
      const scheduleTime = new Date('2024-12-31T23:59:59Z');
      const scheduledThread = {
        id: 'thread-123',
        userId: testUser.id,
        status: 'scheduled',
        scheduledTime: scheduleTime
      };

      req.user = testUser;
      req.params = { id: 'thread-123' };
      req.body = { scheduledTime: scheduleTime.toISOString() };
      threadService.scheduleThread.mockResolvedValue(scheduledThread);

      await threadController.scheduleThread(req, res);

      expect(threadService.scheduleThread).toHaveBeenCalledWith('thread-123', scheduleTime, testUser.id);
      MockHelper.expectSuccess(res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Thread scheduled successfully',
        data: scheduledThread
      });
    });

    it('should handle missing scheduled time', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = { id: 'thread-123' };
      req.body = {}; // Missing scheduledTime

      await threadController.scheduleThread(req, res);

      MockHelper.expectBadRequest(res);
      expect(threadService.scheduleThread).not.toHaveBeenCalled();
    });

    it('should handle invalid scheduled time', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = { id: 'thread-123' };
      req.body = { scheduledTime: 'invalid-date' };

      await threadController.scheduleThread(req, res);

      MockHelper.expectBadRequest(res);
      expect(threadService.scheduleThread).not.toHaveBeenCalled();
    });

    it('should handle past scheduled time', async () => {
      const testUser = AuthHelper.generateTestUser();
      const pastTime = new Date('2020-01-01T00:00:00Z');
      
      req.user = testUser;
      req.params = { id: 'thread-123' };
      req.body = { scheduledTime: pastTime.toISOString() };

      await threadController.scheduleThread(req, res);

      MockHelper.expectBadRequest(res);
      expect(threadService.scheduleThread).not.toHaveBeenCalled();
    });
  });

  describe('Get Thread Metrics', () => {
    it('should return thread metrics successfully', async () => {
      const testUser = AuthHelper.generateTestUser();
      const metrics = {
        views: 100,
        likes: 10,
        retweets: 5,
        replies: 3,
        impressions: 200,
        engagementRate: 0.09
      };

      req.user = testUser;
      req.params = { id: 'thread-123' };
      threadService.getThreadMetrics.mockResolvedValue(metrics);

      await threadController.getThreadMetrics(req, res);

      expect(threadService.getThreadMetrics).toHaveBeenCalledWith('thread-123', testUser.id);
      MockHelper.expectSuccess(res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: metrics
      });
    });

    it('should handle thread without metrics', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = { id: 'thread-123' };
      threadService.getThreadMetrics.mockResolvedValue(null);

      await threadController.getThreadMetrics(req, res);

      MockHelper.expectNotFound(res);
    });

    it('should handle missing thread ID', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.params = {}; // Missing ID

      await threadController.getThreadMetrics(req, res);

      MockHelper.expectBadRequest(res);
      expect(threadService.getThreadMetrics).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Requirements', () => {
    it('should handle unauthenticated requests', async () => {
      req.user = null; // No user

      await threadController.createThread(req, res);

      MockHelper.expectUnauthorized(res);
      expect(threadService.createThread).not.toHaveBeenCalled();
    });

    it('should pass user ID to service methods', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.body = { content: ['Test'] };
      threadService.createThread.mockResolvedValue({} as any);

      await threadController.createThread(req, res);

      expect(threadService.createThread).toHaveBeenCalledWith(
        expect.objectContaining({ userId: testUser.id })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected service errors', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      threadService.getAllThreads.mockRejectedValue(new Error('Unexpected error'));

      await threadController.getAllThreads(req, res);

      MockHelper.expectInternalServerError(res);
    });

    it('should handle service timeout errors', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      req.body = { content: ['Test'] };
      
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';
      threadService.createThread.mockRejectedValue(timeoutError);

      await threadController.createThread(req, res);

      MockHelper.expectInternalServerError(res);
    });
  });
});