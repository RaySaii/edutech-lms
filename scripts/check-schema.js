#!/usr/bin/env node

/**
 * Database Schema Check Script
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

async function checkSchema() {
  console.log('🔍 Checking Database Schema');
  console.log('===========================\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check course table columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'courses'
      ORDER BY ordinal_position
    `);

    console.log('📊 Courses Table Schema:');
    columnsResult.rows.forEach(col => {
      console.log(`   • ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });

    console.log('\n📚 Sample Course Data:');
    const sampleResult = await client.query(`
      SELECT title, price, "enrollmentCount", rating, level, tags
      FROM courses
      LIMIT 3
    `);

    sampleResult.rows.forEach((course, index) => {
      console.log(`   ${index + 1}. ${course.title}`);
      console.log(`      Price: $${course.price} | Level: ${course.level} | Rating: ${course.rating}⭐`);
      console.log(`      Tags: ${course.tags ? course.tags.join(', ') : 'None'}`);
      console.log(`      Enrollments: ${course.enrollmentCount.toLocaleString()}\n`);
    });

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

checkSchema();