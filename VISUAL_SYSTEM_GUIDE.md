# 🎨 Visual System Architecture Guide
*For Frontend Developers*

## 🏗️ System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌐 Frontend Applications                     │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   📱 Student App    │   👨‍🏫 Instructor App │   🔧 Admin Panel    │
│   (React/Next.js)   │   (React/Next.js)   │   (React/Next.js)   │
└─────────────────────┴─────────────────────┴─────────────────────┘
                               │
                        🌍 HTTP/HTTPS
                               │
┌─────────────────────────────────────────────────────────────────┐
│                  🚪 API Gateway (Port 3000)                    │
│                      /api/* endpoints                          │
│     Authentication • Rate Limiting • Request Routing          │
└─────────────────────────────────────────────────────────────────┘
                               │
                    📨 Internal Communication
                          (RabbitMQ)
                               │
┌───────────────┬───────────────┬───────────────┬───────────────────┐
│   🔐 Auth     │   👥 User     │   📚 Course   │   📧 Notification │
│   Service     │   Service     │   Service     │   Service         │
│   (Port 3001) │  (Port 3002)  │  (Port 3003)  │   (Port 3004)     │
└───────────────┴───────────────┴───────────────┴───────────────────┘
                               │
                    💾 Data Layer
                               │
┌───────────────┬───────────────┬───────────────┬───────────────────┐
│  🐘 PostgreSQL │  ⚡ Redis     │  🐰 RabbitMQ  │  📧 MailHog       │
│  (Port 5432)  │  (Port 6379)  │  (Port 5672)  │  (Port 8025)      │
│  Database      │  Cache        │  Messages     │  Email Testing    │
└───────────────┴───────────────┴───────────────┴───────────────────┘
```

## 🎯 Frontend Integration Points

### **1. Single API Entry Point**
```javascript
// Your frontend only needs to know ONE URL
const API_BASE_URL = 'http://localhost:3000/api'

// All requests go through API Gateway
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})
```

### **2. Authentication Flow**
```javascript
// 🔐 Login Flow (Frontend → Backend)
┌─────────────┐    POST /api/auth/login     ┌─────────────┐
│   Frontend  │ ─────────────────────────→ │ API Gateway │
│             │                            │             │
│ {email,pwd} │ ←───────────── JWT tokens  │             │
└─────────────┘                            └─────────────┘
                                                   │
                                        Routes to Auth Service
                                                   ↓
                                           ┌─────────────┐
                                           │ Auth Service│
                                           │ Validates   │
                                           │ Credentials │
                                           └─────────────┘
```

### **3. API Endpoints Structure**
```
🚪 API Gateway Routes:
├── /api/auth/*          → 🔐 Auth Service
│   ├── POST /login      → User login
│   ├── POST /register   → User registration
│   ├── POST /refresh    → Token refresh
│   └── POST /logout     → User logout
│
├── /api/users/*         → 👥 User Service  
│   ├── GET /profile     → Get user profile
│   ├── PUT /profile     → Update profile
│   └── GET /:id         → Get user by ID
│
├── /api/courses/*       → 📚 Course Service
│   ├── GET /            → List courses
│   ├── POST /           → Create course
│   ├── GET /:id         → Get course details
│   ├── PUT /:id         → Update course
│   ├── POST /:id/enroll → Enroll in course
│   └── GET /:id/progress → Get progress
│
└── /api/analytics/*     → 📊 Analytics Service
    ├── GET /dashboard   → Dashboard stats
    └── GET /reports     → Generate reports
```

## 📊 Data Flow Diagrams

### **Course Enrollment Flow**
```
1. Student clicks "Enroll" button
   ┌─────────────┐
   │  Frontend   │ ──── POST /api/courses/123/enroll
   └─────────────┘
           │
           ▼
   ┌─────────────┐
   │ API Gateway │ ──── Routes to Course Service
   └─────────────┘
           │
           ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │Course Service│────▶│ PostgreSQL  │────▶│   RabbitMQ  │
   │Save enrollment│    │Store record │     │Send messages│
   └─────────────┘     └─────────────┘     └─────────────┘
                                                   │
         ┌─────────────────────────┬───────────────┘
         ▼                         ▼
   ┌─────────────┐         ┌─────────────┐
   │Email Service│         │Analytics    │
   │Send welcome │         │Update stats │
   └─────────────┘         └─────────────┘
```

### **Real-time Notifications**
```
Backend Event                     Frontend Update
┌─────────────┐                  ┌─────────────┐
│Course Update│ ──RabbitMQ────▶  │WebSocket/SSE│
└─────────────┘                  └─────────────┘
       │                                │
       ▼                                ▼
┌─────────────┐                  ┌─────────────┐
│Notification │                  │UI Update    │
│Service      │                  │(Toast/Badge)│
└─────────────┘                  └─────────────┘
```

## 🗄️ Database Schema Visual

```sql
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Organizations │    │      Users      │    │     Courses     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (UUID) PK    │◄──┐│ id (UUID) PK    │   ┌│ id (UUID) PK    │
│ name            │   ││ email           │   ││ title           │
│ slug            │   ││ firstName       │   ││ description     │
│ logo            │   ││ lastName        │   ││ price           │
│ settings (JSON) │   ││ role (enum)     │   ││ status (enum)   │
│ isActive        │   ││ organizationId ─┘   ││ instructorId ───┘
│ createdAt       │   ││ emailVerifiedAt │   ││ organizationId ──┘
│ updatedAt       │   ││ createdAt       │   ││ curriculum (JSON)│
└─────────────────┘   ││ updatedAt       │   ││ createdAt       │
                      │└─────────────────┘   ││ updatedAt       │
                      │                      │└─────────────────┘
                      │                      │
                      │ ┌─────────────────┐  │
                      │ │   Enrollments   │  │
                      │ ├─────────────────┤  │
                      │ │ id (UUID) PK    │  │
                      └─│ userId ─────────┘  │
                        │ courseId ──────────┘
                        │ status (enum)   │
                        │ progress (%)    │
                        │ enrolledAt      │
                        │ completedAt     │
                        │ progressData    │
                        └─────────────────┘
```

## 🔗 API Response Examples

### **Authentication Response**
```json
POST /api/auth/login
{
  "email": "student@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-1234",
      "email": "student@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student",
      "organizationId": "org-uuid"
    },
    "tokens": {
      "accessToken": "jwt-token-here",
      "refreshToken": "refresh-token-here",
      "expiresIn": "15m"
    }
  }
}
```

### **Course List Response**
```json
GET /api/courses?page=1&limit=10

Response:
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "course-uuid-1",
        "title": "Introduction to React",
        "description": "Learn React fundamentals",
        "price": 99.99,
        "level": "beginner",
        "status": "published",
        "thumbnail": "https://...",
        "instructor": {
          "id": "instructor-uuid",
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "enrollmentCount": 150,
        "rating": 4.5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### **Error Response Format**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Password must be at least 8 characters"
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 🎨 Frontend Component Architecture

### **React Component Mapping**
```jsx
// 🏠 App Structure
<App>
  <Router>
    <AuthProvider>          // 🔐 Manages JWT tokens
      <Header>               // 🧭 Navigation + User menu
        <UserDropdown />     // 👤 Profile/Logout
      </Header>
      
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/courses" element={<CoursePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </AuthProvider>
  </Router>
</App>

// 📚 Course Components
<CoursePage>
  <CourseFilter />         // 🔍 Search/Filter courses
  <CourseGrid>             // 📋 List of courses
    <CourseCard />         // 🎴 Individual course preview
  </CourseGrid>
  <Pagination />           // 📄 Page navigation
</CoursePage>
```

### **State Management Flow**
```javascript
// 🔄 Redux/Zustand Store Structure
{
  auth: {
    user: {...},
    token: "jwt-here",
    isAuthenticated: true
  },
  courses: {
    list: [...],
    current: {...},
    loading: false,
    filters: {...}
  },
  ui: {
    notifications: [...],
    modals: {...}
  }
}

// 📡 API Calls
const useCourses = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    setLoading(true)
    api.get('/courses')
      .then(response => setCourses(response.data.courses))
      .finally(() => setLoading(false))
  }, [])
  
  return { courses, loading }
}
```

## 🚀 Development Workflow

### **Frontend Development Steps**
```
1. 🎯 Design Component
   ├── Create React component
   ├── Define props interface
   └── Add to Storybook

2. 🔗 Connect to API
   ├── Create API service function
   ├── Add error handling
   └── Implement loading states

3. 🧪 Test Integration
   ├── Mock API responses
   ├── Test error scenarios
   └── Verify data flow

4. 🎨 Polish UI
   ├── Add animations
   ├── Responsive design
   └── Accessibility
```

### **API Development Testing**
```bash
# 🧪 Test API endpoints
curl -X GET http://localhost:3000/api/courses
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 📖 View API documentation
open http://localhost:3000/api/docs
```

## 🔧 Configuration for Frontend

### **Environment Variables**
```javascript
// .env.local (Frontend)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_ENV=development
```

### **API Client Setup**
```javascript
// lib/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
    }
    return Promise.reject(error)
  }
)

export default api
```

## 🎯 Next Steps for Frontend Integration

1. **Setup API Client** - Configure axios with proper interceptors
2. **Authentication Flow** - Implement login/logout with JWT
3. **Course Management** - Build course listing and detail pages
4. **Real-time Updates** - Add WebSocket for live notifications
5. **Error Handling** - Consistent error UI components
6. **Loading States** - Skeleton screens and spinners

Your backend is ready for frontend integration! All endpoints follow RESTful conventions and return consistent JSON responses. 🚀