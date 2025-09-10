// import mongoose from 'mongoose';
import { UserTopicPerformance } from '../models/Performance/UserTopicPerformance';
import { Topic } from '../models/Topic';

type TopicAccuracyUpdate = {
  topicId: string;
  topicName: string | null;
  previousAccuracy: number | null;
  updatedAccuracy: number;
};

type ProcessResult = {
  topicsTouched: number;
  topics: TopicAccuracyUpdate[];
};

function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function computeWeightedMovingAverage(points: Array<{ timestamp: Date | string; value: number }>, weight: number): number {
  if (!Array.isArray(points) || points.length === 0) return 0;
  const sorted = [...points].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const w = Math.pow(weight, index);
    numerator += sorted[index].value * w;
    denominator += w;
  }
  return denominator > 0 ? numerator / denominator : 0;
}

export async function processUserLevelSession(
  session: any,
  level: any,
  options?: { attemptWindowSize?: number; accuracyWeight?: number }
): Promise<ProcessResult> {
  const attemptWindowSize = options?.attemptWindowSize ?? getEnvNumber('ATTEMPT_WINDOW_SIZE', 10);
  const accuracyWeight = options?.accuracyWeight ?? getEnvNumber('ACCURACY_WEIGHT', 1.2);
  

  try {
    const snapshot = session as any;
    if (!snapshot) {
      throw new Error('Session payload missing');
    }

    const now = new Date();

    // Get sectionId from the passed level object
    if (!level) {
      throw new Error('Level object is required');
    }
    const sectionId = level.sectionId;

    // Upsert or fetch the user topic performance document
    let utp = await UserTopicPerformance.findOne({ userId: snapshot.userId });
    if (!utp) {
      utp = new UserTopicPerformance({ userId: snapshot.userId, sections: [] });
    } else {
      // Ensure all existing sections have valid structure (backwards compatibility)
      const invalidSections = utp.sections.filter(section => !section.sectionId || !Array.isArray(section.topics));
      if (invalidSections.length > 0) {
        console.log(`Found ${invalidSections.length} existing sections with invalid structure, will be cleaned up`);
      }
    }

    const topicsChangedIndexSet = new Set<string>(); // Use string key: "sectionId_topicId"
    let skippedQuestions = 0;

    const ensureTopicIndex = (topicId: any, sectionId: any): string => {
      const sections = utp!.sections as any[];
      
      // First, try to find the section
      let sectionIndex = sections.findIndex(sec => sec.sectionId && String(sec.sectionId) === String(sectionId));
      
      if (sectionIndex === -1) {
        // Create new section if it doesn't exist
        sections.push({ sectionId, topics: [] });
        sectionIndex = sections.length - 1;
      }
      
      const section = sections[sectionIndex];
      
      // Now find the topic within this section
      let topicIndex = section.topics.findIndex((topic: any) => 
        topic.topicId && String(topic.topicId) === String(topicId)
      );
      
      if (topicIndex === -1) {
        // Create new topic entry if it doesn't exist 
        section.topics.push({ topicId, attemptsWindow: [], accuracyHistory: [] });
        topicIndex = section.topics.length - 1;
      }
      
      // Return a unique key for this section-topic combination
      return `${sectionIndex}_${topicIndex}`;
    };

    for (const entry of snapshot.questionsHistory || []) {
      if (entry.correctOption === undefined || entry.correctOption === null) {
        skippedQuestions += 1;
        continue;
      }

      // Handle both single and multi-correct answers
      const correctOptions = Array.isArray(entry.correctOption) ? entry.correctOption : [entry.correctOption];
      const isCorrect = correctOptions.includes(entry.userOptionChoice) ? 1 : 0;

      for (const topic of entry.topics || []) {
        const topicId = (topic as any).topicId;
        if (!topicId) continue;

        const topicKey = ensureTopicIndex(topicId, sectionId);
        const [sectionIndex, topicIndex] = topicKey.split('_').map(Number);
        const topicEntry = utp.sections[sectionIndex].topics[topicIndex];

        topicEntry.attemptsWindow.push({ timestamp: now, value: isCorrect });
        if (Array.isArray(topicEntry.attemptsWindow) && topicEntry.attemptsWindow.length > attemptWindowSize) {
          topicEntry.attemptsWindow = topicEntry.attemptsWindow.slice(-attemptWindowSize);
        }
        topicsChangedIndexSet.add(topicKey);
      }
    }

    // Compute and append WMA accuracy once per touched topic
    const perTopicUpdates: TopicAccuracyUpdate[] = [];
    for (const topicKey of topicsChangedIndexSet) {
      const [sectionIndex, topicIndex] = topicKey.split('_').map(Number);
      const topicEntry = utp.sections[sectionIndex].topics[topicIndex];
      
      const topicIdStr = String(topicEntry.topicId);
      const history = Array.isArray(topicEntry.accuracyHistory) ? topicEntry.accuracyHistory : [];
      const previousAccuracy = history.length > 0 ? history[history.length - 1].accuracy : null;
      const wma = computeWeightedMovingAverage(topicEntry.attemptsWindow || [], accuracyWeight);
      topicEntry.accuracyHistory.push({ timestamp: now, accuracy: wma });
      perTopicUpdates.push({ topicId: topicIdStr, topicName: null, previousAccuracy, updatedAccuracy: wma });
    }

    if (topicsChangedIndexSet.size > 0) {
      // Clean up old entries without proper structure (backwards compatibility cleanup)
      const originalSectionsCount = utp.sections.length;
      utp.sections = utp.sections.filter(section => 
        section && section.sectionId && Array.isArray(section.topics)
      );
      
      // Clean up invalid topics within sections
      utp.sections.forEach((section: any) => {
        const originalTopicsCount = section.topics.length;
        section.topics = section.topics.filter((topic: any) => 
          topic && topic.topicId && Array.isArray(topic.attemptsWindow) && Array.isArray(topic.accuracyHistory)
        );
        if (section.topics.length !== originalTopicsCount) {
          console.log(`Cleaned up ${originalTopicsCount - section.topics.length} invalid topics in section ${section.sectionId}`);
        }
      });
      
      const removedSectionsCount = originalSectionsCount - utp.sections.length;
      if (removedSectionsCount > 0) {
        console.log(`Cleaned up ${removedSectionsCount} invalid sections`);
      }
      
      await utp.save();
    }

    // Enrich with topic names using a reusable helper
    if (perTopicUpdates.length > 0) {
      const ids = Array.from(new Set(perTopicUpdates.map(t => t.topicId)));
      const nameMap = await mapTopicIdsToNames(ids);
      perTopicUpdates.forEach(t => { t.topicName = nameMap.get(t.topicId) || null; });
    }

    // No status updates; processing live session object

    return {
      topicsTouched: topicsChangedIndexSet.size,
      topics: Array.from(perTopicUpdates),
    };
  } catch (error: any) {
    throw error;
  }
}

export default {
  processUserLevelSession,
};

// General helper to map topic IDs to names
export async function mapTopicIdsToNames(topicIds: string[]): Promise<Map<string, string>> {
  if (!Array.isArray(topicIds) || topicIds.length === 0) return new Map();
  const uniqueIds = Array.from(new Set(topicIds)).map(id => id.toString());
  const topicsDocs = await Topic.find({ _id: { $in: uniqueIds } }).select('_id topic').lean();
  return new Map((topicsDocs as any[]).map((t: any) => [t._id.toString(), t.topic as string]));
}


