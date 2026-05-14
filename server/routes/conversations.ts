import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export const conversationsRouter = Router();

conversationsRouter.get('/', async (_req, res) => {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  const conversations = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => {
        const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf-8');
        const conv = JSON.parse(raw);
        return {
          id: conv.id,
          title: conv.title,
          model: conv.model,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      }),
  );
  conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(conversations);
});

conversationsRouter.get('/:id', async (req, res) => {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${req.params.id}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

conversationsRouter.post('/', async (req, res) => {
  await ensureDataDir();
  const conversation = req.body;
  const filePath = path.join(DATA_DIR, `${conversation.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
  res.json({ ok: true });
});

conversationsRouter.delete('/:id', async (req, res) => {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${req.params.id}.json`);
  try {
    await fs.unlink(filePath);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Conversation not found' });
  }
});
