import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { ClipboardList, Plus, Trash2, Edit2, CheckCircle2, XCircle, ExternalLink, Sparkles, Award } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward_amount: '5',
    task_type: 'telegram_channel',
    target_url: '',
    action_label: 'Join',
    is_active: true
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getTasks();
      if (res && res.tasks) setTasks(res.tasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      reward_amount: '5',
      task_type: 'telegram_channel',
      target_url: 'https://t.me/',
      action_label: 'Join',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      reward_amount: String(task.reward_amount || '5'),
      task_type: task.task_type || 'custom',
      target_url: task.target_url || '',
      action_label: task.action_label || 'Join',
      is_active: task.is_active !== false
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSubmitting(true);
    try {
      if (editingTask) {
        await adminApi.updateTask(editingTask.id, formData);
      } else {
        await adminApi.createTask(formData);
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await adminApi.deleteTask(id);
      fetchTasks();
    } catch (err) {
      alert('Failed to delete task');
    }
  };

  const handleToggleActive = async (task) => {
    try {
      await adminApi.updateTask(task.id, { is_active: !task.is_active });
      fetchTasks();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-amber-500" />
            Dynamic Tasks & Rewards
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create custom tasks, set reward amounts, and incentivize user engagement.
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create New Task
        </Button>
      </div>

      {/* Task List */}
      <Card className="bg-slate-900/60 border-slate-800 p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-semibold">No tasks created yet</p>
            <p className="text-xs text-slate-500 mt-1">Click "Create New Task" above to add your first reward task.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-100">{task.title}</span>
                    </div>
                    <Badge variant={task.is_active ? 'success' : 'secondary'}>
                      {task.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      +{parseFloat(task.reward_amount).toFixed(2)} ETB
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                      Type: {task.task_type}
                    </span>
                    {task.target_url && (
                      <a
                        href={task.target_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Link
                      </a>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Claims: <strong className="text-slate-200">{task.total_claims || 0}</strong> users
                    ({formatCurrency(task.total_paid_out || 0)})
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(task)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold ${
                        task.is_active
                          ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                      title={task.is_active ? 'Deactivate task' : 'Activate task'}
                    >
                      {task.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                      title="Edit task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create / Edit Task Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingTask ? 'Edit Task' : 'Create New Reward Task'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Task Title *</label>
              <Input
                placeholder="e.g. Join BingoX Channel"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-slate-950 border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
              <textarea
                placeholder="Short description of what the user needs to do..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-20 px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Reward (ETB) *</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="5.00"
                  value={formData.reward_amount}
                  onChange={(e) => setFormData({ ...formData, reward_amount: e.target.value })}
                  required
                  className="bg-slate-950 border-slate-800 font-bold text-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Task Type</label>
                <select
                  value={formData.task_type}
                  onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-slate-950 border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="telegram_channel">Telegram Channel</option>
                  <option value="telegram_group">Telegram Group</option>
                  <option value="social_link">Social / Web Link</option>
                  <option value="daily_checkin">Daily Check-in</option>
                  <option value="referral_milestone">Referral Milestone</option>
                  <option value="custom">Custom Action</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Target URL</label>
                <Input
                  placeholder="https://t.me/yourchannel"
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Button Label</label>
                <Input
                  placeholder="e.g. Join, Claim, Open"
                  value={formData.action_label}
                  onChange={(e) => setFormData({ ...formData, action_label: e.target.value })}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-slate-800 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="is_active" className="text-sm font-semibold text-slate-300">
                Active & Visible to Players
              </label>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-slate-800 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
