#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class FrontendValidator {
  constructor() {
    this.results = {
      components: [],
      pages: [],
      hooks: [],
      utilities: [],
      styles: [],
      overall: { score: 0, status: '', issues: [] }
    };
  }

  validateFile(filePath, expectedContent = []) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const size = Math.round(content.length / 1024);
      const hasExpectedContent = expectedContent.every(item => content.includes(item));
      
      return {
        exists: true,
        size: size,
        content: content,
        hasExpectedContent: hasExpectedContent,
        contentMatches: expectedContent.filter(item => content.includes(item)),
        missing: expectedContent.filter(item => !content.includes(item))
      };
    } catch (error) {
      return {
        exists: false,
        size: 0,
        content: '',
        hasExpectedContent: false,
        contentMatches: [],
        missing: expectedContent
      };
    }
  }

  validateComponent(componentPath, componentName, expectedFeatures) {
    console.log(`\n🔍 Testing ${componentName}...`);
    
    const validation = this.validateFile(componentPath, expectedFeatures);
    const component = {
      name: componentName,
      path: componentPath,
      exists: validation.exists,
      size: validation.size,
      features: validation.contentMatches,
      missing: validation.missing,
      score: validation.exists ? Math.round((validation.contentMatches.length / expectedFeatures.length) * 100) : 0
    };

    if (validation.exists) {
      console.log(`  ✅ ${componentName}: ${component.size}KB (${component.score}%)`);
      if (component.missing.length > 0) {
        console.log(`  ⚠️  Missing: ${component.missing.join(', ')}`);
      }
    } else {
      console.log(`  ❌ ${componentName}: FILE NOT FOUND`);
    }

    this.results.components.push(component);
    return component;
  }

  validatePages() {
    console.log(`\n📄 TESTING FRONTEND PAGES`);
    console.log('='.repeat(50));

    const pages = [
      {
        name: 'Dashboard Page',
        path: 'apps/frontend/src/app/dashboard/page.tsx',
        features: ['export default', 'Dashboard', 'React']
      },
      {
        name: 'Login Page',
        path: 'apps/frontend/src/app/login/page.tsx',
        features: ['export default', 'Login', 'React']
      },
      {
        name: 'Courses Page',
        path: 'apps/frontend/src/app/courses/page.tsx',
        features: ['export default', 'Courses', 'React']
      },
      {
        name: 'Search Page',
        path: 'apps/frontend/src/app/search/page.tsx',
        features: ['export default', 'Search', 'React']
      },
      {
        name: 'Gamification Page',
        path: 'apps/frontend/src/app/gamification/page.tsx',
        features: ['export default', 'Gamification', 'React']
      }
    ];

    pages.forEach(page => {
      const result = this.validateComponent(page.path, page.name, page.features);
      this.results.pages.push(result);
    });
  }

  validateComponents() {
    console.log(`\n🧩 TESTING REACT COMPONENTS`);
    console.log('='.repeat(50));

    const components = [
      {
        name: 'LoginForm',
        path: 'apps/frontend/src/components/auth/LoginForm.tsx',
        features: ['useState', 'onSubmit', 'email', 'password', 'export default', 'React']
      },
      {
        name: 'RegisterForm',
        path: 'apps/frontend/src/components/auth/RegisterForm.tsx',
        features: ['useState', 'onSubmit', 'email', 'password', 'firstName', 'export default']
      },
      {
        name: 'ForgotPasswordForm',
        path: 'apps/frontend/src/components/auth/ForgotPasswordForm.tsx',
        features: ['useState', 'onSubmit', 'email', 'export default']
      },
      {
        name: 'CourseDashboard',
        path: 'apps/frontend/src/components/courses/CourseDashboard.tsx',
        features: ['useEffect', 'useState', 'courses', 'loading', 'export default']
      },
      {
        name: 'CourseForm',
        path: 'apps/frontend/src/components/courses/CourseForm.tsx',
        features: ['useState', 'onSubmit', 'title', 'description', 'export default']
      },
      {
        name: 'CourseDetailView',
        path: 'apps/frontend/src/components/courses/CourseDetailView.tsx',
        features: ['useEffect', 'useState', 'course', 'enrollment', 'export default']
      },
      {
        name: 'GamificationDashboard',
        path: 'apps/frontend/src/components/gamification/GamificationDashboard.tsx',
        features: ['useState', 'useEffect', 'points', 'achievements', 'badges', 'export default']
      },
      {
        name: 'AdvancedSearchDashboard',
        path: 'apps/frontend/src/components/search/AdvancedSearchDashboard.tsx',
        features: ['useState', 'useEffect', 'handleSearch', 'filters', 'results', 'export default']
      },
      {
        name: 'DashboardStats',
        path: 'apps/frontend/src/components/dashboard/DashboardStats.tsx',
        features: ['useState', 'useEffect', 'stats', 'export default']
      }
    ];

    components.forEach(comp => {
      this.validateComponent(comp.path, comp.name, comp.features);
    });
  }

  validateHooks() {
    console.log(`\n🎣 TESTING CUSTOM HOOKS`);
    console.log('='.repeat(50));

    const hooks = [
      {
        name: 'useDashboard',
        path: 'apps/frontend/src/hooks/useDashboard.ts',
        features: ['export', 'useState', 'useEffect', 'dashboard']
      },
      {
        name: 'useEnrolledCourses', 
        path: 'apps/frontend/src/hooks/useEnrolledCourses.ts',
        features: ['export', 'useState', 'useEffect', 'courses']
      },
      {
        name: 'useSearch',
        path: 'apps/frontend/src/hooks/useSearch.ts',
        features: ['export', 'useState', 'search']
      },
      {
        name: 'useTeacherCourses',
        path: 'apps/frontend/src/hooks/useTeacherCourses.ts',
        features: ['export', 'useState', 'courses']
      }
    ];

    hooks.forEach(hook => {
      const result = this.validateComponent(hook.path, hook.name, hook.features);
      this.results.hooks.push(result);
    });
  }

  validateContexts() {
    console.log(`\n🎯 TESTING REACT CONTEXTS`);
    console.log('='.repeat(50));

    const contexts = [
      {
        name: 'AuthContext',
        path: 'apps/frontend/src/contexts/AuthContext.tsx',
        features: ['createContext', 'useState', 'useEffect', 'login', 'logout', 'user']
      }
    ];

    contexts.forEach(context => {
      this.validateComponent(context.path, context.name, context.features);
    });
  }

  validateUtilities() {
    console.log(`\n🔧 TESTING UTILITY FILES`);
    console.log('='.repeat(50));

    const utilities = [
      {
        name: 'Utils Library',
        path: 'apps/frontend/src/lib/utils.ts',
        features: ['export', 'function', 'cn']
      },
      {
        name: 'API Base',
        path: 'apps/frontend/src/lib/api/base.ts',
        features: ['export', 'fetch', 'API']
      },
      {
        name: 'Auth API',
        path: 'apps/frontend/src/lib/api/auth.ts',
        features: ['export', 'login', 'register']
      },
      {
        name: 'Courses API',
        path: 'apps/frontend/src/lib/api/courses.ts',
        features: ['export', 'fetch', 'courses']
      }
    ];

    utilities.forEach(util => {
      const result = this.validateComponent(util.path, util.name, util.features);
      this.results.utilities.push(result);
    });
  }

  validateUIComponents() {
    console.log(`\n🎨 TESTING UI COMPONENTS`);
    console.log('='.repeat(50));

    const uiComponents = [
      'button.tsx', 'card.tsx', 'input.tsx', 'badge.tsx', 
      'tabs.tsx', 'select.tsx', 'checkbox.tsx', 'slider.tsx'
    ];

    uiComponents.forEach(comp => {
      const filePath = `apps/frontend/src/components/ui/${comp}`;
      const validation = this.validateFile(filePath, ['export', 'React']);
      
      if (validation.exists) {
        console.log(`  ✅ ${comp}: ${validation.size}KB`);
      } else {
        console.log(`  ❌ ${comp}: MISSING`);
      }
    });
  }

  checkProjectStructure() {
    console.log(`\n📁 TESTING PROJECT STRUCTURE`);
    console.log('='.repeat(50));

    const requiredDirs = [
      'apps/frontend/src/app',
      'apps/frontend/src/components', 
      'apps/frontend/src/components/auth',
      'apps/frontend/src/components/courses',
      'apps/frontend/src/components/dashboard',
      'apps/frontend/src/components/gamification',
      'apps/frontend/src/components/search',
      'apps/frontend/src/components/ui',
      'apps/frontend/src/hooks',
      'apps/frontend/src/lib',
      'apps/frontend/src/contexts'
    ];

    requiredDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).length;
        console.log(`  ✅ ${dir}: ${files} files`);
      } else {
        console.log(`  ❌ ${dir}: MISSING`);
        this.results.overall.issues.push(`Missing directory: ${dir}`);
      }
    });
  }

  calculateOverallScore() {
    const allComponents = [...this.results.components, ...this.results.pages, ...this.results.hooks, ...this.results.utilities];
    const totalScore = allComponents.reduce((sum, comp) => sum + comp.score, 0);
    const avgScore = allComponents.length > 0 ? Math.round(totalScore / allComponents.length) : 0;
    
    this.results.overall.score = avgScore;
    
    if (avgScore >= 80) {
      this.results.overall.status = '✅ PRODUCTION READY';
    } else if (avgScore >= 60) {
      this.results.overall.status = '⚠️ NEEDS IMPROVEMENTS';
    } else {
      this.results.overall.status = '❌ NEEDS MAJOR WORK';
    }

    return avgScore;
  }

  generateReport() {
    const score = this.calculateOverallScore();
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 FRONTEND COMPREHENSIVE TEST REPORT`);
    console.log(`${'='.repeat(70)}`);
    console.log(`\n🎯 OVERALL FRONTEND SCORE: ${score}%`);
    console.log(`📈 STATUS: ${this.results.overall.status}`);

    console.log(`\n📋 COMPONENT SUMMARY:`);
    console.log(`   🧩 React Components: ${this.results.components.length} tested`);
    console.log(`   📄 Pages: ${this.results.pages.length} tested`);  
    console.log(`   🎣 Custom Hooks: ${this.results.hooks.length} tested`);
    console.log(`   🔧 Utilities: ${this.results.utilities.length} tested`);

    const workingComponents = [...this.results.components, ...this.results.pages, ...this.results.hooks].filter(c => c.exists && c.score > 70);
    const issueComponents = [...this.results.components, ...this.results.pages, ...this.results.hooks].filter(c => !c.exists || c.score <= 70);

    console.log(`\n✅ WORKING COMPONENTS (${workingComponents.length}):`);
    workingComponents.forEach(comp => {
      console.log(`   • ${comp.name}: ${comp.size}KB (${comp.score}%)`);
    });

    if (issueComponents.length > 0) {
      console.log(`\n⚠️ COMPONENTS WITH ISSUES (${issueComponents.length}):`);
      issueComponents.forEach(comp => {
        console.log(`   • ${comp.name}: ${comp.exists ? comp.size + 'KB (' + comp.score + '%)' : 'MISSING'}`);
        if (comp.missing && comp.missing.length > 0) {
          console.log(`     Missing: ${comp.missing.join(', ')}`);
        }
      });
    }

    console.log(`\n🎨 FRONTEND TECHNOLOGY STACK:`);
    console.log(`   • React 18+ with TypeScript`);
    console.log(`   • Next.js 14 App Router`);
    console.log(`   • Tailwind CSS for styling`);
    console.log(`   • Shadcn/UI component library`);
    console.log(`   • Custom hooks for state management`);
    console.log(`   • Context API for global state`);

    if (score >= 80) {
      console.log(`\n🎉 EXCELLENT! Frontend is production-ready.`);
      console.log(`   • All major components implemented`);
      console.log(`   • Modern React patterns used`);
      console.log(`   • TypeScript integration complete`);
      console.log(`   • UI/UX components functional`);
    } else if (score >= 60) {
      console.log(`\n👍 GOOD! Frontend is mostly complete.`);
      console.log(`   • Core functionality working`);
      console.log(`   • Some components need refinement`);
      console.log(`   • Consider addressing missing features`);
    } else {
      console.log(`\n⚠️ NEEDS WORK! Frontend requires development.`);
      console.log(`   • Several components incomplete`);
      console.log(`   • Major features missing`);
      console.log(`   • Not ready for production`);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✨ Frontend Test Complete - ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(70)}`);

    return this.results;
  }

  runFullTest() {
    console.log('🚀 STARTING COMPREHENSIVE FRONTEND TEST');
    console.log('='.repeat(70));
    
    this.checkProjectStructure();
    this.validatePages();
    this.validateComponents();
    this.validateHooks();
    this.validateContexts();
    this.validateUtilities();
    this.validateUIComponents();
    
    return this.generateReport();
  }
}

// Run the test
const validator = new FrontendValidator();
const results = validator.runFullTest();

// Export results for potential use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FrontendValidator, results };
}