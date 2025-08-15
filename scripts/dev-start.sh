#!/bin/bash

echo "🚀 Starting EduTech LMS Development Environment"

# Start infrastructure services
echo "📦 Starting infrastructure services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Start all microservices
echo "🏃‍♂️ Starting all microservices..."
npm run dev:all

echo "✅ Development environment is ready!"
echo "🌐 API Gateway: http://localhost:3000"
echo "📊 RabbitMQ Management: http://localhost:15672"
echo "📧 MailHog: http://localhost:8025"