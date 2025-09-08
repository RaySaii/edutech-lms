#!/usr/bin/env node

/**
 * Course Database Seeder for EduTech LMS
 * This script inserts comprehensive course data using raw SQL
 * 
 * Usage: node scripts/seed-courses.js
 */

const { Client } = require('pg');
require('dotenv').config();

// Database configuration
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'edutech_lms',
});

// Sample instructor data
const instructors = [
  { name: 'Sarah Johnson', email: 'sarah.johnson@edutech.com' },
  { name: 'Mike Chen', email: 'mike.chen@edutech.com' },
  { name: 'David Rodriguez', email: 'david.rodriguez@edutech.com' },
  { name: 'Dr. Emily Watson', email: 'emily.watson@edutech.com' },
  { name: 'Dr. Alex Kumar', email: 'alex.kumar@edutech.com' },
  { name: 'Lisa Park', email: 'lisa.park@edutech.com' },
  { name: 'James Wilson', email: 'james.wilson@edutech.com' },
  { name: 'Maria Garcia', email: 'maria.garcia@edutech.com' },
  { name: 'Robert Kim', email: 'robert.kim@edutech.com' },
  { name: 'Mark Thompson', email: 'mark.thompson@edutech.com' },
  { name: 'Anna Petrov', email: 'anna.petrov@edutech.com' },
  { name: 'Carlos Santos', email: 'carlos.santos@edutech.com' },
  { name: 'Dr. Jennifer Lee', email: 'jennifer.lee@edutech.com' },
  { name: 'Michael Brown', email: 'michael.brown@edutech.com' },
  { name: 'Sophie Miller', email: 'sophie.miller@edutech.com' },
  { name: 'Tom Anderson', email: 'tom.anderson@edutech.com' },
  { name: 'Rachel Green', email: 'rachel.green@edutech.com' },
  { name: 'Steve Johnson', email: 'steve.johnson@edutech.com' },
  { name: 'Lisa Chen', email: 'lisa.chen@edutech.com' },
  { name: 'Kevin Park', email: 'kevin.park@edutech.com' }
];

