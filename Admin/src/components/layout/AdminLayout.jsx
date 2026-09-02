import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

export function AdminLayout({
  currentTab,
  setCurrentTab,
  metrics,
  maintenanceActive,
  onRefresh,
  isRefreshing,
  isRealtimeConnected,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileMenuOpen(prev => !prev);
    window.addEventListener('toggle-mobile-drawer', handleToggle);
    return () => window.removeEventListener('toggle-mobile-drawer', handleToggle);
  }, []);

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Dashboard';
      case 'users': return 'Players';
      case 'deposits': return 'Deposits';
      case 'withdrawals': return 'Withdrawals';
      case 'promo-codes': return 'Promo Codes';
      case 'broadcast': return 'Broadcast';
      case 'maintenance': return 'Maintenance';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-admin-bg flex flex-row transition-colors duration-200">
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        metrics={metrics}
        maintenanceActive={maintenanceActive}
      />

      {/* Mobile Drawer and Bottom Bar */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        metrics={metrics}
        maintenanceActive={maintenanceActive}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-24 lg:pb-8">
        <Header
          title={getPageTitle()}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          maintenanceActive={maintenanceActive}
          isRealtimeConnected={isRealtimeConnected}
        />

        <main key={currentTab} className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
