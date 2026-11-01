import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { sessionsApi } from '../api/sessionsApi';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDateTime, truncateSessionId } from '../utils/formatDate';
import {
  ShieldCheck,
  ShieldAlert,
  Layers,
  Sliders,
  ExternalLink,
  RefreshCw,
  Key,
  Clock,
  User,
} from 'lucide-react';

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  const fetchSessionData = async () => {
    setIsLoadingSessions(true);
    setSessionError(null);
    try {
      const data = await sessionsApi.getActiveSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setSessionError(err.message || 'Unable to retrieve active sessions.');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.name || 'User'}`}
        subtitle="Manage your identity credentials, active sessions, and enterprise access privileges."
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchSessionData}
            isLoading={isLoadingSessions}
          >
            Refresh Data
          </Button>
        }
      />

      {/* Account & Security Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Profile Card */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-espresso-500">
              Identity Profile
            </span>
            <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-espresso-700">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-espresso-500">Full Name</p>
              <p className="text-base font-semibold text-espresso-800">
                {user?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-espresso-500">Email Address</p>
              <p className="text-sm font-medium text-espresso-800 break-all">
                {user?.email || '—'}
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <StatusBadge status="verified" label="Email Verified" />
              {isAdmin && (
                <StatusBadge status="info" label="Role: Admin" />
              )}
            </div>
          </div>
        </Card>

        {/* Security Overview */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-espresso-500">
              Security Overview
            </span>
            <div className="w-8 h-8 rounded-full bg-sage-50 border border-sage-200 flex items-center justify-center text-sage-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-1 border-b border-cream-400/50">
              <span className="text-espresso-600">Authentication</span>
              <span className="font-semibold text-espresso-800">JWT + Refresh Token</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-cream-400/50">
              <span className="text-espresso-600">Lockout Policy</span>
              <span className="font-semibold text-espresso-800">5 Failed Attempts</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-espresso-600">Account Access</span>
              <StatusBadge status="active" label="Unrestricted" />
            </div>
          </div>
        </Card>

        {/* Active Sessions Counter */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-espresso-500">
              Session Tokens
            </span>
            <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-espresso-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-espresso-800">
              {isLoadingSessions ? (
                <Skeleton className="w-12 h-8" />
              ) : (
                sessions.length
              )}
            </div>
            <p className="text-xs text-espresso-500 mt-1">
              Active refresh sessions issued to your account
            </p>
            <div className="mt-4">
              <Link
                to="/sessions"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-600 hover:text-sage-700"
              >
                <span>Manage active sessions</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Active Sessions Summary Table */}
      <Card
        title="Active Sessions Summary"
        subtitle="Current authenticated sessions tied to your user identity"
        actions={
          <Link to="/sessions">
            <Button variant="secondary" size="sm">
              View All Sessions
            </Button>
          </Link>
        }
      >
        {isLoadingSessions ? (
          <div className="space-y-3 py-2">
            <Skeleton lines={3} />
          </div>
        ) : sessionError ? (
          <div className="p-4 rounded-card bg-status-error-bg border border-status-error-border text-xs text-status-error">
            {sessionError}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-6 text-xs text-espresso-500">
            No active sessions found for this user account.
          </div>
        ) : (
          <div className="divide-y divide-cream-400/60">
            {sessions.slice(0, 3).map((s) => (
              <div
                key={s.sessionId}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-control bg-cream-200 flex items-center justify-center text-espresso-600">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-medium text-espresso-800 bg-cream-100 px-2 py-0.5 rounded border border-cream-400">
                      {truncateSessionId(s.sessionId)}
                    </span>
                    <p className="text-[11px] text-espresso-500 mt-0.5">
                      Session UUID (Database hashed token)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-espresso-600">
                  <Clock className="w-3.5 h-3.5 text-espresso-400" />
                  <span>Expires: {formatDateTime(s.expiresAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Access Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/settings" className="block">
          <Card className="p-5 hover:border-sage-500 transition-all duration-150 group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-control bg-cream-200 text-espresso-700 flex items-center justify-center group-hover:bg-sage-50 group-hover:text-sage-600 transition-colors shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-espresso-800 group-hover:text-sage-700 transition-colors">
                  Account & Security Settings
                </h4>
                <p className="text-xs text-espresso-500 mt-1">
                  Review authentication rules, password recovery protocols, and security specifications.
                </p>
              </div>
            </div>
          </Card>
        </Link>

        {isAdmin ? (
          <Link to="/admin/audit" className="block">
            <Card className="p-5 hover:border-sage-500 transition-all duration-150 group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-control bg-cream-200 text-espresso-700 flex items-center justify-center group-hover:bg-sage-50 group-hover:text-sage-600 transition-colors shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-espresso-800 group-hover:text-sage-700 transition-colors">
                    Security & Audit Log Explorer
                  </h4>
                  <p className="text-xs text-espresso-500 mt-1">
                    Review authentication events, failed logins, and administrative access records.
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ) : (
          <Link to="/sessions" className="block">
            <Card className="p-5 hover:border-sage-500 transition-all duration-150 group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-control bg-cream-200 text-espresso-700 flex items-center justify-center group-hover:bg-sage-50 group-hover:text-sage-600 transition-colors shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-espresso-800 group-hover:text-sage-700 transition-colors">
                    Active Session Management
                  </h4>
                  <p className="text-xs text-espresso-500 mt-1">
                    Inspect current active sessions and selectively revoke access tokens.
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
