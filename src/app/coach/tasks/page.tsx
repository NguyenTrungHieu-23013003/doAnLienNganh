'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { Input, Select, Textarea } from '@/shared/components/FormFields';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Task, User, TaskType, TaskStatus } from '@/shared/types';
import { useSession, signOut } from 'next-auth/react';
import { Plus, Dumbbell, Salad, MessageSquare, CheckCircle2, Ban, ChevronRight, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useTranslation } from "react-i18next";

const TYPE_OPTIONS = [
  { value: 'workout', label: 'Workout' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'consultation', label: 'Consultation' },
];

const typeIcon: Record<TaskType, React.ReactNode> = {
  workout: <Dumbbell className="w-4 h-4" />,
  nutrition: <Salad className="w-4 h-4" />,
  consultation: <MessageSquare className="w-4 h-4" />,
};

const typeColor: Record<TaskType, string> = {
  workout: 'text-blue-400 bg-blue-600/10',
  nutrition: 'text-green-400 bg-green-600/10',
  consultation: 'text-purple-400 bg-purple-600/10',
};

export default function CoachTasksPage() {
    const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ userId: '', title: '', type: 'workout' as TaskType, description: '', dueDate: '' });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const [tasksRes, studentsRes] = await Promise.all([
      fetch(`/api/tasks?coachId=${user.id}`, { cache: 'no-store' }),
      fetch(`/api/users?coachId=${user.id}`, { cache: 'no-store' }),
    ]);
    setTasks(await tasksRes.json());
    setStudents(await studentsRes.json());
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, coachId: user?.id }),
    });
    setIsSaving(false);
    setIsCreateOpen(false);
    setForm({ userId: '', title: '', type: 'workout', description: '', dueDate: '' });
    fetchData();
  };

  const displayed = filterStatus ? tasks.filter((t) => t.status === filterStatus) : tasks;
  const reviewCount = tasks.filter((t) => t.status === 'review').length;
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;

  const studentOptions = [
    { value: '', label: 'Select student...' },
    ...students.map((s) => ({ value: s.id, label: s.fullName })),
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Alert strip for urgent items */}
        {(reviewCount > 0 || blockedCount > 0) && (
          <div className="flex gap-4">
            {reviewCount > 0 && (
              <button onClick={() => setFilterStatus('review')} className="flex-1 flex items-center gap-3 px-5 py-4 rounded-xl bg-amber-600/5 border border-amber-600/20 hover:bg-amber-600/10 transition-all">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-amber-300 font-semibold text-sm">{reviewCount} {t("task")}{reviewCount > 1 ? 's' : ''} {t("await your review")}</span>
                <ChevronRight className="w-4 h-4 text-amber-500 ml-auto" />
              </button>
            )}
            {blockedCount > 0 && (
              <button onClick={() => setFilterStatus('blocked')} className="flex-1 flex items-center gap-3 px-5 py-4 rounded-xl bg-red-600/5 border border-red-600/20 hover:bg-red-600/10 transition-all">
                <Ban className="w-5 h-5 text-red-400 shrink-0" />
                <span className="text-red-300 font-semibold text-sm">{blockedCount} {t("injury / blocked report")}{blockedCount > 1 ? 's' : ''} {t("need attention")}</span>
                <ChevronRight className="w-4 h-4 text-red-500 ml-auto" />
              </button>
            )}
          </div>
        )}

        <Card className="border-zinc-800">
          <CardHeader title="Task Management" subtitle="All tasks assigned to your students">
            <div className="flex items-center gap-3">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TaskStatus | '')}
                className="bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                <option value="">{t("All Statuses")}</option>
                <option value="todo">{t("To Do")}</option>
                <option value="in_progress">{t("In Progress")}</option>
                <option value="review">{t("Review")}</option>
                <option value="done">{t("Done")}</option>
                <option value="blocked">{t("Blocked")}</option>
              </select>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> {t("Assign Task")}</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">{t("No tasks found.")}</div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {displayed.map((task) => {
                  const student = students.find((s) => s.id === task.userId);
                  return (
                    <div key={task.id} className="flex items-start gap-5 px-6 py-5 hover:bg-zinc-900/30 transition-colors">
                      <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${typeColor[task.type]}`}>
                        {typeIcon[task.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <h4 className="font-semibold text-white truncate">{task.title}</h4>
                          <StatusBadge status={task.status} />
                        </div>
                        <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{task.description}</p>
                        <div className="flex items-center gap-5 text-xs text-zinc-600">
                          <span className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                              {student?.fullName.charAt(0) ?? '?'}
                            </div>
                            {student?.fullName ?? 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t("Due")}{formatDate(task.dueDate)}</span>
                        </div>
                      </div>
                      {/* Coach actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {task.status === 'review' && (
                          <>
                            <Button size="sm" onClick={() => updateStatus(task.id, 'done')} className="gap-1 bg-green-700 hover:bg-green-600 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t("Approve")}</Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(task.id, 'in_progress')} className="text-xs">
                              {t("Return")}</Button>
                          </>
                        )}
                        {task.status === 'blocked' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(task.id, 'todo')} className="text-xs text-amber-400 border-amber-600/30">
                            {t("Reassign")}</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Assign New Task">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select id="userId" label="Student" value={form.userId} options={studentOptions}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} required />
          <Input id="title" label="Task Title" placeholder="e.g. Upper Body Strength Training" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <Select id="type" label="Type" value={form.type} options={TYPE_OPTIONS}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TaskType }))} />
          <Textarea id="description" label="Description / Instructions" placeholder="Describe the workout or nutrition plan in detail..." value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Input id="dueDate" type="date" label="Due Date" value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} required />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreateOpen(false)}>{t("Cancel")}</Button>
            <Button type="submit" className="flex-1" isLoading={isSaving}>{t("Assign Task")}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
