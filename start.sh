#!/bin/bash
# Football Manager Platform - Quick Start Script

echo "🚀 Football Manager Pro - Starting up..."

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Installing manually..."

  # Start PostgreSQL + Redis via Docker
  echo "💡 Use docker-compose up -d postgres redis to start databases"
  echo "   Or install PostgreSQL locally and run:"
  echo "   createdb football_manager"
  echo ""
fi

# Start databases
echo "🗄️  Starting databases..."
docker-compose up -d postgres redis 2>/dev/null || echo "Docker not available, start PostgreSQL and Redis manually"

sleep 3

# Backend setup
echo ""
echo "📦 Setting up backend..."
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
echo ""

# Start backend
echo "🔧 Starting backend on http://localhost:4000..."
npm run dev &
BACKEND_PID=$!

cd ../frontend

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
npm install

# Start frontend
echo "🎨 Starting frontend on http://localhost:3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Platform running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:4000/api/health"
echo "   Prisma:   npx prisma studio (in backend/)"
echo ""
echo "📧 Demo login:"
echo "   Email:    demo@footballmanager.pro"
echo "   Password: User1234!"
echo ""
echo "Press Ctrl+C to stop all services"

wait $BACKEND_PID $FRONTEND_PID
