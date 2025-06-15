import { Request, Response } from 'express';
import { ThreadService } from '../services/ThreadService';
import { TwitterService } from '../services/TwitterService';
import { ThreadData } from '../types';

export class ThreadController {
  private threadService: ThreadService;
  private twitterService: TwitterService;

  constructor() {
    this.threadService = new ThreadService();
    this.twitterService = new TwitterService();
  }

  // GET /api/threads
  async getAllThreads(req: Request, res: Response) {
    try {
      const threads = await this.threadService.getAllThreads();
      return res.json({ success: true, data: threads });
    } catch (error) {
      console.error('Error fetching threads:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch threads' });
    }
  }

  // GET /api/threads/:id
  async getThread(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Thread ID is required' });
      }
      
      const thread = await this.threadService.getThreadById(id);
      if (!thread) {
        return res.status(404).json({ success: false, error: 'Thread not found' });
      }

      return res.json({ success: true, data: thread });
    } catch (error) {
      console.error('Error fetching thread:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch thread' });
    }
  }

  // POST /api/threads
  async createThread(req: Request, res: Response) {
    try {
      const { content, scheduledTime } = req.body;

      if (!content || !Array.isArray(content) || content.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Content is required and must be a non-empty array' 
        });
      }

      const threadData: Partial<ThreadData> = {
        content,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
        status: scheduledTime ? 'scheduled' : 'draft'
      };

      const thread = await this.threadService.createThread(threadData);
      return res.status(201).json({ success: true, data: thread });
    } catch (error) {
      console.error('Error creating thread:', error);
      return res.status(500).json({ success: false, error: 'Failed to create thread' });
    }
  }

  // PUT /api/threads/:id
  async updateThread(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Thread ID is required' });
      }
      
      const updates = req.body;
      const thread = await this.threadService.updateThread(id, updates);
      
      if (!thread) {
        return res.status(404).json({ success: false, error: 'Thread not found' });
      }

      return res.json({ success: true, data: thread });
    } catch (error) {
      console.error('Error updating thread:', error);
      return res.status(500).json({ success: false, error: 'Failed to update thread' });
    }
  }

  // DELETE /api/threads/:id
  async deleteThread(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Thread ID is required' });
      }
      
      const success = await this.threadService.deleteThread(id);
      if (!success) {
        return res.status(404).json({ success: false, error: 'Thread not found' });
      }

      return res.json({ success: true, message: 'Thread deleted successfully' });
    } catch (error) {
      console.error('Error deleting thread:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete thread' });
    }
  }

  // POST /api/threads/:id/publish
  async publishThread(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Thread ID is required' });
      }
      
      const thread = await this.threadService.getThreadById(id);
      if (!thread) {
        return res.status(404).json({ success: false, error: 'Thread not found' });
      }

      if (thread.status === 'published') {
        return res.status(400).json({ success: false, error: 'Thread already published' });
      }

      const tweetIds = await this.twitterService.publishThread(thread.content);
      
      await this.threadService.updateThread(id, {
        status: 'published',
        publishedTime: new Date(),
        tweetIds: tweetIds
      });

      return res.json({ 
        success: true, 
        message: 'Thread published successfully',
        tweetIds 
      });
    } catch (error) {
      console.error('Error publishing thread:', error);
      
      // Update thread status to failed
      if (req.params.id) {
        await this.threadService.updateThread(req.params.id, {
          status: 'failed'
        });
      }
      
      return res.status(500).json({ success: false, error: 'Failed to publish thread' });
    }
  }

  // POST /api/threads/:id/schedule
  async scheduleThread(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Thread ID is required' });
      }
      
      const { scheduledTime } = req.body;
      if (!scheduledTime) {
        return res.status(400).json({ success: false, error: 'Scheduled time is required' });
      }

      const scheduleDate = new Date(scheduledTime);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, error: 'Scheduled time must be in the future' });
      }

      const thread = await this.threadService.updateThread(id, {
        scheduledTime: scheduleDate,
        status: 'scheduled'
      });

      if (!thread) {
        return res.status(404).json({ success: false, error: 'Thread not found' });
      }

      return res.json({ success: true, data: thread });
    } catch (error) {
      console.error('Error scheduling thread:', error);
      return res.status(500).json({ success: false, error: 'Failed to schedule thread' });
    }
  }

  // GET /api/threads/:id/metrics
  async getThreadMetrics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Thread ID is required' });
      }
      
      const metrics = await this.threadService.getThreadMetrics(id);
      if (!metrics) {
        return res.status(404).json({ success: false, error: 'Thread metrics not found' });
      }

      return res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Error fetching thread metrics:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch thread metrics' });
    }
  }
}