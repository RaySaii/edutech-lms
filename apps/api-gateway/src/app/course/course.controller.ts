import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '@edutech-lms/auth';
import { Permission, UserRole, ApiRateLimit, SearchRateLimit, CourseEnrollmentRateLimit } from '@edutech-lms/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateCourseDto, UpdateCourseDto, CourseQueryDto } from './dto';
import { CourseResponse, CoursesResponse } from './interfaces';

@ApiTags('courses')
@Controller('courses')
export class CourseController {
  constructor(
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all courses with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async getCourses(@Query() query: CourseQueryDto): Promise<CoursesResponse> {
    return this.courseClient.send({ cmd: 'get_courses' }, query).toPromise();
  }

  @Get('search')
  @SearchRateLimit()
  @ApiOperation({ summary: 'Search courses by title, description, or tags' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchCourses(
    @Query('q') searchQuery: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<CoursesResponse> {
    return this.courseClient.send(
      { cmd: 'get_courses' },
      { search: searchQuery, page, limit }
    ).toPromise();
  }

  @Get('instructor/:instructorId')
  @ApiOperation({ summary: 'Get courses by instructor' })
  @ApiResponse({ status: 200, description: 'Instructor courses retrieved successfully' })
  async getInstructorCourses(
    @Param('instructorId', ParseUUIDPipe) instructorId: string,
  ): Promise<CoursesResponse> {
    return this.courseClient.send(
      { cmd: 'get_instructor_courses' },
      { instructorId }
    ).toPromise();
  }

  @Get('my-courses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user courses (as instructor)' })
  @ApiResponse({ status: 200, description: 'User courses retrieved successfully' })
  async getMyCourses(@Request() req): Promise<CoursesResponse> {
    return this.courseClient.send(
      { cmd: 'get_instructor_courses' },
      { instructorId: req.user.id }
    ).toPromise();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<CourseResponse> {
    const userId = req.user?.id;
    return this.courseClient.send(
      { cmd: 'get_course_by_id' },
      { id, userId }
    ).toPromise();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.COURSE_CREATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course (Teachers and Admins)' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid course data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions - teacher role or admin required' })
  async createCourse(
    @Body(ValidationPipe) createCourseDto: CreateCourseDto,
    @Request() req,
  ): Promise<CourseResponse> {
    const courseData = {
      ...createCourseDto,
      instructorId: req.user.id,
      organizationId: req.user.organizationId,
    };

    return this.courseClient.send(
      { cmd: 'create_course' },
      courseData
    ).toPromise();
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.COURSE_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course (Teachers and Admins)' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this course or insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async updateCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateCourseDto: UpdateCourseDto,
    @Request() req,
  ): Promise<CourseResponse> {
    return this.courseClient.send(
      { cmd: 'update_course' },
      { id, userId: req.user.id, ...updateCourseDto }
    ).toPromise();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this course' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async deleteCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'delete_course' },
      { id, userId: req.user.id }
    ).toPromise();
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish course' })
  @ApiResponse({ status: 200, description: 'Course published successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to publish this course' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async publishCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'publish_course' },
      { courseId: id, instructorId: req.user.id }
    ).toPromise();
  }

  @Post(':id/enroll')
  @CourseEnrollmentRateLimit()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.COURSE_ENROLL)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in course (Self-learning)' })
  @ApiResponse({ status: 200, description: 'Enrolled successfully' })
  @ApiResponse({ status: 400, description: 'Already enrolled or course not available' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to enroll' })
  async enrollInCourse(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'enroll_course' },
      { courseId, userId: req.user.id }
    ).toPromise();
  }

  @Get(':id/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course progress' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  async getCourseProgress(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'get_course_progress' },
      { courseId, userId: req.user.id }
    ).toPromise();
  }

