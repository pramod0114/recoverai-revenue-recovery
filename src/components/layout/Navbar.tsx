import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import {
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  Zap,
  LogOut,
  ChevronDown,
  Shield,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Github
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlobalSearchDropdown } from '../common/GlobalSearchDropdown';

export const Navbar: React.FC = () => {
  const { user, logout, quickLoginAs } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveSyncTime, setLiveSyncTime] = useState('Just now');
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'PM';

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    {
      id: 1,
      title: '₹4,999 Recovered',
      desc: 'Case RC-10291 recovered via smart off-peak retry',
      time: '2m ago',
      type: 'success'
    },
    {
      id: 2,
      title: 'High Priority Escalation',
      desc: 'Case RC-10289 escalated to human desk (₹48,200)',
      time: '15m ago',
      type: 'warning'
    },
    {
      id: 3,
      title: 'WhatsApp Dunning Sent',
      desc: '1-click UPI pay link delivered to Rohan Sharma',
      time: '32m ago',
      type: 'info'
    }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.getHealth();
      setLiveSyncTime('Just now');
    } catch {
      // offline
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#EAECF0] px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {/* Brand & Logo */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-sm transition-transform group-hover:scale-105">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#171717] text-[15px] tracking-tight">RecoverAI</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse"></span>
                TEST MODE
              </span>
            </div>
            <p className="text-[11px] text-[#667085] leading-none hidden sm:block">
              AI Revenue Recovery Agent
            </p>
          </div>
        </Link>

        {/* Global Search Bar */}
        <div className="hidden lg:block w-72">
          <GlobalSearchDropdown />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Creator GitHub Link */}
        <a
          href="https://github.com/pramod0114"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#F9FAFB] hover:bg-[#F2F4F7] border border-[#EAECF0] hover:border-[#D0D5DD] rounded-lg text-[12px] text-[#344054] hover:text-[#101828] transition-all group"
          title="Created by Pramod Mahajan (GitHub: https://github.com/pramod0114)"
        >
          <Github className="w-3.5 h-3.5 text-[#101828] group-hover:scale-110 transition-transform" />
          <span className="font-medium">Pramod Mahajan</span>
        </a>

        {/* Live sync pill */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-[12px] text-[#475467]">
          <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
          <span>Live Sync</span>
          <button
            onClick={handleRefresh}
            title="Sync Data"
            className="text-[#98A2B3] hover:text-[#2563EB] p-0.5 ml-1 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Role Toggle Pill */}
        <div className="hidden sm:flex items-center gap-1 bg-[#F2F4F7] p-1 rounded-lg text-[12px]">
          <button
            onClick={() => quickLoginAs('ADMIN')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              user?.role === 'ADMIN'
                ? 'bg-white text-[#171717] shadow-sm font-semibold'
                : 'text-[#667085] hover:text-[#171717]'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => quickLoginAs('ANALYST')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              user?.role === 'ANALYST'
                ? 'bg-white text-[#171717] shadow-sm font-semibold'
                : 'text-[#667085] hover:text-[#171717]'
            }`}
          >
            Analyst
          </button>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-[#667085] hover:text-[#171717] hover:bg-[#F2F4F7] transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2563EB] rounded-full ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#EAECF0] rounded-xl shadow-lg p-3 space-y-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAECF0] px-1">
                <span className="text-[13px] font-semibold text-[#171717]">Recovery Alerts</span>
                <span className="text-[11px] text-[#2563EB] font-medium cursor-pointer hover:underline">
                  Mark all read
                </span>
              </div>
              <div className="space-y-1.5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2 rounded-lg hover:bg-[#F9FAFB] transition-colors text-left flex gap-2.5 items-start"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.type === 'success'
                          ? 'bg-[#16A34A]'
                          : n.type === 'warning'
                          ? 'bg-[#D97706]'
                          : 'bg-[#2563EB]'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-[#171717]">{n.title}</span>
                        <span className="text-[10px] text-[#98A2B3]">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-[#667085] mt-0.5 leading-snug">{n.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-1.5 border-t border-[#EAECF0] text-center">
                <Link
                  to="/audit"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-[#2563EB] font-medium hover:underline inline-flex items-center gap-1"
                >
                  View full audit log <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#F2F4F7] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold text-xs">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-[13px] font-semibold text-[#171717] leading-tight">
                {user?.fullName || 'Pramod Mahajan'}
              </div>
              <div className="text-[11px] text-[#667085] leading-none capitalize">
                {user?.role?.toLowerCase() || 'admin'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#98A2B3] hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-[#EAECF0] rounded-xl shadow-lg p-2 z-50">
              <div className="px-3 py-2 border-b border-[#EAECF0]">
                <div className="text-[13px] font-semibold text-[#171717]">
                  {user?.fullName || 'Pramod Mahajan'}
                </div>
                <div className="text-[11px] text-[#667085] truncate">
                  {user?.email || 'admin@recoverai.io'}
                </div>
              </div>
              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-[#344054] hover:bg-[#F9FAFB] rounded-md flex items-center justify-between"
                >
                  <span>Recovery Settings</span>
                </Link>
                <Link
                  to="/system-health"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-[#344054] hover:bg-[#F9FAFB] rounded-md flex items-center justify-between"
                >
                  <span>System Diagnostics</span>
                </Link>
              </div>
              <div className="pt-1 border-t border-[#EAECF0]">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-[#DC2626] hover:bg-[#FEF2F2] rounded-md flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
