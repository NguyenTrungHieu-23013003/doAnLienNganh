'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Textarea } from '@/shared/components/FormFields';
import { Task, Comment, TaskStatus, User } from '@/shared/types';
import { useSession } from 'next-auth/react';
import {
  Dumbbell, Salad, MessageSquare, Calendar, Ban, PlayCircle,
  CheckCheck, Send, X, AlertTriangle, Clock, Video,
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const typeIcon: Record<string, React.ReactNode> = {
  workout: <Dumbbell className="w-4 h-4" />,
  nutrition: <Salad className="w-4 h-4" />,
  consultation: <MessageSquare className="w-4 h-4" />,
};
const typeColor: Record<string, string> = {
  workout: 'text-blue-400 bg-blue-600/10',
  nutrition: 'text-green-400 bg-green-600/10',
  consultation: 'text-purple-400 bg-purple-600/10',
};

// ── Helpers ────────────────────────────────────────────────

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

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Urgency = 'overdue' | 'urgent' | 'soon' | 'normal';

function getDueUrgency(dueDate: string | null, status: TaskStatus): Urgency {
  if (!dueDate) return 'normal';
  if (status === 'done' || status === 'blocked') return 'normal';
  const diffDays = (new Date(dueDate).getTime() - Date.now()) / 86_400_000;
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 1) return 'urgent';
  if (diffDays <= 2) return 'soon';
  return 'normal';
}

const urgencyConfig: Record<Urgency, { label: string; pill: string; cardBorder: string; icon: React.ElementType | null }> = {
  overdue: {
    label: 'Overdue',
    pill: 'text-red-400 bg-red-600/10 border-red-600/30',
    cardBorder: 'border-red-900/50',
    icon: AlertTriangle,
  },
  urgent: {
    label: 'Due Today',
    pill: 'text-orange-400 bg-orange-600/10 border-orange-600/30',
    cardBorder: 'border-orange-900/50',
    icon: Clock,
  },
  soon: {
    label: 'Due Soon',
    pill: 'text-yellow-400 bg-yellow-600/10 border-yellow-600/30',
    cardBorder: 'border-yellow-900/40',
    icon: Clock,
  },
  normal: { label: '', pill: '', cardBorder: 'border-zinc-800', icon: null },
};

const urgencyOrder: Record<Urgency, number> = { overdue: 0, urgent: 1, soon: 2, normal: 3 };