  @Put(':id/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course progress' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  async updateCourseProgress(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() progressData: any,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'update_course_progress' },
      { courseId, userId: req.user.id, progressData }
    ).toPromise();
  }

  // Module Management Endpoints
  @Post(':id/modules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add module to course' })
  @ApiResponse({ status: 201, description: 'Module added successfully' })
  async addModule(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() moduleData: any,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'add_module' },
      { courseId, instructorId: req.user.id, moduleData }
    ).toPromise();
  }

  @Put(':id/modules/:moduleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course module' })
  @ApiResponse({ status: 200, description: 'Module updated successfully' })
  async updateModule(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() updateData: any,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'update_module' },
      { courseId, moduleId, instructorId: req.user.id, updateData }
    ).toPromise();
  }

  @Delete(':id/modules/:moduleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course module' })
  @ApiResponse({ status: 200, description: 'Module deleted successfully' })
  async deleteModule(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Param('moduleId') moduleId: string,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'delete_module' },
      { courseId, moduleId, instructorId: req.user.id }
    ).toPromise();
  }

  // Lesson Management Endpoints
  @Post(':id/modules/:moduleId/lessons')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add lesson to module' })
  @ApiResponse({ status: 201, description: 'Lesson added successfully' })
  async addLesson(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() lessonData: any,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'add_lesson' },
      { courseId, moduleId, instructorId: req.user.id, lessonData }
    ).toPromise();
  }

  @Put(':id/modules/:moduleId/lessons/:lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lesson' })
  @ApiResponse({ status: 200, description: 'Lesson updated successfully' })
  async updateLesson(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('lessonId') lessonId: string,
    @Body() updateData: any,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'update_lesson' },
      { courseId, moduleId, lessonId, instructorId: req.user.id, updateData }
    ).toPromise();
  }

  @Delete(':id/modules/:moduleId/lessons/:lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete lesson' })
  @ApiResponse({ status: 200, description: 'Lesson deleted successfully' })
  async deleteLesson(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('lessonId') lessonId: string,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'delete_lesson' },
      { courseId, moduleId, lessonId, instructorId: req.user.id }
    ).toPromise();
  }


  // Bulk Operations
  @Post('bulk/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update course status' })
  @ApiResponse({ status: 200, description: 'Courses updated successfully' })
  async bulkUpdateStatus(
    @Body() data: { courseIds: string[]; status: string },
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'bulk_update_course_status' },
      { ...data, instructorId: req.user.id }
    ).toPromise();
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate course' })
  @ApiResponse({ status: 201, description: 'Course duplicated successfully' })
  async duplicateCourse(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() data: { newTitle?: string },
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'duplicate_course' },
      { courseId, instructorId: req.user.id, newTitle: data.newTitle }
    ).toPromise();
  }

  // Enrollment Management
  @Get('enrollments/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user enrollments' })
  @ApiResponse({ status: 200, description: 'Enrollments retrieved successfully' })
  async getMyEnrollments(@Request() req) {
    return this.courseClient.send(
      { cmd: 'get_student_enrollments' },
      { userId: req.user.id }
    ).toPromise();
  }

  @Get(':id/enrollments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course enrollments (instructor only)' })
  @ApiResponse({ status: 200, description: 'Enrollments retrieved successfully' })
  async getCourseEnrollments(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'get_course_enrollments' },
      { courseId, instructorId: req.user.id }
    ).toPromise();
  }

  // Review Management Endpoints
  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add course review' })
  @ApiResponse({ status: 201, description: 'Review added successfully' })
  async addReview(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() reviewData: { rating: number; comment?: string },
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'add_course_review' },
      { courseId, userId: req.user.id, reviewData }
    ).toPromise();
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get course reviews' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getCourseReviews(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.courseClient.send(
      { cmd: 'get_course_reviews' },
      { courseId, page, limit }
    ).toPromise();
  }

  @Put('reviews/:reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course review' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  async updateReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() updateData: { rating?: number; comment?: string },
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'update_course_review' },
      { reviewId, userId: req.user.id, updateData }
    ).toPromise();
  }

  @Delete('reviews/:reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course review' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  async deleteReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'delete_course_review' },
      { reviewId, userId: req.user.id }
    ).toPromise();
  }

  @Post('reviews/:reviewId/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote on review helpfulness' })
  @ApiResponse({ status: 200, description: 'Vote recorded successfully' })
  async voteOnReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() voteData: { voteType: 'helpful' | 'notHelpful' },
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'vote_on_review' },
      { reviewId, userId: req.user.id, voteType: voteData.voteType }
    ).toPromise();
  }

  // Wishlist Management Endpoints
  @Post(':id/wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add course to wishlist' })
  @ApiResponse({ status: 200, description: 'Course added to wishlist successfully' })
  async addToWishlist(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'add_to_wishlist' },
      { courseId, userId: req.user.id }
    ).toPromise();
  }

  @Delete(':id/wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove course from wishlist' })
  @ApiResponse({ status: 200, description: 'Course removed from wishlist successfully' })
  async removeFromWishlist(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Request() req,
  ) {
    return this.courseClient.send(
      { cmd: 'remove_from_wishlist' },
      { courseId, userId: req.user.id }
    ).toPromise();
  }

  @Get('wishlist/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved successfully' })
  async getMyWishlist(@Request() req) {
    return this.courseClient.send(
      { cmd: 'get_user_wishlist' },
      { userId: req.user.id }
    ).toPromise();
  }
}