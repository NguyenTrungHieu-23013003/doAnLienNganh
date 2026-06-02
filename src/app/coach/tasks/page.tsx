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
  AlertCircle,
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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

// ── Component ────────────────────────────────────────────────
export default function CoachTasksPage() {
  const { t } = useTranslation();
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
  const [form, setForm] = useState({
    userId: '', title: '', type: 'workout' as TaskType, description: '', dueDate: '',
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

  // ── Data fetching ────────────────────────────────────────
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
    setIsSaving(false);
    setIsCreateOpen(false);
    setForm({ userId: '', title: '', type: 'workout', description: '', dueDate: '' });
    fetchData();
  };

  // ── Derived ──────────────────────────────────────────────
  const displayed = filterStatus ? tasks.filter((t) => t.status === filterStatus) : tasks;
  const reviewCount = tasks.filter((t) => t.status === 'review').length;
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;
  const studentOptions = [
    { value: '', label: t('Select student...') },
    ...students.map((s) => ({ value: s.id, label: s.fullName })),
  ];
  const selectedStudent = selectedTask
    ? students.find((s) => s.id === selectedTask.userId)
    : null;

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
            <div className="flex items-center gap-3">
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
            ) : (
              <div className="space-y-2">
                {displayed.map((task) => {
                  const student = students.find((s) => s.id === task.userId);
                  const isSelected = selectedTask?.id === task.id;
                  return (
                    <button
                      key={task.id}
                      onClick={() => openTask(task)}
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
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                              <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold shrink-0">
                                {student?.fullName.charAt(0) ?? '?'}
                              </div>
                              <span className="truncate max-w-[80px]">{student?.fullName ?? '—'}</span>
                            </div>
                            <StatusBadge status={task.status} />
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
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
                    <button
                      onClick={() => setSelectedTask(null)}
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
                      {t('Due')} {formatDate(selectedTask.dueDate)}
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
                                  'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                                  isMe
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-sm',
                                )}>
                                  {c.content}
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
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={t('Assign New Task')}>
        <form onSubmit={handleCreate} className="space-y-4">
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
          <Input
            id="dueDate" type="date" label={t('Due Date')} value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            required
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreateOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" className="flex-1" isLoading={isSaving}>
              {t('Assign Task')}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
