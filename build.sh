#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Building Project Nexus Full-Stack MVP ==="

echo "1. Installing Python backend dependencies..."
pip install -r backend/requirements.txt

echo "2. Installing Node frontend dependencies and compiling production bundle..."
cd frontend
npm install
npm run build
cd ..

echo "3. Seeding demo accounts and edge case fixtures..."
python backend/seed.py

echo "=== Build and Seed Complete! ==="
