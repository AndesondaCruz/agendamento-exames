/**
 * Todas as chaves de cache num lugar só: o formato de cada chave é um
 * contrato entre quem grava e quem invalida.
 */

/** Validades em segundos. */
export const CacheTtl = {
  /** Catálogo (exames, médicos) só muda no deploy, quando o seed roda. */
  CATALOG: 60 * 60,
  /**
   * Disponibilidade é invalidada na hora a cada agendamento; o TTL curto é
   * só uma rede de segurança caso uma invalidação se perca (Redis fora).
   */
  AVAILABILITY: 5 * 60,
} as const;

export const CacheKeys = {
  /** Sobe a cada inicialização da API: um deploy novo nunca serve catálogo velho. */
  catalogVersion: 'catalog:version',

  examSearch: (version: number, normalizedTerm: string) =>
    // encodeURIComponent: o termo vem do usuário; assim ele nunca "quebra" o formato da chave.
    `catalog:v${version}:exams:search:${encodeURIComponent(normalizedTerm)}`,

  doctors: (version: number) => `catalog:v${version}:doctors`,

  /** Um contador por médico + dia: agendar invalida só a agenda afetada. */
  availabilityVersion: (doctorId: number, date: string) =>
    `availability:version:doctor:${doctorId}:date:${date}`,

  availability: (params: {
    version: number;
    doctorId: number;
    date: string;
    examId: number;
    /**
     * A resposta depende de "hoje" (ex.: uma data passa a ser passada à
     * meia-noite). Com o dia de hoje na chave, a virada do dia invalida tudo.
     */
    today: string;
  }) =>
    `availability:v${params.version}:doctor:${params.doctorId}:date:${params.date}:exam:${params.examId}:today:${params.today}`,
} as const;
