import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Course, User, Enrollment } from '@edutech-lms/database';
import { CourseStatus, UserRole } from '@edutech-lms/common';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async getCourses(filters: any) {
    const {
      page = 1,
      limit = 10,
      search,
      level,
      tags,
      organizationId,
      status = CourseStatus.PUBLISHED
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = {
      organizationId,
      status,
    };

    if (search) {
      where.title = ILike(`%${search}%`);
    }

    if (level) {
      where.level = level;
    }

    if (tags) {
      const tagArray = tags.split(',');
      where.tags = tagArray;
    }

    const [courses, total] = await this.courseRepository.findAndCount({
      where,
      relations: ['instructor', 'organization'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: {
        courses: courses.map(course => ({
          ...course,
          instructor: {
            id: course.instructor.id,
            firstName: course.instructor.firstName,
            lastName: course.instructor.lastName,
          },
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    };
  }

  async getCourseById(id: string, userId?: string) {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['instructor', 'organization'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    let enrollment = null;
    if (userId) {
      enrollment = await this.enrollmentRepository.findOne({
        where: { courseId: id, userId },
      });
    }

    return {
      success: true,
      data: {
        ...course,
        instructor: {
          id: course.instructor.id,
          firstName: course.instructor.firstName,
          lastName: course.instructor.lastName,
        },
        enrollment,
      },
    };
  }

  async createCourse(courseData: any) {
    const { instructorId, organizationId, ...data } = courseData;

    // Verify instructor exists
    const instructor = await this.userRepository.findOne({
      where: { id: instructorId },
    });
    
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    // Generate slug from title
    const slug = data.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const course = this.courseRepository.create({
      ...data,
      slug,
      instructorId,
      organizationId,
      status: CourseStatus.DRAFT,
    });

    const savedCourse = await this.courseRepository.save(course);

    return {
      success: true,
      message: 'Course created successfully',
      data: savedCourse,
    };
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
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check permission
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (course.instructorId !== userId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this course');
    }

    // Check if course has enrollments
    const enrollmentCount = await this.enrollmentRepository.count({
      where: { courseId: id },
    });

    if (enrollmentCount > 0) {
      // Archive instead of delete if there are enrollments
      await this.courseRepository.update(id, { status: CourseStatus.ARCHIVED });
      return {
        success: true,
        message: 'Course archived due to existing enrollments',
      };
    }

    await this.courseRepository.delete(id);
    return {
      success: true,
      message: 'Course deleted successfully',
    };
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
}