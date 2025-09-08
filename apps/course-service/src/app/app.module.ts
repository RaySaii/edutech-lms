import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedDatabaseModule } from '@edutech-lms/database';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CourseController } from './course/course.controller';
import { CourseService } from './course/course.service';
import { EnrollmentService } from './enrollment/enrollment.service';
import { Course, User, Enrollment, Organization, CourseReview } from '@edutech-lms/database';
import { configuration } from '@edutech-lms/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    SharedDatabaseModule,
    TypeOrmModule.forFeature([Course, User, Enrollment, Organization, CourseReview]),
  ],
  controllers: [AppController, CourseController],
  providers: [AppService, CourseService, EnrollmentService],
})
export class AppModule {}
