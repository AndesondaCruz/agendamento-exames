import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity.js';
import { ExamsController } from './exams.controller.js';
import { ExamsService } from './exams.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Exam])],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
