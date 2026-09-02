import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { DepositsPage } from './pages/DepositsPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { PromoCodesPage } from './pages/PromoCodesPage';
import { TasksPage } from './pages/TasksPage';
import { BroadcastPage } from './pages/BroadcastPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { SettingsPage } from './pages/SettingsPage';
import { adminApi } from './api/adminApi';
import { initAdminSocket, disconnectAdminSocket } from './socket';
import { playDepositChime, playWithdrawalChime } from './utils/audioAlerts';
import { sendPhoneNotification, requestNotificationPermission, getNotificationPermission } from './utils/notifications';
import { ArrowDownLeft, ArrowUpRight, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from './utils/formatters';

function AdminPortal() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Shared state
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  // Auto-request notification permissions on login
  useEffect(() => {
    if (isAuthenticated && getNotificationPermission() === 'default') {
      const timer = setTimeout(() => {
        requestNotificationPermission();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const fetchAllData = useCallback(async (isSilent = false) => {
    if (!isAuthenticated) return;
    if (!isSilent) setIsRefreshing(true);

    try {
      const [metricsData, usersData, depositsData, withdrawalsData, maintData] = await Promise.allSettled([
        adminApi.getMetrics(),
        adminApi.getUsers(),
        adminApi.getDeposits(),
        adminApi.getWithdrawals(),
        adminApi.getMaintenance(),
      ]);

      let pendingDeps = 0;
      let pendingWiths = 0;

      if (depositsData.status === 'fulfilled') {
        const depList = depositsData.value || [];
        setDeposits(depList);
        pendingDeps = depList.filter(d => String(d.status).toLowerCase() === 'pending').length;
      }

      if (withdrawalsData.status === 'fulfilled') {
        const withList = withdrawalsData.value || [];
        setWithdrawals(withList);
        pendingWiths = withList.filter(w => String(w.status).toLowerCase() === 'pending').length;
      }

      if (metricsData.status === 'fulfilled') {
        const m = metricsData.value;
        const depList = depositsData.status === 'fulfilled' ? depositsData.value : [];
        const withList = withdrawalsData.status === 'fulfilled' ? withdrawalsData.value : [];
        const uList = usersData.status === 'fulfilled' ? usersData.value : [];

        const totalDepAmt = m.totalDepositsAmount ?? (depList || []).reduce((acc, d) => acc + (String(d.status).toLowerCase() === 'approved' ? (parseFloat(d.amount) || 0) : 0), 0);
        const totalWithAmt = m.totalWithdrawalsAmount ?? (withList || []).reduce((acc, w) => acc + (['approved', 'paid'].includes(String(w.status).toLowerCase()) ? (parseFloat(w.amount) || 0) : 0), 0);
        const totalRev = m.totalRevenue ?? (totalDepAmt > 0 ? Math.max(0, (totalDepAmt - totalWithAmt) * 0.2) : 0);

        setMetrics({
          ...m,
          totalUsers: typeof m.totalUsers === 'number' ? m.totalUsers : ((uList || []).length || 0),
          activeUsers: typeof m.activeUsers === 'number' ? m.activeUsers : (uList || []).filter(u => !u.is_banned).length,
          bannedUsers: typeof m.bannedUsers === 'number' ? m.bannedUsers : (uList || []).filter(u => !!u.is_banned).length,
          pendingDepositsCount: pendingDeps,
          pendingWithdrawalsCount: pendingWiths,
          totalDepositsAmount: totalDepAmt,
          totalWithdrawalsAmount: totalWithAmt,
          totalRevenue: totalRev,
          newUsersToday: typeof m.newUsersToday === 'number' ? m.newUsersToday : 0,
        });
      }

      if (usersData.status === 'fulfilled') setUsers(usersData.value || []);
      if (maintData.status === 'fulfilled') setMaintenanceActive(!!maintData.value?.maintenanceMode);
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  // Real-time Socket.IO Connection Layer
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectAdminSocket();
      return;
    }

    // Initial fetch
    fetchAllData();

    // Debounce timer for socket burst events
    let refreshTimeout = null;
    const triggerDebouncedRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        fetchAllData(true);
      }, 400);
    };

    const socket = initAdminSocket((event, data) => {
      if (event === 'connected') {
        setIsRealtimeConnected(true);
      } else if (event === 'disconnected') {
        setIsRealtimeConnected(false);
      } else if (event === 'admin_new_deposit') {
        playDepositChime();
        const amt = parseFloat(data?.amount) || 0;
        const user = data?.username || 'Player';

        setLiveToast({
          type: 'deposit',
          title: `💰 New Deposit Received (+${formatCurrency(amt)})`,
          message: `${user} submitted a deposit request (${data?.method || 'Telebirr'})`,
          tab: 'deposits'
        });

        sendPhoneNotification({
          title: `💰 New Deposit (+${formatCurrency(amt)})`,
          body: `${user} submitted a deposit via ${data?.method || 'Telebirr'}`,
          tag: 'deposit-incoming'
        });

        triggerDebouncedRefresh();
      } else if (event === 'admin_new_withdrawal') {
        playWithdrawalChime();
        const amt = parseFloat(data?.amount) || 0;
        const user = data?.username || 'Player';

        setLiveToast({
          type: 'withdrawal',
          title: `💸 New Payout Request (${formatCurrency(amt)})`,
          message: `${user} requested a withdrawal to ${data?.method || 'Telebirr'}`,
          tab: 'withdrawals'
        });

        sendPhoneNotification({
          title: `💸 New Payout Request (${formatCurrency(amt)})`,
          body: `${user} requested a withdrawal of ${formatCurrency(amt)}`,
          tag: 'withdrawal-incoming'
        });

        triggerDebouncedRefresh();
      } else if (event === 'admin_data_changed' || event === 'user_registered') {
        triggerDebouncedRefresh();
      }
    });

    // Fallback sync every 60 seconds (real-time changes push immediately via WebSocket)
    const fallbackTimer = setInterval(() => {
      fetchAllData(true);
    }, 60000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAllData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(refreshTimeout);
      clearInterval(fallbackTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnectAdminSocket();
    };
  }, [isAuthenticated, fetchAllData]);

  // Auto-dismiss live toast after 6s
  useEffect(() => {
    if (liveToast) {
      const timer = setTimeout(() => setLiveToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [liveToast]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-admin-muted">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            setCurrentTab={setCurrentTab}
            onRefresh={fetchAllData}
            metrics={metrics}
            users={users}
            deposits={deposits}
            withdrawals={withdrawals}
          />
        );
      case 'users':
        return (
          <UsersPage
            users={users}
            metrics={metrics}
            deposits={deposits}
            withdrawals={withdrawals}
            loading={isRefreshing}
            onRefresh={fetchAllData}
          />
        );
      case 'deposits':
        return (
          <DepositsPage
            deposits={deposits}
            loading={isRefreshing}
            onRefresh={fetchAllData}
          />
        );
      case 'withdrawals':
        return (
          <WithdrawalsPage
            withdrawals={withdrawals}
            loading={isRefreshing}
            onRefresh={fetchAllData}
          />
        );
      case 'promo-codes':
        return <PromoCodesPage onRefresh={fetchAllData} />;
      case 'tasks':
        return <TasksPage />;
      case 'broadcast':
        return <BroadcastPage users={users} metrics={metrics} />;
      case 'maintenance':
        return (
          <MaintenancePage
            maintenanceActive={maintenanceActive}
            onRefresh={fetchAllData}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            deposits={deposits}
            withdrawals={withdrawals}
            metrics={metrics}
            onRefresh={fetchAllData}
          />
        );
      default:
        return (
          <DashboardPage
            setCurrentTab={setCurrentTab}
            onRefresh={fetchAllData}
            metrics={metrics}
          />
        );
    }
  };

  return (
    <AdminLayout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      metrics={metrics}
      isRefreshing={isRefreshing}
      onRefresh={fetchAllData}
      isRealtimeConnected={isRealtimeConnected}
    >
      {/* Real-time Floating Live Toast Alert */}
      {liveToast && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 max-w-sm w-full animate-toast-enter">
          <div className={`p-4 rounded-xl bg-admin-surface border shadow-2xl flex items-start justify-between gap-3 ${
            liveToast.type === 'deposit'
              ? 'border-emerald-500/40 shadow-emerald-500/10'
              : 'border-amber-500/40 shadow-amber-500/10'
          }`}>
            <div
              onClick={() => {
                if (liveToast.tab) setCurrentTab(liveToast.tab);
                setLiveToast(null);
              }}
              className="flex-1 cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                {liveToast.type === 'deposit' ? (
                  <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-sm font-semibold text-admin-text">{liveToast.title}</span>
              </div>
              <p className="text-xs text-admin-muted">{liveToast.message}</p>
              <span className="text-xs text-admin-accent font-medium mt-1 inline-block">
                View {liveToast.tab} →
              </span>
            </div>

            <button
              onClick={() => setLiveToast(null)}
              className="p-1 rounded-lg text-admin-muted hover:text-admin-text transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {renderActivePage()}
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AdminPortal />
      </ThemeProvider>
    </AuthProvider>
  );
}
