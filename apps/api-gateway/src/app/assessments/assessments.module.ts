import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@edutech-lms/common';
import { 
  Assessment, 
  AssessmentQuestion, 
  AssessmentAttempt, 
  AssessmentAnswer 
} from '@edutech-lms/database';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assessment,
      AssessmentQuestion,
      AssessmentAttempt,
      AssessmentAnswer,
    ]),
    CacheModule.forFeature(),
  ],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentsModule {}