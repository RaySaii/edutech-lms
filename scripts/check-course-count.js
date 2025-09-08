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

async function checkCourses() {
  await client.connect();
  
  const published = await client.query("SELECT COUNT(*) as count FROM courses WHERE status = 'published'");
  const draft = await client.query("SELECT COUNT(*) as count FROM courses WHERE status = 'draft'");
  const total = await client.query('SELECT COUNT(*) as count FROM courses');
  
  console.log('📊 Course Status Count:');
  console.log('   Published:', published.rows[0].count);
  console.log('   Draft:', draft.rows[0].count);
  console.log('   Total:', total.rows[0].count);
  
  await client.end();
}

checkCourses().catch(console.error);