// ── Component ──────────────────────────────────────────────
export default function UserTasksPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as { id: string; role: string; fullName: string; coachId?: string } | undefined;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [coachInfo, setCoachInfo] = useState<User | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const res = await fetch(`/api/tasks?userId=${user.id}`, { cache: 'no-store' });
    setTasks(await res.json());
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Fetch coach info
  useEffect(() => {
    if (user?.coachId) {
      fetch(`/api/users/${user.coachId}`).then((r) => r.json()).then(setCoachInfo);
    }
  }, [user]);

  // Fetch comments + scroll to bottom
  const fetchComments = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/comments?taskId=${taskId}`, { cache: 'no-store' });
    setComments(await res.json());
  }, []);

  useEffect(() => {
    if (comments.length > 0) {
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [comments]);

  const openTask = (task: Task) => {
    setSelectedTask(task);
    fetchComments(task.id);
  };

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchTasks();
    setSelectedTask((prev) => (prev ? { ...prev, status } : null));
  };

  // ── Fixed send: video URL is proper state, no setTimeout ──
  const sendComment = async () => {
    if (!selectedTask || !user) return;
    const text = commentText.trim();
    const vid = videoUrl.trim();
    const content = text && vid
      ? `${text}\n🎥 Video: ${vid}`
      : vid
        ? `🎥 Video: ${vid}`
        : text;
    if (!content) return;

    setIsSendingComment(true);
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: selectedTask.id, authorId: user.id, content }),
    });
    setCommentText('');
    setVideoUrl('');
    await fetchComments(selectedTask.id);
    setIsSendingComment(false);
  };

  // Sort by urgency then by dueDate ascending
  const displayed = (() => {
    const list = filterStatus ? tasks.filter((t) => t.status === filterStatus) : tasks;
    return [...list].sort((a, b) => {
      const diff = urgencyOrder[getDueUrgency(a.dueDate, a.status)] - urgencyOrder[getDueUrgency(b.dueDate, b.status)];
      if (diff !== 0) return diff;
      if (!a.dueDate && !b.dueDate) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (!a.dueDate) return -1;
      if (!b.dueDate) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  })();

  const taskGroups = (() => {
    const map = new Map<string, Task[]>();
    for (const t of displayed) {
      const key = `${t.title}|${t.createdAt.substring(0, 16)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.values());
  })();

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">

        {/* ── Task List ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t('My Tasks')}</h2>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | '')}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">{t('All')}</option>
              <option value="todo">{t('To Do')}</option>
              <option value="in_progress">{t('In Progress')}</option>
              <option value="review">{t('Review')}</option>
              <option value="done">{t('Done')}</option>
              <option value="blocked">{t('Blocked')}</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">{t('No tasks found.')}</div>
          ) : (
            <div className="space-y-3">
              {taskGroups.map((group, groupIdx) => {
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
                      {group.map((task, idx) => {
                        const urgency = getDueUrgency(task.dueDate, task.status);
                        const cfg = urgencyConfig[urgency];
                        const isSelected = selectedTask?.id === task.id;
                        return (
                          <button
                            key={task.id}
                            onClick={() => openTask(task)}
                            className={cn(
                              'w-full text-left p-3.5 rounded-xl border transition-all',
                              isSelected
                                ? 'border-blue-600/40 bg-blue-600/5'
                                : urgency !== 'normal'
                                  ? `${cfg.cardBorder} bg-zinc-950/50 hover:border-zinc-700`
                                  : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700',
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', typeColor[task.type])}>
                                {typeIcon[task.type]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm leading-snug mb-1 truncate">
                                  {isGroup ? `${t('Buổi')} ${idx + 1}` : task.title}
                                </p>
                                <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                                  <StatusBadge status={task.status} />
                                  <div className="flex items-center gap-1.5">
                                    {cfg.icon && (
                                      <span className={cn(
                                        'text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full border',
                                        cfg.pill,
                                      )}>
                                        <cfg.icon className="w-3 h-3" />
                                        {t(cfg.label)}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {task.dueDate ? formatDate(task.dueDate) : t('Unscheduled (Select Date)')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Task Detail ── */}
        <div className="lg:col-span-3">
          {selectedTask ? (
            <Card className="border-zinc-800 flex flex-col" style={{ minHeight: '70vh' }}>
              <CardHeader title={selectedTask.title} subtitle={selectedTask.dueDate ? `Due ${formatDate(selectedTask.dueDate)}` : t('Not Scheduled')}>
                <div className="flex items-center gap-2">
                  {/* Due date badge in header */}
                  {(() => {
                    const urg = getDueUrgency(selectedTask.dueDate, selectedTask.status);
                    const cfg = urgencyConfig[urg];
                    if (!cfg.icon) return null;
                    return (
                      <span className={cn('text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-full border', cfg.pill)}>
                        <cfg.icon className="w-3.5 h-3.5" />
                        {t(cfg.label)}
                      </span>
                    );
                  })()}
                  <StatusBadge status={selectedTask.status} />
                  <button onClick={() => setSelectedTask(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-6">
                {/* Description */}
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('Instructions')}</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {selectedTask.description || t('No description provided.')}
                  </p>
                </div>

                {/* User Actions */}
                <div className="flex flex-wrap gap-3">
                  {selectedTask.status === 'todo' && !selectedTask.dueDate && (
                    <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-900/20 border border-blue-800/40">
                      <span className="text-sm font-medium text-blue-300">{t('Hãy chọn ngày tập:')}</span>
                      <input 
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="bg-zinc-900 border border-zinc-700 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                        onBlur={async (e) => {
                          const newDate = e.target.value;
                          if (!newDate) return;
                          // Validate: năm phải >= 2020 và <= 2100 để tránh lưu ngày dở dang
                          const year = new Date(newDate).getFullYear();
                          if (year < 2020 || year > 2100) return;
                          await fetch(`/api/tasks/${selectedTask.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ dueDate: newDate }),
                          });
                          fetchTasks();
                          setSelectedTask((prev) => (prev ? { ...prev, dueDate: newDate } : null));
                        }}
                      />
                    </div>
                  )}

                  {selectedTask.status === 'todo' && selectedTask.dueDate && (
                    <Button size="sm" onClick={() => updateStatus(selectedTask.id, 'in_progress')} className="gap-1.5">
                      <PlayCircle className="w-4 h-4" /> {t('Start Task')}
                    </Button>
                  )}
                  {selectedTask.status === 'in_progress' && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(selectedTask.id, 'review')} className="gap-1.5 bg-amber-600 hover:bg-amber-500">
                        <CheckCheck className="w-4 h-4" /> {t('Submit for Review')}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => updateStatus(selectedTask.id, 'blocked')} className="gap-1.5">
                        <Ban className="w-4 h-4" /> {t('Report Injury / Block')}
                      </Button>
                    </>
                  )}
                  {selectedTask.status === 'blocked' && (
                    <div className="w-full p-3 rounded-xl bg-red-950/20 border border-red-900/30">
                      <p className="text-sm text-red-300 font-medium">
                        {t('⚠ This task is blocked. Your coach has been notified and will adjust your plan.')}
                      </p>
                    </div>
                  )}
                  {selectedTask.status === 'done' && (
                    <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                      <CheckCheck className="w-5 h-5" /> {t('Coach approved — completed!')}
                    </div>
                  )}
                </div>

                {/* ── Discussion ── */}
                <div className="flex-1 flex flex-col">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    {t('Discussion with Coach')}
                  </p>

                  {/* Message list */}
                  <div className="flex-1 space-y-4 max-h-60 overflow-y-auto pr-1 mb-4">
                    {comments.length === 0 ? (
                      <p className="text-sm text-zinc-600 italic">{t('No messages yet. Start the conversation!')}</p>
                    ) : (
                      comments.map((c) => {
                        const isMe = c.authorId === user?.id;
                        const authorName = isMe ? (user?.fullName ?? 'You') : (coachInfo?.fullName ?? 'Coach');
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
                              {/* Timestamp */}
                              <span className="text-[10px] text-zinc-600 px-1">
                                {authorName} · {relativeTime(c.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {/* Scroll anchor */}
                    <div ref={commentsEndRef} />
                  </div>

                  {/* ── Input area (fixed video URL flow) ── */}
                  <div className="flex flex-col gap-2 mt-2">
                    <Textarea
                      id="comment"
                      placeholder={t('Send a message or notes...') || 'Send a message or notes...'}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="w-full resize-none bg-zinc-900"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendComment();
                        }
                      }}
                    />

                    {/* Video URL row */}
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus-within:border-blue-500 transition-colors">
                        <Video className="w-4 h-4 text-zinc-500 shrink-0" />
                        <input
                          id="videoLink"
                          type="url"
                          placeholder={t('Video URL (YouTube, Drive, TikTok...)') || 'Video URL (YouTube, Drive, TikTok...)'}
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); sendComment(); }
                          }}
                          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none min-w-0"
                        />
                        {videoUrl && (
                          <button onClick={() => setVideoUrl('')} className="text-zinc-600 hover:text-zinc-400 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <Button
                        onClick={sendComment}
                        isLoading={isSendingComment}
                        disabled={!commentText.trim() && !videoUrl.trim()}
                        className="gap-2 shrink-0"
                      >
                        <Send className="w-4 h-4" /> {t('Send')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-700 text-sm border-2 border-dashed border-zinc-800 rounded-2xl">
              <Dumbbell className="w-10 h-10 mb-3 opacity-30" />
              {t('Select a task to view details and chat with your coach.')}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
