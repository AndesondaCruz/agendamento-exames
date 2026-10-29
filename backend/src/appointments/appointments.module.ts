import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { ExamsModule } from '../exams/exams.module.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';
import { Appointment } from './entities/appointment.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    DoctorsModule,
    ExamsModule,
  ],
  controllers: [AvailabilityController, AppointmentsController],
  providers: [AvailabilityService, AppointmentsService],
})
export class AppointmentsModule {}
