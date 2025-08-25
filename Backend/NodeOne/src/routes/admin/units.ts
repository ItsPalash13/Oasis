import express from 'express';
import { Unit } from '../../models/Units';
import { Level } from '../../models/Level';
import { Request, Response } from 'express';

const router = express.Router();

// Create a unit
router.post('/', async (req: Request, res: Response) => {
  try {
    const { chapterId, sectionId, name, description, unitNumber, topics, status } = req.body;
    if (!chapterId || !sectionId || !name || !description || !unitNumber || !Array.isArray(topics)) {
      return res.status(400).json({ success: false, error: 'chapterId, sectionId, name, description, unitNumber and topics (array) are required' });
    }
    const unit = new Unit({ chapterId, sectionId, name, description, unitNumber, topics, status: status ?? true });
    await unit.save();
    return res.status(201).json({ success: true, data: unit });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Update a unit
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, topics, status, sectionId, unitNumber } = req.body;
    const unit = await Unit.findByIdAndUpdate(
      id,
      { name, description, topics, status, ...(sectionId && { sectionId }), ...(unitNumber && { unitNumber }) },
      { new: true, runValidators: true }
    );
    if (!unit) return res.status(404).json({ success: false, error: 'Unit not found' });
    return res.status(200).json({ success: true, data: unit });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Delete a unit
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const unit = await Unit.findByIdAndDelete(id);
    if (!unit) return res.status(404).json({ success: false, error: 'Unit not found' });
    return res.status(200).json({ success: true, message: 'Unit deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// List units (optionally filter by chapterId)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { chapterId, sectionId } = req.query as { chapterId?: string; sectionId?: string };
    const filter: any = {};
    if (chapterId) filter.chapterId = chapterId;
    if (sectionId) filter.sectionId = sectionId;
    const units = await Unit.find(filter).sort({ unitNumber: 1 });
    return res.status(200).json({ success: true, data: units });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get all levels for a unit (with difficulty params)
router.get('/:unitId/levels', async (req: Request, res: Response) => {
  try {
    const { unitId } = req.params;
    const levels = await Level.find({ unitId })
      .select('name levelNumber difficultyParams');
      return res.status(200).json({ success: true, data: levels });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
