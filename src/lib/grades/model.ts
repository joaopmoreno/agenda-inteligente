export const passingScore = 60;
export const terms = [1, 2, 3] as const;
export interface GradeInput {
  subject: string;
  title: string;
  term: number;
  points: number;
  school_year: number;
}
export interface Grade extends GradeInput {
  id: string;
}
export interface SubjectResult {
  name: string;
  grades: Grade[];
  totals: number[];
  final: number;
}
export const formatPoints = (value: number) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export function resultsBySubject(grades: Grade[]): SubjectResult[] {
  const subjects = new Map<string, SubjectResult>();
  for (const grade of grades) {
    const name = grade.subject.trim().replace(/\s+/g, ' ');
    const key = name.normalize('NFC').toLocaleLowerCase('pt-BR');
    const subject = subjects.get(key) || { name, grades: [], totals: [0, 0, 0], final: 0 };
    // Acumule em centésimos para manter notas fracionárias exatas.
    const cents = Math.round(grade.points * 100);
    subject.totals[grade.term - 1] += cents;
    subject.final += cents;
    subject.grades.push(grade);
    subjects.set(key, subject);
  }
  return [...subjects.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((subject) => ({
      ...subject,
      final: subject.final / 100,
      totals: subject.totals.map((total) => total / 100),
    }));
}
