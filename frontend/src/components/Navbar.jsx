import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEMO_USERS } from '../context/AuthContext';
import {
  Compass,
  Users,
  LayoutDashboard,
  UserCheck,
  Sparkles,
  Briefcase,
  Building,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Layers
} from 'lucide-react';

export const Navbar = () => {
  const { user, role, logout, switchDemoAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleDemoSwitch = (email) => {
    setDemoMenuOpen(false);
    setMobileMenuOpen(false);
    switchDemoAccount(email);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-gray-900 leading-none">
                  Campus<span className="text-indigo-600">Forge</span>
                </span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">
                  Opportunity & Collaboration
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              <Link
                to="/opportunities"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/opportunities') || isActive('/')
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Compass className="w-4 h-4" />
                Opportunities
              </Link>

              {role === 'student' && (
                <>
                  <Link
                    to="/teams"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/teams')
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Teams
                  </Link>
                  <Link
                    to="/dashboard"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/dashboard')
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    My Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/profile')
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Profile
                  </Link>
                  <Link
                    to="/recommendations"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/recommendations')
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    AI Fit & Feed
                  </Link>
                </>
              )}

              {role === 'organizer' && (
                <Link
                  to="/organizer"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/organizer')
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Organizer Workspace
                </Link>
              )}

              {(role === 'ambassador' || role === 'coordinator') && (
                <Link
                  to="/staff"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/staff')
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  Staff Portal
                </Link>
              )}
            </nav>
          </div>

          {/* Right Header: Role badge, Demo Switcher, User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick Demo Switcher */}
            <div className="relative">
              <button
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                title="Switch demo account to evaluate different role journeys"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Demo Switcher</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {demoMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Select Test Persona
                  </div>
                  {DEMO_USERS.map((demo) => (
                    <button
                      key={demo.email}
                      onClick={() => handleDemoSwitch(demo.email)}
                      className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-indigo-50 transition-colors ${
                        user?.email === demo.email ? 'bg-indigo-50/70 border-l-2 border-indigo-600' : ''
                      }`}
                    >
                      <span className="font-semibold text-gray-800">{demo.label}</span>
                      <span className="text-[10px] text-gray-500">{demo.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Info / Role Badge */}
            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-gray-900 leading-tight">{user.name}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-indigo-600">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-3">
          {/* User info */}
          {user && (
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email} · <span className="font-semibold text-indigo-600 uppercase">{user.role}</span></p>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-md"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Mobile links */}
          <nav className="flex flex-col gap-1">
            <Link
              to="/opportunities"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              🧭 Opportunities Directory
            </Link>
            {role === 'student' && (
              <>
                <Link
                  to="/teams"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  👥 Project Teams
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  📊 My Dashboard
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  👤 My Profile & Resume
                </Link>
                <Link
                  to="/recommendations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  ✨ AI Fit & Recommendations
                </Link>
              </>
            )}
            {role === 'organizer' && (
              <Link
                to="/organizer"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                💼 Organizer Workspace
              </Link>
            )}
            {(role === 'ambassador' || role === 'coordinator') && (
              <Link
                to="/staff"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                🏛️ Staff Portal
              </Link>
            )}
          </nav>

          {/* Mobile Demo Persona Switcher */}
          <div className="pt-2 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Quick Role Switcher (For Mentors)
            </span>
            <div className="grid grid-cols-1 gap-1">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.email}
                  onClick={() => handleDemoSwitch(demo.email)}
                  className="text-left px-3 py-1.5 text-xs rounded-md bg-gray-50 hover:bg-indigo-50 font-medium text-gray-700 flex justify-between"
                >
                  <span>{demo.label}</span>
                  {user?.email === demo.email && <span className="text-indigo-600 font-bold">✓ Active</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