// Comprehensive course data
const courseData = [
  {
    title: "Complete JavaScript Fundamentals",
    slug: "complete-javascript-fundamentals",
    description: "Master JavaScript from basics to advanced concepts. Learn ES6+, async/await, DOM manipulation, and modern JavaScript patterns used in real-world applications.",
    shortDescription: "Comprehensive JavaScript course covering fundamentals to advanced concepts",
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&h=450&fit=crop&crop=entropy&auto=format",
    price: 89.99,
    level: "beginner",
    category: "Programming",
    tags: ["javascript", "programming", "web development", "es6", "async"],
    curriculum: {
      modules: [
        {
          id: "js-mod-1",
          title: "JavaScript Basics",
          lessons: [
            { id: "js-1-1", title: "Introduction to JavaScript", type: "video", content: "", duration: 600 },
            { id: "js-1-2", title: "Variables and Data Types", type: "video", content: "", duration: 720 },
            { id: "js-1-3", title: "Functions and Scope", type: "video", content: "", duration: 900 }
          ]
        }
      ]
    },
    status: "published",
    enrollmentCount: 15420,
    rating: 4.7,
    reviewCount: 2840,
    instructorEmail: 'sarah.johnson@edutech.com'
  },
  {
    title: "React Mastery: Hooks to Advanced Patterns",
    slug: "react-mastery-hooks-advanced-patterns",
    description: "Deep dive into React development with hooks, context, performance optimization, and advanced patterns. Build real-world applications with modern React practices.",
    shortDescription: "Advanced React course focusing on hooks, patterns, and performance",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop&crop=entropy&auto=format",
    price: 149.99,
    level: "intermediate",
    category: "Programming",
    tags: ["react", "hooks", "frontend", "javascript", "performance"],
    curriculum: {
      modules: [
        {
          id: "react-mod-1",
          title: "React Hooks Deep Dive",
          lessons: [
            { id: "react-1-1", title: "useState and useEffect", type: "video", content: "", duration: 900 },
            { id: "react-1-2", title: "Custom Hooks", type: "video", content: "", duration: 1200 }
          ]
        }
      ]
    },
    status: "published",
    enrollmentCount: 12800,
    rating: 4.8,
    reviewCount: 1950,
    instructorEmail: 'mike.chen@edutech.com'
  },
  {
    title: "Node.js Backend Development Masterclass",
    slug: "nodejs-backend-development-masterclass",
    description: "Build scalable backend applications with Node.js, Express, MongoDB, authentication, testing, and deployment to production environments.",
    shortDescription: "Complete Node.js backend development from basics to production",
    thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=450&fit=crop&crop=entropy&auto=format",
    price: 129.99,
    level: "intermediate",
    category: "Programming",
    tags: ["nodejs", "backend", "express", "mongodb", "api"],
    curriculum: {
      modules: [
        {
          id: "node-mod-1",
          title: "Node.js Fundamentals",
          lessons: [
            { id: "node-1-1", title: "Introduction to Node.js", type: "video", content: "", duration: 600 },
            { id: "node-1-2", title: "Express.js Framework", type: "video", content: "", duration: 900 }
          ]
        }
      ]
    },
    status: "published",
    enrollmentCount: 9650,
    rating: 4.6,
    reviewCount: 1420,
    instructorEmail: 'david.rodriguez@edutech.com'
  },
  {
    title: "Python Programming: Zero to Hero",
    slug: "python-programming-zero-to-hero",
    description: "Complete Python course covering syntax, data structures, OOP, web scraping, APIs, and building real projects. Perfect for beginners and career changers.",
    shortDescription: "Comprehensive Python programming course for all skill levels",
    thumbnail: "https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=800&h=450&fit=crop&crop=entropy&auto=format",
    price: 79.99,
    level: "beginner",
    category: "Programming",
    tags: ["python", "programming", "oop", "data structures", "apis"],
    curriculum: {
      modules: [
        {
          id: "python-mod-1",
          title: "Python Basics",
          lessons: [
            { id: "python-1-1", title: "Python Installation and Setup", type: "video", content: "", duration: 480 },
            { id: "python-1-2", title: "Variables and Data Types", type: "video", content: "", duration: 720 }
          ]
        }
      ]
    },
    status: "published",
    enrollmentCount: 18750,
    rating: 4.5,
    reviewCount: 3200,
    instructorEmail: 'emily.watson@edutech.com'
  },
  {
    title: "Machine Learning with Python and Scikit-Learn",
    slug: "machine-learning-python-scikit-learn",
    description: "Learn machine learning fundamentals with Python. Cover supervised and unsupervised learning, model evaluation, and real-world ML project implementation.",
    shortDescription: "Practical machine learning course using Python and scikit-learn",
    thumbnail: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=450&fit=crop&crop=entropy&auto=format",
    price: 199.99,
    level: "intermediate",
    category: "Data Science",
    tags: ["machine learning", "python", "scikit-learn", "data analysis", "ai"],
    curriculum: {
      modules: [
        {
          id: "ml-mod-1",
          title: "ML Fundamentals",
          lessons: [
            { id: "ml-1-1", title: "Introduction to Machine Learning", type: "video", content: "", duration: 900 },
            { id: "ml-1-2", title: "Supervised Learning", type: "video", content: "", duration: 1200 }
          ]
        }
      ]
    },
    status: "published",
    enrollmentCount: 8940,
    rating: 4.9,
    reviewCount: 1680,
    instructorEmail: 'alex.kumar@edutech.com'
  },
  {
    title: "Flutter Complete Course: Build iOS & Android Apps",
    slug: "flutter-complete-course-ios-android",
    description: "Build beautiful cross-platform mobile apps with Flutter and Dart. Learn widgets, state management, Firebase integration, and app store deployment.",
    shortDescription: "Complete Flutter development course for cross-platform mobile apps",
    thumbnail: "https://images.unsplash.com/photo-1563813251-90a84b1d8550?w=800&h=450&fit=crop&crop=entropy&auto=format",
    price: 179.99,
    level: "intermediate",
    category: "Mobile Development",
    tags: ["flutter", "mobile", "dart", "cross-platform", "firebase"],
    curriculum: {
      modules: [
        {
          id: "flutter-mod-1",
          title: "Flutter Fundamentals",
          lessons: [
            { id: "flutter-1-1", title: "Dart Language Basics", type: "video", content: "", duration: 900 },
            { id: "flutter-1-2", title: "Flutter Widgets", type: "video", content: "", duration: 1200 }
          ]
        }
      ]
    },
    status: "published",
    enrollmentCount: 7850,
    rating: 4.7,
    reviewCount: 1320,
    instructorEmail: 'james.wilson@edutech.com'
  },
  {
    title: "AWS Cloud Practitioner Complete Course",
    slug: "aws-cloud-practitioner-complete",
    description: "Master AWS fundamentals including EC2, S3, RDS, Lambda, and more. Prepare for AWS certification while learning practical cloud computing skills.",
    shortDescription: "Complete AWS fundamentals course with certification preparation",
    thumbnail: "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=800&h=450&fit=crop&crop=entropy&auto=format",
    price: 159.99,
    level: "beginner",
    category: "Cloud Computing",
    tags: ["aws", "cloud", "devops", "certification", "infrastructure"],
    curriculum: {
      modules: [
        {
          id: "aws-mod-1",
          title: "AWS Fundamentals",
          lessons: [
            { id: "aws-1-1", title: "Introduction to Cloud Computing", type: "video", content: "", duration: 600 },
            { id: "aws-1-2", title: "AWS Core Services", type: "video", content: "", duration: 900 }
          ]
        }
      ]
    },
    status: "published",
    enrollmentCount: 9820,
    rating: 4.7,
    reviewCount: 1560,
    instructorEmail: 'mark.thompson@edutech.com'
  },
  {
    title: "UI/UX Design Masterclass",
    slug: "ui-ux-design-masterclass",
    description: "Complete UI/UX design course covering user research, wireframing, prototyping, and design systems. Learn industry-standard tools and methodologies.",
    shortDescription: "Comprehensive UI/UX design course with real-world projects",
    thumbnail: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=450&fit=crop&crop=entropy&auto=format",
    price: 199.99,
    level: "intermediate",
    category: "Design",
    tags: ["ui design", "ux design", "prototyping", "user research", "design systems"],
    curriculum: {
      modules: [
        {
          id: "ui-ux-mod-1",
          title: "Design Fundamentals",
          lessons: [
            { id: "ui-ux-1-1", title: "Design Thinking", type: "video", content: "", duration: 800 },
            { id: "ui-ux-1-2", title: "User Research", type: "video", content: "", duration: 900 }
          ]
        }
      ]
    },
    status: "published",
    enrollmentCount: 8790,
    rating: 4.8,
    reviewCount: 1450,
    instructorEmail: 'sophie.miller@edutech.com'
  },
  {
    title: "Digital Marketing Complete Strategy",
    slug: "digital-marketing-complete-strategy",
    description: "Complete digital marketing course covering SEO, social media, PPC, email marketing, analytics, and conversion optimization for business growth.",
    shortDescription: "Comprehensive digital marketing strategy for modern businesses",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop&crop=entropy&auto=format",
    price: 149.99,
    level: "beginner",
    category: "Business",
    tags: ["digital marketing", "seo", "social media", "ppc", "analytics"],
    curriculum: {
      modules: [
        {
          id: "marketing-mod-1",
          title: "Marketing Fundamentals",
          lessons: [
            { id: "marketing-1-1", title: "Introduction to Digital Marketing", type: "video", content: "", duration: 700 },
            { id: "marketing-1-2", title: "SEO Basics", type: "video", content: "", duration: 850 }
          ]
        }
      ]
    },
    status: "published",
    enrollmentCount: 14320,
    rating: 4.5,
    reviewCount: 2680,
    instructorEmail: 'steve.johnson@edutech.com'
  },
  {
    title: "Introduction to Programming Concepts",
    slug: "introduction-programming-concepts",
    description: "Free introductory course covering basic programming concepts, logic, and problem-solving. Perfect starting point for complete beginners.",
    shortDescription: "Free introduction to programming fundamentals and concepts",
    thumbnail: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=450&fit=crop&crop=entropy&auto=format",
    price: 0,
    level: "beginner",
    category: "Programming",
    tags: ["programming", "fundamentals", "logic", "problem solving", "beginner"],
    curriculum: {
      modules: [
        {
          id: "intro-mod-1",
          title: "Programming Basics",
          lessons: [
            { id: "intro-1-1", title: "What is Programming?", type: "video", content: "", duration: 600 },
            { id: "intro-1-2", title: "Problem Solving", type: "video", content: "", duration: 720 }
          ]
        }
      ]
    },
    status: "published",
    enrollmentCount: 28450,
    rating: 4.3,
    reviewCount: 4560,
    instructorEmail: 'sarah.johnson@edutech.com'
  }
];

