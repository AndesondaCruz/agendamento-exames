import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service.js';
import { DoctorResponse } from './dto/doctor.response.js';

@ApiTags('Médicos')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os médicos com seus turnos semanais' })
  @ApiOkResponse({ type: [DoctorResponse] })
  async findAll(): Promise<DoctorResponse[]> {
    const doctors = await this.doctorsService.findAllWithShifts();
    return doctors.map((doctor) => DoctorResponse.from(doctor));
  }
}
