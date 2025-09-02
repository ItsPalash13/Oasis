import express, { Request, Response } from 'express';
import { Topic } from '../models/Topic';
import { Section } from '../models/Section';
import { UserTopicPerformance } from '../models/Performance/UserTopicPerformance';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();
router.use(authMiddleware);

export default router; 

// New APIs: User topic accuracy history (WMA) from UserTopicPerformance

// GET /api/performance/topics-accuracy-history?topicIds=a,b,c&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&sectionId=xyz
router.get('/topics-accuracy-history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const topicIdsParam = req.query.topicIds as string | undefined;
    const sectionId = req.query.sectionId as string | undefined;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    let topicIds: string[] = [];
    if (topicIdsParam && topicIdsParam.length > 0) {
      topicIds = topicIdsParam.split(',').map(id => id.trim()).filter(Boolean);
    } else if (sectionId) {
      // If no topicIds but sectionId is provided, get topics from that section
      const section = await Section.findById(sectionId).select('topics');
      if (section && section.topics) {
        topicIds = section.topics.map((t: any) => t.toString());
      } else {
        return res.json({ data: [], meta: { topicIds: [], sectionId, startDate: startDate || null, endDate: endDate || null, totalTopics: 0 } });
      }
    } else {
      return res.status(400).json({ error: 'Provide topicIds or sectionId' });
    }

    const utp = await UserTopicPerformance.findOne({ userId });
    if (!utp) {
      return res.json({ data: [], meta: { topicIds, startDate: startDate || null, endDate: endDate || null } });
    }
    
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    // If end is a date-only string, include the full day by setting to 23:59:59.999
    if (end && end.toString() !== 'Invalid Date') {
      end.setHours(23, 59, 59, 999);
    }

    // Prepare topic name map
    const topicsDocs = await Topic.find({ _id: { $in: topicIds } }).select('_id topic').lean();
    const topicNameMap = new Map((topicsDocs as any[]).map((t: any) => [t._id.toString(), t.topic]));

    const topicIdSet = new Set(topicIds.map(id => id.toString()));
    console.log('Topic IDs to find:', topicIds.length);
    console.log('Section ID requested:', sectionId);
    
    const data = (utp.sections || [])
      .flatMap(section => {
        if (!section || !section.sectionId || !Array.isArray(section.topics)) {
          return []; // Skip invalid sections
        }
        const mappedTopics = (section.topics || []).map(topic => {
          // Extract the actual topic data from Mongoose subdocument
          const topicData = {
            topicId: topic.topicId,
            attemptsWindow: topic.attemptsWindow || [],
            accuracyHistory: topic.accuracyHistory || [],
            section: section
          };
          return topicData;
        });
        return mappedTopics;
      })
      .filter((item: any) => {
        if (!item || !item.section || !item.topicId) {
          return false; // Skip invalid items
        }
        
        const matchesToopic = topicIdSet.has(item.topicId.toString());
        const itemSectionId = item.section.sectionId?.toString();
        const requestedSectionIdStr = sectionId?.toString();
        const matchesSection = !sectionId || (itemSectionId && itemSectionId === requestedSectionIdStr);
        
        return matchesToopic && matchesSection;
      })
      .map((item: any) => {
        if (!item || !item.section) {
          return null; // Skip invalid items
        }
        const history = Array.isArray(item.accuracyHistory) ? item.accuracyHistory : [];
        const filtered = history.filter((p: any) => {
          const ts = new Date(p.timestamp);
          if (start && ts < start) return false;
          if (end && ts > end) return false;
          return true;
        }).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return {
          topicId: item.topicId.toString(),
          topicName: topicNameMap.get(item.topicId.toString()) || null,
          sectionId: item.section.sectionId?.toString() || null,
          accuracyHistory: filtered.map((p: any) => ({
            timestamp: p.timestamp,
            accuracy: p.accuracy
          }))
        };
      })
      .filter(Boolean); // Remove null entries

    return res.json({
      data,
      meta: {
        topicIds,
        chapterId: null, // No longer applicable
        sectionId: sectionId || null,
        startDate: startDate || null,
        endDate: endDate || null,
        totalTopics: data.length
      }
    });
  } catch (error) {
    console.error('Error fetching topics accuracy history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/performance/topics-accuracy-latest?topicIds=a,b,c&sectionId=xyz
router.get('/topics-accuracy-latest', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const topicIdsParam = req.query.topicIds as string | undefined;
    const sectionId = req.query.sectionId as string | undefined;
    let topicIds: string[] = [];
    if (topicIdsParam && topicIdsParam.length > 0) {
      topicIds = topicIdsParam.split(',').map(id => id.trim()).filter(Boolean);
    } else if (sectionId) {
      // If no topicIds but sectionId is provided, get topics from that section
      const section = await Section.findById(sectionId).select('topics');
      if (section && section.topics) {
        topicIds = section.topics.map((t: any) => t.toString());
      } else {
        return res.json({ data: [], meta: { topicIds: [], sectionId, totalTopics: 0 } });
      }
    } else {
      return res.status(400).json({ error: 'Provide topicIds or sectionId' });
    }

    const utp = await UserTopicPerformance.findOne({ userId });
    if (!utp) {
      return res.json({ data: [], meta: { topicIds } });
    }

    const topicsDocs = await Topic.find({ _id: { $in: topicIds } }).select('_id topic').lean();
    const topicNameMap = new Map((topicsDocs as any[]).map((t: any) => [t._id.toString(), t.topic]));

    const topicIdSet = new Set(topicIds.map(id => id.toString()));
    console.log('Topic IDs to find:', topicIds.length);
    console.log('Section ID requested:', sectionId);
    
    const data = (utp.sections || [])
      .flatMap(section => {
        if (!section || !section.sectionId || !Array.isArray(section.topics)) {
          return []; // Skip invalid sections
        }
        console.log('Processing section:', {
          sectionId: section.sectionId.toString(),
          topicsCount: section.topics.length
        });
        const mappedTopics = (section.topics || []).map(topic => {
          // Extract the actual topic data from Mongoose subdocument
          const topicData = {
            topicId: topic.topicId,
            attemptsWindow: topic.attemptsWindow || [],
            accuracyHistory: topic.accuracyHistory || [],
            section: section
          };
          return topicData;
        });
        return mappedTopics;
      })
      .filter((item: any) => {
        if (!item || !item.section || !item.topicId) {
          return false; // Skip invalid items
        }
        
        const matchesToopic = topicIdSet.has(item.topicId.toString());
        const itemSectionId = item.section.sectionId?.toString();
        const requestedSectionIdStr = sectionId?.toString();
        const matchesSection = !sectionId || (itemSectionId && itemSectionId === requestedSectionIdStr);
        
        return matchesToopic && matchesSection;
      })
      .map((item: any) => {
        if (!item || !item.section) {
          return null; // Skip invalid items
        }
        const history = Array.isArray(item.accuracyHistory) ? item.accuracyHistory : [];
        const latest = history.length > 0 ? history.reduce((a: any, b: any) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b) : null;
        return {
          topicId: item.topicId.toString(),
          topicName: topicNameMap.get(item.topicId.toString()) || null,
          sectionId: item.section.sectionId?.toString() || null,
          latest: latest ? { timestamp: latest.timestamp, accuracy: latest.accuracy } : null
        };
      })
      .filter(Boolean); // Remove null entries
    
    return res.json({
      data,
      meta: {
        topicIds,
        chapterId: null, // No longer applicable
        sectionId: sectionId || null,
        totalTopics: data.length
      }
    });
  } catch (error) {
    console.error('Error fetching latest topics accuracy:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});