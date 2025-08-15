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
}