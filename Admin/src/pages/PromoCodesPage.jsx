import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TableWrapper, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmptyState } from '../components/ui/Table';
import { CreatePromoModal } from '../components/modals/CreatePromoModal';
import { formatCurrency, formatDateTime, copyToClipboard } from '../utils/formatters';
import { adminApi } from '../api/adminApi';
import { Ticket, Plus, Check, Copy, Trash2, Power, Users } from 'lucide-react';

export function PromoCodesPage({ onRefresh }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPromos();
      setPromos(data.promos || []);
    } catch (err) {
      console.error('Error fetching promos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async (payload) => {
    setCreateLoading(true);
    try {
      await adminApi.createPromo(payload);
      setIsCreateOpen(false);
      fetchPromos();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create promo code');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleTogglePromo = async (id, currentStatus) => {
    try {
      await adminApi.togglePromo(id, !currentStatus);
      fetchPromos();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle promo code');
    }
  };

  const handleDeletePromo = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete promo code "${code}"?`)) return;
    try {
      await adminApi.deletePromo(id);
      fetchPromos();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete promo code');
    }
  };

  const handleCopyCode = async (id, code) => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header with Create Action */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-admin-text">Active Codes ({promos.length})</div>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="text-xs font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Promo Code
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promo Code</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Usage Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.length > 0 ? (
                promos.map((p) => {
                  const used = parseInt(p.used_count) || 0;
                  const max = parseInt(p.max_uses) || 1;
                  const pct = Math.min(100, Math.round((used / max) * 100));
                  const isActive = !!p.is_active;

                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                            {p.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(p.id, p.code)}
                            className="p-1 rounded text-admin-muted hover:text-admin-text"
                            title="Copy code"
                          >
                            {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(p.reward_amount)}
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-admin-text font-medium">{used} / {max}</span>
                            <span className="text-admin-muted">{pct}%</span>
                          </div>
                          <div className="w-full bg-admin-border h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'success' : 'default'} dot>
                          {isActive ? 'ACTIVE' : 'DISABLED'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-admin-muted">{p.created_by || 'Admin'}</TableCell>
                      <TableCell className="text-right space-x-1.5">
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => handleTogglePromo(p.id, isActive)}
                          title={isActive ? 'Disable Promo' : 'Enable Promo'}
                        >
                          <Power className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-admin-muted'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => handleDeletePromo(p.id, p.code)}
                          title="Delete Promo"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <td colSpan={6} className="py-12">
                    <TableEmptyState
                      icon={Ticket}
                      title="No Promo Codes Created"
                      description="Create your first promotional reward code using the button above."
                    />
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableWrapper>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {promos.length > 0 ? (
          promos.map((p) => {
            const used = parseInt(p.used_count) || 0;
            const max = parseInt(p.max_uses) || 1;
            const pct = Math.min(100, Math.round((used / max) * 100));
            const isActive = !!p.is_active;

            return (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-admin-card border border-admin-border shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                      {p.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(p.id, p.code)}
                      className="p-1 rounded text-admin-muted hover:text-admin-text"
                    >
                      {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <Badge variant={isActive ? 'success' : 'default'} dot>
                    {isActive ? 'ACTIVE' : 'DISABLED'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-admin-muted">Reward</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(p.reward_amount)}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-admin-muted">
                    <span>Usage</span>
                    <span className="text-admin-text font-medium">{used} / {max} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-admin-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-admin-border">
                  <Button
                    variant={isActive ? 'outline' : 'default'}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleTogglePromo(p.id, isActive)}
                  >
                    <Power className="w-3.5 h-3.5 mr-1" />
                    {isActive ? 'Disable' : 'Activate'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePromo(p.id, p.code)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-10">
              <TableEmptyState
                icon={Ticket}
                title="No Promo Codes Created"
                description="Create your first promotional reward code using the button above."
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Promo Modal */}
      <CreatePromoModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreatePromo}
        isLoading={createLoading}
      />
    </div>
  );
}
