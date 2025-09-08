// Comprehensive video source library for educational content

export interface VideoSource {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  subcategory: string;
  duration: number; // in seconds
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  instructor: string;
  description: string;
  tags: string[];
  videoUrl?: string; // For future integration
  hasSubtitles: boolean;
  hasTranscript: boolean;
  quality: string[];
  language: string;
}

export const videoLibrary: VideoSource[] = [
  // Programming & Development - JavaScript Ecosystem
  {
    id: 'js-fundamentals',
    title: 'JavaScript Fundamentals for Beginners',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Programming',
    subcategory: 'JavaScript',
    duration: 3600,
    difficulty: 'beginner',
    instructor: 'Sarah Johnson',
    description: 'Master the fundamentals of JavaScript programming from variables to functions.',
    tags: ['javascript', 'programming', 'web development', 'fundamentals'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'react-hooks',
    title: 'Mastering React Hooks',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Programming',
    subcategory: 'React',
    duration: 5400,
    difficulty: 'intermediate',
    instructor: 'Mike Chen',
    description: 'Deep dive into React Hooks - useState, useEffect, custom hooks and more.',
    tags: ['react', 'hooks', 'frontend', 'javascript'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p', '4K'],
    language: 'English'
  },
  {
    id: 'nodejs-api',
    title: 'Building REST APIs with Node.js',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Programming',
    subcategory: 'Backend',
    duration: 7200,
    difficulty: 'intermediate',
    instructor: 'David Rodriguez',
    description: 'Learn to build scalable REST APIs using Node.js and Express.',
    tags: ['nodejs', 'api', 'backend', 'express'],
    hasSubtitles: true,
    hasTranscript: false,
    quality: ['720p', '1080p'],
    language: 'English'
  },

  // Python & Data Science
  {
    id: 'python-basics',
    title: 'Python Programming Essentials',
    thumbnail: 'https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Programming',
    subcategory: 'Python',
    duration: 4800,
    difficulty: 'beginner',
    instructor: 'Dr. Emily Watson',
    description: 'Complete Python course covering syntax, data structures, and OOP.',
    tags: ['python', 'programming', 'data science', 'oop'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'ml-tensorflow',
    title: 'Machine Learning with TensorFlow',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Data Science',
    subcategory: 'Machine Learning',
    duration: 9000,
    difficulty: 'advanced',
    instructor: 'Dr. Alex Kumar',
    description: 'Advanced machine learning techniques using TensorFlow 2.0.',
    tags: ['machine learning', 'tensorflow', 'ai', 'deep learning'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p', '4K'],
    language: 'English'
  },
  {
    id: 'data-analysis-pandas',
    title: 'Data Analysis with Pandas',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Data Science',
    subcategory: 'Data Analysis',
    duration: 6300,
    difficulty: 'intermediate',
    instructor: 'Lisa Park',
    description: 'Master data manipulation and analysis using Pandas library.',
    tags: ['pandas', 'data analysis', 'python', 'statistics'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },

  // Mobile Development
  {
    id: 'flutter-basics',
    title: 'Flutter Mobile App Development',
    thumbnail: 'https://images.unsplash.com/photo-1563813251-90a84b1d8550?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Mobile Development',
    subcategory: 'Flutter',
    duration: 8100,
    difficulty: 'intermediate',
    instructor: 'James Wilson',
    description: 'Build cross-platform mobile apps with Flutter and Dart.',
    tags: ['flutter', 'mobile', 'dart', 'cross-platform'],
    hasSubtitles: true,
    hasTranscript: false,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'ios-swift',
    title: 'iOS Development with Swift',
    thumbnail: 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Mobile Development',
    subcategory: 'iOS',
    duration: 10800,
    difficulty: 'intermediate',
    instructor: 'Maria Garcia',
    description: 'Create native iOS applications using Swift and SwiftUI.',
    tags: ['ios', 'swift', 'mobile', 'xcode'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'android-kotlin',
    title: 'Android Development with Kotlin',
    thumbnail: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Mobile Development',
    subcategory: 'Android',
    duration: 9600,
    difficulty: 'intermediate',
    instructor: 'Robert Kim',
    description: 'Modern Android development using Kotlin and Jetpack Compose.',
    tags: ['android', 'kotlin', 'mobile', 'jetpack compose'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },

  // Cloud & DevOps
  {
    id: 'aws-cloud',
    title: 'AWS Cloud Fundamentals',
    thumbnail: 'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Cloud Computing',
    subcategory: 'AWS',
    duration: 7200,
    difficulty: 'intermediate',
    instructor: 'Mark Thompson',
    description: 'Learn AWS core services: EC2, S3, RDS, and Lambda.',
    tags: ['aws', 'cloud', 'devops', 'infrastructure'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'docker-containers',
    title: 'Docker and Containerization',
    thumbnail: 'https://images.unsplash.com/photo-1605745341112-85968b19335a?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'DevOps',
    subcategory: 'Docker',
    duration: 5400,
    difficulty: 'intermediate',
    instructor: 'Anna Petrov',
    description: 'Master Docker containers, images, and orchestration.',
    tags: ['docker', 'containers', 'devops', 'deployment'],
    hasSubtitles: true,
    hasTranscript: false,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'kubernetes-orchestration',
    title: 'Kubernetes Container Orchestration',
    thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'DevOps',
    subcategory: 'Kubernetes',
    duration: 12600,
    difficulty: 'advanced',
    instructor: 'Carlos Santos',
    description: 'Advanced Kubernetes deployment and management strategies.',
    tags: ['kubernetes', 'orchestration', 'devops', 'microservices'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p', '4K'],
    language: 'English'
  },

  // Cybersecurity
  {
    id: 'ethical-hacking',
    title: 'Ethical Hacking and Penetration Testing',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Cybersecurity',
    subcategory: 'Penetration Testing',
    duration: 14400,
    difficulty: 'advanced',
    instructor: 'Dr. Jennifer Lee',
    description: 'Learn ethical hacking techniques and penetration testing methodologies.',
    tags: ['ethical hacking', 'penetration testing', 'cybersecurity', 'security'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'network-security',
    title: 'Network Security Fundamentals',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Cybersecurity',
    subcategory: 'Network Security',
    duration: 8700,
    difficulty: 'intermediate',
    instructor: 'Michael Brown',
    description: 'Comprehensive guide to network security protocols and practices.',
    tags: ['network security', 'cybersecurity', 'protocols', 'firewall'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },

  // Design & Creative
  {
    id: 'ui-ux-design',
    title: 'UI/UX Design Masterclass',
    thumbnail: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Design',
    subcategory: 'UI/UX',
    duration: 10800,
    difficulty: 'intermediate',
    instructor: 'Sophie Miller',
    description: 'Complete guide to user interface and user experience design.',
    tags: ['ui', 'ux', 'design', 'user experience'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p', '4K'],
    language: 'English'
  },
  {
    id: 'figma-design',
    title: 'Figma Design System Creation',
    thumbnail: 'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Design',
    subcategory: 'Figma',
    duration: 6900,
    difficulty: 'intermediate',
    instructor: 'Tom Anderson',
    description: 'Build scalable design systems using Figma\'s advanced features.',
    tags: ['figma', 'design system', 'prototyping', 'collaboration'],
    hasSubtitles: true,
    hasTranscript: false,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'photoshop-advanced',
    title: 'Advanced Photoshop Techniques',
    thumbnail: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Design',
    subcategory: 'Photoshop',
    duration: 9900,
    difficulty: 'advanced',
    instructor: 'Rachel Green',
    description: 'Master advanced Photoshop techniques for professional design work.',
    tags: ['photoshop', 'photo editing', 'design', 'retouching'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },

  // Business & Marketing
  {
    id: 'digital-marketing',
    title: 'Digital Marketing Strategy',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Business',
    subcategory: 'Digital Marketing',
    duration: 7800,
    difficulty: 'beginner',
    instructor: 'Steve Johnson',
    description: 'Comprehensive digital marketing strategies for modern businesses.',
    tags: ['digital marketing', 'seo', 'social media', 'advertising'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'entrepreneurship',
    title: 'Startup Entrepreneurship',
    thumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Business',
    subcategory: 'Entrepreneurship',
    duration: 11700,
    difficulty: 'intermediate',
    instructor: 'Lisa Chen',
    description: 'From idea to IPO: Complete guide to building a successful startup.',
    tags: ['entrepreneurship', 'startup', 'business planning', 'funding'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },

  // Photography & Video
  {
    id: 'photography-basics',
    title: 'Digital Photography Fundamentals',
    thumbnail: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Photography',
    subcategory: 'Digital Photography',
    duration: 8400,
    difficulty: 'beginner',
    instructor: 'Kevin Park',
    description: 'Master the fundamentals of digital photography and composition.',
    tags: ['photography', 'composition', 'lighting', 'camera'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p', '4K'],
    language: 'English'
  },
  {
    id: 'video-editing',
    title: 'Professional Video Editing',
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Video Production',
    subcategory: 'Video Editing',
    duration: 12000,
    difficulty: 'intermediate',
    instructor: 'Alex Rodriguez',
    description: 'Professional video editing techniques using industry-standard tools.',
    tags: ['video editing', 'premiere pro', 'color grading', 'audio'],
    hasSubtitles: true,
    hasTranscript: false,
    quality: ['720p', '1080p', '4K'],
    language: 'English'
  },

  // Blockchain & Cryptocurrency
  {
    id: 'blockchain-basics',
    title: 'Blockchain Technology Explained',
    thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Technology',
    subcategory: 'Blockchain',
    duration: 6600,
    difficulty: 'beginner',
    instructor: 'Dr. Sarah Kim',
    description: 'Understanding blockchain technology, cryptocurrencies, and smart contracts.',
    tags: ['blockchain', 'cryptocurrency', 'smart contracts', 'web3'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'solidity-smart-contracts',
    title: 'Smart Contract Development with Solidity',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Technology',
    subcategory: 'Blockchain',
    duration: 10800,
    difficulty: 'advanced',
    instructor: 'Marcus Johnson',
    description: 'Build and deploy smart contracts using Solidity and Ethereum.',
    tags: ['solidity', 'ethereum', 'smart contracts', 'dapp'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },

  // Artificial Intelligence
  {
    id: 'ai-fundamentals',
    title: 'Artificial Intelligence Fundamentals',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Artificial Intelligence',
    subcategory: 'AI Fundamentals',
    duration: 8100,
    difficulty: 'intermediate',
    instructor: 'Dr. Maya Patel',
    description: 'Introduction to AI concepts, algorithms, and real-world applications.',
    tags: ['artificial intelligence', 'machine learning', 'neural networks', 'algorithms'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p', '4K'],
    language: 'English'
  },
  {
    id: 'deep-learning',
    title: 'Deep Learning with PyTorch',
    thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Artificial Intelligence',
    subcategory: 'Deep Learning',
    duration: 14400,
    difficulty: 'advanced',
    instructor: 'Dr. Robert Zhang',
    description: 'Advanced deep learning techniques using PyTorch framework.',
    tags: ['deep learning', 'pytorch', 'neural networks', 'computer vision'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p'],
    language: 'English'
  },

  // Game Development
  {
    id: 'unity-game-dev',
    title: 'Game Development with Unity',
    thumbnail: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Game Development',
    subcategory: 'Unity',
    duration: 16200,
    difficulty: 'intermediate',
    instructor: 'Jake Mitchell',
    description: 'Create 2D and 3D games using Unity game engine.',
    tags: ['unity', 'game development', 'c#', '3d modeling'],
    hasSubtitles: true,
    hasTranscript: false,
    quality: ['720p', '1080p'],
    language: 'English'
  },
  {
    id: 'unreal-engine',
    title: 'Unreal Engine 5 Masterclass',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop&crop=entropy&auto=format',
    category: 'Game Development',
    subcategory: 'Unreal Engine',
    duration: 18000,
    difficulty: 'advanced',
    instructor: 'Emma Williams',
    description: 'Professional game development using Unreal Engine 5.',
    tags: ['unreal engine', 'game development', 'blueprints', 'rendering'],
    hasSubtitles: true,
    hasTranscript: true,
    quality: ['720p', '1080p', '4K'],
    language: 'English'
  }
];

// Helper functions
export const getVideosByCategory = (category: string): VideoSource[] => {
  return videoLibrary.filter(video => video.category === category);
};

export const getVideosByDifficulty = (difficulty: string): VideoSource[] => {
  return videoLibrary.filter(video => video.difficulty === difficulty);
};

export const getVideosByTag = (tag: string): VideoSource[] => {
  return videoLibrary.filter(video => 
    video.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
};

export const getRandomVideos = (count: number): VideoSource[] => {
  const shuffled = [...videoLibrary].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const formatVideoDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const getVideoThumbnail = (title: string): string => {
  const video = videoLibrary.find(v => 
    v.title.toLowerCase().includes(title.toLowerCase()) ||
    v.tags.some(tag => title.toLowerCase().includes(tag.toLowerCase()))
  );
  return video?.thumbnail || 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=450&fit=crop&crop=entropy&auto=format';
};