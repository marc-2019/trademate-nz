'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { teamsClient, ApiError } from '@/lib/api-client';
import type { Team, TeamMember, TeamInvite, TeamRole } from '@bossboard/shared';
import { Users, Mail, X, Smartphone } from 'lucide-react';

const dateFmt = new Intl.DateTimeFormat('en-NZ', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(iso: string | Date | null) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

const roleLabel: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  worker: 'Worker',
};

export default function TeamsPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<TeamRole | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('worker');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteOk, setInviteOk] = useState<string | null>(null);

  const isAdminOrOwner = role === 'owner' || role === 'admin';

  const load = async () => {
    try {
      const data = await teamsClient.myTeam();
      setTeam(data.team);
      setRole(data.role);
      setMembers(data.members || []);
      if (data.team && (data.role === 'owner' || data.role === 'admin')) {
        try {
          const inv = await teamsClient.listInvites(data.team.id);
          setInvites(inv.invites || []);
        } catch {
          // Non-fatal: invites panel just shows empty.
          setInvites([]);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Could not load team.');
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!team || !inviteEmail || inviteBusy) return;
    setInviteBusy(true);
    setError(null);
    setInviteOk(null);
    try {
      await teamsClient.invite(team.id, { email: inviteEmail, role: inviteRole });
      setInviteOk(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      // Refresh the invites list.
      const inv = await teamsClient.listInvites(team.id);
      setInvites(inv.invites || []);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Could not send invite.');
    } finally {
      setInviteBusy(false);
    }
  };

  const onCancelInvite = async (inviteId: string) => {
    if (!team) return;
    if (!confirm('Cancel this invite? The link will stop working immediately.')) return;
    try {
      await teamsClient.cancelInvite(team.id, inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel invite.');
    }
  };

  if (!loaded) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Team</h1>
        <Card>
          <p className="text-sm text-gray-500 py-8 text-center">Loading team…</p>
        </Card>
      </div>
    );
  }

  if (!team) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Team</h1>
        <Card>
          <div className="py-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
              <Users size={20} className="text-gray-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">You're not on a team yet</h2>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Create a team or accept a team invite from the BossBoard mobile app. Once
              you're on a team, you can manage members and send invites from this screen.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          <p className="text-sm text-gray-600 mt-1">
            You're a <span className="font-medium">{role ? roleLabel[role] : '—'}</span> on this team.
          </p>
        </div>
      </div>

      {error && (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No members on this team yet.</p>
        ) : (
          <ul className="divide-y divide-border-light -mx-2">
            {members.map((m) => (
              <li key={m.id} className="px-2 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-accent">
                    {(m.userName || m.userEmail || '?').slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.userName || m.userEmail || 'Unknown'}
                  </p>
                  {m.userEmail && m.userName && (
                    <p className="text-xs text-gray-500 truncate">{m.userEmail}</p>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded shrink-0">
                  {roleLabel[m.role]}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!isAdminOrOwner && (
          <p className="text-xs text-gray-500 mt-4">
            Only owners and admins can invite or remove members.
          </p>
        )}
      </Card>

      {isAdminOrOwner && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Invite a member
          </h2>
          <form onSubmit={onInvite} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <Input
                type="email"
                required
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviteBusy}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                disabled={inviteBusy}
                className="rounded-lg border border-border px-3 py-2 text-sm bg-white"
              >
                <option value="worker">Worker</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" loading={inviteBusy} variant="primary" size="md">
                <Mail size={16} className="mr-2" />
                Send invite
              </Button>
              {inviteOk && (
                <span className="text-sm text-success">{inviteOk}</span>
              )}
            </div>
          </form>
          <p className="text-xs text-gray-500 mt-3">
            Invited members get an email with a link to join. Workers can log time and use
            assigned features; admins can also invite and manage other members.
          </p>
        </Card>
      )}

      {isAdminOrOwner && invites.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pending invites ({invites.length})
          </h2>
          <ul className="divide-y divide-border-light -mx-2">
            {invites.map((inv) => (
              <li key={inv.id} className="px-2 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Mail size={16} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                  <p className="text-xs text-gray-500">
                    {roleLabel[inv.role]} · invited {formatDate(inv.createdAt)} · expires{' '}
                    {formatDate(inv.expiresAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCancelInvite(inv.id)}
                  className="text-gray-400 hover:text-danger transition-colors p-1"
                  aria-label={`Cancel invite to ${inv.email}`}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Smartphone size={18} className="text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">More team actions in the mobile app</h2>
            <p className="text-sm text-gray-600 mt-1">
              Removing members, changing roles, and leaving a team currently happen in the
              BossBoard mobile app. Web is for adding new members and reviewing team state
              from a desktop.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
