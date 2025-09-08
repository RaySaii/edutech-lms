#!/usr/bin/env node

/**
 * Video Library Uniqueness Analysis Script
 * Analyzes all videos for uniqueness and identifies any duplicates
 */

const fs = require('fs');
const path = require('path');

// Read the TypeScript file and extract video data
const videoSourcesPath = path.join(__dirname, '../apps/frontend/src/lib/videoSources.ts');
const videoSourcesContent = fs.readFileSync(videoSourcesPath, 'utf8');

// Extract the videoLibrary array using regex (simplified approach)
const videoLibraryMatch = videoSourcesContent.match(/export const videoLibrary: VideoSource\[\] = (\[[\s\S]*?\]);/);
if (!videoLibraryMatch) {
  console.error('❌ Could not extract video library from file');
  process.exit(1);
}

// Parse the video data (simplified - focusing on key uniqueness indicators)
const videoData = [];
const lines = videoSourcesContent.split('\n');
let currentVideo = {};
let inVideoObject = false;

lines.forEach(line => {
  const trimmed = line.trim();
  
  if (trimmed.startsWith('id:') && trimmed.includes("'")) {
    const id = trimmed.match(/'([^']+)'/)?.[1];
    if (id) currentVideo.id = id;
    inVideoObject = true;
  } else if (trimmed.startsWith('title:') && trimmed.includes("'")) {
    const title = trimmed.match(/'([^']+)'/)?.[1];
    if (title) currentVideo.title = title;
  } else if (trimmed.startsWith('thumbnail:') && trimmed.includes('https://')) {
    const thumbnail = trimmed.match(/'([^']+)'/)?.[1];
    if (thumbnail) currentVideo.thumbnail = thumbnail;
  } else if (trimmed.startsWith('instructor:') && trimmed.includes("'")) {
    const instructor = trimmed.match(/'([^']+)'/)?.[1];
    if (instructor) currentVideo.instructor = instructor;
  } else if (trimmed.startsWith('category:') && trimmed.includes("'")) {
    const category = trimmed.match(/'([^']+)'/)?.[1];
    if (category) currentVideo.category = category;
  } else if (trimmed.startsWith('subcategory:') && trimmed.includes("'")) {
    const subcategory = trimmed.match(/'([^']+)'/)?.[1];
    if (subcategory) currentVideo.subcategory = subcategory;
  } else if (trimmed === '},' && inVideoObject && currentVideo.id) {
    videoData.push({ ...currentVideo });
    currentVideo = {};
    inVideoObject = false;
  }
});

console.log('📊 Video Library Uniqueness Analysis');
console.log('====================================\n');

const uniqueFields = {
  ids: new Set(),
  titles: new Set(),
  thumbnails: new Set(),
  instructors: new Set(),
  categories: new Set(),
  subcategories: new Set()
};

const duplicates = {
  ids: new Map(),
  titles: new Map(),
  thumbnails: new Map()
};

videoData.forEach((video, index) => {
  // Track unique fields
  uniqueFields.ids.add(video.id);
  uniqueFields.titles.add(video.title);
  uniqueFields.thumbnails.add(video.thumbnail);
  uniqueFields.instructors.add(video.instructor);
  uniqueFields.categories.add(video.category);
  uniqueFields.subcategories.add(video.subcategory);
  
  // Check for duplicates
  videoData.forEach((otherVideo, otherIndex) => {
    if (index !== otherIndex) {
      if (video.id === otherVideo.id) {
        if (!duplicates.ids.has(video.id)) duplicates.ids.set(video.id, []);
        duplicates.ids.get(video.id).push(index, otherIndex);
      }
      if (video.title === otherVideo.title) {
        if (!duplicates.titles.has(video.title)) duplicates.titles.set(video.title, []);
        duplicates.titles.get(video.title).push(index, otherIndex);
      }
      if (video.thumbnail === otherVideo.thumbnail) {
        if (!duplicates.thumbnails.has(video.thumbnail)) duplicates.thumbnails.set(video.thumbnail, []);
        duplicates.thumbnails.get(video.thumbnail).push(index, otherIndex);
      }
    }
  });
});

console.log('🔍 Uniqueness Statistics:');
console.log(`   • Total Videos: ${videoData.length}`);
console.log(`   • Unique IDs: ${uniqueFields.ids.size}`);
console.log(`   • Unique Titles: ${uniqueFields.titles.size}`);
console.log(`   • Unique Thumbnails: ${uniqueFields.thumbnails.size}`);
console.log(`   • Unique Instructors: ${uniqueFields.instructors.size}`);
console.log(`   • Unique Categories: ${uniqueFields.categories.size}`);
console.log(`   • Unique Subcategories: ${uniqueFields.subcategories.size}\n`);

// Report duplicates
let hasDuplicates = false;

if (duplicates.ids.size > 0) {
  console.log('❌ Duplicate IDs Found:');
  duplicates.ids.forEach((indices, id) => {
    console.log(`   • "${id}" appears in videos at indices: ${[...new Set(indices)].join(', ')}`);
    hasDuplicates = true;
  });
  console.log();
}

if (duplicates.titles.size > 0) {
  console.log('❌ Duplicate Titles Found:');
  duplicates.titles.forEach((indices, title) => {
    console.log(`   • "${title}" appears in videos at indices: ${[...new Set(indices)].join(', ')}`);
    hasDuplicates = true;
  });
  console.log();
}

if (duplicates.thumbnails.size > 0) {
  console.log('⚠️  Duplicate Thumbnails Found:');
  duplicates.thumbnails.forEach((indices, thumbnail) => {
    console.log(`   • Same thumbnail used in videos at indices: ${[...new Set(indices)].join(', ')}`);
    console.log(`     URL: ${thumbnail.substring(0, 60)}...`);
    hasDuplicates = true;
  });
  console.log();
}

// Show category breakdown
console.log('🎯 Content Distribution:');
const categoryCount = {};
const subcategoryCount = {};
videoData.forEach(video => {
  categoryCount[video.category] = (categoryCount[video.category] || 0) + 1;
  subcategoryCount[video.subcategory] = (subcategoryCount[video.subcategory] || 0) + 1;
});

console.log('   Categories:');
Object.entries(categoryCount).sort(([,a], [,b]) => b - a).forEach(([category, count]) => {
  console.log(`     • ${category}: ${count} videos`);
});

console.log('\n   Top Subcategories:');
Object.entries(subcategoryCount)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 8)
  .forEach(([subcategory, count]) => {
    console.log(`     • ${subcategory}: ${count} videos`);
  });

console.log('\n👨‍🏫 Instructor Distribution:');
const instructorCount = {};
videoData.forEach(video => {
  instructorCount[video.instructor] = (instructorCount[video.instructor] || 0) + 1;
});
Object.entries(instructorCount)
  .sort(([,a], [,b]) => b - a)
  .forEach(([instructor, count]) => {
    console.log(`   • ${instructor}: ${count} videos`);
  });

if (!hasDuplicates) {
  console.log('\n✅ All videos are unique! No duplicates found.');
  console.log('🎉 The video library demonstrates excellent diversity and uniqueness.');
} else {
  console.log('\n⚠️  Some duplicates were found. Consider reviewing for uniqueness.');
}

console.log('\n📈 Summary:');
console.log(`   The video library contains ${videoData.length} educational videos`);
console.log(`   spanning ${uniqueFields.categories.size} major categories and ${uniqueFields.subcategories.size} subcategories,`);
console.log(`   taught by ${uniqueFields.instructors.size} different instructors.`);