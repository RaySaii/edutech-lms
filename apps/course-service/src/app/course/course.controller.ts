import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CourseService } from './course.service';
import { EnrollmentService } from '../enrollment/enrollment.service';

@Controller()
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  @MessagePattern({ cmd: 'get_courses' })
  async getCourses(@Payload() filters: any) {
    return this.courseService.getCourses(filters);
  }

  @MessagePattern({ cmd: 'get_course_by_id' })
  async getCourseById(@Payload() data: { id: string; userId?: string }) {
    return this.courseService.getCourseById(data.id, data.userId);
  }

  @MessagePattern({ cmd: 'create_course' })
  async createCourse(@Payload() courseData: any) {
    return this.courseService.createCourse(courseData);
  }

  @MessagePattern({ cmd: 'update_course' })
  async updateCourse(@Payload() data: any) {
    const { id, userId, ...updateData } = data;
    return this.courseService.updateCourse(id, updateData, userId);
  }

  @MessagePattern({ cmd: 'delete_course' })
  async deleteCourse(@Payload() data: { id: string; userId: string }) {
    return this.courseService.deleteCourse(data.id, data.userId);
  }

  @MessagePattern({ cmd: 'enroll_course' })
  async enrollCourse(@Payload() enrollData: any) {
    return this.enrollmentService.enrollStudent(enrollData);
  }

  @MessagePattern({ cmd: 'get_course_progress' })
  async getCourseProgress(@Payload() data: { courseId: string; userId: string }) {
    return this.enrollmentService.getCourseProgress(data.courseId, data.userId);
  }

  @MessagePattern({ cmd: 'update_course_progress' })
  async updateCourseProgress(@Payload() data: { courseId: string; userId: string; progressData: any }) {
    return this.enrollmentService.updateProgress(data.courseId, data.userId, data.progressData);
  }

  @MessagePattern({ cmd: 'get_instructor_courses' })
  async getInstructorCourses(@Payload() data: { instructorId: string }) {
    return this.courseService.getInstructorCourses(data.instructorId);
  }

  @MessagePattern({ cmd: 'publish_course' })
  async publishCourse(@Payload() data: { courseId: string; instructorId: string }) {
    return this.courseService.publishCourse(data.courseId, data.instructorId);
  }

  // Module Management
  @MessagePattern({ cmd: 'add_module' })
  async addModule(@Payload() data: { courseId: string; instructorId: string; moduleData: any }) {
    return this.courseService.addModule(data.courseId, data.instructorId, data.moduleData);
  }

  @MessagePattern({ cmd: 'update_module' })
  async updateModule(@Payload() data: { courseId: string; moduleId: string; instructorId: string; updateData: any }) {
    return this.courseService.updateModule(data.courseId, data.moduleId, data.instructorId, data.updateData);
  }

  @MessagePattern({ cmd: 'delete_module' })
  async deleteModule(@Payload() data: { courseId: string; moduleId: string; instructorId: string }) {
    return this.courseService.deleteModule(data.courseId, data.moduleId, data.instructorId);
  }

  // Lesson Management
  @MessagePattern({ cmd: 'add_lesson' })
  async addLesson(@Payload() data: { courseId: string; moduleId: string; instructorId: string; lessonData: any }) {
    return this.courseService.addLesson(data.courseId, data.moduleId, data.instructorId, data.lessonData);
  }

  @MessagePattern({ cmd: 'update_lesson' })
  async updateLesson(@Payload() data: { courseId: string; moduleId: string; lessonId: string; instructorId: string; updateData: any }) {
    return this.courseService.updateLesson(data.courseId, data.moduleId, data.lessonId, data.instructorId, data.updateData);
  }

  @MessagePattern({ cmd: 'delete_lesson' })
  async deleteLesson(@Payload() data: { courseId: string; moduleId: string; lessonId: string; instructorId: string }) {
    return this.courseService.deleteLesson(data.courseId, data.moduleId, data.lessonId, data.instructorId);
  }


  // Bulk Operations
  @MessagePattern({ cmd: 'bulk_update_course_status' })
  async bulkUpdateCourseStatus(@Payload() data: { courseIds: string[]; status: any; instructorId: string }) {
    return this.courseService.bulkUpdateCourseStatus(data.courseIds, data.status, data.instructorId);
  }

  @MessagePattern({ cmd: 'duplicate_course' })
  async duplicateCourse(@Payload() data: { courseId: string; instructorId: string; newTitle?: string }) {
    return this.courseService.duplicateCourse(data.courseId, data.instructorId, data.newTitle);
  }

  // Student Enrollments
  @MessagePattern({ cmd: 'get_student_enrollments' })
  async getStudentEnrollments(@Payload() data: { userId: string }) {
    return this.enrollmentService.getStudentEnrollments(data.userId);
  }

  @MessagePattern({ cmd: 'get_course_enrollments' })
  async getCourseEnrollments(@Payload() data: { courseId: string; instructorId?: string }) {
    return this.enrollmentService.getCourseEnrollments(data.courseId, data.instructorId);
  }

  // Review Management
  @MessagePattern({ cmd: 'add_course_review' })
  async addReview(@Payload() data: { courseId: string; userId: string; reviewData: any }) {
    return this.courseService.addReview(data.courseId, data.userId, data.reviewData);
  }

  @MessagePattern({ cmd: 'update_course_review' })
  async updateReview(@Payload() data: { reviewId: string; userId: string; updateData: any }) {
    return this.courseService.updateReview(data.reviewId, data.userId, data.updateData);
  }

  @MessagePattern({ cmd: 'delete_course_review' })
  async deleteReview(@Payload() data: { reviewId: string; userId: string }) {
    return this.courseService.deleteReview(data.reviewId, data.userId);
  }

  @MessagePattern({ cmd: 'get_course_reviews' })
  async getCourseReviews(@Payload() data: { courseId: string; page?: number; limit?: number }) {
    return this.courseService.getCourseReviews(data.courseId, data.page, data.limit);
  }

  @MessagePattern({ cmd: 'vote_on_review' })
  async voteOnReview(@Payload() data: { reviewId: string; userId: string; voteType: 'helpful' | 'notHelpful' }) {
    return this.courseService.voteOnReview(data.reviewId, data.userId, data.voteType);
  }
}