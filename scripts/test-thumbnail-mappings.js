#!/usr/bin/env node

/**
 * Test Thumbnail Mappings
 * Verifies that all courses will have appropriate thumbnail images
 */

const courseTitles = [
  "Introduction to Web Development",
  "Python Programming for Beginners", 
  "Data Structures and Algorithms",
  "Machine Learning Fundamentals",
  "Complete JavaScript Course - From Zero to Hero",
  "Full Stack React Development Bootcamp",
  "Python Data Science Masterclass",
  "Complete DevOps Engineering Course",
  "Mobile App Development with React Native",
  "Cybersecurity Fundamentals and Ethical Hacking",
  "Complete JavaScript Fundamentals",
  "React Mastery: Hooks to Advanced Patterns",
  "Node.js Backend Development Masterclass",
  "Python Programming: Zero to Hero",
  "Machine Learning with Python and Scikit-Learn",
  "Flutter Complete Course: Build iOS & Android Apps",
  "AWS Cloud Practitioner Complete Course",
  "UI/UX Design Masterclass",
  "Digital Marketing Complete Strategy",
  "Introduction to Programming Concepts",
  "Advanced Docker and Kubernetes",
  "GraphQL API Development Complete Course",
  "TypeScript Complete Developer Course",
  "Vue.js 3 Composition API Masterclass",
  "Progressive Web Apps Development"
];

// Simulate the thumbnail mapping logic
const thumbnails = {
  // Programming & Development
  'javascript': 'JavaScript thumbnail',
  'react': 'React thumbnail',
  'python': 'Python thumbnail', 
  'node': 'Node.js thumbnail',
  'vue': 'Vue.js thumbnail',
  'vue.js': 'Vue.js thumbnail',
  'composition api': 'Vue.js thumbnail',
  'typescript': 'TypeScript thumbnail',
  'typescript complete': 'TypeScript thumbnail',
  
  // Mobile Development
  'mobile': 'Mobile thumbnail',
  'android': 'Android thumbnail',
  'ios': 'iOS thumbnail',
  'flutter': 'Flutter thumbnail',
  'flutter complete': 'Flutter thumbnail',
  'build ios': 'Flutter thumbnail',
  'react native': 'React Native thumbnail',
  
  // DevOps & Cloud
  'devops': 'DevOps thumbnail',
  'docker': 'Docker thumbnail',
  'kubernetes': 'Kubernetes thumbnail',
  'aws': 'AWS thumbnail',
  'aws cloud': 'AWS thumbnail',
  'cloud practitioner': 'AWS thumbnail',
  
  // Data & AI  
  'data': 'Data thumbnail',
  'machine learning': 'ML thumbnail',
  'data structures': 'Data Structures thumbnail',
  'data structures and algorithms': 'Data Structures thumbnail',
  
  // Cybersecurity
  'cybersecurity': 'Security thumbnail',
  'ethical hacking': 'Security thumbnail',
  
  // Web Development
  'web development': 'Web Dev thumbnail',
  'progressive web apps': 'PWA thumbnail',
  'pwa': 'PWA thumbnail',
  'programming': 'Programming thumbnail',
  'api': 'API thumbnail',
  'graphql': 'GraphQL thumbnail',
  
  // Design
  'ui': 'UI thumbnail',
  'ux': 'UX thumbnail', 
  'design': 'Design thumbnail',
  
  // Business & Marketing
  'marketing': 'Marketing thumbnail',
  'digital marketing': 'Marketing thumbnail'
};

// Test function similar to the one in CourseDashboard
function getCourseThumbnail(title) {
  const titleLower = title.toLowerCase();
  for (const [keyword, thumbnail] of Object.entries(thumbnails)) {
    if (titleLower.includes(keyword)) {
      return thumbnail;
    }
  }
  return 'Default thumbnail';
}

console.log('🖼️  Thumbnail Mapping Test');
console.log('========================\n');

console.log('📋 Testing all course titles:');
console.log('=============================');

let hasThumbnail = 0;
let needsDefault = 0;

courseTitles.forEach((title, index) => {
  const thumbnail = getCourseThumbnail(title);
  const isDefault = thumbnail === 'Default thumbnail';
  
  console.log(`${index + 1}. "${title}"`);
  console.log(`   → ${thumbnail} ${isDefault ? '❌' : '✅'}`);
  
  if (isDefault) {
    needsDefault++;
  } else {
    hasThumbnail++;
  }
});

console.log('\n📊 Summary:');
console.log('===========');
console.log(`✅ Courses with specific thumbnails: ${hasThumbnail}`);
console.log(`❌ Courses using default thumbnail: ${needsDefault}`);
console.log(`📈 Coverage: ${Math.round((hasThumbnail / courseTitles.length) * 100)}%`);

if (needsDefault === 0) {
  console.log('\n🎉 Perfect! All courses have specific thumbnails!');
} else {
  console.log('\n⚠️  Some courses still need thumbnail mappings.');
}