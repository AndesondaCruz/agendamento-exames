import { readFileSync } from 'node:fs';
import { parseExamsCsv } from './exams-csv.parser.js';

describe('parseExamsCsv', () => {
  it('converte linhas válidas em registros tipados', () => {
    const csv =
      'id,nome,duracao_minutos\n1,Raio-X de Tórax,20\n7,Ultrassonografia Abdominal Total,40\n';

    expect(parseExamsCsv(csv)).toEqual([
      { id: 1, name: 'Raio-X de Tórax', durationMinutes: 20 },
      { id: 7, name: 'Ultrassonografia Abdominal Total', durationMinutes: 40 },
    ]);
  });

  it('tolera BOM, CRLF e linhas em branco', () => {
    const csv = '\uFEFFid,nome,duracao_minutos\r\n\r\n1,Raio-X de Tórax,20\r\n';

    expect(parseExamsCsv(csv)).toHaveLength(1);
  });

  it('rejeita cabeçalho inesperado', () => {
    expect(() => parseExamsCsv('id,name,duration\n1,X,20')).toThrow(
      /Cabeçalho inválido/,
    );
  });

  it('informa a linha com duração inválida', () => {
    const csv = 'id,nome,duracao_minutos\n1,A,20\n2,B,abc';

    expect(() => parseExamsCsv(csv)).toThrow(/linha 3/);
  });

  it('rejeita ids duplicados', () => {
    const csv = 'id,nome,duracao_minutos\n1,A,20\n1,B,30';

    expect(() => parseExamsCsv(csv)).toThrow(/id duplicado \(1\)/);
  });

  it('aceita o catálogo oficial completo (30 exames de 20, 30 ou 40 min)', () => {
    const csv = readFileSync(
      new URL('../../../data/exames.csv', import.meta.url),
      'utf-8',
    );
    const exams = parseExamsCsv(csv);

    expect(exams).toHaveLength(30);
    expect(new Set(exams.map((exam) => exam.durationMinutes))).toEqual(
      new Set([20, 30, 40]),
    );
  });
});
