import { expect, it } from 'vitest';
import { resultsBySubject, formatPoints } from './model';

it('soma por matéria e trimestre, sem limitar o resultado à meta', () => {
  const g = { id: '1', title: 'Prova', term: 1, school_year: 2026, points: 20, subject: 'História' };
  const rows = resultsBySubject([
    g,
    { ...g, subject: ' história ', term: 2, points: 27.5 },
    { ...g, term: 3, points: 16.25 },
    { ...g, subject: 'Química', points: 0 },
  ]);
  expect(rows[0]).toMatchObject({ name: 'História', totals: [20, 27.5, 16.25], final: 63.75 });
  expect(rows[1]).toMatchObject({ totals: [0, 0, 0], final: 0 });
  expect(formatPoints(rows[0].final)).toBe('63,75');
});
it('mantém a precisão em avaliações fracionárias', () => {
  const g = { id: '1', subject: 'Artes', title: 'Trabalho', term: 2, school_year: 2026, points: 0.1 };
  expect(resultsBySubject([g, { ...g, points: 0.2 }])[0].final).toBe(0.3);
});