async function generateUUID() {
  const { randomBytes } = require('crypto');
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [
    bytes.toString('hex', 0, 4),
    bytes.toString('hex', 4, 6),
    bytes.toString('hex', 6, 8),
    bytes.toString('hex', 8, 10),
    bytes.toString('hex', 10, 16)
  ].join('-');
}

async function createOrganization() {
  const orgId = await generateUUID();
  const now = new Date().toISOString();

  try {
    const result = await client.query(`
      INSERT INTO organizations (
        id, name, slug, description, logo, "isActive", settings, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (slug) DO UPDATE SET "updatedAt" = $9
      RETURNING *
    `, [
      orgId,
      'EduTech LMS Platform',
      'edutech-lms-platform',
      'Premier online learning platform for technology education',
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop',
      true,
      JSON.stringify({
        theme: { primaryColor: '#7c3aed', darkMode: false },
        features: ['courses', 'assessments', 'certificates', 'analytics'],
        limits: { maxUsers: 10000, maxCourses: 1000, storageLimit: 100000000000 }
      }),
      now,
      now
    ]);

    console.log(`✅ Created/verified organization: EduTech LMS Platform`);
    return result.rows[0];
  } catch (error) {
    // If insert fails due to conflict, fetch existing
    const existing = await client.query(`
      SELECT * FROM organizations WHERE slug = 'edutech-lms-platform' LIMIT 1
    `);
    return existing.rows[0];
  }
}

