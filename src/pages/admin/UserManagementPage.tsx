import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { UserManagementItem, UserRole } from '../../types';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Mail,
  User,
  Key,
  Calendar,
  Lock,
  Edit2,
  X
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<UserManagementItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'ANALYST' as UserRole,
    title: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      if (res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      await api.createUser(formData);
      setShowAddModal(false);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'ANALYST',
        title: ''
      });
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setFormError(null);
    setFormLoading(true);
    try {
      await api.updateUser(editUser.id, {
        fullName: editUser.fullName,
        title: editUser.title,
        role: editUser.role,
        isActive: editUser.isActive
      });
      setEditUser(null);
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update user.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.title && u.title.toLowerCase().includes(search.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const totalAdmins = users.filter((u) => u.role === 'ADMIN').length;
  const totalAnalysts = users.filter((u) => u.role === 'ANALYST').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            User Management & Access Control
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Govern user profiles, role assignments, and permission boundaries for platform operators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#667085]">Total Operators</div>
            <div className="text-2xl font-bold text-[#171717] mt-1">{users.length}</div>
            <div className="text-[11px] text-[#16A34A] font-medium mt-0.5">All accounts active</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#667085]">Admins (Full Governance)</div>
            <div className="text-2xl font-bold text-[#2563EB] mt-1">{totalAdmins}</div>
            <div className="text-[11px] text-[#667085] mt-0.5">Policy overrides & config</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#667085]">Recovery Analysts</div>
            <div className="text-2xl font-bold text-[#0D9488] mt-1">{totalAnalysts}</div>
            <div className="text-[11px] text-[#667085] mt-0.5">Operational investigations</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0D9488]">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#EAECF0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or title..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#667085] font-medium whitespace-nowrap">Filter Role:</span>
          <div className="flex items-center p-0.5 bg-[#F2F4F7] rounded-lg border border-[#EAECF0] text-xs">
            {(['ALL', 'ADMIN', 'ANALYST'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  roleFilter === r
                    ? 'bg-white text-[#171717] shadow-xs'
                    : 'text-[#667085] hover:text-[#171717]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[#EAECF0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] text-[#667085] font-semibold border-b border-[#EAECF0] uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Official Title</th>
                <th className="py-3 px-4">Role Assigned</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          u.role === 'ADMIN'
                            ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                            : 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                        }`}>
                          {u.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#171717]">{u.fullName}</div>
                          <div className="text-[11px] text-[#667085] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#98A2B3]" />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#344054] font-medium">
                      {u.title || (u.role === 'ADMIN' ? 'Chief Risk Officer' : 'Payment Recovery Analyst')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        u.role === 'ADMIN'
                          ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                          : 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                      }`}>
                        {u.role === 'ADMIN' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#DC2626]">
                          <XCircle className="w-3.5 h-3.5" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#667085]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setFormError(null);
                          setEditUser({ ...u });
                        }}
                        className="px-2.5 py-1 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg font-semibold text-xs shadow-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#667085]">
                    No operators found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Role Permissions Matrix */}
      <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#171717]">Role Permissions & Governance Matrix</h3>
          <p className="text-xs text-[#667085]">Detailed functional boundaries enforced across backend APIs and frontend navigation.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> ADMIN ROLE (Pramod Mahajan)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] font-bold border border-[#BFDBFE]">
                SUPERUSER
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#344054]">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                <span>Full access to all 12 platform dashboards and logs</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                <span>Override safety policies and retries on blocked cases</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                <span>Configure ML thresholds, retry caps, and safety bounds</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                <span>Manage operator accounts and role privilege assignments</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0D9488] flex items-center gap-1.5">
                <User className="w-4 h-4" /> ANALYST ROLE (Devin Thorne)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F0FDFA] text-[#0D9488] font-bold border border-[#CCFBF1]">
                OPERATOR
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#344054]">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                <span>Investigate failed transactions and recovery cases</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                <span>Execute policy-compliant retries, dunning, and payment links</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                <span>Escalate complex or disputed transactions to human desk</span>
              </li>
              <li className="flex items-center gap-1.5 text-[#98A2B3]">
                <XCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                <span>No policy overrides, user management, or system config</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#171717]">Create Operator Account</h3>
                  <p className="text-[11px] text-[#667085]">Register a new operator with assigned RBAC role.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-[#667085] hover:bg-[#F2F4F7] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626]">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. alex.morgan@recoverai.io"
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Official Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior Risk Analyst"
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Role Assignment</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                >
                  <option value="ANALYST">ANALYST (Operational Investigation & Recovery)</option>
                  <option value="ADMIN">ADMIN (Full Governance & Policy Overrides)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {formLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Create Operator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#171717]">Edit Operator Details</h3>
                  <p className="text-[11px] text-[#667085]">{editUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="p-1.5 text-[#667085] hover:bg-[#F2F4F7] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626]">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editUser.fullName}
                  onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Official Title</label>
                <input
                  type="text"
                  value={editUser.title || ''}
                  onChange={(e) => setEditUser({ ...editUser, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Role Assignment</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                >
                  <option value="ANALYST">ANALYST</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Account Active Status</label>
                <select
                  value={editUser.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditUser({ ...editUser, isActive: e.target.value === 'active' })}
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                >
                  <option value="active">Active (Can Sign In)</option>
                  <option value="inactive">Deactivated (Access Revoked)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-3.5 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {formLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
