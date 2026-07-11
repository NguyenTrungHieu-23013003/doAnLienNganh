'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { Input, Select, Textarea } from '@/shared/components/FormFields';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Task, User, TaskType, TaskStatus, Comment } from '@/shared/types';
import { useSession } from 'next-auth/react';
import {
  Plus, Dumbbell, Salad, MessageSquare, CheckCircle2, Ban,
  ChevronRight, Calendar, X, Send, CornerDownLeft, UserCircle2,
  AlertCircle, Trash2, Users, List, Database,
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ExercisePicker } from '@/shared/components/ExercisePicker';
import type { Exercise } from '@/lib/exercises';


// ── Constants ───────────────────────────────────────────────
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

// ── Helpers ─────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}


/** Parse nội dung comment: tách URL thành <a> có thể click */
function renderContent(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ── TaskCard sub-component ───────────────────────────────────
function TaskCard({
  task, student, isSelected, onClick, hideStudent = false, t
}: {
  task: Task;
  student: User | undefined;
  isSelected: boolean;
  onClick: () => void;
  hideStudent?: boolean;
  t: (key: string) => string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3.5 rounded-xl border transition-all',
        isSelected
          ? 'border-blue-600/40 bg-blue-600/5'
          : task.status === 'review'
            ? 'border-amber-900/40 bg-zinc-950/50 hover:border-amber-800/50'
            : task.status === 'blocked'
              ? 'border-red-900/40 bg-zinc-950/50 hover:border-red-800/50'
              : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', typeColor[task.type])}>
          {typeIcon[task.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{task.title}</p>
          <div className="flex items-center justify-between mt-1.5 gap-2">
            {!hideStudent && (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold shrink-0">
                  {student?.fullName.charAt(0) ?? '?'}
                </div>
                <span className="truncate max-w-[80px]">{student?.fullName ?? '—'}</span>
              </div>
            )}
            <StatusBadge status={task.status} />
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
            <Calendar className="w-3 h-3" />
            {task.dueDate ? formatDate(task.dueDate) : t('Unscheduled')}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function CoachTasksPage() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as { id: string; role: string; fullName: string; name: string | null } | undefined;

  // Core data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');

  // Create task modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createTab, setCreateTab] = useState<'manual' | 'dataset'>('manual');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [form, setForm] = useState({
    userId: '', title: '', type: 'workout' as TaskType, description: '', frequency: 1,
  });

  // Task detail panel
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Return-with-note state
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  // View mode & delete state
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Data fetching ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const [tasksRes, studentsRes] = await Promise.all([
      fetch(`/api/tasks?coachId=${user.id}`, { cache: 'no-store' }),
      fetch(`/api/users?coachId=${user.id}`, { cache: 'no-store' }),
    ]);
    const rawTasks = await tasksRes.json();
    const activeStudents = await studentsRes.json();

    // Lọc bỏ task của những tài khoản không còn là học sinh
    const validTasks = rawTasks.filter((t: Task) => activeStudents.some((s: User) => s.id === t.userId));

    setTasks(validTasks);
    setStudents(activeStudents);
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchComments = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/comments?taskId=${taskId}`, { cache: 'no-store' });
    setComments(await res.json());
  }, []);

  useEffect(() => {
    if (comments.length > 0) {
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [comments]);

  // ── Actions ──────────────────────────────────────────────
  const openTask = (task: Task) => {
    setSelectedTask(task);
    setShowReturnForm(false);
    setReturnNote('');
    setCommentText('');
    fetchComments(task.id);
  };

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSelectedTask((prev) => (prev ? { ...prev, status } : null));
    fetchData();
  };

  // Return with optional note
  const handleReturn = async () => {
    if (!selectedTask || !user) return;
    setIsReturning(true);
    await fetch(`/api/tasks/${selectedTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    const note = returnNote.trim();
    if (note) {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          authorId: user.id,
          content: `↩ ${t('Returned')}: ${note}`,
        }),
      });
    }
    setShowReturnForm(false);
    setReturnNote('');
    setIsReturning(false);
    setSelectedTask((prev) => (prev ? { ...prev, status: 'in_progress' } : null));
    fetchData();
    fetchComments(selectedTask.id);
  };

  const sendComment = async () => {
    if (!commentText.trim() || !selectedTask || !user) return;
    setIsSendingComment(true);
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: selectedTask.id, authorId: user.id, content: commentText }),
    });
    setCommentText('');
    await fetchComments(selectedTask.id);
    setIsSendingComment(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, coachId: user?.id }),
    });
    // Dispatch custom event to notify NotificationBell component to update instantly
    window.dispatchEvent(new CustomEvent('refresh-notifications'));
    setIsSaving(false);
    setIsCreateOpen(false);
    setForm({ userId: '', title: '', type: 'workout', description: '', frequency: 1 });
    setCreateTab('manual');
    fetchData();
  };

  // Pick exercise from dataset and pre-fill form
  const handlePickExercise = (exercise: Exercise) => {
    const isVi = i18n.language?.startsWith('vi');
    const instructionsText = isVi
      ? (exercise.instructions?.vi ?? exercise.instructions?.en ?? '')
      : (exercise.instructions?.en ?? '');

    const descriptionParts = isVi ? [
      `Phân loại: ${exercise.category}`,
      `Cơ bắp nhắm tới: ${exercise.target}`,
      exercise.secondary_muscles?.length ? `Cơ bắp liên quan: ${exercise.secondary_muscles.join(', ')}` : '',
      `Dụng cụ: ${exercise.equipment}`,
      '',
      'Hướng dẫn tập luyện:',
      instructionsText,
    ] : [
      `Category: ${exercise.category}`,
      `Target: ${exercise.target}`,
      exercise.secondary_muscles?.length ? `Secondary: ${exercise.secondary_muscles.join(', ')}` : '',
      `Equipment: ${exercise.equipment}`,
      '',
      'Instructions:',
      instructionsText,
    ];

    setForm((f) => ({
      ...f,
      title: exercise.name,
      type: 'workout',
      description: descriptionParts.filter(Boolean).join('\n'),
    }));
    setIsPickerOpen(false);
    setCreateTab('manual');
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    setIsDeleting(true);
    await fetch(`/api/tasks/${selectedTask.id}`, { method: 'DELETE' });
    setSelectedTask(null);
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    fetchData();
  };

  // ── Derived ──────────────────────────────────────────────
  const displayed = filterStatus ? tasks.filter((t) => t.status === filterStatus) : tasks;

  // Group tasks by title and createdAt for the flat view
  const groupedTasks = (() => {
    const map = new Map<string, Task[]>();
    for (const t of displayed) {
      const key = `${t.title}|${t.createdAt.substring(0, 16)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.values());
  })();
  const reviewCount = tasks.filter((t) => t.status === 'review').length;
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;
  const studentOptions = [
    { value: '', label: t('Select student...') },
    ...students.map((s) => ({ value: s.id, label: s.fullName })),
  ];
  const selectedStudent = selectedTask
    ? students.find((s) => s.id === selectedTask.userId)
    : null;

  // Group tasks by student, and then by title/createdAt for grouped view
  const groupedByStudent = (() => {
    const map = new Map<string, { student: User | undefined; taskGroups: Task[][] }>();
    
    // First group by title and createdAt for each student
    const groupMap = new Map<string, Task[]>();
    for (const task of displayed) {
      const gkey = `${task.userId}|${task.title}|${task.createdAt.substring(0, 16)}`;
      if (!groupMap.has(gkey)) groupMap.set(gkey, []);
      groupMap.get(gkey)!.push(task);
    }

    for (const group of groupMap.values()) {
      const task = group[0];
      if (!map.has(task.userId)) {
        map.set(task.userId, {
          student: students.find((s) => s.id === task.userId),
          taskGroups: [],
        });
      }
      map.get(task.userId)!.taskGroups.push(group);
    }
    return Array.from(map.values());
  })();

  // ── Render ───────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-4">

        {/* Alert strips */}
        {(reviewCount > 0 || blockedCount > 0) && (
          <div className="flex gap-3">
            {reviewCount > 0 && (
              <button
                onClick={() => setFilterStatus('review')}
                className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-600/5 border border-amber-600/20 hover:bg-amber-600/10 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-amber-300 font-semibold text-sm">
                  {reviewCount} {t('task')}{reviewCount > 1 ? 's' : ''} {t('await your review')}
                </span>
                <ChevronRight className="w-4 h-4 text-amber-500 ml-auto" />
              </button>
            )}
            {blockedCount > 0 && (
              <button
                onClick={() => setFilterStatus('blocked')}
                className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-600/5 border border-red-600/20 hover:bg-red-600/10 transition-all"
              >
                <Ban className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-300 font-semibold text-sm">
                  {blockedCount} {t('injury / blocked report')}{blockedCount > 1 ? 's' : ''} {t('need attention')}
                </span>
                <ChevronRight className="w-4 h-4 text-red-500 ml-auto" />
              </button>
            )}
          </div>
        )}

        {/* Master-detail grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Task list ── */}
          <div className="lg:col-span-2 space-y-3">
            {/* List header */}
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TaskStatus | '')}
                className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 flex-1"
              >
                <option value="">{t('All Statuses')}</option>
                <option value="todo">{t('To Do')}</option>
                <option value="in_progress">{t('In Progress')}</option>
                <option value="review">{t('Review')}</option>
                <option value="done">{t('Done')}</option>
                <option value="blocked">{t('Blocked')}</option>
              </select>
              {/* View mode toggle */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shrink-0">
                <button
                  onClick={() => setViewMode('flat')}
                  title={t('Flat list') || 'Flat list'}
                  className={cn('p-1.5 rounded-md transition-colors', viewMode === 'flat' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300')}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('grouped')}
                  title={t('Group by student') || 'Group by student'}
                  className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grouped' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300')}
                >
                  <Users className="w-3.5 h-3.5" />
                </button>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 shrink-0 text-xs px-3 py-2">
                <Plus className="w-4 h-4" /> {t('Assign Task')}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-16 text-zinc-600 text-sm border-2 border-dashed border-zinc-800 rounded-xl">
                {t('No tasks found.')}
              </div>
            ) : viewMode === 'flat' ? (
              <div className="space-y-4">
                {groupedTasks.map((group, groupIdx) => {
                  const parentTask = group[0];
                  const isGroup = group.length > 1;

                  return (
                    <div key={groupIdx} className={cn("flex flex-col gap-2", isGroup && "p-3 rounded-2xl bg-zinc-900/30 border border-zinc-800/60")}>
                      {isGroup && (
                        <div className="flex items-center gap-2 px-1 mb-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                            {t('Lộ trình')}: {parentTask.title}
                          </span>
                          <span className="ml-auto text-[10px] text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">
                            {group.filter(t => t.status === 'done').length}/{group.length} {t('Hoàn thành')}
                          </span>
                        </div>
                      )}
                      <div className="space-y-2">
                        {group.map((task, idx) => (
                          <TaskCard
                            key={task.id}
                            task={{ ...task, title: isGroup ? `${t('Buổi')} ${idx + 1}` : task.title }}
                            student={students.find((s) => s.id === task.userId)}
                            isSelected={selectedTask?.id === task.id}
                            onClick={() => openTask(task)}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Grouped by student
              <div className="space-y-4">
                {groupedByStudent.map(({ student, taskGroups: sTasksGroups }) => (
                  <div key={student?.id ?? 'unknown'}>
                    {/* Student group header */}
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {student?.fullName.charAt(0) ?? '?'}
                      </div>
                      <span className="text-xs font-bold text-zinc-400 truncate">{student?.fullName ?? '—'}</span>
                      <span className="ml-auto text-[10px] text-zinc-600 font-medium">{sTasksGroups.length} {t('Lộ trình')}</span>
                    </div>
                    <div className="space-y-4 pl-2 border-l border-zinc-800">
                      {sTasksGroups.map((group: Task[], groupIdx: number) => {
                        const parentTask = group[0];
                        const isGroup = group.length > 1;
                        return (
                          <div key={groupIdx} className={cn("flex flex-col gap-2", isGroup && "p-3 rounded-2xl bg-zinc-900/20 border border-zinc-800/40")}>
                            {isGroup && (
                              <div className="flex items-center gap-2 px-1 mb-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                  {t('Lộ trình')}: {parentTask.title}
                                </span>
                              </div>
                            )}
                            <div className="space-y-2">
                              {group.map((task: Task, idx: number) => (
                                <TaskCard
                                  key={task.id}
                                  task={{ ...task, title: isGroup ? `${t('Buổi')} ${idx + 1}` : task.title }}
                                  student={student}
                                  isSelected={selectedTask?.id === task.id}
                                  onClick={() => openTask(task)}
                                  hideStudent
                                  t={t}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Task detail + comments ── */}
          <div className="lg:col-span-3">
            {selectedTask ? (
              <Card className="border-zinc-800 flex flex-col" style={{ minHeight: '75vh' }}>
                <CardHeader
                  title={selectedTask.title}
                  subtitle={selectedStudent?.fullName ?? '—'}
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedTask.status} />
                    {/* Delete button */}
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        title={t('Delete task') || 'Delete task'}
                        className="p-1.5 rounded-lg hover:bg-red-900/30 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-red-950/30 border border-red-900/40 rounded-lg px-2 py-1">
                        <span className="text-[11px] text-red-300 font-medium">{t('Delete?')}</span>
                        <button
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="text-[11px] font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          {isDeleting ? '…' : t('Yes')}
                        </button>
                        <span className="text-zinc-700">·</span>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="text-[11px] text-zinc-500 hover:text-zinc-300"
                        >
                          {t('No')}
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => { setSelectedTask(null); setShowDeleteConfirm(false); }}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-5">
                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-xs text-zinc-500 border-b border-zinc-800/60 pb-4">
                    <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium', typeColor[selectedTask.type])}>
                      {typeIcon[selectedTask.type]}
                      {t(selectedTask.type.charAt(0).toUpperCase() + selectedTask.type.slice(1))}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {t('Due')}: {selectedTask.dueDate ? formatDate(selectedTask.dueDate) : t('Not set')}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserCircle2 className="w-3.5 h-3.5" />
                      {selectedStudent?.email ?? '—'}
                    </span>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                      {t('Instructions')}
                    </p>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {selectedTask.description || t('No description provided.')}
                    </p>
                  </div>

                  {/* ── Coach Actions ── */}
                  <div className="space-y-3">
                    {selectedTask.status === 'review' && !showReturnForm && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateStatus(selectedTask.id, 'done')}
                          className="gap-1.5 bg-green-700 hover:bg-green-600"
                        >
                          <CheckCircle2 className="w-4 h-4" /> {t('Approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowReturnForm(true)}
                          className="gap-1.5"
                        >
                          <CornerDownLeft className="w-4 h-4" /> {t('Return with Note')}
                        </Button>
                      </div>
                    )}

                    {/* Return-with-note inline form */}
                    {showReturnForm && (
                      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30 space-y-3">
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          ↩ {t('Return Task — Add a reason (optional)')}
                        </p>
                        <Textarea
                          id="returnNote"
                          placeholder={t('e.g. Please redo the squat sets with correct form...') || 'e.g. Please redo the squat sets with correct form...'}
                          value={returnNote}
                          onChange={(e) => setReturnNote(e.target.value)}
                          rows={3}
                          className="bg-zinc-900 resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleReturn}
                            isLoading={isReturning}
                            className="gap-1.5 bg-amber-600 hover:bg-amber-500"
                          >
                            <CornerDownLeft className="w-4 h-4" />
                            {returnNote.trim() ? t('Return with Note') : t('Return')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setShowReturnForm(false); setReturnNote(''); }}
                          >
                            {t('Cancel')}
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedTask.status === 'blocked' && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-red-950/20 border border-red-900/30">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-red-300 font-medium mb-2">
                            {t('Student reported a block or injury.')}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(selectedTask.id, 'todo')}
                            className="text-amber-400 border-amber-600/30 text-xs"
                          >
                            {t('Reassign Task')}
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedTask.status === 'done' && (
                      <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                        <CheckCircle2 className="w-5 h-5" /> {t('Task completed and approved.')}
                      </div>
                    )}
                  </div>

                  {/* ── Comments thread ── */}
                  <div className="flex-1 flex flex-col">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                      {t('Discussion with Student')}
                    </p>

                    <div className="flex-1 space-y-4 max-h-52 overflow-y-auto pr-1 mb-3">
                      {comments.length === 0 ? (
                        <p className="text-sm text-zinc-600 italic">{t('No messages yet.')}</p>
                      ) : (
                        comments.map((c) => {
                          const isMe = c.authorId === user?.id;
                          const authorName = isMe
                            ? (user?.fullName ?? 'Coach')
                            : (selectedStudent?.fullName ?? 'Student');
                          return (
                            <div key={c.id} className={cn('flex gap-2.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
                              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0">
                                {authorName.charAt(0)}
                              </div>
                              <div className={cn('flex flex-col gap-1', isMe ? 'items-end' : 'items-start')}>
                                <div className={cn(
                                  'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                                  isMe
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-sm',
                                )}>
                                  {renderContent(c.content)}
                                </div>
                                <span className="text-[10px] text-zinc-600 px-1">
                                  {authorName} · {relativeTime(c.createdAt)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={commentsEndRef} />
                    </div>

                    {/* Coach message input */}
                    <div className="flex gap-2 mt-auto">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendComment(); }}
                        placeholder={t('Leave a note or feedback...') || 'Leave a note or feedback...'}
                        className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                      />
                      <Button
                        onClick={sendComment}
                        isLoading={isSendingComment}
                        disabled={!commentText.trim()}
                        className="px-4 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-700 text-sm border-2 border-dashed border-zinc-800 rounded-2xl">
                <Dumbbell className="w-10 h-10 mb-3 opacity-30" />
                {t('Select a task to view details and discussion.')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setCreateTab('manual'); }} title={t('Assign New Task')}>
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg mb-4">
          <button
            onClick={() => setCreateTab('manual')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all',
              createTab === 'manual' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300')}
          >
            <Plus className="w-3.5 h-3.5" /> {t('Manual')}
          </button>
          <button
            onClick={() => setCreateTab('dataset')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all',
              createTab === 'dataset' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300')}
          >
            <Database className="w-3.5 h-3.5" /> {t('From Dataset')} <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">1,324</span>
          </button>
        </div>

        {createTab === 'dataset' ? (
          <ExercisePicker onSelect={handlePickExercise} onClose={() => setIsCreateOpen(false)} />
        ) : (
        <form onSubmit={handleCreate} className="space-y-4">
          {form.title && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/10 border border-blue-600/20 text-blue-300 text-xs">
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t('Pre-filled from dataset')}: <strong>{form.title}</strong></span>
              <button type="button" onClick={() => setForm((f) => ({ ...f, title: '', description: '' }))} className="ml-auto text-blue-400 hover:text-white shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <Select
            id="userId" label={t('Student')} value={form.userId}
            options={studentOptions}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
            required
          />
          <Input
            id="title" label={t('Task Title')}
            placeholder={t('e.g. Upper Body Strength Training') || 'e.g. Upper Body Strength Training'}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <Select
            id="type" label={t('Type')} value={form.type}
            options={TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TaskType }))}
          />
          <Textarea
            id="description" label={t('Description / Instructions')}
            placeholder={t('Describe the workout or nutrition plan in detail...') || 'Describe the workout or nutrition plan in detail...'}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          {form.type === 'workout' && (
            <Select
              id="frequency" label={t('Frequency')} value={form.frequency.toString()}
              options={[
                { value: '1', label: t('1 Session (Once)') },
                { value: '2', label: t('2 Sessions / Week') },
                { value: '3', label: t('3 Sessions / Week') },
                { value: '4', label: t('4 Sessions / Week') },
                { value: '5', label: t('5 Sessions / Week') },
              ]}
              onChange={(e) => setForm((f) => ({ ...f, frequency: parseInt(e.target.value) }))}
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreateOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" className="flex-1" isLoading={isSaving}>
              {t('Assign Task')}
            </Button>
          </div>
        </form>
        )}
      </Modal>
    </DashboardLayout>
  );
}
