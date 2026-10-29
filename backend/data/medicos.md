# Médicos e agendas

> **Nota didática:** para simplificar o desafio, **todos os médicos realizam qualquer exame** do catálogo (`exames.csv`).

## Regra de horários

- Dias úteis: `SEG`, `TER`, `QUA`, `QUI`, `SEX`, `SAB`, `DOM`.
- Cada médico atende em um ou mais **turnos** por dia, definidos por um intervalo `HH:MM–HH:MM`.
- Cada exame ocupa a sua **própria duração** (20, 30 ou 40 min — ver `exames.csv`), e não um slot fixo (ver regras de negócio no `README.md`).

---

## 1. Dra. Helena Marques (CRM-MG 11111)

| Dia              | Turnos                    |
| ---------------- | ------------------------- |
| Segunda a Sexta  | 08:00–12:00 e 14:00–18:00 |
| Sábado / Domingo | Não atende                |

## 2. Dr. Rafael Teixeira (CRM-MG 22222)

| Dia                     | Turnos      |
| ----------------------- | ----------- |
| Segunda, Quarta e Sexta | 07:00–13:00 |
| Terça e Quinta          | 13:00–19:00 |
| Sábado / Domingo        | Não atende  |

## 3. Dra. Beatriz Nogueira (CRM-MG 33333)

| Dia              | Turnos                              |
| ---------------- | ----------------------------------- |
| Segunda a Quinta | 09:00–12:00 e 18:00–22:00 (noturno) |
| Sexta a Domingo  | Não atende                          |

## 4. Dr. Thiago Fontes (CRM-MG 44444)

| Dia               | Turnos                |
| ----------------- | --------------------- |
| Terça a Sábado    | 08:00–12:00           |
| Quarta e Sexta    | 19:00–22:00 (noturno) |
| Segunda / Domingo | Não atende            |

## 5. Dra. Camila Andrade (CRM-MG 55555)

| Dia             | Turnos      |
| --------------- | ----------- |
| Segunda a Sexta | 10:00–14:00 |
| Sábado          | 08:00–12:00 |
| Domingo         | Não atende  |
