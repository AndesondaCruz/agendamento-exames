import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheKeys, CacheTtl } from '../common/cache/cache-keys.js';
import { CacheService, type Cached } from '../common/cache/cache.service.js';
import { AppException } from '../common/errors/app.exception.js';
import { ErrorCode } from '../common/errors/error-codes.js';
import { DoctorResponse } from './dto/doctor.response.js';
import { DoctorShift } from './entities/doctor-shift.entity.js';
import { Doctor } from './entities/doctor.entity.js';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
    @InjectRepository(DoctorShift)
    private readonly shiftsRepository: Repository<DoctorShift>,
    private readonly cache: CacheService,
  ) {}

  /** Lista de médicos com turnos, com cache (o catálogo só muda no deploy). */
  async listCatalog(): Promise<Cached<DoctorResponse[]>> {
    const version = await this.cache.version(CacheKeys.catalogVersion);

    return this.cache.getOrLoad(
      CacheKeys.doctors(version),
      CacheTtl.CATALOG,
      async () => {
        const doctors = await this.findAllWithShifts();
        return doctors.map((doctor) => DoctorResponse.from(doctor));
      },
    );
  }

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
