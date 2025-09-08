#!/usr/bin/env node

/**
 * Final Course Database Verification Script
 * This script verifies the course data for EduTech LMS Platform
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

async function verifyFinalState() {
  console.log('🎯 Final Course Database Verification');
  console.log('=====================================\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get our organization
    const orgResult = await client.query(`
      SELECT id, name FROM organizations WHERE name = 'EduTech LMS Platform'
    `);

    if (orgResult.rows.length === 0) {
      console.log('❌ EduTech LMS Platform organization not found');
      return;
    }

    const org = orgResult.rows[0];
    console.log(`🏢 Organization: ${org.name} (${org.id})\n`);

    // Get course statistics for our organization
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN price = 0 THEN 1 END) as free_courses,
        COUNT(CASE WHEN price > 0 THEN 1 END) as paid_courses,
        SUM("enrollmentCount") as total_enrollments,
        AVG(rating)::numeric(10,2) as avg_rating,
        COUNT(DISTINCT "instructorId") as unique_instructors
      FROM courses
      WHERE "organizationId" = $1
    `, [org.id]);

    const stats = statsResult.rows[0];

    console.log('📊 EduTech LMS Platform Statistics:');
    console.log(`   • Total Courses: ${stats.total_courses}`);
    console.log(`   • Free Courses: ${stats.free_courses}`);
    console.log(`   • Paid Courses: ${stats.paid_courses}`);
    console.log(`   • Total Enrollments: ${parseInt(stats.total_enrollments || 0).toLocaleString()}`);
    console.log(`   • Average Rating: ${stats.avg_rating}⭐`);
    console.log(`   • Unique Instructors: ${stats.unique_instructors}\n`);

    // Get all courses for our organization
    console.log('📚 EduTech LMS Course Catalog:');
    const coursesResult = await client.query(`
      SELECT c.title, c.price, c."enrollmentCount", c.rating, c.level,
             u."firstName", u."lastName"
      FROM courses c
      JOIN users u ON c."instructorId" = u.id
      WHERE c."organizationId" = $1
      ORDER BY c."enrollmentCount" DESC
    `, [org.id]);

    coursesResult.rows.forEach((course, index) => {
      const priceDisplay = course.price == 0 ? 'FREE' : `$${course.price}`;
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${course.title}`);
      console.log(`       📊 ${course.enrollmentCount.toLocaleString()} enrollments | ${course.rating}⭐ | ${course.level} | ${priceDisplay}`);
      console.log(`       👨‍🏫 ${course.firstName} ${course.lastName}\n`);
    });

    // Get instructor statistics
    const instructorsResult = await client.query(`
      SELECT u."firstName", u."lastName", COUNT(c.id) as course_count,
             SUM(c."enrollmentCount") as total_enrollments
      FROM users u
      JOIN courses c ON u.id = c."instructorId"
      WHERE c."organizationId" = $1
      GROUP BY u.id, u."firstName", u."lastName"
      ORDER BY total_enrollments DESC
    `, [org.id]);

    console.log('👩‍🏫 Top Instructors by Enrollment:');
    instructorsResult.rows.slice(0, 5).forEach((instructor, index) => {
      console.log(`   ${index + 1}. ${instructor.firstName} ${instructor.lastName}`);
      console.log(`      Courses: ${instructor.course_count} | Enrollments: ${parseInt(instructor.total_enrollments).toLocaleString()}\n`);
    });

    console.log('🎉 Database verification completed successfully!');
    console.log('✨ EduTech LMS Platform is ready with comprehensive course content!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await client.end();
    console.log('\n📡 Database connection closed');
  }
}

verifyFinalState();