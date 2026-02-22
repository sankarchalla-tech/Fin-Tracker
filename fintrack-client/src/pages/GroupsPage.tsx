import { useEffect, useState } from 'react';
import { Plus, Users, Copy, RefreshCw, Trash2, LogOut, Crown, User as UserIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { groupsApi } from '@/lib/api';
import { groupSchema, joinGroupSchema, type GroupInput, type JoinGroupInput } from '@/lib/validations';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import type { Group, GroupWithMembers } from '@/types';

export default function GroupsPage() {
  const { user, groups, fetchGroups, switchGroup } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [formData, setFormData] = useState<GroupInput>({ name: '', description: '' });
  const [joinData, setJoinData] = useState<JoinGroupInput>({ inviteCode: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof GroupInput, string>>>({});
  const [joinError, setJoinError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetchGroupsData();
  }, []);

  const fetchGroupsData = async () => {
    setIsLoading(true);
    try {
      await fetchGroups();
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof GroupInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = groupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof GroupInput, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof GroupInput;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await groupsApi.create(formData);
      toast.success('Group created successfully');
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
      fetchGroupsData();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');

    const result = joinGroupSchema.safeParse(joinData);
    if (!result.success) {
      setJoinError(result.error.issues[0]?.message || 'Invalid invite code');
      return;
    }

    setIsSubmitting(true);

    try {
      await groupsApi.join(joinData.inviteCode);
      toast.success('Successfully joined the group');
      setIsJoinDialogOpen(false);
      setJoinData({ inviteCode: '' });
      fetchGroupsData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to join group';
      if (!error.response?.status || error.response.status >= 500) {
        toast.error(message);
      } else {
        setJoinError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectGroup = async (group: Group) => {
    try {
      const response = await groupsApi.getById(group.id);
      setSelectedGroup(response.data);
    } catch (error) {
      console.error('Failed to fetch group details:', error);
    }
  };

  const handleSwitchGroup = async (groupId: string) => {
    try {
      await switchGroup(groupId);
      toast.success('Switched group successfully');
    } catch (error) {
      console.error('Failed to switch group:', error);
    }
  };

  const handleLeave = async () => {
    const id = leaveConfirm.id;
    setLeaveConfirm({ open: false, id: '' });
    try {
      await groupsApi.leave(id);
      toast.success('Left group successfully');
      setSelectedGroup(null);
      fetchGroupsData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to leave group';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ open: false, id: '' });
    try {
      await groupsApi.delete(id);
      toast.success('Group deleted successfully');
      setSelectedGroup(null);
      fetchGroupsData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete group';
      toast.error(message);
    }
  };

  const handleRegenerateCode = async (groupId: string) => {
    try {
      const response = await groupsApi.regenerateCode(groupId);
      if (selectedGroup) {
        setSelectedGroup({ ...selectedGroup, inviteCode: response.data.inviteCode });
      }
      toast.success('Invite code regenerated');
    } catch (error) {
      console.error('Failed to regenerate code:', error);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Groups</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsJoinDialogOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Join Group
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">You're not part of any groups</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsJoinDialogOpen(true)}>
                Join a Group
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create a Group
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((membership) => (
            <Card
              key={membership.group.id}
              className={`cursor-pointer transition-colors ${
                user?.currentGroupId === membership.group.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleSelectGroup(membership.group)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{membership.group.name}</CardTitle>
                  {membership.role === 'owner' && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <CardDescription>{membership.group.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{membership.role}</span>
                  {user?.currentGroupId !== membership.group.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwitchGroup(membership.group.id);
                      }}
                    >
                      Switch
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedGroup && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedGroup.name}</CardTitle>
                <CardDescription>{selectedGroup.description || 'No description'}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedGroup(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Invite Code</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                  {selectedGroup.inviteCode}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyInviteCode(selectedGroup.inviteCode)}
                >
                  {copiedCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                {selectedGroup.userRole === 'owner' && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleRegenerateCode(selectedGroup.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Members ({selectedGroup.members.length})</Label>
              <div className="mt-2 space-y-2">
                {selectedGroup.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {selectedGroup.userRole === 'owner' ? (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirm({ open: true, id: selectedGroup.id })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setLeaveConfirm({ open: true, id: selectedGroup.id })}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Group
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) setErrors({}); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Family Finances"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={isSubmitting}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Track household expenses together"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </span>
                ) : (
                  'Create Group'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isJoinDialogOpen} onOpenChange={(open) => { setIsJoinDialogOpen(open); if (!open) setJoinError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                placeholder="Enter the invite code"
                value={joinData.inviteCode}
                onChange={(e) => { setJoinData({ inviteCode: e.target.value.toUpperCase() }); setJoinError(''); }}
                disabled={isSubmitting}
                className={joinError ? 'border-destructive' : ''}
                maxLength={8}
              />
              {joinError && <p className="text-sm text-destructive">{joinError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsJoinDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Joining...
                  </span>
                ) : (
                  'Join Group'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={leaveConfirm.open}
        onOpenChange={(open) => setLeaveConfirm({ open, id: '' })}
        title="Leave Group"
        description="Are you sure you want to leave this group? You'll need a new invite code to rejoin."
        confirmText="Leave"
        onConfirm={handleLeave}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, id: '' })}
        title="Delete Group"
        description="Are you sure you want to delete this group? All group data will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
