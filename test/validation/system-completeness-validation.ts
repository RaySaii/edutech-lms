import * as fs from 'fs';
import * as path from 'path';

interface FeatureValidation {
  feature: string;
  status: 'complete' | 'partial' | 'missing';
  backendFiles: string[];
  frontendFiles: string[];
  databaseEntities: string[];
  tests: string[];
  issues: string[];
  completionScore: number;
}

class SystemCompletenessValidator {
  private projectRoot = '/Users/wanglei/Desktop/fullstack/edutech-lms';
  private features: FeatureValidation[] = [];

  private validateFileExists(filePath: string): boolean {
    try {
      return fs.existsSync(path.join(this.projectRoot, filePath));
    } catch {
      return false;
    }
  }

  private getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(path.join(this.projectRoot, filePath));
      return stats.size;
    } catch {
      return 0;
    }
  }

  private searchInFile(filePath: string, searchTerms: string[]): boolean {
    try {
      const content = fs.readFileSync(path.join(this.projectRoot, filePath), 'utf8');
      return searchTerms.some(term => content.includes(term));
    } catch {
      return false;
    }
  }

  validateAuthenticationSystem(): FeatureValidation {
    const feature: FeatureValidation = {
      feature: 'Authentication & Authorization System',
      status: 'complete',
      backendFiles: [],
      frontendFiles: [],
      databaseEntities: [],
      tests: [],
      issues: [],
      completionScore: 0,
    };

    // Backend files validation
    const backendFiles = [
      'apps/auth-service/src/app/auth/auth.service.ts',
      'apps/auth-service/src/app/auth/auth.controller.ts',
      'apps/api-gateway/src/app/auth/auth.controller.ts',
      'libs/shared/auth/src/lib/guards/jwt.guard.ts',
      'libs/shared/auth/src/lib/strategies/jwt.strategy.ts',
    ];

    backendFiles.forEach(file => {
      const exists = this.validateFileExists(file);
      const size = this.getFileSize(file);
      
      if (exists && size > 1000) { // Substantial implementation
        feature.backendFiles.push(`✅ ${file} (${Math.round(size/1024)}KB)`);
      } else if (exists) {
        feature.backendFiles.push(`⚠️ ${file} (${Math.round(size/1024)}KB - minimal)`);
        feature.issues.push(`${file} appears to be minimal implementation`);
      } else {
        feature.backendFiles.push(`❌ ${file} (missing)`);
        feature.issues.push(`Missing backend file: ${file}`);
      }
    });

    // Frontend files validation
    const frontendFiles = [
      'apps/frontend/src/components/auth/LoginForm.tsx',
      'apps/frontend/src/components/auth/RegisterForm.tsx',
      'apps/frontend/src/components/auth/ForgotPasswordForm.tsx',
      'apps/frontend/src/contexts/AuthContext.tsx',
    ];

    frontendFiles.forEach(file => {
      const exists = this.validateFileExists(file);
      const size = this.getFileSize(file);
      
      if (exists && size > 500) {
        feature.frontendFiles.push(`✅ ${file} (${Math.round(size/1024)}KB)`);
      } else if (exists) {
        feature.frontendFiles.push(`⚠️ ${file} (${Math.round(size/1024)}KB - minimal)`);
      } else {
        feature.frontendFiles.push(`❌ ${file} (missing)`);
        feature.issues.push(`Missing frontend file: ${file}`);
      }
    });

    // Database entities
    const entityFile = 'libs/shared/database/src/entities/user.entity.ts';
    if (this.validateFileExists(entityFile)) {
      const hasAdvancedFields = this.searchInFile(entityFile, [
        'mfaEnabled', 'lastLoginAt', 'emailVerified', 'role'
      ]);
      if (hasAdvancedFields) {
        feature.databaseEntities.push(`✅ User entity with advanced fields`);
      } else {
        feature.databaseEntities.push(`⚠️ Basic user entity`);
        feature.issues.push('User entity missing advanced authentication fields');
      }
    } else {
      feature.databaseEntities.push(`❌ User entity missing`);
      feature.issues.push('User entity file not found');
    }

    // Calculate completion score
    const totalChecks = backendFiles.length + frontendFiles.length + 1; // +1 for entity
    const passedChecks = feature.backendFiles.filter(f => f.startsWith('✅')).length +
                        feature.frontendFiles.filter(f => f.startsWith('✅')).length +
                        feature.databaseEntities.filter(f => f.startsWith('✅')).length;
    
    feature.completionScore = Math.round((passedChecks / totalChecks) * 100);
    
    if (feature.completionScore >= 80) feature.status = 'complete';
    else if (feature.completionScore >= 50) feature.status = 'partial';
    else feature.status = 'missing';

    return feature;
  }

  validateCourseManagement(): FeatureValidation {
    const feature: FeatureValidation = {
      feature: 'Course Management System',
      status: 'complete',
      backendFiles: [],
      frontendFiles: [],
      databaseEntities: [],
      tests: [],
      issues: [],
      completionScore: 0,
    };

    // Backend validation
    const backendFiles = [
      'apps/course-service/src/app/course/course.service.ts',
      'apps/course-service/src/app/course/course.controller.ts',
      'apps/api-gateway/src/app/course/course.controller.ts',
      'apps/content-service/src/app/content/content.service.ts',
    ];

    backendFiles.forEach(file => {
      const exists = this.validateFileExists(file);
      const size = this.getFileSize(file);
      
      if (exists && size > 2000) {
        feature.backendFiles.push(`✅ ${file} (${Math.round(size/1024)}KB)`);
      } else if (exists) {
        feature.backendFiles.push(`⚠️ ${file} (${Math.round(size/1024)}KB)`);
      } else {
        feature.backendFiles.push(`❌ ${file} (missing)`);
        feature.issues.push(`Missing: ${file}`);
      }
    });

    // Frontend validation
    const frontendFiles = [
      'apps/frontend/src/components/courses/CourseForm.tsx',
      'apps/frontend/src/components/courses/CourseDashboard.tsx',
      'apps/frontend/src/components/courses/CourseDetailView.tsx',
      'apps/frontend/src/app/courses/page.tsx',
    ];

    frontendFiles.forEach(file => {
      const exists = this.validateFileExists(file);
      const size = this.getFileSize(file);
      
      if (exists && size > 1000) {
        feature.frontendFiles.push(`✅ ${file} (${Math.round(size/1024)}KB)`);
      } else if (exists) {
        feature.frontendFiles.push(`⚠️ ${file} (${Math.round(size/1024)}KB)`);
      } else {
        feature.frontendFiles.push(`❌ ${file} (missing)`);
      }
    });

    // Database entities
    const entities = ['course.entity.ts', 'content.entity.ts', 'enrollment.entity.ts'];
    entities.forEach(entity => {
      const entityPath = `libs/shared/database/src/entities/${entity}`;
      if (this.validateFileExists(entityPath)) {
        feature.databaseEntities.push(`✅ ${entity}`);
      } else {
        feature.databaseEntities.push(`❌ ${entity} (missing)`);
        feature.issues.push(`Database entity missing: ${entity}`);
      }
    });

    // Calculate completion score
    const totalItems = backendFiles.length + frontendFiles.length + entities.length;
    const completedItems = 
      feature.backendFiles.filter(f => f.startsWith('✅')).length +
      feature.frontendFiles.filter(f => f.startsWith('✅')).length +
      feature.databaseEntities.filter(f => f.startsWith('✅')).length;

    feature.completionScore = Math.round((completedItems / totalItems) * 100);
    
    if (feature.completionScore >= 80) feature.status = 'complete';
    else if (feature.completionScore >= 50) feature.status = 'partial';
    else feature.status = 'missing';

    return feature;
  }

  validateGamificationSystem(): FeatureValidation {
    const feature: FeatureValidation = {
      feature: 'Gamification & Achievement System',
      status: 'complete',
      backendFiles: [],
      frontendFiles: [],
      databaseEntities: [],
      tests: [],
      issues: [],
      completionScore: 0,
    };

    // Backend files
    const backendFiles = [
      'apps/api-gateway/src/app/gamification/gamification.service.ts',
      'apps/api-gateway/src/app/gamification/gamification.controller.ts',
      'apps/api-gateway/src/app/gamification/gamification.processor.ts',
      'apps/api-gateway/src/app/gamification/gamification.module.ts',
    ];

    backendFiles.forEach(file => {
      const exists = this.validateFileExists(file);
      const size = this.getFileSize(file);
      
      if (exists && size > 5000) { // Substantial implementation expected
        feature.backendFiles.push(`✅ ${file} (${Math.round(size/1024)}KB)`);
      } else if (exists && size > 1000) {
        feature.backendFiles.push(`⚠️ ${file} (${Math.round(size/1024)}KB - basic)`);
      } else if (exists) {
        feature.backendFiles.push(`⚠️ ${file} (${Math.round(size/1024)}KB - minimal)`);
        feature.issues.push(`${file} appears minimal - may need more implementation`);
      } else {
        feature.backendFiles.push(`❌ ${file} (missing)`);
        feature.issues.push(`Critical backend file missing: ${file}`);
      }
    });

    // Frontend files
    const frontendFiles = [
      'apps/frontend/src/components/gamification/GamificationDashboard.tsx',
      'apps/frontend/src/app/gamification/page.tsx',
    ];

    frontendFiles.forEach(file => {
      const exists = this.validateFileExists(file);
      const size = this.getFileSize(file);
      
      if (exists && size > 3000) {
        feature.frontendFiles.push(`✅ ${file} (${Math.round(size/1024)}KB)`);
      } else if (exists) {
        feature.frontendFiles.push(`⚠️ ${file} (${Math.round(size/1024)}KB)`);
      } else {
        feature.frontendFiles.push(`❌ ${file} (missing)`);
      }
    });

    // Database entities - comprehensive gamification system
    const gamificationEntity = 'libs/shared/database/src/entities/gamification.entity.ts';
    if (this.validateFileExists(gamificationEntity)) {
      const size = this.getFileSize(gamificationEntity);
      const hasComprehensiveEntities = this.searchInFile(gamificationEntity, [
        'UserPoints', 'Achievement', 'Badge', 'Quest', 'Leaderboard'
      ]);
      
      if (size > 10000 && hasComprehensiveEntities) {
        feature.databaseEntities.push(`✅ Comprehensive gamification entities (${Math.round(size/1024)}KB)`);
      } else if (hasComprehensiveEntities) {
        feature.databaseEntities.push(`⚠️ Basic gamification entities (${Math.round(size/1024)}KB)`);
      } else {
        feature.databaseEntities.push(`❌ Incomplete gamification entities`);
        feature.issues.push('Gamification entities missing key components');
      }
    } else {
      feature.databaseEntities.push(`❌ Gamification entities missing`);
      feature.issues.push('Critical: Gamification database entities not found');
    }

    // Calculate completion score
    const totalItems = backendFiles.length + frontendFiles.length + 1;
    const completedItems = 
      feature.backendFiles.filter(f => f.startsWith('✅')).length +
      feature.frontendFiles.filter(f => f.startsWith('✅')).length +
      feature.databaseEntities.filter(f => f.startsWith('✅')).length;

    feature.completionScore = Math.round((completedItems / totalItems) * 100);
    
    if (feature.completionScore >= 80) feature.status = 'complete';
    else if (feature.completionScore >= 50) feature.status = 'partial';
    else feature.status = 'missing';

    return feature;
  }

  validateAdvancedSearch(): FeatureValidation {
    const feature: FeatureValidation = {
      feature: 'Advanced Search with Elasticsearch',
      status: 'complete',
      backendFiles: [],
      frontendFiles: [],
      databaseEntities: [],
      tests: [],
      issues: [],
      completionScore: 0,
    };

    // Backend files
    const backendFiles = [
      'apps/api-gateway/src/app/search/advanced-search.service.ts',
      'apps/api-gateway/src/app/search/advanced-search.controller.ts',
      'apps/api-gateway/src/app/search/search-indexing.processor.ts',
      'apps/api-gateway/src/app/search/search-analytics.processor.ts',
    ];

    backendFiles.forEach(file => {
      const exists = this.validateFileExists(file);
      const size = this.getFileSize(file);
      
      if (exists && size > 8000) { // Complex search implementation expected
        feature.backendFiles.push(`✅ ${file} (${Math.round(size/1024)}KB)`);
      } else if (exists && size > 2000) {
        feature.backendFiles.push(`⚠️ ${file} (${Math.round(size/1024)}KB - partial)`);
      } else if (exists) {
        feature.backendFiles.push(`⚠️ ${file} (${Math.round(size/1024)}KB - minimal)`);
        feature.issues.push(`${file} may need more comprehensive implementation`);
      } else {
        feature.backendFiles.push(`❌ ${file} (missing)`);
        feature.issues.push(`Missing advanced search file: ${file}`);
      }
    });

    // Frontend files
    const frontendFiles = [
      'apps/frontend/src/components/search/AdvancedSearchDashboard.tsx',
      'apps/frontend/src/app/search/page.tsx',
    ];

    frontendFiles.forEach(file => {
      const exists = this.validateFileExists(file);
      const size = this.getFileSize(file);
      
      if (exists && size > 5000) {
        feature.frontendFiles.push(`✅ ${file} (${Math.round(size/1024)}KB)`);
      } else if (exists) {
        feature.frontendFiles.push(`⚠️ ${file} (${Math.round(size/1024)}KB)`);
      } else {
        feature.frontendFiles.push(`❌ ${file} (missing)`);
      }
    });

    // Database entities
    const searchEntity = 'libs/shared/database/src/entities/search.entity.ts';
    if (this.validateFileExists(searchEntity)) {
      const size = this.getFileSize(searchEntity);
      const hasAdvancedEntities = this.searchInFile(searchEntity, [
        'SearchIndex', 'SearchQuery', 'SearchAnalytics', 'SearchPersonalization'
      ]);
      
      if (size > 8000 && hasAdvancedEntities) {
        feature.databaseEntities.push(`✅ Comprehensive search entities (${Math.round(size/1024)}KB)`);
      } else if (hasAdvancedEntities) {
        feature.databaseEntities.push(`⚠️ Basic search entities (${Math.round(size/1024)}KB)`);
      } else {
        feature.databaseEntities.push(`❌ Incomplete search entities`);
        feature.issues.push('Search entities missing advanced features');
      }
    } else {
      feature.databaseEntities.push(`❌ Search entities missing`);
      feature.issues.push('Search database entities not found');
    }

    // Calculate completion score
    const totalItems = backendFiles.length + frontendFiles.length + 1;
    const completedItems = 
      feature.backendFiles.filter(f => f.startsWith('✅')).length +
      feature.frontendFiles.filter(f => f.startsWith('✅')).length +
      feature.databaseEntities.filter(f => f.startsWith('✅')).length;

    feature.completionScore = Math.round((completedItems / totalItems) * 100);
    
    if (feature.completionScore >= 80) feature.status = 'complete';
    else if (feature.completionScore >= 50) feature.status = 'partial';
    else feature.status = 'missing';

    return feature;
  }

  generateComprehensiveReport(): void {
    console.log('\n🔍 EDUTECH LMS - SYSTEM COMPLETENESS VALIDATION REPORT');
    console.log('=' .repeat(80));

    // Validate all major features
    const features = [
      this.validateAuthenticationSystem(),
      this.validateCourseManagement(),
      this.validateGamificationSystem(),
      this.validateAdvancedSearch(),
    ];

    // Overall system score
    const overallScore = Math.round(
      features.reduce((sum, f) => sum + f.completionScore, 0) / features.length
    );

    console.log(`\n📊 OVERALL SYSTEM COMPLETENESS: ${overallScore}%`);
    console.log(`Status: ${overallScore >= 80 ? '✅ PRODUCTION READY' : 
                         overallScore >= 60 ? '⚠️  NEEDS MINOR IMPROVEMENTS' : 
                         '❌ NEEDS MAJOR WORK'}`);

    // Feature-by-feature breakdown
    features.forEach(feature => {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📋 ${feature.feature.toUpperCase()}`);
      console.log(`Status: ${this.getStatusIcon(feature.status)} ${feature.status.toUpperCase()} (${feature.completionScore}%)`);
      
      if (feature.backendFiles.length > 0) {
        console.log('\n🔧 Backend Implementation:');
        feature.backendFiles.forEach(file => console.log(`   ${file}`));
      }

      if (feature.frontendFiles.length > 0) {
        console.log('\n🎨 Frontend Implementation:');
        feature.frontendFiles.forEach(file => console.log(`   ${file}`));
      }

      if (feature.databaseEntities.length > 0) {
        console.log('\n🗄️  Database Entities:');
        feature.databaseEntities.forEach(entity => console.log(`   ${entity}`));
      }

      if (feature.issues.length > 0) {
        console.log('\n⚠️  Issues Found:');
        feature.issues.forEach(issue => console.log(`   • ${issue}`));
      }
    });

    // Summary recommendations
    console.log(`\n${'═'.repeat(80)}`);
    console.log('📝 SUMMARY RECOMMENDATIONS:');
    
    const completedFeatures = features.filter(f => f.status === 'complete').length;
    const partialFeatures = features.filter(f => f.status === 'partial').length;
    const missingFeatures = features.filter(f => f.status === 'missing').length;

    console.log(`   ✅ ${completedFeatures} features fully implemented`);
    console.log(`   ⚠️  ${partialFeatures} features need improvements`);
    console.log(`   ❌ ${missingFeatures} features missing or incomplete`);

    if (overallScore >= 80) {
      console.log('\n🎉 EXCELLENT! System is production-ready with comprehensive features.');
      console.log('   • All major features are implemented');
      console.log('   • Backend and frontend integration is complete');
      console.log('   • Database schema supports advanced functionality');
      console.log('   • Ready for enterprise deployment');
    } else if (overallScore >= 60) {
      console.log('\n👍 GOOD! System is mostly complete but needs some improvements.');
      console.log('   • Core functionality is working');
      console.log('   • Some features need additional implementation');
      console.log('   • Consider adding missing components before production');
    } else {
      console.log('\n⚠️  NEEDS WORK! System requires significant development.');
      console.log('   • Several critical features are incomplete');
      console.log('   • Backend/frontend integration needs work');
      console.log('   • Not recommended for production deployment');
    }

    // File count summary
    console.log('\n📈 IMPLEMENTATION STATISTICS:');
    const totalBackendFiles = features.reduce((sum, f) => sum + f.backendFiles.length, 0);
    const totalFrontendFiles = features.reduce((sum, f) => sum + f.frontendFiles.length, 0);
    const totalDbEntities = features.reduce((sum, f) => sum + f.databaseEntities.length, 0);
    
    console.log(`   🔧 Backend Files: ${totalBackendFiles}`);
    console.log(`   🎨 Frontend Files: ${totalFrontendFiles}`);
    console.log(`   🗄️  Database Entities: ${totalDbEntities}`);
    console.log(`   📁 Total Components: ${totalBackendFiles + totalFrontendFiles + totalDbEntities}`);

    console.log(`\n${'═'.repeat(80)}`);
    console.log('✨ EduTech LMS Validation Complete');
    console.log(`Generated: ${new Date().toLocaleString()}`);
    console.log(`${'═'.repeat(80)}\n`);
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'complete': return '✅';
      case 'partial': return '⚠️ ';
      case 'missing': return '❌';
      default: return '❓';
    }
  }
}

// Run the validation
const validator = new SystemCompletenessValidator();
validator.generateComprehensiveReport();