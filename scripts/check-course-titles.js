#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'edutech_lms',
});

async function checkCourseTitles() {
  await client.connect();
  
  const result = await client.query('SELECT title FROM courses WHERE status = $1', ['published']);
  
  console.log('📚 Course titles in database:');
  console.log('=============================');
  result.rows.forEach((row, index) => {
    console.log(`${index + 1}. ${row.title}`);
  });
  
  console.log('\n🔍 Checking for missing thumbnail keywords:');
  console.log('===========================================');
  
  const problematicCourses = result.rows.filter(row => {
    const title = row.title.toLowerCase();
    // Check if title contains common keywords
    return !title.includes('javascript') && !title.includes('python') && 
           !title.includes('react') && !title.includes('node') &&
           !title.includes('web') && !title.includes('programming') &&
           !title.includes('development');
  });
  
  problematicCourses.forEach(course => {
    console.log(`⚠️  "${course.title}" - may need specific thumbnail mapping`);
  });
  
  await client.end();
}

checkCourseTitles().catch(console.error);