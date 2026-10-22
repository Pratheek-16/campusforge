#!/usr/bin/env bash
# Render build script for CampusForge full-stack MVP
set -e

echo "=== Building CampusForge ==="

echo "1. Installing Python backend dependencies..."
pip install -r backend/requirements.txt

echo "2. Installing Node frontend dependencies and compiling production bundle..."
cd frontend
npm install
npm run build
cd ..

echo "=== Build complete! ==="
