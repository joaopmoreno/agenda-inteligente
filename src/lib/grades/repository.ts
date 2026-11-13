import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import type { Grade, GradeInput } from './model';

const fields = 'id,subject,title,term,points,school_year';
export function useGrades(userId: string | undefined, year: number) {
  return useQuery({
    queryKey: ['grades', userId, year],
    enabled: !!userId,
    queryFn: async () => {
      const grades: Grade[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from('student_grades')
          .select(fields)
          .eq('user_id', userId!)
          .eq('school_year', year)
          .order('created_at')
          .order('id')
          .range(offset, offset + 499);
        if (error) throw new Error(error.message);
        grades.push(...data);
        if (data.length < 500) return grades;
      }
    },
  });
}
export async function saveGrade(userId: string, id: string, input: GradeInput, editing: boolean) {
  const table = supabase.from('student_grades');
  const query = editing
    ? table.update(input).eq('id', id).eq('user_id', userId)
    : table.upsert({ ...input, id, user_id: userId }, { onConflict: 'id' });
  const { error } = await query.select('id').single();
  if (error) throw new Error(error.message);
}
export async function removeGrade(userId: string, id: string) {
  const { error } = await supabase.from('student_grades').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}
