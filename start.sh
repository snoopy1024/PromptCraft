#!/bin/bash
cd "$(dirname "$0")"

# kill previous Vite and Express processes
lsof -ti:3000 -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null
sleep 0.3

echo "Starting PromptCraft..."
npm run dev
