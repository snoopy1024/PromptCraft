import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const CONVERSATION_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function conversationFilePath(id: unknown) {
  if (typeof id !== 'string' || !CONVERSATION_ID_PATTERN.test(id)) {
    return null;
  }

  return path.join(DATA_DIR, `${id}.json`);
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
  const filePath = conversationFilePath(req.params.id);
  if (!filePath) {
    res.status(400).json({ error: 'Invalid conversation id' });
    return;
  }

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
  const filePath = conversationFilePath(conversation?.id);
  if (!filePath) {
    res.status(400).json({ error: 'Invalid conversation id' });
    return;
  }

  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
  res.json({ ok: true });
});

conversationsRouter.patch('/:id', async (req, res) => {
  await ensureDataDir();
  const filePath = conversationFilePath(req.params.id);
  if (!filePath) {
    res.status(400).json({ error: 'Invalid conversation id' });
    return;
  }

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const conv = JSON.parse(raw);
    Object.assign(conv, req.body);
    await fs.writeFile(filePath, JSON.stringify(conv, null, 2));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

conversationsRouter.delete('/:id', async (req, res) => {
  await ensureDataDir();
  const filePath = conversationFilePath(req.params.id);
  if (!filePath) {
    res.status(400).json({ error: 'Invalid conversation id' });
    return;
  }

  try {
    await fs.unlink(filePath);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Conversation not found' });
  }
});
