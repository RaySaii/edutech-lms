#!/bin/bash

echo "🔧 Starting EduTech LMS with local services..."
echo ""
echo "⚠️  Note: This requires PostgreSQL, Redis, and RabbitMQ to be installed locally"
echo ""
echo "To install required services:"
echo "brew install postgresql redis rabbitmq"
echo ""
echo "To start services:"
echo "brew services start postgresql"
echo "brew services start redis"
echo "brew services start rabbitmq"
echo ""

# Check if services are running
echo "🔍 Checking local services..."

# Check PostgreSQL
if pg_isready -q; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
    echo "   Run: brew services start postgresql"
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running"  
    echo "   Run: brew services start redis"
fi

# Check RabbitMQ
if curl -s http://localhost:15672 > /dev/null 2>&1; then
    echo "✅ RabbitMQ is running"
else
    echo "❌ RabbitMQ is not running"
    echo "   Run: brew services start rabbitmq"
fi

echo ""
echo "Once all services are running, you can start the application with:"
echo "npm run dev:all"