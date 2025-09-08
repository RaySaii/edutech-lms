import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Course, User, Enrollment, CourseReview } from '@edutech-lms/database';
import { 
  CourseStatus, 
  UserRole, 
  EnrollmentStatus,
  ResponseUtil,
  ErrorUtil,
  LoggerUtil,
  ValidationUtil,
  DatabaseUtil
} from '@edutech-lms/common';

@Injectable()
export class CourseService {
  private readonly logger = LoggerUtil.createLogger(CourseService.name);

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(CourseReview)
    private reviewRepository: Repository<CourseReview>,
  ) {}

  async getCourses(filters: any) {
    const {
      page = 1,
      limit = 12,
      search,
      level,
      tags,
      organizationId,
      status = CourseStatus.PUBLISHED
    } = filters;

    const { page: validPage, limit: validLimit } = ValidationUtil.validatePagination(page, limit);

    let queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.organization', 'organization')
      .where('course.status = :status', { status });

    if (organizationId) {
      queryBuilder.andWhere('course.organizationId = :organizationId', { organizationId });
    }

    if (search) {
      queryBuilder = DatabaseUtil.applySearch(queryBuilder, search, ['title', 'description']);
    }

    if (level) {
      queryBuilder = DatabaseUtil.applyStatusFilter(queryBuilder, 'level', level);
    }

    if (tags) {
      const tagArray = tags.split(',');
      queryBuilder.andWhere('course.tags @> :tags', { tags: tagArray });
    }

    queryBuilder.orderBy('course.createdAt', 'DESC');

    const { data: courses, total, totalPages } = await DatabaseUtil.getPaginatedResults(
      queryBuilder,
      validPage,
      validLimit
    );

    const transformedCourses = courses.map(course => ({
      ...course,
      instructor: {
        id: course.instructor.id,
        firstName: course.instructor.firstName,
        lastName: course.instructor.lastName,
      },
    }));

    return ResponseUtil.paginated(
      transformedCourses,
      validPage,
      validLimit,
      total,
      'Courses retrieved successfully'
    );
  }

  async getCourseById(id: string, userId?: string) {
    ValidationUtil.validateUUID(id, 'Course ID');

    const course = await DatabaseUtil.findWithRelations(
      this.courseRepository,
      id,
      ['instructor', 'organization']
    );

    ErrorUtil.checkExists(course, 'Course', id);

    let enrollment = null;
    if (userId) {
      ValidationUtil.validateUUID(userId, 'User ID');
      enrollment = await this.enrollmentRepository.findOne({
        where: { courseId: id, userId },
      });
    }

    const result = {
      ...course,
      instructor: {
        id: course.instructor.id,
        firstName: course.instructor.firstName,
        lastName: course.instructor.lastName,
      },
      enrollment,
    };

    return ResponseUtil.success(result, 'Course retrieved successfully');
  }

  async createCourse(courseData: any) {
    const { instructorId, organizationId, ...data } = courseData;

    ValidationUtil.validateRequired(courseData, ['title', 'instructorId']);
    ValidationUtil.validateUUID(instructorId, 'Instructor ID');
    ValidationUtil.validateStringLength(data.title, 'Course title', 3, 200);

    if (organizationId) {
      ValidationUtil.validateUUID(organizationId, 'Organization ID');
    }

    // Verify instructor exists
    const instructor = await this.userRepository.findOne({ where: { id: instructorId } });
    ErrorUtil.checkExists(instructor, 'Instructor', instructorId);

    // Generate slug from title
    const slug = ValidationUtil.sanitizeString(data.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    try {
      const course = this.courseRepository.create({
        ...data,
        slug,
        instructorId,
        organizationId,
        status: CourseStatus.DRAFT,
      });

      const savedCourse = await this.courseRepository.save(course);
      LoggerUtil.logWithData(this.logger, 'log', 'Course created', { courseId: savedCourse.id, instructorId });
      
      return ResponseUtil.success(savedCourse, 'Course created successfully');
    } catch (error) {
      ErrorUtil.handleRepositoryError(error, 'Course', this.logger);
    }
  }

  async updateCourse(id: string, updateData: any, userId: string) {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check permission
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (course.instructorId !== userId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this course');
    }

    // Update slug if title changes
    if (updateData.title && updateData.title !== course.title) {
      updateData.slug = updateData.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    await this.courseRepository.update(id, updateData);
    const updatedCourse = await this.getCourseById(id);

    return {
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse.data,
    };
  }

  async deleteCourse(id: string, userId: string) {
    ValidationUtil.validateUUID(id, 'Course ID');
    ValidationUtil.validateUUID(userId, 'User ID');

    const course = await this.courseRepository.findOne({ where: { id } });
    ErrorUtil.checkExists(course, 'Course', id);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    ErrorUtil.checkExists(user, 'User', userId);

    // Check permission
    const hasPermission = course.instructorId === userId || user.role === UserRole.ADMIN;
    ErrorUtil.checkPermission(hasPermission, 'delete', 'this course');

    // Check if course has enrollments
    const enrollmentCount = await DatabaseUtil.countWithFilters(
      this.enrollmentRepository,
      { courseId: id }
    );

    if (enrollmentCount > 0) {
      // Archive instead of delete if there are enrollments
      await this.courseRepository.update(id, { status: CourseStatus.ARCHIVED });
      LoggerUtil.logWithData(this.logger, 'log', 'Course archived', { courseId: id, userId, enrollmentCount });
      return ResponseUtil.success(null, 'Course archived due to existing enrollments');
    }

    await this.courseRepository.delete(id);
    LoggerUtil.logWithData(this.logger, 'log', 'Course deleted', { courseId: id, userId });
    return ResponseUtil.success(null, 'Course deleted successfully');
  }

  async getInstructorCourses(instructorId: string) {
    const courses = await this.courseRepository.find({
      where: { instructorId },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: courses,
    };
  }

  async publishCourse(courseId: string, instructorId: string) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not have permission to publish this course');
    }

    // Basic validation for publishing
    if (!course.title || !course.description || !course.curriculum) {
      throw new ForbiddenException('Course must have title, description, and curriculum to be published');
    }

    await this.courseRepository.update(courseId, {
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
    });

    return {
      success: true,
      message: 'Course published successfully',
    };
  }

  // Module and Lesson Management
  async addModule(courseId: string, instructorId: string, moduleData: any) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not have permission to modify this course');
    }

    const newModule = {
      id: `module_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: moduleData.title,
      lessons: [],
    };

    const curriculum = course.curriculum || { modules: [] };
    curriculum.modules.push(newModule);

    await this.courseRepository.update(courseId, { curriculum });

    return {
      success: true,
      message: 'Module added successfully',
      data: newModule,
    };
  }

  async updateModule(courseId: string, moduleId: string, instructorId: string, updateData: any) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course || !course.curriculum) {
      throw new NotFoundException('Course or curriculum not found');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not have permission to modify this course');
    }

    const moduleIndex = course.curriculum.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) {
      throw new NotFoundException('Module not found');
    }

    course.curriculum.modules[moduleIndex] = {
      ...course.curriculum.modules[moduleIndex],
      ...updateData,
    };

    await this.courseRepository.update(courseId, { curriculum: course.curriculum });

    return {
      success: true,
      message: 'Module updated successfully',
      data: course.curriculum.modules[moduleIndex],
    };
  }

  async deleteModule(courseId: string, moduleId: string, instructorId: string) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course || !course.curriculum) {
      throw new NotFoundException('Course or curriculum not found');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not have permission to modify this course');
    }

    course.curriculum.modules = course.curriculum.modules.filter(m => m.id !== moduleId);
    await this.courseRepository.update(courseId, { curriculum: course.curriculum });

    return {
      success: true,
      message: 'Module deleted successfully',
    };
  }

  async addLesson(courseId: string, moduleId: string, instructorId: string, lessonData: any) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course || !course.curriculum) {
      throw new NotFoundException('Course or curriculum not found');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not have permission to modify this course');
    }

    const moduleIndex = course.curriculum.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) {
      throw new NotFoundException('Module not found');
    }

    const newLesson = {
      id: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: lessonData.title,
      type: lessonData.type,
      content: lessonData.content,
      duration: lessonData.duration || 0,
    };

    course.curriculum.modules[moduleIndex].lessons.push(newLesson);
    await this.courseRepository.update(courseId, { curriculum: course.curriculum });

    return {
      success: true,
      message: 'Lesson added successfully',
      data: newLesson,
    };
  }

  async updateLesson(courseId: string, moduleId: string, lessonId: string, instructorId: string, updateData: any) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course || !course.curriculum) {
      throw new NotFoundException('Course or curriculum not found');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not have permission to modify this course');
    }

    const moduleIndex = course.curriculum.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) {
      throw new NotFoundException('Module not found');
    }

    const lessonIndex = course.curriculum.modules[moduleIndex].lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex === -1) {
      throw new NotFoundException('Lesson not found');
    }

    course.curriculum.modules[moduleIndex].lessons[lessonIndex] = {
      ...course.curriculum.modules[moduleIndex].lessons[lessonIndex],
      ...updateData,
    };

    await this.courseRepository.update(courseId, { curriculum: course.curriculum });

    return {
      success: true,
      message: 'Lesson updated successfully',
      data: course.curriculum.modules[moduleIndex].lessons[lessonIndex],
    };
  }

  async deleteLesson(courseId: string, moduleId: string, lessonId: string, instructorId: string) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course || !course.curriculum) {
      throw new NotFoundException('Course or curriculum not found');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not have permission to modify this course');
    }

    const moduleIndex = course.curriculum.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) {
      throw new NotFoundException('Module not found');
    }

    course.curriculum.modules[moduleIndex].lessons = course.curriculum.modules[moduleIndex].lessons.filter(l => l.id !== lessonId);
    await this.courseRepository.update(courseId, { curriculum: course.curriculum });

    return {
      success: true,
      message: 'Lesson deleted successfully',
    };
  }


  // Bulk Operations
  async bulkUpdateCourseStatus(courseIds: string[], status: CourseStatus, instructorId: string) {
    const courses = await this.courseRepository.find({
      where: { id: courseIds as any, instructorId },
    });

    if (courses.length !== courseIds.length) {
      throw new ForbiddenException('You do not have permission to update some of these courses');
    }

    await this.courseRepository.update(
      { id: courseIds as any, instructorId },
      { status }
    );

    return {
      success: true,
      message: `${courses.length} courses updated successfully`,
      data: { updated: courses.length },
    };
  }

  async duplicateCourse(courseId: string, instructorId: string, newTitle?: string) {
    const originalCourse = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!originalCourse) {
      throw new NotFoundException('Course not found');
    }

    if (originalCourse.instructorId !== instructorId) {
      throw new ForbiddenException('You do not have permission to duplicate this course');
    }

    const duplicatedCourse = this.courseRepository.create({
      ...originalCourse,
      id: undefined,
      title: newTitle || `${originalCourse.title} (Copy)`,
      slug: `${originalCourse.slug}-copy-${Date.now()}`,
      status: CourseStatus.DRAFT,
      enrollmentCount: 0,
      rating: 0,
      reviewCount: 0,
      publishedAt: null,
      createdAt: undefined,
      updatedAt: undefined,
    });

    const savedCourse = await this.courseRepository.save(duplicatedCourse);

    return {
      success: true,
      message: 'Course duplicated successfully',
      data: savedCourse,
    };
  }

  // Review and Rating Management
  async addReview(courseId: string, userId: string, reviewData: any) {
    const { rating, comment } = reviewData;

    // Check if course exists
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user is enrolled
    const enrollment = await this.enrollmentRepository.findOne({
      where: { courseId, userId },
    });

    if (!enrollment) {
      throw new ForbiddenException('You must be enrolled in the course to leave a review');
    }

    // Check if user already reviewed this course
    const existingReview = await this.reviewRepository.findOne({
      where: { courseId, userId },
    });

    if (existingReview) {
      throw new ForbiddenException('You have already reviewed this course');
    }

    const review = this.reviewRepository.create({
      courseId,
      userId,
      rating,
      comment,
      isVerifiedPurchase: enrollment.paidAmount > 0,
      helpfulVotes: { helpful: 0, notHelpful: 0, votedBy: [] },
    });

    const savedReview = await this.reviewRepository.save(review);

    // Update course rating and review count
    await this.updateCourseRating(courseId);

    return {
      success: true,
      message: 'Review added successfully',
      data: savedReview,
    };
  }

  async updateReview(reviewId: string, userId: string, updateData: any) {
    const review = await this.reviewRepository.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    await this.reviewRepository.update(reviewId, updateData);
    const updatedReview = await this.reviewRepository.findOne({ where: { id: reviewId } });

    // Update course rating
    await this.updateCourseRating(review.courseId);

    return {
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    };
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await this.reviewRepository.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const courseId = review.courseId;
    await this.reviewRepository.delete(reviewId);

    // Update course rating
    await this.updateCourseRating(courseId);

    return {
      success: true,
      message: 'Review deleted successfully',
    };
  }

  async getCourseReviews(courseId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { courseId },
      relations: ['user'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const reviewsWithUserInfo = reviews.map(review => ({
      ...review,
      user: {
        id: review.user.id,
        firstName: review.user.firstName,
        lastName: review.user.lastName,
      },
    }));

    return {
      success: true,
      data: {
        reviews: reviewsWithUserInfo,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    };
  }

  async voteOnReview(reviewId: string, userId: string, voteType: 'helpful' | 'notHelpful') {
    const review = await this.reviewRepository.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const helpfulVotes = review.helpfulVotes || { helpful: 0, notHelpful: 0, votedBy: [] };

    // Check if user already voted
    if (helpfulVotes.votedBy.includes(userId)) {
      throw new ForbiddenException('You have already voted on this review');
    }

    // Add vote
    if (voteType === 'helpful') {
      helpfulVotes.helpful += 1;
    } else {
      helpfulVotes.notHelpful += 1;
    }
    helpfulVotes.votedBy.push(userId);

    await this.reviewRepository.update(reviewId, { helpfulVotes });

    return {
      success: true,
      message: 'Vote recorded successfully',
    };
  }

  private async updateCourseRating(courseId: string) {
    const reviews = await this.reviewRepository.find({ where: { courseId } });
    
    if (reviews.length === 0) {
      await this.courseRepository.update(courseId, { rating: 0, reviewCount: 0 });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await this.courseRepository.update(courseId, {
      rating: Math.round(averageRating * 100) / 100,
      reviewCount: reviews.length,
    });
  }
}