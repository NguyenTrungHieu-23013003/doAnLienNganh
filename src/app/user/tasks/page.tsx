'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Modal } from '@/shared/components/Modal';
import { Textarea } from '@/shared/components/FormFields';
import { Task, Comment, TaskStatus, User } from '@/shared/types';
import { useAuth } from '@/features/auth/AuthContext';
import { Dumbbell, Salad, MessageSquare, Calendar, Ban, PlayCircle, CheckCheck, Send, X } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';

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

export default function UserTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [coachInfo, setCoachInfo] = useState<User | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const res = await fetch(`/api/tasks?userId=${user.id}`, { cache: 'no-store' });
    setTasks(await res.json());
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (user?.coachId) {
      fetch(`/api/users/${user.coachId}`).then((r) => r.json()).then(setCoachInfo);
    }
  }, [user]);

  const fetchComments = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/comments?taskId=${taskId}`, { cache: 'no-store' });
    setComments(await res.json());
  }, []);

  const openTask = (task: Task) => {
    setSelectedTask(task);
    fetchComments(task.id);
  };

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchTasks();
    setSelectedTask((prev) => prev ? { ...prev, status } : null);
  };

  const sendComment = async () => {
    if (!commentText.trim() || !selectedTask || !user) return;
    setIsSendingComment(true);
    await fetch('/api/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: selectedTask.id, authorId: user.id, content: commentText }),
    });
    setCommentText('');
    fetchComments(selectedTask.id);
    setIsSendingComment(false);
  };

  const displayed = filterStatus ? tasks.filter((t) => t.status === filterStatus) : tasks;

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
        {/* Task List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">My Tasks</h2>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TaskStatus | '')}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
              <option value="">All</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">No tasks found.</div>
          ) : (
            <div className="space-y-3">
              {displayed.map((task) => (
                <button key={task.id} onClick={() => openTask(task)}
                  className={cn('w-full text-left p-4 rounded-xl border transition-all', selectedTask?.id === task.id ? 'border-blue-600/40 bg-blue-600/5' : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', typeColor[task.type])}>
                      {typeIcon[task.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-snug mb-1 truncate">{task.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <StatusBadge status={task.status} />
                        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Task Detail */}
        <div className="lg:col-span-3">
          {selectedTask ? (
            <Card className="border-zinc-800 flex flex-col" style={{ minHeight: '70vh' }}>
              <CardHeader title={selectedTask.title} subtitle={`Due ${formatDate(selectedTask.dueDate)}`}>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedTask.status} />
                  <button onClick={() => setSelectedTask(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-6">
                {/* Description */}
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Instructions</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{selectedTask.description || 'No description provided.'}</p>
                </div>

                {/* User Actions */}
                <div className="flex flex-wrap gap-3">
                  {selectedTask.status === 'todo' && (
                    <Button size="sm" onClick={() => updateStatus(selectedTask.id, 'in_progress')} className="gap-1.5">
                      <PlayCircle className="w-4 h-4" /> Start Task
                    </Button>
                  )}
                  {selectedTask.status === 'in_progress' && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(selectedTask.id, 'review')} className="gap-1.5 bg-amber-600 hover:bg-amber-500">
                        <CheckCheck className="w-4 h-4" /> Submit for Review
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => updateStatus(selectedTask.id, 'blocked')} className="gap-1.5">
                        <Ban className="w-4 h-4" /> Report Injury / Block
                      </Button>
                    </>
                  )}
                  {selectedTask.status === 'blocked' && (
                    <div className="w-full p-3 rounded-xl bg-red-950/20 border border-red-900/30">
                      <p className="text-sm text-red-300 font-medium">⚠ This task is blocked. Your coach has been notified and will adjust your plan.</p>
                    </div>
                  )}
                  {selectedTask.status === 'done' && (
                    <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                      <CheckCheck className="w-5 h-5" /> Coach approved — completed!
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div className="flex-1 flex flex-col">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Discussion with Coach</p>
                  <div className="flex-1 space-y-3 max-h-60 overflow-y-auto pr-1 mb-4">
                    {comments.length === 0 ? (
                      <p className="text-sm text-zinc-600 italic">No messages yet. Start the conversation!</p>
                    ) : (
                      comments.map((c) => {
                        const isMe = c.authorId === user?.id;
                        return (
                          <div key={c.id} className={cn('flex gap-2.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
                            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0">
                              {isMe ? user?.fullName.charAt(0) : coachInfo?.fullName.charAt(0) ?? 'C'}
                            </div>
                            <div className={cn('max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                              isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-sm')}>
                              {c.content}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex gap-3 items-end">
                    <Textarea id="comment" placeholder="Send a message to your coach..." value={commentText}
                      onChange={(e) => setCommentText(e.target.value)} className="flex-1 resize-none" rows={2}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }} />
                    <Button size="icon" onClick={sendComment} isLoading={isSendingComment} className="mb-0.5 h-10 w-10">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-700 text-sm border-2 border-dashed border-zinc-800 rounded-2xl">
              <Dumbbell className="w-10 h-10 mb-3 opacity-30" />
              Select a task to view details and chat with your coach.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
