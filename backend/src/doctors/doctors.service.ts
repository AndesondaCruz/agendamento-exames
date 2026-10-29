import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../common/errors/app.exception.js';
import { ErrorCode } from '../common/errors/error-codes.js';
import { DoctorShift } from './entities/doctor-shift.entity.js';
import { Doctor } from './entities/doctor.entity.js';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
    @InjectRepository(DoctorShift)
    private readonly shiftsRepository: Repository<DoctorShift>,
  ) {}

  findAllWithShifts(): Promise<Doctor[]> {
    return this.doctorsRepository.find({
      relations: { shifts: true },
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(id: number): Promise<Doctor> {
    const doctor = await this.doctorsRepository.findOneBy({ id });
    if (!doctor) {
      throw AppException.notFound(
        ErrorCode.DOCTOR_NOT_FOUND,
        `Médico ${id} não encontrado.`,
      );
    }
    return doctor;
  }

  /** Turnos do médico num dia da semana (usa o índice doctor_id + weekday). */
  findShifts(doctorId: number, isoWeekday: number): Promise<DoctorShift[]> {
    return this.shiftsRepository.find({
      where: { doctorId, weekday: isoWeekday },
      order: { startMinute: 'ASC' },
    });
  }
}
