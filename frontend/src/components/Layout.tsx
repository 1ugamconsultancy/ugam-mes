import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useShopfloorStore } from '../context/shopfloorStore';
import logoImg from '../logo.png';
import UgamAIChatbot from './UgamAIChatbot';
import {
  LayoutDashboard,
  MonitorPlay,
  ClipboardList,
  CalendarDays,
  Smartphone,
  CheckSquare,
  Network,
  LogOut,
  Bell,
  Sun,
  Moon,
  Laptop,
  Factory,
  Check,
  AlertTriangle,
  Warehouse,
  BookOpen,
  Wrench,
  ShieldCheck,
  HelpCircle,
  Settings,
  Package,
  Layers,
  Search,
  Truck,
  RotateCcw,
  History,
  ChevronDown,
  Boxes,
  Cpu,
  Sliders,
  Users,
  Terminal,
  Radio,
  ArrowRight,
  Menu,
  X,
  Building2,
  Palette,
  Sparkles,
  Phone,
  GitFork,
  Calculator
} from 'lucide-react';
import { AlertNotification } from '../context/shopfloorStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, theme, toggleTheme, mode, toggleMode, alerts, markAlertAsRead, markAllAlertsAsRead } = useShopfloorStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAlertForModal, setSelectedAlertForModal] = useState<AlertNotification | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification popover when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  interface NavItem {
    path: string;
    label: string;
    icon: React.ReactElement<any>;
  }

  interface NavGroup {
    title: string;
    directPath?: string;
    icon?: React.ReactElement<any>;
    items?: NavItem[];
  }

  const navGroups: NavGroup[] = isSuperAdmin
    ? [
        {
          title: 'Enterprise Governance',
          items: [
            { path: '/super-admin', label: 'Enterprise Platform & Plants', icon: <Building2 size={18} /> },
          ]
        }
      ]
    : [
        {
          title: 'Operations',
          items: [
            { path: '/dashboard', label: 'Executive Dashboard', icon: <LayoutDashboard size={18} /> },
            { path: '/monitoring', label: 'Production Monitor', icon: <MonitorPlay size={18} /> },
            { path: '/schedule', label: 'Gantt Schedule', icon: <CalendarDays size={18} /> },
            { path: '/operator', label: 'Operator Station', icon: <Smartphone size={18} /> },
          ]
        },
        {
          title: 'Materials & Recipes',
          items: [
            { path: '/material-management', label: 'Material Management', icon: <Warehouse size={18} /> },
            { path: '/recipes', label: 'Recipes & BOM', icon: <BookOpen size={18} /> },
          ]
        },
        {
          title: 'Quality & Compliance',
          items: [
            { path: '/work-orders', label: 'Batch Records', icon: <ClipboardList size={18} /> },
            { path: '/quality', label: 'Quality & SPC', icon: <CheckSquare size={18} /> },
            { path: '/equipment', label: 'Equipment & Calibrations', icon: <Wrench size={18} /> },
            { path: '/compliance', label: 'Compliance & Audits', icon: <ShieldCheck size={18} /> },
          ]
        },
        {
          title: 'Track & Trace',
          items: [
            { path: '/trace/dashboard', label: 'Trace Dashboard', icon: <LayoutDashboard size={18} /> },
            { path: '/trace/products', label: 'Product Registry', icon: <Package size={18} /> },
            { path: '/trace/batches', label: 'Batch Campaigns', icon: <Layers size={18} /> },
            { path: '/trace/trace', label: 'Genealogy Trace', icon: <Search size={18} /> },
            { path: '/trace/events', label: 'Milestone Events', icon: <History size={18} /> },
            { path: '/trace/shipments', label: 'Shipments Ledger', icon: <Truck size={18} /> },
            { path: '/trace/recall', label: 'Recall Simulator', icon: <RotateCcw size={18} /> },
          ]
        },
        ...(user?.role === 'ADMIN' ? [{
          title: 'Enterprise Governance',
          items: [
            { path: '/super-admin', label: 'Enterprise Platform & Plants', icon: <Building2 size={18} /> },
          ]
        }] : []),
        ...(user?.role === 'ADMIN' ? [{
          title: 'Administration',
          items: [
            { path: '/admin/material', label: 'Material Master', icon: <Boxes size={18} /> },
            { path: '/admin/equipment', label: 'Equipment Assets', icon: <Cpu size={18} /> },
            { path: '/admin/types-uom', label: 'Material Types & UOM', icon: <Sliders size={18} /> },
            { path: '/admin/users', label: 'Users & Roles', icon: <Users size={18} /> },
            { path: '/admin/standards', label: 'Standards & Serialization', icon: <ShieldCheck size={18} /> },
            { path: '/admin/opc-sync', label: 'OPC Kepware Sync', icon: <Radio size={18} /> },
            { path: '/admin/api-docs', label: 'API Integration Guide', icon: <Terminal size={18} /> },
          ]
        }] : []),
        {
          title: 'Support',
          items: [
            { path: '/help/contact', label: 'Contact Us & Support', icon: <Phone size={18} /> },
            { path: '/help/track-trace', label: 'Track & Trace Guide', icon: <GitFork size={18} /> },
            { path: '/help/operations', label: 'Shopfloor Operations', icon: <Smartphone size={18} /> },
            { path: '/help/quality-compliance', label: 'Batch Records & Quality', icon: <ClipboardList size={18} /> },
            { path: '/help/oee', label: 'OEE Calculations', icon: <Calculator size={18} /> },
            { path: '/help/monitoring', label: 'Machine Statuses', icon: <Cpu size={18} /> },
            { path: '/help/master-data', label: 'Master Data Setup', icon: <Boxes size={18} /> },
          ]
        }
      ];

  // Helper to determine the group containing current active route
  const getActiveGroupTitle = (pathname: string) => {
    const matched = navGroups.find(g =>
      g.directPath
        ? pathname === g.directPath
        : g.items?.some(item =>
            pathname === item.path ||
            (item.path.startsWith('/trace') && pathname.startsWith(item.path)) ||
            (item.path.startsWith('/help') && pathname.startsWith(item.path)) ||
            (item.path.startsWith('/super-admin') && pathname.startsWith(item.path)) ||
            (item.path.startsWith('/admin') && (pathname.startsWith(item.path) || pathname === '/admin'))
          )
    );
    return matched ? matched.title : (isSuperAdmin ? 'Enterprise Governance' : 'Operations');
  };

  // Collapsible Accordion State: Default appearance is collapsed EXCEPT for the menu that is selected
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    [getActiveGroupTitle(location.pathname)]: true
  }));

  // Mobile / Tablet sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // When location changes, update openGroups so only the newly selected menu group is open & close mobile sidebar
  useEffect(() => {
    const activeTitle = getActiveGroupTitle(location.pathname);
    setOpenGroups({ [activeTitle]: true });
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Sync theme & mode attributes to document.body and html class list
  useEffect(() => {
    const body = document.querySelector('body');
    const root = window.document.documentElement;
    if (body) {
      if (theme === 'dark') {
        body.setAttribute('data-theme', 'dark');
      } else {
        body.removeAttribute('data-theme');
      }

      if (mode === 'factory') {
        body.setAttribute('data-mode', 'factory');
      } else {
        body.removeAttribute('data-mode');
      }
    }

    if (theme === 'dark' || mode === 'factory') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, mode]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadAlerts = alerts.filter(a => !a.isRead);

  return (
    <div className="h-screen max-h-screen flex flex-col font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="h-14 bg-[#142A45] text-white border-b border-[#1F3A5C] px-3 sm:px-4 flex items-center justify-between shrink-0 z-40 relative shadow-sm">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Mobile / Tablet Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-1.5 lg:hidden bg-[#102237] border border-[#1F3A5C] rounded-lg text-slate-300 hover:text-white transition cursor-pointer shrink-0"
            title="Toggle Navigation Menu"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="bg-white px-2 py-0.5 rounded-lg border border-slate-200/20 shadow-sm flex items-center justify-center shrink-0">
            <img
              src={logoImg}
              alt="UGAM Next Gen MES"
              className="h-7 w-auto object-contain block"
            />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-sm font-extrabold tracking-tight block leading-tight text-white whitespace-nowrap">UGAM NEXT GEN MES</span>
            <span className="text-[10px] sm:text-xs text-[#F5A623] font-bold tracking-normal sm:tracking-wider block mt-0.5 leading-none truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-none">
              Next Generation MES for connected, traceable manufacturing
            </span>
          </div>
        </div>

        {/* Configurations & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-[#102237] border border-[#1F3A5C] rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Bright Mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Alarm Notifications Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-[#102237] border border-[#1F3A5C] rounded-lg text-slate-300 hover:text-white transition relative cursor-pointer"
              title={unreadAlerts.length > 0 ? `${unreadAlerts.length} Unread Notifications` : 'Notifications'}
            >
              <Bell size={16} />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4.5 h-4.5 font-bold rounded-full flex items-center justify-center shadow-md pointer-events-none">
                  {unreadAlerts.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#142A45] border border-slate-200 dark:border-[#1F3A5C] rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn text-left flex flex-col max-h-[calc(100vh-80px)]">
                <div className="p-3 bg-slate-50 dark:bg-[#102237] border-b border-slate-200 dark:border-[#1F3A5C] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Live Alarms & Notifications</span>
                    {unreadAlerts.length > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        {unreadAlerts.length} unread
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        All read
                      </span>
                    )}
                  </div>
                  {unreadAlerts.length > 0 && (
                    <button
                      type="button"
                      onClick={markAllAlertsAsRead}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1F3A5C]/60 mes-scrollbar">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">No active alerts or events</div>
                  ) : (
                    alerts.map(a => (
                      <div
                        key={a.id}
                        onClick={() => {
                          if (!a.isRead) markAlertAsRead(a.id);
                          setShowNotifications(false);
                          setSelectedAlertForModal(a);
                        }}
                        className={`p-3 text-xs transition cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                          a.isRead
                            ? 'bg-slate-50/50 dark:bg-[#102237]/40 text-slate-500 dark:text-slate-400'
                            : 'bg-white dark:bg-[#142A45] border-l-4 border-rose-500 text-slate-800 dark:text-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                            {a.severity === 'CRITICAL' ? (
                              <AlertTriangle size={13} className="text-rose-500 shrink-0" />
                            ) : (
                              <span className={`w-2 h-2 rounded-full shrink-0 ${a.isRead ? 'bg-slate-400' : 'bg-amber-400'}`}></span>
                            )}
                            <span className="truncate">{a.title}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {a.isRead ? (
                              <span className="text-[10px] text-slate-400 font-semibold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                                Read
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAlertAsRead(a.id);
                                }}
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold transition flex items-center gap-0.5 cursor-pointer"
                                title="Mark as read"
                              >
                                <Check size={10} /> Mark read
                              </button>
                            )}
                          </div>
                        </div>

                        <p className={`mt-1 line-clamp-2 leading-relaxed ${a.isRead ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                          {a.message}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
                          <span>{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-0.5 font-semibold">
                            View details ➔
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Plant & Tenant Active Chip */}
          {user && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/20 border border-white/10 text-xs">
              {user.role === 'SUPER_ADMIN' ? (
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Sparkles size={14} />
                  <span>Enterprise Super Admin</span>
                </div>
              ) : (
                <div className="flex flex-col text-left">
                  <span className="font-bold text-white flex items-center gap-1">
                    <Factory size={12} className="text-[#10B981]" /> {user.plantName || 'Plant Station'}
                  </span>
                  {user.organizationName && (
                    <span className="text-[10px] text-slate-400 font-medium">{user.organizationName}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User profile card */}
          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-[#1F3A5C]">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-white block leading-tight">{user.name}</span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-slate-400 hover:text-red-400 transition"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-[#F4F5F6] dark:bg-[#111111] transition-colors relative">
        {/* Mobile / Tablet Backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar (Desktop static, Tablet/Mobile off-canvas slide drawer) */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
            w-64 lg:w-60 h-full max-h-full bg-white dark:bg-[#142A45]
            border-r border-[#E3E5E8] dark:border-[#1F3A5C]
            flex flex-col p-2.5 shrink-0 transition-transform duration-200 ease-in-out select-none overflow-hidden shadow-2xl lg:shadow-none
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Mobile Sidebar Close Header */}
          <div className="lg:hidden flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-[#1F3A5C]">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white">
              Navigation Menu
            </span>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 sidebar-scrollbar">
            {navGroups.map((group) => {
              // Direct Top-Level Links (e.g. Support directly opens /help)
              if (group.directPath) {
                const isActive = location.pathname === group.directPath;
                return (
                  <Link
                    key={group.title}
                    to={group.directPath}
                    title={group.title}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition group cursor-pointer ${
                      isActive
                        ? 'bg-[#174A7C] text-white border-[#174A7C] shadow-sm shadow-[#174A7C]/40'
                        : 'border-slate-200/70 dark:border-[#1F3A5C]/80 bg-slate-50/70 dark:bg-[#102237]/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#142A45]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {group.icon ? React.cloneElement(group.icon, { size: 15 }) : <HelpCircle size={15} />}
                      <span className={isActive ? 'text-white font-extrabold' : ''}>
                        {group.title}
                      </span>
                    </span>
                    <ArrowRight
                      size={13}
                      className={`text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0 ${
                        isActive ? 'text-white' : ''
                      }`}
                    />
                  </Link>
                );
              }

              // Collapsible Group Accordion
              const isOpen = openGroups[group.title] ?? false;
              const hasActiveChild = (group.items || []).some(
                (item) =>
                  location.pathname === item.path ||
                  (item.path.startsWith('/trace') && location.pathname.startsWith(item.path)) ||
                  (item.path.startsWith('/help') && location.pathname.startsWith(item.path))
              );

              return (
                <div
                  key={group.title}
                  className="rounded-lg overflow-hidden border border-slate-200/70 dark:border-[#1F3A5C]/80 bg-slate-50/70 dark:bg-[#102237]/50 transition"
                >
                  {/* Accordion Group Header Trigger */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    title={`Click to toggle ${group.title} section`}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#142A45] transition group cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {hasActiveChild && !isOpen && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] shrink-0 animate-pulse"></span>
                      )}
                      <span className={hasActiveChild && !isOpen ? 'text-[#174A7C] dark:text-[#F5A623] font-extrabold' : ''}>
                        {group.title}
                      </span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'transform rotate-0' : 'transform -rotate-90'
                      }`}
                    />
                  </button>

                  {/* Accordion Sub-items */}
                  {isOpen && (
                    <div className="space-y-0.5 px-1.5 pb-1.5 pt-0.5 transition-all">
                      {(group.items || []).map((item) => {
                        const isActive =
                          location.pathname === item.path ||
                          (item.path.startsWith('/trace/') && location.pathname.startsWith(item.path)) ||
                          (item.path.startsWith('/help/') && location.pathname.startsWith(item.path)) ||
                          (item.path === '/help/contact' && location.pathname === '/help') ||
                          (item.path.startsWith('/admin/') && location.pathname.startsWith(item.path)) ||
                          (item.path === '/admin/material' && location.pathname === '/admin');
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            title={item.label}
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-bold transition group/item relative ${
                              isActive
                                ? 'bg-[#174A7C] text-white shadow-sm shadow-[#174A7C]/40'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#142A45] hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <span
                              title={item.label}
                              className="shrink-0 flex items-center justify-center"
                            >
                              {React.cloneElement(item.icon, { size: 14 })}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Page Container */}
        <main className="flex-1 min-h-0 overflow-y-auto p-2.5 md:p-3 relative">
          {children}
        </main>
      </div>

      {/* Floating Draggable UGAM AI Advisor & Machine Calibration Chatbot */}
      <UgamAIChatbot />

      {/* Centered Notification Details Modal */}
      {selectedAlertForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="relative bg-white dark:bg-[#142A45] border border-slate-200 dark:border-[#1F3A5C] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden my-auto animate-scaleUp text-left">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#1F3A5C] bg-slate-50 dark:bg-[#102237]">
              <div className="flex items-center gap-2.5">
                <span
                  className={`p-1.5 rounded-lg flex items-center justify-center ${
                    selectedAlertForModal.severity === 'CRITICAL'
                      ? 'bg-rose-500/10 text-rose-500'
                      : selectedAlertForModal.severity === 'WARNING'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-blue-500/10 text-blue-500'
                  }`}
                >
                  <AlertTriangle size={18} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Alert Diagnostics
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        selectedAlertForModal.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : selectedAlertForModal.severity === 'WARNING'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {selectedAlertForModal.severity}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Recorded {new Date(selectedAlertForModal.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlertForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedAlertForModal.title}
                </h4>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C]/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                {selectedAlertForModal.message}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-100/70 dark:bg-[#102237]/60 border border-slate-200/60 dark:border-[#1F3A5C]/40">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Status</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {selectedAlertForModal.isRead ? (
                      <span className="text-emerald-500 flex items-center gap-1 font-bold">
                        <Check size={12} /> Acknowledged
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold">Unread / Active</span>
                    )}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-100/70 dark:bg-[#102237]/60 border border-slate-200/60 dark:border-[#1F3A5C]/40">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Subsystem</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    Shopfloor SCADA / Telemetry
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-[#1F3A5C] bg-slate-50/70 dark:bg-[#102237]/60">
              <div>
                {!selectedAlertForModal.isRead && (
                  <button
                    type="button"
                    onClick={() => {
                      markAlertAsRead(selectedAlertForModal.id);
                      setSelectedAlertForModal({ ...selectedAlertForModal, isRead: true });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Check size={14} /> Mark as Read
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedAlertForModal.link && (
                  <button
                    type="button"
                    onClick={() => {
                      const link = selectedAlertForModal.link!;
                      setSelectedAlertForModal(null);
                      navigate(link);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#174A7C] hover:bg-[#1e5d9b] text-white transition flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    Go to Asset / Module <ArrowRight size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedAlertForModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-[#1F3A5C] hover:bg-slate-300 dark:hover:bg-[#2a4d79] text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
