import express from 'express';
import Badge from '../../models/Badge';
import { Request, Response } from 'express';

const router = express.Router();

// Create Badge
router.post('/', async (req: Request, res: Response) => {
  try {
    const badgeData = req.body;
    // Ensure badgelevel is an array of objects if provided
    if (badgeData.badgelevel && Array.isArray(badgeData.badgelevel)) {
      badgeData.badgelevel = badgeData.badgelevel.map((lvl: any) => ({
        milestone: Number(lvl.milestone),
        badgeImage: lvl.badgeImage,
      }));
    }
    const badge = new Badge(badgeData);
    await badge.save();
    return res.status(201).json(badge);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Update Badge
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const badgeData = req.body;
    if (badgeData.badgelevel && Array.isArray(badgeData.badgelevel)) {
      badgeData.badgelevel = badgeData.badgelevel.map((lvl: any) => ({
        milestone: Number(lvl.milestone),
        badgeImage: lvl.badgeImage,
      }));
    }
    const badge = await Badge.findByIdAndUpdate(req.params.id, badgeData, { new: true });
    if (!badge) return res.status(404).json({ error: 'Badge not found' });
    return res.json(badge);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Delete Badge
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const badge = await Badge.findByIdAndDelete(req.params.id);
    if (!badge) return res.status(404).json({ error: 'Badge not found' });
    return res.json({ message: 'Badge deleted' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Get all Badges
router.get('/', async (req: Request, res: Response) => {
  console.log('Fetching badges', req.body);
  try {
    const badges = await Badge.find();
    return res.json(badges);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
