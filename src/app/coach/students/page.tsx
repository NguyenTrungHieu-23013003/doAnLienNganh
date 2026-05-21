'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { User, Task } from '@/shared/types';
import { useAuth } from '@/features/auth/AuthContext';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Activity, Dumbbell, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface StudentWithStats extends User {
  tasks: Task[];
  completion: number;
  blocked: boolean;
}

export default function CoachStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<StudentWithStats | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const [studentsRes, tasksRes] = await Promise.all([
      fetch(`/api/users?coachId=${user.id}`, { cache: 'no-store' }),
      fetch(`/api/tasks?coachId=${user.id}`, { cache: 'no-store' }),
    ]);
    const studentsData: User[] = await studentsRes.json();
    const tasksData: Task[] = await tasksRes.json();

    const enriched: StudentWithStats[] = studentsData.map((s) => {
      const myTasks = tasksData.filter((t) => t.userId === s.id);
      const done = myTasks.filter((t) => t.status === 'done').length;
      const total = myTasks.length;
      return {
        ...s,
        tasks: myTasks,
        completion: total > 0 ? Math.round((done / total) * 100) : 0,
        blocked: myTasks.some((t) => t.status === 'blocked'),
      };
    });

    setStudents(enriched);
    if (enriched.length > 0 && !selected) setSelected(enriched[0]);
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedLatest = selected?.tasks.slice(0, 5) ?? [];

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List */}
        <Card className="border-zinc-800 lg:col-span-1">
          <CardHeader title="My Students" subtitle={`${students.length} assigned`} />
          <CardContent className="p-3">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-center text-zinc-600 py-8 text-sm">No students assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {students.map((s) => (
                  <button key={s.id} onClick={() => setSelected(s)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${selected?.id === s.id ? 'bg-blue-600/10 border border-blue-600/20' : 'hover:bg-zinc-900 border border-transparent'}`}>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">
                        {s.fullName.charAt(0)}
                      </div>
                      {s.blocked && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{s.fullName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${s.completion}%` }} />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold">{s.completion}%</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Detail */}
        <div className="lg:col-span-2 space-y-6">
          {selected ? (
            <>
              <Card className="border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl font-bold text-blue-400">
                      {selected.fullName.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selected.fullName}</h2>
                      <p className="text-zinc-500 text-sm">{selected.email}</p>
                      {selected.blocked && (
                        <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-red-400 bg-red-600/10 px-2.5 py-1 rounded-full border border-red-600/20">
                          <AlertCircle className="w-3 h-3" /> Has Blocked Task
                        </span>
                      )}
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-3xl font-bold text-blue-400">{selected.completion}%</p>
                      <p className="text-xs text-zinc-500 font-bold uppercase">Completion</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Total Tasks', value: selected.tasks.length, icon: Dumbbell },
                      { label: 'Completed', value: selected.tasks.filter((t) => t.status === 'done').length, icon: CheckCircle2 },
                      { label: 'In Review', value: selected.tasks.filter((t) => t.status === 'review').length, icon: Activity },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                        <s.icon className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{s.value}</p>
                        <p className="text-xs text-zinc-500 font-bold uppercase mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-800">
                <CardHeader title="Recent Tasks" subtitle="Latest 5 assigned tasks" />
                <CardContent className="p-0">
                  {selectedLatest.length === 0 ? (
                    <p className="text-center text-zinc-600 py-8 text-sm">No tasks assigned yet.</p>
                  ) : (
                    <div className="divide-y divide-zinc-900">
                      {selectedLatest.map((task) => (
                        <div key={task.id} className="flex items-center gap-4 px-6 py-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                            </p>
                          </div>
                          <StatusBadge status={task.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : !isLoading && (
            <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">Select a student to view details.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
