#!/usr/bin/env node

/**
 * Course API Pagination Test Script
 * Tests the course API to verify pagination is working correctly
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

async function testCoursePagination() {
  console.log('🧪 Course API Pagination Test');
  console.log('============================\n');

  await client.connect();

  // Test pagination directly at database level
  console.log('📊 Database Pagination Test:');
  console.log('============================');
  
  // Get total courses
  const totalResult = await client.query('SELECT COUNT(*) as total FROM courses WHERE status = $1', ['published']);
  const totalCourses = parseInt(totalResult.rows[0].total);
  console.log(`📚 Total published courses: ${totalCourses}`);
  
  const limit = 12; // New limit
  const totalPages = Math.ceil(totalCourses / limit);
  console.log(`📄 Expected pages (${limit} per page): ${totalPages}`);
  
  // Test each page
  for (let page = 1; page <= totalPages; page++) {
    const skip = (page - 1) * limit;
    const result = await client.query(
      'SELECT id, title FROM courses WHERE status = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
      ['published', limit, skip]
    );
    
    console.log(`   Page ${page}: ${result.rows.length} courses`);
    if (result.rows.length > 0) {
      console.log(`      First: "${result.rows[0].title}"`);
      if (result.rows.length > 1) {
        console.log(`      Last: "${result.rows[result.rows.length - 1].title}"`);
      }
    }
  }
  
  console.log('\n✅ Pagination verification:');
  let totalItemsAcrossPages = 0;
  for (let page = 1; page <= totalPages; page++) {
    const skip = (page - 1) * limit;
    const result = await client.query(
      'SELECT COUNT(*) as count FROM courses WHERE status = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
      ['published', limit, skip]
    );
    const pageCount = parseInt(result.rows[0].count);
    totalItemsAcrossPages += pageCount;
    
    if (page === totalPages && pageCount === 0) {
      console.log(`❌ Page ${page} is empty! This should not happen.`);
    } else if (page < totalPages && pageCount < limit) {
      console.log(`⚠️  Page ${page} has only ${pageCount} items (expected ${limit})`);
    } else {
      console.log(`✅ Page ${page}: ${pageCount} items`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total courses: ${totalCourses}`);
  console.log(`   Items per page: ${limit}`);
  console.log(`   Expected pages: ${totalPages}`);
  console.log(`   Total items across pages: ${totalItemsAcrossPages}`);
  console.log(`   Data consistency: ${totalCourses === totalItemsAcrossPages ? '✅ Perfect' : '❌ Mismatch'}`);

  await client.end();
}

testCoursePagination().catch(console.error);