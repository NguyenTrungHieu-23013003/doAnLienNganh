'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { Input, Select } from '@/shared/components/FormFields';
import { User, Role } from '@/shared/types';
import { Plus, Trash2, Pencil, Users, Shield, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from "react-i18next";

const ROLE_OPTIONS = [
  { value: 'user', label: 'User (Student)' },
  { value: 'coach', label: 'Coach' },
  { value: 'admin', label: 'Admin' },
];

const RoleBadge = ({ role }: { role: Role }) => {
  const styles: Record<Role, string> = {
    admin: 'bg-purple-600/10 text-purple-400 border-purple-600/30',
    coach: 'bg-blue-600/10 text-blue-400 border-blue-600/30',
    user: 'bg-green-600/10 text-green-400 border-green-600/30',
  };
  const icons: Record<Role, React.ReactNode> = {
    admin: <Shield className="w-3 h-3" />, coach: <Dumbbell className="w-3 h-3" />, user: <Users className="w-3 h-3" />,
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase', styles[role])}>
      {icons[role]} {role}
    </span>
  );
};

export default function AdminUsersPage() {
    const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', role: 'user' as Role, coachId: '' });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterRole, setFilterRole] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch('/api/users', { cache: 'no-store' });
    const data = await res.json();
    setUsers(data);
    setCoaches(data.filter((u: User) => u.role === 'coach'));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ fullName: '', email: '', role: 'user', coachId: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({ fullName: user.fullName, email: user.email, role: user.role, coachId: user.coachId || '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      const url = editUser ? `/api/users/${editUser.id}` : '/api/users';
      const method = editUser ? 'PATCH' : 'POST';
      const body = { ...form, coachId: form.coachId || undefined };

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || 'Failed to save user.');
        return;
      }
      setIsModalOpen(false);
      fetchUsers();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  const displayed = filterRole ? users.filter((u) => u.role === filterRole) : users;

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    coaches: users.filter((u) => u.role === 'coach').length,
    students: users.filter((u) => u.role === 'user').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.total, color: 'text-white' },
            { label: 'Admins', value: stats.admins, color: 'text-purple-400' },
            { label: 'Coaches', value: stats.coaches, color: 'text-blue-400' },
            { label: 'Students', value: stats.students, color: 'text-green-400' },
          ].map((s) => (
            <Card key={s.label} className="border-zinc-800 bg-zinc-950/50">
              <CardContent className="pt-5 pb-5">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{s.label}</p>
                <p className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User Table */}
        <Card className="border-zinc-800">
          <CardHeader title="User Management" subtitle="Create, edit, and manage all platform accounts">
            <div className="flex items-center gap-3">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">{t("All Roles")}</option>
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="w-4 h-4" /> {t("Add User")}</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">{t("Name")}</th>
                    <th className="px-6 py-3 text-left">{t("Email")}</th>
                    <th className="px-6 py-3 text-left">{t("Role")}</th>
                    <th className="px-6 py-3 text-left">{t("Assigned Coach")}</th>
                    <th className="px-6 py-3 text-left">{t("Joined")}</th>
                    <th className="px-6 py-3 text-right">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((user) => {
                    const coach = coaches.find((c) => c.id === user.coachId);
                    return (
                      <tr key={user.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                              {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-white">{user.fullName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{user.email}</td>
                        <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                        <td className="px-6 py-4 text-zinc-400">{coach ? coach.fullName : <span className="text-zinc-700">—</span>}</td>
                        <td className="px-6 py-4 text-zinc-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(user)} title="Edit">
                              <Pencil className="w-4 h-4 text-zinc-400" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(user.id)} title="Delete">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editUser ? 'Edit User' : 'Add New User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="fullName" label="Full Name" placeholder="John Doe" value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
          <Input id="email" type="email" label="Email Address" placeholder="user@fitness.com" value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          <Select id="role" label="Role" value={form.role} options={ROLE_OPTIONS}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role, coachId: '' }))} />
          {form.role === 'user' && (
            <Select id="coachId" label="Assign Coach (optional)" value={form.coachId}
              options={[{ value: '', label: 'No coach assigned' }, ...coaches.map((c) => ({ value: c.id, label: c.fullName }))]}
              onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value }))} />
          )}
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>{t("Cancel")}</Button>
            <Button type="submit" className="flex-1" isLoading={isSaving}>{editUser ? 'Save Changes' : 'Create User'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
