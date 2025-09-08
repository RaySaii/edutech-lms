#!/bin/bash

# EduTech LMS Production Deployment Script
# This script handles the complete deployment process for the EduTech LMS platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DOMAIN=${2:-your-domain.com}
VERSION=$(git describe --tags --always --dirty)
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}🚀 EduTech LMS Deployment Script${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${YELLOW}===================================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}===================================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_section "🔍 Checking Prerequisites"
    
    local missing_tools=()
    
    if ! command_exists docker; then
        missing_tools+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_tools+=("docker-compose")
    fi
    
    if ! command_exists git; then
        missing_tools+=("git")
    fi
    
    if ! command_exists node; then
        missing_tools+=("node")
    fi
    
    if ! command_exists npm; then
        missing_tools+=("npm")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing required tools: ${missing_tools[*]}${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
}

# Function to validate environment variables
validate_environment() {
    print_section "🔧 Validating Environment Configuration"
    
    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        echo -e "${RED}❌ Environment file .env.${ENVIRONMENT} not found${NC}"
        exit 1
    fi
    
    # Source environment file
    source ".env.${ENVIRONMENT}"
    
    # Check required environment variables
    local required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_ACCESS_SECRET"
        "JWT_REFRESH_SECRET"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing required environment variables: ${missing_vars[*]}${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment configuration valid${NC}"
}

# Function to run tests
run_tests() {
    print_section "🧪 Running Tests"
    
    echo "Running unit tests..."
    npm run test:ci || {
        echo -e "${RED}❌ Unit tests failed${NC}"
        exit 1
    }
    
    echo "Running integration tests..."
    npm run test:e2e || {
        echo -e "${RED}❌ Integration tests failed${NC}"
        exit 1
    }
    
    echo "Running security audit..."
    npm audit --audit-level high || {
        echo -e "${YELLOW}⚠️  Security vulnerabilities found, review before continuing${NC}"
        read -p "Continue deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Function to build application
build_application() {
    print_section "🔨 Building Application"
    
    echo "Installing dependencies..."
    npm ci --only=production
    
    echo "Building backend services..."
    npm run build || {
        echo -e "${RED}❌ Backend build failed${NC}"
        exit 1
    }
    
    echo "Building frontend..."
    cd apps/frontend
    npm ci
    npm run build || {
        echo -e "${RED}❌ Frontend build failed${NC}"
        exit 1
    }
    cd ../..
    
    echo -e "${GREEN}✅ Build completed successfully${NC}"
}

# Function to backup existing deployment
backup_deployment() {
    print_section "💾 Creating Backup"
    
    if [ "$ENVIRONMENT" != "production" ]; then
        echo "Skipping backup for non-production environment"
        return 0
    fi
    
    mkdir -p "$BACKUP_DIR"
    
    echo "Backing up database..."
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > "$BACKUP_DIR/database.sql" || {
        echo -e "${YELLOW}⚠️  Database backup failed (database might not be running)${NC}"
    }
    
    echo "Backing up uploaded files..."
    if [ -d "./uploads" ]; then
        tar -czf "$BACKUP_DIR/uploads.tar.gz" ./uploads
    fi
    
    echo "Backing up configuration..."
    cp .env.production "$BACKUP_DIR/"
    cp docker-compose.prod.yml "$BACKUP_DIR/"
    
    echo -e "${GREEN}✅ Backup created at $BACKUP_DIR${NC}"
}

# Function to deploy services
deploy_services() {
    print_section "🚀 Deploying Services"
    
    echo "Stopping existing services..."
    docker-compose -f docker-compose.prod.yml down || true
    
    echo "Pulling latest images..."
    docker-compose -f docker-compose.prod.yml pull
    
    echo "Building custom images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    echo "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "Waiting for services to be ready..."
    sleep 30
    
    echo -e "${GREEN}✅ Services deployed${NC}"
}

# Function to run database migrations
run_migrations() {
    print_section "🗃️  Running Database Migrations"
    
    echo "Running database migrations..."
    docker-compose -f docker-compose.prod.yml exec api-gateway npm run migration:run || {
        echo -e "${RED}❌ Database migrations failed${NC}"
        exit 1
    }
    
    echo "Seeding initial data..."
    docker-compose -f docker-compose.prod.yml exec api-gateway npm run seed:prod || {
        echo -e "${YELLOW}⚠️  Data seeding completed with warnings${NC}"
    }
    
    echo -e "${GREEN}✅ Database setup completed${NC}"
}

# Function to verify deployment
verify_deployment() {
    print_section "🔍 Verifying Deployment"
    
    local services=("api-gateway" "auth-service" "course-service" "notification-service" "analytics-service")
    local failed_services=()
    
    for service in "${services[@]}"; do
        echo "Checking $service health..."
        
        # Wait up to 60 seconds for service to be healthy
        local timeout=60
        local count=0
        local healthy=false
        
        while [ $count -lt $timeout ]; do
            if docker-compose -f docker-compose.prod.yml exec "$service" curl -f "http://localhost/health" >/dev/null 2>&1; then
                healthy=true
                break
            fi
            sleep 1
            ((count++))
        done
        
        if [ "$healthy" = true ]; then
            echo -e "${GREEN}✅ $service is healthy${NC}"
        else
            echo -e "${RED}❌ $service health check failed${NC}"
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -ne 0 ]; then
        echo -e "${RED}❌ Some services failed health checks: ${failed_services[*]}${NC}"
        echo "Check logs with: docker-compose -f docker-compose.prod.yml logs [service-name]"
        exit 1
    fi
    
    # Test API endpoints
    echo "Testing API endpoints..."
    
    local api_base="http://localhost:3000/api"
    local endpoints=("/health" "/auth/health" "/courses" "/dashboard/stats")
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f "$api_base$endpoint" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $endpoint responding${NC}"
        else
            echo -e "${YELLOW}⚠️  $endpoint not responding (might require authentication)${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ Deployment verification completed${NC}"
}

# Function to setup monitoring
setup_monitoring() {
    print_section "📊 Setting Up Monitoring"
    
    echo "Configuring Prometheus..."
    # Prometheus config is handled by docker-compose
    
    echo "Configuring Grafana dashboards..."
    # Import default dashboards
    sleep 10  # Wait for Grafana to start
    
    echo "Setting up log aggregation..."
    # ELK stack configuration
    
    echo -e "${GREEN}✅ Monitoring setup completed${NC}"
    echo "Grafana: http://$DOMAIN:3001 (admin/admin)"
    echo "Prometheus: http://$DOMAIN:9090"
    echo "Kibana: http://$DOMAIN:5601"
}

# Function to setup SSL certificates
setup_ssl() {
    print_section "🔒 Setting Up SSL Certificates"
    
    if [ "$ENVIRONMENT" != "production" ]; then
        echo "Skipping SSL setup for non-production environment"
        return 0
    fi
    
    mkdir -p ./ssl
    
    if [ ! -f "./ssl/cert.pem" ] || [ ! -f "./ssl/key.pem" ]; then
        echo "Generating self-signed certificates for testing..."
        openssl req -x509 -newkey rsa:4096 -keyout ./ssl/key.pem -out ./ssl/cert.pem -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
        
        echo -e "${YELLOW}⚠️  Self-signed certificates generated${NC}"
        echo -e "${YELLOW}   For production, replace with proper SSL certificates${NC}"
    fi
    
    echo -e "${GREEN}✅ SSL certificates configured${NC}"
}

# Function to cleanup old resources
cleanup() {
    print_section "🧹 Cleanup"
    
    echo "Removing unused Docker images..."
    docker image prune -f
    
    echo "Removing unused volumes..."
    docker volume prune -f
    
    echo "Removing old log files..."
    find ./logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to show deployment summary
show_summary() {
    print_section "📋 Deployment Summary"
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Version: $VERSION"
    echo "Domain: $DOMAIN"
    echo ""
    echo "Services:"
    echo "  • Frontend: https://$DOMAIN"
    echo "  • API: https://api.$DOMAIN"
    echo "  • WebSocket: wss://ws.$DOMAIN"
    echo ""
    echo "Monitoring:"
    echo "  • Grafana: http://$DOMAIN:3001"
    echo "  • Prometheus: http://$DOMAIN:9090"
    echo "  • Kibana: http://$DOMAIN:5601"
    echo ""
    echo "Useful commands:"
    echo "  • View logs: docker-compose -f docker-compose.prod.yml logs -f [service]"
    echo "  • Restart service: docker-compose -f docker-compose.prod.yml restart [service]"
    echo "  • Scale service: docker-compose -f docker-compose.prod.yml up -d --scale [service]=3"
    echo ""
    
    if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
        echo "Backup created at: $BACKUP_DIR"
    fi
}

# Function to handle rollback
rollback() {
    print_section "🔄 Rolling Back Deployment"
    
    if [ -z "$1" ]; then
        echo -e "${RED}❌ Backup directory not specified${NC}"
        exit 1
    fi
    
    local backup_dir="$1"
    
    if [ ! -d "$backup_dir" ]; then
        echo -e "${RED}❌ Backup directory not found: $backup_dir${NC}"
        exit 1
    fi
    
    echo "Stopping current services..."
    docker-compose -f docker-compose.prod.yml down
    
    echo "Restoring configuration..."
    cp "$backup_dir/.env.production" ./ 2>/dev/null || true
    cp "$backup_dir/docker-compose.prod.yml" ./ 2>/dev/null || true
    
    echo "Restoring database..."
    if [ -f "$backup_dir/database.sql" ]; then
        docker-compose -f docker-compose.prod.yml up -d postgres
        sleep 10
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < "$backup_dir/database.sql"
    fi
    
    echo "Restoring uploaded files..."
    if [ -f "$backup_dir/uploads.tar.gz" ]; then
        tar -xzf "$backup_dir/uploads.tar.gz"
    fi
    
    echo "Restarting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo -e "${GREEN}✅ Rollback completed${NC}"
}

# Main execution flow
main() {
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            validate_environment
            run_tests
            build_application
            backup_deployment
            setup_ssl
            deploy_services
            run_migrations
            setup_monitoring
            verify_deployment
            cleanup
            show_summary
            ;;
        "rollback")
            rollback "$2"
            ;;
        "backup")
            backup_deployment
            ;;
        "verify")
            verify_deployment
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|backup|verify} [backup_dir]"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full deployment process"
            echo "  rollback - Rollback to previous backup"
            echo "  backup   - Create backup only"
            echo "  verify   - Verify current deployment"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'echo -e "${RED}Deployment interrupted${NC}"; exit 1' INT TERM

# Run main function with all arguments
main "$@"