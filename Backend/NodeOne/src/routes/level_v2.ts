import express, { Request, Response } from 'express';

const router = express.Router();

function generate16DigitId(): string {
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += Math.floor(Math.random() * 10).toString();
  }
  return id;
}

router.post('/start', (_req: Request, res: Response) => {
  const userChapterTicket = generate16DigitId();
  return res.json({ userChapterTicket });
});

export default router;