async function createInstructors(organizationId) {
  const instructorMap = new Map();

  for (const instructorData of instructors) {
    try {
      const instructorId = await generateUUID();
      const now = new Date().toISOString();

      const result = await client.query(`
        INSERT INTO users (
          id, email, password, "firstName", "lastName", role, status, 
          "organizationId", "emailVerifiedAt", avatar, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (email, "organizationId") DO UPDATE SET "updatedAt" = $12
        RETURNING *
      `, [
        instructorId,
        instructorData.email,
        '$2b$12$LQv3c1yqBTlbieHHnl6t6.lVPzYJn0.GUJoqwzA5oPmkn5rK9PnhO', // hashed 'password123'
        instructorData.name.split(' ')[0],
        instructorData.name.split(' ').slice(1).join(' '),
        'admin',
        'active',
        organizationId,
        now,
        `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face`,
        now,
        now
      ]);

      instructorMap.set(instructorData.email, result.rows[0]);
      console.log(`✅ Created/verified instructor: ${instructorData.name}`);
    } catch (error) {
      // If insert fails, try to fetch existing
      const existing = await client.query(`
        SELECT * FROM users WHERE email = $1 AND "organizationId" = $2 LIMIT 1
      `, [instructorData.email, organizationId]);
      
      if (existing.rows.length > 0) {
        instructorMap.set(instructorData.email, existing.rows[0]);
      }
    }
  }

  return instructorMap;
}

async function insertCourses(organizationId, instructorMap) {
  // Clear existing courses for fresh seeding
  await client.query(`DELETE FROM courses WHERE "organizationId" = $1`, [organizationId]);
  console.log(`🗑️ Cleared existing courses`);

  let createdCount = 0;

  for (const courseInfo of courseData) {
    const instructor = instructorMap.get(courseInfo.instructorEmail);
    
    if (!instructor) {
      console.warn(`⚠️ Instructor not found for email: ${courseInfo.instructorEmail}`);
      continue;
    }

    try {
      const courseId = await generateUUID();
      const now = new Date().toISOString();

      await client.query(`
        INSERT INTO courses (
          id, title, slug, description, "shortDescription", thumbnail, price, level,
          tags, curriculum, status, "enrollmentCount", rating, "reviewCount",
          "organizationId", "instructorId", "publishedAt", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        courseId,
        courseInfo.title,
        courseInfo.slug,
        courseInfo.description,
        courseInfo.shortDescription,
        courseInfo.thumbnail,
        courseInfo.price,
        courseInfo.level,
        courseInfo.tags,
        JSON.stringify(courseInfo.curriculum),
        courseInfo.status,
        courseInfo.enrollmentCount,
        courseInfo.rating,
        courseInfo.reviewCount,
        organizationId,
        instructor.id,
        now,
        now,
        now
      ]);

      createdCount++;
      console.log(`✅ Created course: ${courseInfo.title} (${courseInfo.enrollmentCount.toLocaleString()} enrollments)`);
    } catch (error) {
      console.error(`❌ Failed to create course: ${courseInfo.title}`, error.message);
    }
  }

  return createdCount;
}

async function main() {
  console.log('🚀 EduTech LMS Course Database Seeder');
  console.log('=====================================\n');

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Database connected successfully\n');

    // Create organization
    console.log('🏢 Setting up organization...');
    const organization = await createOrganization();
    console.log('');

    // Create instructors
    console.log('👥 Setting up instructors...');
    const instructorMap = await createInstructors(organization.id);
    console.log(`✅ Created/verified ${instructorMap.size} instructors\n`);

    // Seed courses
    console.log('📚 Seeding courses...');
    const createdCount = await insertCourses(organization.id, instructorMap);
    console.log('');

    // Final statistics
    const totalResult = await client.query(`
      SELECT COUNT(*) as total, SUM("enrollmentCount") as total_enrollments 
      FROM courses WHERE "organizationId" = $1
    `, [organization.id]);

    const stats = totalResult.rows[0];

    console.log('🎉 Seeding completed successfully!');
    console.log('==================================');
    console.log(`📊 Final Statistics:`);
    console.log(`   • Total Courses: ${stats.total}`);
    console.log(`   • Total Enrollments: ${parseInt(stats.total_enrollments || 0).toLocaleString()}`);
    console.log(`   • Organization: ${organization.name}`);
    console.log(`   • Instructors: ${instructorMap.size}`);
    console.log(`   • Courses Created This Run: ${createdCount}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

// Execute the seeding process
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };