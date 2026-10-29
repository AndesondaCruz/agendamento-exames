import { z } from 'zod';

const EXPECTED_HEADER = ['id', 'nome', 'duracao_minutos'] as const;

const examRowSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().positive(),
});

export type ExamSeedRow = z.infer<typeof examRowSchema>;

/**
 * Converte o conteúdo de exames.csv em registros validados.
 *
 * Função pura (recebe string, devolve dados) para ser testável sem tocar
 * em disco ou banco. Falha com a linha exata do problema: um catálogo
 * corrompido não deve ser semeado parcialmente.
 *
 * Premissa: os nomes não contêm vírgulas (vale para o catálogo fornecido).
 * Se isso mudar, troque por uma lib de CSV com suporte a aspas.
 */
export function parseExamsCsv(content: string): ExamSeedRow[] {
  const lines = content
    .replace(/^\uFEFF/, '') // remove BOM, comum em CSVs exportados do Excel
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const [headerLine, ...dataLines] = lines;
  const header = headerLine?.split(',').map((column) => column.trim());

  if (!header || header.join(',') !== EXPECTED_HEADER.join(',')) {
    throw new Error(
      `Cabeçalho inválido em exames.csv. Esperado "${EXPECTED_HEADER.join(',')}", recebido "${headerLine ?? ''}".`,
    );
  }

  const rows = dataLines.map((line, index) => {
    const lineNumber = index + 2; // +1 pelo cabeçalho, +1 por ser 1-based
    const cells = line.split(',');

    if (cells.length !== EXPECTED_HEADER.length) {
      throw new Error(
        `exames.csv linha ${lineNumber}: esperadas ${EXPECTED_HEADER.length} colunas, encontradas ${cells.length}.`,
      );
    }

    const [id, name, durationMinutes] = cells;
    const parsed = examRowSchema.safeParse({ id, name, durationMinutes });

    if (!parsed.success) {
      const reason = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`exames.csv linha ${lineNumber}: ${reason}`);
    }

    return parsed.data;
  });

  const ids = new Set<number>();
  for (const row of rows) {
    if (ids.has(row.id)) {
      throw new Error(`exames.csv: id duplicado (${row.id}).`);
    }
    ids.add(row.id);
  }

  return rows;
}
