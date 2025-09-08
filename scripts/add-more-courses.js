#!/usr/bin/env node

/**
 * Add Additional Courses for Pagination Testing
 */

const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'edutech_lms',
});

const additionalCourses = [
  {
    title: "Advanced Docker and Kubernetes",
    slug: "advanced-docker-kubernetes",
    description: "Master container orchestration with advanced Docker and Kubernetes techniques.",
    price: 129.99,
    level: "advanced",
    enrollmentCount: 5420,
    rating: 4.6,
    reviewCount: 890,
    instructorEmail: 'carlos.santos@edutech.com'
  },
  {
    title: "GraphQL API Development Complete Course",
    slug: "graphql-api-development",
    description: "Build modern APIs with GraphQL, Apollo Server, and advanced schema design.",
    price: 99.99,
    level: "intermediate",
    enrollmentCount: 7320,
    rating: 4.5,
    reviewCount: 1240,
    instructorEmail: 'david.rodriguez@edutech.com'
  },
  {
    title: "TypeScript Complete Developer Course",
    slug: "typescript-complete-course",
    description: "Master TypeScript from basics to advanced patterns and design principles.",
    price: 89.99,
    level: "intermediate",
    enrollmentCount: 9870,
    rating: 4.7,
    reviewCount: 1650,
    instructorEmail: 'mike.chen@edutech.com'
  },
  {
    title: "Vue.js 3 Composition API Masterclass",
    slug: "vuejs-composition-api",
    description: "Build modern Vue.js applications with Composition API and latest best practices.",
    price: 79.99,
    level: "intermediate",
    enrollmentCount: 6540,
    rating: 4.4,
    reviewCount: 980,
    instructorEmail: 'sarah.johnson@edutech.com'
  },
  {
    title: "Cybersecurity Fundamentals and Ethical Hacking",
    slug: "cybersecurity-ethical-hacking",
    description: "Learn cybersecurity basics, penetration testing, and ethical hacking techniques.",
    price: 149.99,
    level: "beginner",
    enrollmentCount: 8760,
    rating: 4.8,
    reviewCount: 1420,
    instructorEmail: 'dr.jennifer.lee@edutech.com'
  },
  {
    title: "Data Structures and Algorithms in Python",
    slug: "data-structures-algorithms-python",
    description: "Master computer science fundamentals with Python implementations.",
    price: 109.99,
    level: "intermediate",
    enrollmentCount: 12340,
    rating: 4.6,
    reviewCount: 2140,
    instructorEmail: 'dr.emily.watson@edutech.com'
  },
  {
    title: "Progressive Web Apps Development",
    slug: "progressive-web-apps",
    description: "Build fast, reliable web apps that work offline with PWA technologies.",
    price: 94.99,
    level: "intermediate",
    enrollmentCount: 5890,
    rating: 4.3,
    reviewCount: 840,
    instructorEmail: 'james.wilson@edutech.com'
  },
  {
    title: "Blockchain Development with Solidity",
    slug: "blockchain-solidity-development",
    description: "Create smart contracts and DApps using Solidity and Ethereum blockchain.",
    price: 179.99,
    level: "advanced",
    enrollmentCount: 4320,
    rating: 4.5,
    reviewCount: 680,
    instructorEmail: 'dr.alex.kumar@edutech.com'
  }
];

async function addMoreCourses() {
  console.log('📚 Adding Additional Courses for Pagination Testing');
  console.log('================================================\n');

  await client.connect();

  // Get organization and instructor IDs
  const orgResult = await client.query("SELECT id FROM organizations WHERE name = 'EduTech LMS Platform'");
  const organizationId = orgResult.rows[0].id;

  let totalAdded = 0;
  
  for (const courseData of additionalCourses) {
    const instructorResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [courseData.instructorEmail]
    );

    if (instructorResult.rows.length === 0) {
      console.log(`⚠️ Instructor not found: ${courseData.instructorEmail}`);
      continue;
    }

    const instructorId = instructorResult.rows[0].id;

    // Check if course already exists
    const existingCourse = await client.query(
      'SELECT id FROM courses WHERE slug = $1',
      [courseData.slug]
    );

    if (existingCourse.rows.length > 0) {
      console.log(`⏭️ Course already exists: ${courseData.title}`);
      continue;
    }

    const curriculum = {
      modules: [
        {
          id: `module_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: "Getting Started",
          lessons: [
            {
              id: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: "Introduction",
              type: "video",
              content: { videoUrl: "sample-video-url", duration: 600 },
              duration: 600
            }
          ]
        }
      ],
      totalLessons: 1,
      totalDuration: 600
    };

    const insertResult = await client.query(`
      INSERT INTO courses (
        title, slug, description, price, level, "enrollmentCount", rating, "reviewCount",
        "instructorId", "organizationId", status, "publishedAt", curriculum, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING id, title
    `, [
      courseData.title,
      courseData.slug,
      courseData.description,
      courseData.price,
      courseData.level,
      courseData.enrollmentCount,
      courseData.rating,
      courseData.reviewCount,
      instructorId,
      organizationId,
      'published',
      new Date(),
      JSON.stringify(curriculum)
    ]);

    console.log(`✅ Added course: ${courseData.title} (${courseData.enrollmentCount.toLocaleString()} enrollments)`);
    totalAdded++;
  }

  // Check final count
  const finalCount = await client.query("SELECT COUNT(*) as count FROM courses WHERE status = 'published'");
  const total = parseInt(finalCount.rows[0].count);

  console.log(`\n🎉 Addition completed!`);
  console.log(`📊 Final Statistics:`);
  console.log(`   • Courses added this run: ${totalAdded}`);
  console.log(`   • Total published courses: ${total}`);
  console.log(`   • Pages with 12 per page: ${Math.ceil(total / 12)}`);

  await client.end();
}

addMoreCourses().catch(console.error);