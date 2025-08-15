import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, User, Enrollment } from '@edutech-lms/database';
import { EnrollmentStatus, CourseStatus } from '@edutech-lms/common';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async enrollStudent(enrollData: any) {
    const { courseId, userId, paidAmount = 0 } = enrollData;

    // Check if course exists and is published
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new ForbiddenException('Course is not available for enrollment');
    }

    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { courseId, userId },
    });

    if (existingEnrollment) {
      throw new ConflictException('User is already enrolled in this course');
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      courseId,
      userId,
      paidAmount,
      paymentDate: paidAmount > 0 ? new Date() : null,
      status: EnrollmentStatus.ACTIVE,
    });

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    // Update course enrollment count
    await this.courseRepository.increment({ id: courseId }, 'enrollmentCount', 1);

    return {
      success: true,
      message: 'Successfully enrolled in course',
      data: savedEnrollment,
    };
  }

  async getCourseProgress(courseId: string, userId: string) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { courseId, userId },
      relations: ['course', 'user'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return {
      success: true,
      data: {
        enrollment,
        progress: enrollment.progress,
        progressData: enrollment.progressData,
        timeSpent: enrollment.timeSpent,
        lastAccessed: enrollment.lastAccessedAt,
      },
    };
  }

  async updateProgress(courseId: string, userId: string, progressData: any) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { courseId, userId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const {
      completedLessons = [],
      currentLesson,
      progress = 0,
      timeSpent = 0,
      quizScores = [],
    } = progressData;

    // Update progress data
    const updatedProgressData = {
      completedLessons: [...new Set([...enrollment.progressData?.completedLessons || [], ...completedLessons])],
      currentLesson,
      quizScores: [...enrollment.progressData?.quizScores || [], ...quizScores],
    };

    // Calculate overall progress percentage
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    let progressPercentage = progress;
    
    if (course?.curriculum?.modules) {
      const totalLessons = course.curriculum.modules.reduce((total, module) => total + module.lessons.length, 0);
      progressPercentage = totalLessons > 0 ? (updatedProgressData.completedLessons.length / totalLessons) * 100 : 0;
    }

    const updateData: Partial<Enrollment> = {
      progress: Math.min(progressPercentage, 100),
      progressData: updatedProgressData,
      timeSpent: enrollment.timeSpent + timeSpent,
      lastAccessedAt: new Date(),
    };

    // Check if course is completed
    if (progressPercentage >= 100 && enrollment.status === EnrollmentStatus.ACTIVE) {
      updateData.status = EnrollmentStatus.COMPLETED;
      updateData.completedAt = new Date();
    }

    await this.enrollmentRepository.update(
      { courseId, userId },
      updateData
    );

    const updatedEnrollment = await this.getCourseProgress(courseId, userId);

    return {
      success: true,
      message: 'Progress updated successfully',
      data: updatedEnrollment.data,
    };
  }

  async getStudentEnrollments(userId: string) {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course', 'course.instructor'],
      order: { enrolledAt: 'DESC' },
    });

    return {
      success: true,
      data: enrollments.map(enrollment => ({
        ...enrollment,
        course: {
          ...enrollment.course,
          instructor: {
            id: enrollment.course.instructor.id,
            firstName: enrollment.course.instructor.firstName,
            lastName: enrollment.course.instructor.lastName,
          },
        },
      })),
    };
  }

  async getCourseEnrollments(courseId: string, instructorId?: string) {
    // If instructorId provided, verify they own the course
    if (instructorId) {
      const course = await this.courseRepository.findOne({ where: { id: courseId } });
      if (!course || course.instructorId !== instructorId) {
        throw new ForbiddenException('You do not have access to this course');
      }
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { courseId },
      relations: ['user'],
      order: { enrolledAt: 'DESC' },
    });

    return {
      success: true,
      data: enrollments.map(enrollment => ({
        ...enrollment,
        user: {
          id: enrollment.user.id,
          firstName: enrollment.user.firstName,
          lastName: enrollment.user.lastName,
          email: enrollment.user.email,
        },
      })),
    };
  }
}