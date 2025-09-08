import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseLevel } from '@edutech-lms/common';

class LessonDto {
  @ApiProperty({ description: 'Lesson ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Lesson title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Lesson type', enum: ['video', 'text', 'quiz', 'assignment'] })
  @IsEnum(['video', 'text', 'quiz', 'assignment'])
  type: 'video' | 'text' | 'quiz' | 'assignment';

  @ApiProperty({ description: 'Lesson content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Lesson duration in minutes' })
  @IsNumber()
  @Min(0)
  duration: number;
}

class ModuleDto {
  @ApiProperty({ description: 'Module ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Module title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Module lessons', type: [LessonDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonDto)
  lessons: LessonDto[];
}

class CurriculumDto {
  @ApiProperty({ description: 'Course modules', type: [ModuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleDto)
  modules: ModuleDto[];
}

export class CreateCourseDto {
  @ApiProperty({ description: 'Course title', example: 'Complete Web Development Bootcamp' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Course description', example: 'Learn full-stack web development from scratch' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Short course description for previews' })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional({ description: 'Course thumbnail URL' })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ description: 'Course price', example: 99.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Course difficulty level', enum: CourseLevel })
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiPropertyOptional({ description: 'Course tags', example: ['javascript', 'react', 'nodejs'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Course curriculum structure', type: CurriculumDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CurriculumDto)
  curriculum?: CurriculumDto;
}