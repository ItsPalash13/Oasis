import express from 'express';
import { Level } from '../../models/Level';
import { Chapter } from '../../models/Chapter';
import { Unit } from '../../models/Units';
import { Section } from '../../models/Section';
import { Topic } from '../../models/Topic';
import { Request, Response } from 'express';

const router = express.Router();

// GET all levels with populated chapter and unit data
router.get('/', async (req: Request, res: Response) => {
  try {
    const { chapterId, unitId, sectionId } = req.query;
    
    let filter = {};
    if (chapterId && unitId && sectionId) {
      filter = { chapterId, unitId, sectionId };
    } else if (chapterId && unitId) {
      filter = { chapterId, unitId };
    } else if (chapterId && sectionId) {
      filter = { chapterId, sectionId };
    } else if (chapterId) {
      filter = { chapterId };
    } else {
      return res.status(400).json({
        success: false,
        message: 'chapterId is required'
      });
    }

    const levels = await Level.find(filter)
      .populate('chapterId', 'name')
      .populate('unitId', 'name')
      .populate('sectionId', 'name')
      .populate('topics', 'topic') // Populate topics with their names
      .sort({ levelNumber: 1 });

    return res.json({
      success: true,
      data: levels
    });
  } catch (error) {
    console.error('Error fetching levels:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch levels',
      error: error.message
    });
  }
});

// GET levels by chapter ID
router.get('/by-chapter/:chapterId', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;

    // Validate chapter exists
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    const levels = await Level.find({ chapterId })
      .populate('chapterId', 'name')
      .populate('unitId', 'name')
      .populate('sectionId', 'name')
      .populate('topics', 'topic') // Populate topics with their names
      .sort({ levelNumber: 1 });

    return res.json({
      success: true,
      data: levels
    });
  } catch (error) {
    console.error('Error fetching levels by chapter:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch levels by chapter',
      error: error.message
    });
  }
});

// POST create new level (time_rush or precision_path)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      levelNumber,
      description,
      topics,
      status = false,
      chapterId,
      unitId,
      sectionId,
      type,
      timeRush,
      precisionPath,
      difficultyParams
    } = req.body;

    // Validate required fields
    if (!name || !levelNumber || !description || !topics || !chapterId || !unitId || !sectionId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate type
    if (!['time_rush', 'precision_path'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "time_rush" or "precision_path"'
      });
    }

    // Validate chapter exists
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(400).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    // Validate unit exists
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(400).json({
        success: false,
        message: 'Unit not found'
      });
    }

    // Validate section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(400).json({
        success: false,
        message: 'Section not found'
      });
    }

    // Validate topics exist (topics are now stored as ObjectIds)
    if (topics && Array.isArray(topics)) {
      const existingTopics = await Topic.find({ _id: { $in: topics } });
      if (existingTopics.length !== topics.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more topics not found'
        });
      }
    }

    // Validate level number uniqueness within chapter
    const existingLevel = await Level.findOne({
      chapterId,
      levelNumber
    });
    if (existingLevel) {
      return res.status(400).json({
        success: false,
        message: `Level number ${levelNumber} already exists in this chapter`
      });
    }

    // Validate type-specific fields
    if (type === 'time_rush') {
      if (!timeRush || !timeRush.requiredXp || !timeRush.totalTime) {
        return res.status(400).json({
          success: false,
          message: 'Time Rush levels require requiredXp and totalTime'
        });
      }
    } else if (type === 'precision_path') {
      if (!precisionPath || !precisionPath.requiredXp || !precisionPath.totalQuestions) {
        return res.status(400).json({
          success: false,
          message: 'Precision Path levels require requiredXp and totalQuestions'
        });
      }
    }

    // Create level data
    const levelData: any = {
      name,
      levelNumber,
      description,
      topics,
      status,
      chapterId,
      unitId,
      sectionId,
      type,
      difficultyParams: difficultyParams || {
        mean: 750,
        sd: 150,
        alpha: 5
      }
    };

    // Add type-specific fields
    if (type === 'time_rush') {
      levelData.timeRush = timeRush;
    } else if (type === 'precision_path') {
      levelData.precisionPath = precisionPath;
    }

    const level = new Level(levelData);
    await level.save();

    // Populate and return the created level
    const populatedLevel = await Level.findById(level._id)
      .populate('chapterId', 'name')
      .populate('unitId', 'name')
      .populate('sectionId', 'name');

    return res.status(201).json({
      success: true,
      message: 'Level created successfully',
      data: populatedLevel
    });
  } catch (error) {
    console.error('Error creating level:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create level',
      error: error.message
    });
  }
});

