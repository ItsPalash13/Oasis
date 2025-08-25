import express from 'express';
import { Request, Response } from 'express';
import { Section } from '../../models/Section';
import { Topic } from '../../models/Topic';

const router = express.Router();

// Create a section
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, status, chapterId, sectionNumber, topics } = req.body;
    if (!name || !description || !chapterId || !sectionNumber || !Array.isArray(topics)) {
      return res.status(400).json({ success: false, error: 'name, description, chapterId, sectionNumber and topics (array) are required' });
    }
    const section = await Section.create({ name, description, status: status ?? true, chapterId, sectionNumber, topics });
    return res.status(201).json({ success: true, data: section });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Update a section
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status, chapterId, sectionNumber, topics } = req.body;
    const section = await Section.findByIdAndUpdate(
      id,
      { name, description, status, chapterId, sectionNumber, topics },
      { new: true, runValidators: true }
    );
    if (!section) return res.status(404).json({ success: false, error: 'Section not found' });
    return res.status(200).json({ success: true, data: section });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Delete a section
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const section = await Section.findByIdAndDelete(id);
    if (!section) return res.status(404).json({ success: false, error: 'Section not found' });
    return res.status(200).json({ success: true, message: 'Section deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// List sections (optionally filter by chapterId)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.query as { chapterId?: string };
    const filter: any = {};
    if (chapterId) filter.chapterId = chapterId;
    const sections = await Section.find(filter).sort({ sectionNumber: 1 });
    return res.status(200).json({ success: true, data: sections });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get a section by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const section = await Section.findById(id);
    if (!section) return res.status(404).json({ success: false, error: 'Section not found' });
    return res.status(200).json({ success: true, data: section });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get topics for a section (populated)
router.get('/:id/topics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const section = await Section.findById(id);
    if (!section) return res.status(404).json({ success: false, error: 'Section not found' });
    const topics = await Topic.find({ _id: { $in: section.topics } }).select('topic');
    return res.status(200).json({ success: true, data: topics });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


