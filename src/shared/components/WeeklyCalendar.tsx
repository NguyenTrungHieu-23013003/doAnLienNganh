'use client';

import { useState } from 'react';
import { Task, User } from '@/shared/types';
import { 
  startOfWeek, addDays, subDays, format, isSameDay, 
  startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Dumbbell, MessageSquare, Salad } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Card } from '@/shared/components/Card';

const typeIcon = {
  workout: <Dumbbell className="w-3.5 h-3.5" />,
  nutrition: <Salad className="w-3.5 h-3.5" />,
  consultation: <MessageSquare className="w-3.5 h-3.5" />,
};

const typeColor = {
  workout: 'bg-blue-600/20 text-blue-400 border-blue-600/30 font-bold',
  nutrition: 'bg-green-600/20 text-green-400 border-green-600/30 font-bold',
  consultation: 'bg-purple-600/20 text-purple-400 border-purple-600/30 font-bold',
};

export default function WeeklyCalendar({ tasks, students }: { tasks: Task[], students?: User[] }) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Week Days (Mon-Sun)
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  // Small Calendar Month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDateSm = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDateSm = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDateSm, end: endDateSm });

  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const prevWeek = () => setCurrentDate(subDays(currentDate, 7));
  const today = () => setCurrentDate(new Date());

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* ── Main Weekly Grid ── */}
      <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-lg p-1">
              <button onClick={prevWeek} className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={today} className="px-3 py-1 text-sm font-semibold hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-white transition-colors">
                {t('Today')}
              </button>
              <button onClick={nextWeek} className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-lg font-bold">
              {format(startDate, 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
            </h2>
          </div>
          <div className="hidden sm:flex text-sm text-zinc-500 font-medium items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {t('Weekly Schedule')}
          </div>
        </div>

        {/* Grid Header */}
        <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/30">
          {weekDays.map((day, i) => {
            const isTodayDay = isSameDay(day, new Date());
            return (
              <div key={i} className="text-center py-3 border-r border-zinc-800 last:border-0 relative">
                {isTodayDay && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />}
                <div className={cn("text-xs font-bold uppercase tracking-wider mb-1", isTodayDay ? 'text-blue-400' : 'text-zinc-500')}>
                  {format(day, 'EEE')}
                </div>
                <div className={cn("text-lg font-black", isTodayDay ? 'text-white' : 'text-zinc-300')}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid Body */}
        <div className="flex-1 grid grid-cols-7 bg-zinc-950/30 relative min-h-[500px]">
          {weekDays.map((day, i) => {
            const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
            return (
              <div key={i} className="border-r border-zinc-800/60 last:border-0 p-2 space-y-2 h-full">
                {dayTasks.map(task => {
                  const student = students?.find(s => s.id === task.userId);
                  return (
                    <div 
                      key={task.id} 
                      className={cn("p-2 rounded-xl border flex flex-col gap-2 min-h-[90px]", typeColor[task.type])}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] opacity-80 font-bold">
                        {typeIcon[task.type]}
                        <span className="uppercase tracking-wider">{t(task.type)}</span>
                        {student && (
                          <span className="ml-auto bg-zinc-900/50 text-white px-1.5 py-0.5 rounded-full truncate max-w-[60px]">
                            {student.fullName}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm leading-tight line-clamp-3 text-white">
                        {task.title}
                      </div>
                      <div className="mt-auto pt-2">
                        <StatusBadge status={task.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Panel: Small Navigator ── */}
      <div className="w-full lg:w-72 space-y-6">
        <Card className="border-zinc-800 bg-zinc-950 shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold text-sm tracking-widest uppercase">{format(currentDate, 'MMMM yyyy')}</h3>
            <div className="flex gap-1">
              <button onClick={() => setCurrentDate(subDays(currentDate, 28))} className="text-zinc-500 hover:text-white p-1">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentDate(addDays(currentDate, 28))} className="text-zinc-500 hover:text-white p-1">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                <div key={d} className="text-[10px] text-center font-bold text-zinc-600 uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {calendarDays.map((day, i) => {
                const isSelected = isSameDay(day, currentDate);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayStr = isSameDay(day, new Date());
                const activeTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day)).length;
                return (
                  <button 
                    key={i}
                    onClick={() => setCurrentDate(day)}
                    className={cn(
                      "aspect-square rounded-full flex flex-col items-center justify-center font-semibold transition-all relative border",
                      !isCurrentMonth ? "text-zinc-700 border-transparent" : "text-zinc-300 border-transparent hover:bg-zinc-800",
                      isSelected && "bg-blue-600/30 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]",
                      isTodayStr && !isSelected && "bg-zinc-800 border-zinc-700 text-white"
                    )}
                  >
                    {format(day, 'd')}
                    {activeTasks > 0 && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