// PUT update level
router.put('/:id', async (req: Request, res: Response) => { 
  try {
    const { id } = req.params;
    const {
      name,
      levelNumber,
      description,
      topics,
      status,
      chapterId,
      unitId,
      sectionId,
      type,
      timeRush,
      precisionPath,
      difficultyParams
    } = req.body;

    // Find existing level
    const existingLevel = await Level.findById(id);
    if (!existingLevel) {
      return res.status(404).json({
        success: false,
        message: 'Level not found'
      });
    }

    // Validate type if changing
    if (type && !['time_rush', 'precision_path'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "time_rush" or "precision_path"'
      });
    }

    // Validate chapter exists if changing
    if (chapterId) {
      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        return res.status(400).json({
          success: false,
          message: 'Chapter not found'
        });
      }
    }

    // Validate unit exists if changing
    if (unitId) {
      const unit = await Unit.findById(unitId);
      if (!unit) {
        return res.status(400).json({
          success: false,
          message: 'Unit not found'
        });
      }
    }

    // Validate section exists if changing
    if (sectionId) {
      const section = await Section.findById(sectionId);
      if (!section) {
        return res.status(400).json({
          success: false,
          message: 'Section not found'
        });
      }
    }

    // Validate topics exist if changing (topics are now stored as ObjectIds)
    if (topics && Array.isArray(topics)) {
      const existingTopics = await Topic.find({ _id: { $in: topics } });
      if (existingTopics.length !== topics.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more topics not found'
        });
      }
    }

    // Validate level number uniqueness within chapter (if changing)
    if (levelNumber && (levelNumber !== existingLevel.levelNumber || chapterId !== existingLevel.chapterId.toString())) {
      const conflictingLevel = await Level.findOne({
        chapterId: chapterId || existingLevel.chapterId,
        levelNumber,
        _id: { $ne: id }
      });
      if (conflictingLevel) {
        return res.status(400).json({
          success: false,
          message: `Level number ${levelNumber} already exists in this chapter`
        });
      }
    }

    // Validate type-specific fields
    if (type === 'time_rush') {
      if (!timeRush || !timeRush.requiredXp || !timeRush.totalTime) {
        return res.status(400).json({
          success: false,
          message: 'Time Rush levels require requiredXp and totalTime'
        });
      }
    } else if (type === 'precision_path') {
      if (!precisionPath || !precisionPath.requiredXp || !precisionPath.totalQuestions) {
        return res.status(400).json({
          success: false,
          message: 'Precision Path levels require requiredXp and totalQuestions'
        });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (levelNumber !== undefined) updateData.levelNumber = levelNumber;
    if (description !== undefined) updateData.description = description;
    if (topics !== undefined) updateData.topics = topics;
    if (status !== undefined) updateData.status = status;
    if (chapterId !== undefined) updateData.chapterId = chapterId;
    if (unitId !== undefined) updateData.unitId = unitId;
    if (sectionId !== undefined) updateData.sectionId = sectionId;
    if (type !== undefined) updateData.type = type;
    if (difficultyParams !== undefined) updateData.difficultyParams = difficultyParams;

    // Handle type-specific fields
    if (type === 'time_rush') {
      updateData.timeRush = timeRush;
      updateData.precisionPath = undefined; // Remove precision path data
    } else if (type === 'precision_path') {
      updateData.precisionPath = precisionPath;
      updateData.timeRush = undefined; // Remove time rush data
    }

    const updatedLevel = await Level.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('chapterId', 'name').populate('unitId', 'name').populate('sectionId', 'name').populate('topics', 'topic');

    return res.json({
      success: true,
      message: 'Level updated successfully',
      data: updatedLevel
    });
  } catch (error) {
    console.error('Error updating level:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update level',
      error: error.message
    });
  }
});

// DELETE level
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const level = await Level.findById(id);
    if (!level) {
      return res.status(404).json({
        success: false,
        message: 'Level not found'
      });
    }

    await Level.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Level deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting level:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete level',
      error: error.message
    });
  }
});

// GET level by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const level = await Level.findById(id)
      .populate('chapterId', 'name')
      .populate('unitId', 'name')
      .populate('sectionId', 'name')
      .populate('topics', 'topic');

    if (!level) {
      return res.status(404).json({
        success: false,
        message: 'Level not found'
      });
    }

    return res.json({
      success: true,
      data: level
    });
  } catch (error) {
    console.error('Error fetching level:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch level',
      error: error.message
    });
  }
});

export default router;
