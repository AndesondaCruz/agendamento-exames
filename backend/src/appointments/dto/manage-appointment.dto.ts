import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { IsCpf, toDigits } from '../../common/validation/validators.js';

/**
 * O CPF funciona como uma "senha" simples: só quem tem o protocolo E o CPF
 * consulta ou cancela. Ele vai no corpo de um POST, nunca na URL, porque
 * URLs costumam ficar registradas em logs de servidores e proxies.
 */
class PatientCpfBody {
  @ApiProperty({ example: '529.982.247-25' })
  @Transform(toDigits)
  @IsCpf()
  patientCpf: string;
}

export class LookupAppointmentDto extends PatientCpfBody {
  @ApiProperty({
    example: 'A1B2C3D4',
    description: 'Protocolo mostrado na confirmação (8 caracteres).',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'protocol deve ser um texto.' })
  @Matches(/^[0-9a-f]{8}$/, {
    message: 'protocol deve ter 8 caracteres (letras de A a F e números).',
  })
  protocol: string;
}

export class CancelAppointmentDto extends PatientCpfBody {}
