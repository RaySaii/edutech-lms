#!/usr/bin/env node

/**
 * Course Database Verification Script
 * This script verifies the course data in the database
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

async function verifyCourses() {
  console.log('🔍 Verifying Course Database Content');
  console.log('====================================\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get course statistics
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN price = 0 THEN 1 END) as free_courses,
        COUNT(CASE WHEN price > 0 THEN 1 END) as paid_courses,
        SUM("enrollmentCount") as total_enrollments,
        AVG(rating)::numeric(10,2) as avg_rating,
        COUNT(DISTINCT "instructorId") as unique_instructors,
        COUNT(DISTINCT category) as categories
      FROM courses
    `);

    const stats = statsResult.rows[0];

    console.log('📊 Database Statistics:');
    console.log(`   • Total Courses: ${stats.total_courses}`);
    console.log(`   • Free Courses: ${stats.free_courses}`);
    console.log(`   • Paid Courses: ${stats.paid_courses}`);
    console.log(`   • Total Enrollments: ${parseInt(stats.total_enrollments || 0).toLocaleString()}`);
    console.log(`   • Average Rating: ${stats.avg_rating}⭐`);
    console.log(`   • Unique Instructors: ${stats.unique_instructors}`);
    console.log(`   • Categories: ${stats.categories}\n`);

    // Get courses by category
    const categoryResult = await client.query(`
      SELECT category, COUNT(*) as course_count, SUM("enrollmentCount") as enrollments
      FROM courses
      GROUP BY category
      ORDER BY course_count DESC
    `);

    console.log('🎯 Courses by Category:');
    categoryResult.rows.forEach(row => {
      console.log(`   • ${row.category}: ${row.course_count} courses (${parseInt(row.enrollments).toLocaleString()} enrollments)`);
    });

    console.log('\n📚 Sample Course Details:');
    const sampleResult = await client.query(`
      SELECT c.title, c.price, c."enrollmentCount", c.rating, c.level,
             u."firstName", u."lastName"
      FROM courses c
      JOIN users u ON c."instructorId" = u.id
      ORDER BY c."enrollmentCount" DESC
      LIMIT 5
    `);

    sampleResult.rows.forEach((course, index) => {
      console.log(`   ${index + 1}. ${course.title}`);
      console.log(`      Price: $${course.price} | Level: ${course.level} | Rating: ${course.rating}⭐`);
      console.log(`      Instructor: ${course.firstName} ${course.lastName}`);
      console.log(`      Enrollments: ${course.enrollmentCount.toLocaleString()}\n`);
    });

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

verifyCourses();