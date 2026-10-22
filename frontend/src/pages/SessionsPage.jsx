import React, { useState, useEffect } from 'react';
import { sessionsApi } from '../api/sessionsApi';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/tables/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ToastContainer } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { formatDateTime, truncateSessionId, formatRelativeTime } from '../utils/formatDate';
import { RefreshCw, Trash2, Key, Shield, AlertCircle } from 'lucide-react';

export function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Revocation state
  const [sessionToRevoke, setSessionToRevoke] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const { toasts, toast, dismissToast } = useToast();

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sessionsApi.getActiveSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to retrieve active sessions from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleConfirmRevoke = async () => {
    if (!sessionToRevoke) return;
    setIsRevoking(true);
    try {
      await sessionsApi.revokeSession(sessionToRevoke.sessionId);
      toast.success('Session Revoked', `Session ${truncateSessionId(sessionToRevoke.sessionId)} was successfully terminated.`);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionToRevoke.sessionId));
      setSessionToRevoke(null);
    } catch (err) {
      toast.error('Revocation Failed', err.message || 'Could not revoke session. It may have already expired.');
    } finally {
      setIsRevoking(false);
    }
  };

  const columns = [
    {
      header: 'Session Identifier',
      key: 'sessionId',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-control bg-cream-200 text-espresso-600 flex items-center justify-center shrink-0">
            <Key className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-mono text-xs font-semibold text-espresso-800 bg-cream-100 px-2 py-0.5 rounded border border-cream-400">
              {truncateSessionId(item.sessionId)}
            </span>
            <p className="text-[10px] text-espresso-400 mt-0.5">UUID v4</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: () => <StatusBadge status="active" label="Active" />,
    },
    {
      header: 'Expiration Time',
      key: 'expiresAt',
      render: (item) => (
        <div>
          <span className="text-xs font-medium text-espresso-800">
            {formatDateTime(item.expiresAt)}
          </span>
          <p className="text-[10px] text-espresso-500 mt-0.5">
            Expires in {formatRelativeTime(item.expiresAt)}
          </p>
        </div>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          icon={Trash2}
          onClick={() => setSessionToRevoke(item)}
          className="hover:border-status-error hover:text-status-error hover:bg-status-error-bg"
          disabled={isRevoking}
        >
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <PageHeader
        title="Active Sessions"
        subtitle="Manage and revoke active refresh tokens and authenticated sessions issued to your account."
        badge={
          <span className="text-xs px-2.5 py-1 rounded-full bg-cream-200 text-espresso-700 font-semibold border border-cream-400">
            {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchSessions}
            isLoading={isLoading}
          >
            Refresh
          </Button>
        }
      />

      {/* Backend Integration Note */}
      <div className="p-4 rounded-card bg-cream-50 border border-cream-400 text-xs text-espresso-600 flex items-start gap-3">
        <Shield className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Sessions correspond directly to opaque refresh-token records stored as SHA-256 hashes in the database.
          Revoking a session immediately prevents access token re-issuance.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-card bg-status-error-bg border border-status-error-border text-xs text-status-error flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Sessions Data Table */}
      <DataTable
        columns={columns}
        data={sessions}
        isLoading={isLoading}
        emptyTitle="No active sessions"
        emptyDescription="There are currently no active refresh sessions for your account."
        keyExtractor={(item) => item.sessionId}
      />

      {/* Revocation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!sessionToRevoke}
        onClose={() => setSessionToRevoke(null)}
        onConfirm={handleConfirmRevoke}
        title="Revoke Active Session"
        message={`Are you sure you want to revoke session ${
          sessionToRevoke ? truncateSessionId(sessionToRevoke.sessionId) : ''
        }? Any client relying on this refresh token will be required to sign in again.`}
        confirmText="Revoke Session"
        cancelText="Keep Session"
        variant="destructive"
        isLoading={isRevoking}
      />
    </div>
  );
}
