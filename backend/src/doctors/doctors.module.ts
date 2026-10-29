import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsController } from './doctors.controller.js';
import { DoctorsService } from './doctors.service.js';
import { DoctorShift } from './entities/doctor-shift.entity.js';
import { Doctor } from './entities/doctor.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, DoctorShift])],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
