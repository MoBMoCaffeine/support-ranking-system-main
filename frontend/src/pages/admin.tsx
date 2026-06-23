import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAllTracks,
  createTrack,
  updateTrack,
  deleteTrack,
  Track,
} from '@/lib/tracks-service';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  Link as LinkIcon,
  ExternalLink,
  LayoutDashboard,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = [
  '#00CC00', '#00BFFF', '#FF6B35', '#22C55E',
  '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
  '#06B6D4', '#10B981', '#F97316', '#6366F1',
];

const API_URL = import.meta.env.VITE_API_URL || '';

type FormState = {
  name: string;
  slug: string;
  description: string;
  color: string;
  sheet_id: string;
  sheet_url: string;
  status: string;
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  color: '#00CC00',
  sheet_id: '',
  sheet_url: '',
  status: 'active',
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function AdminPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(
    sessionStorage.getItem('adminToken')
  );
  const [adminError, setAdminError] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Track | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);

  const isAdmin = !!adminToken;

  useEffect(() => {
    if (isAdmin) loadTracks();
  }, [isAdmin]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const loadTracks = async () => {
    setLoading(true);
    try {
      const data = await fetchAllTracks();
      setTracks(data);
    } catch (e: any) {
      if (e.message?.includes('Session expired') || e.message?.includes('Unauthorized')) {
        handleLogout();
      } else {
        setToast({ type: 'error', message: 'Failed to load tracks' });
      }
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingTrack(null);
    setForm({ ...emptyForm });
    setAutoSlug(true);
    setDialogOpen(true);
  };

  const openEdit = (track: Track) => {
    setEditingTrack(track);
    setForm({
      name: track.name,
      slug: track.slug || '',
      description: track.description || '',
      color: track.color || '#00CC00',
      sheet_id: track.sheet_id || '',
      sheet_url: track.sheet_url || '',
      status: track.status || 'active',
    });
    setAutoSlug(false);
    setDialogOpen(true);
  };

  const handleNameChange = (value: string) => {
    setForm(f => ({
      ...f,
      name: value,
      slug: autoSlug ? slugify(value) : f.slug,
    }));
  };

  const handleSlugChange = (value: string) => {
    setAutoSlug(false);
    setForm(f => ({ ...f, slug: value }));
  };

  const handleSheetUrlChange = (value: string) => {
    let sheetId = '';
    const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) sheetId = match[1];
    setForm(f => ({ ...f, sheet_url: value, sheet_id: sheetId || f.sheet_id }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setToast({ type: 'error', message: 'Name and slug are required' });
      return;
    }
    setSaving(true);
    try {
      if (editingTrack) {
        const updated = await updateTrack(editingTrack.id, {
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          color: form.color,
          sheet_id: form.sheet_id.trim(),
          sheet_url: form.sheet_url.trim(),
          status: form.status,
        });
        setTracks(ts => ts.map(t => t.id === updated.id ? updated : t));
        setToast({ type: 'success', message: 'Track updated successfully' });
      } else {
        const created = await createTrack({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          color: form.color,
          sheet_id: form.sheet_id.trim(),
          sheet_url: form.sheet_url.trim(),
          status: form.status,
          position: tracks.length,
          enrollment_open: true,
        });
        setTracks(ts => [...ts, created]);
        setToast({ type: 'success', message: 'Track created successfully' });
      }
      setDialogOpen(false);
    } catch (e: any) {
      if (e.message?.includes('Session expired')) {
        handleLogout();
      } else {
        setToast({ type: 'error', message: e.message || 'An error occurred' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteTrack(deleteTarget.id);
      setTracks(ts => ts.filter(t => t.id !== deleteTarget.id));
      setToast({ type: 'success', message: 'Track deleted' });
    } catch (e: any) {
      if (e.message?.includes('Session expired')) handleLogout();
      else setToast({ type: 'error', message: 'Failed to delete track' });
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleStatus = async (track: Track) => {
    const newStatus = track.status === 'active' ? 'archived' : 'active';
    try {
      const updated = await updateTrack(track.id, { status: newStatus });
      setTracks(ts => ts.map(t => t.id === updated.id ? updated : t));
      setToast({ type: 'success', message: `Track ${newStatus === 'active' ? 'activated' : 'archived'}` });
    } catch (e: any) {
      if (e.message?.includes('Session expired')) handleLogout();
      else setToast({ type: 'error', message: 'Failed to update status' });
    }
  };

  const handleAdminSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, key: adminKey }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      sessionStorage.setItem('adminToken', data.token);
      setAdminToken(data.token);
    } catch {
      setAdminError('Invalid password or admin key');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    setAdminToken(null);
    setTracks([]);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-28 pb-12">
          <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Admin Access</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-key">Admin Key</Label>
                    <Input
                      id="admin-key"
                      type="password"
                      value={adminKey}
                      onChange={e => setAdminKey(e.target.value)}
                    />
                  </div>
                  {adminError && (
                    <p className="text-sm text-destructive">{adminError}</p>
                  )}
                  <Button type="submit" className="w-full">
                    Enter Admin
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-medium transition-all animate-in slide-in-from-bottom-4',
          toast.type === 'success'
            ? 'bg-primary text-primary-foreground'
            : 'bg-destructive text-destructive-foreground'
        )}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      <main className="pt-28 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-3"
                onClick={handleLogout}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <LayoutDashboard className="w-8 h-8 text-primary" />
                Admin Panel
              </h1>
              <p className="text-muted-foreground mt-1">Manage training tracks and Google Sheets connections</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                Logout
              </Button>
              <Button onClick={openCreate} className="gap-2 glow-green-sm">
                <Plus className="w-4 h-4" />
                Add Track
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Tracks', value: tracks.length },
              { label: 'Active', value: tracks.filter(t => t.status === 'active').length },
              { label: 'Archived', value: tracks.filter(t => t.status === 'archived').length },
              { label: 'Connected Sheets', value: tracks.filter(t => t.sheet_id).length },
            ].map(stat => (
              <Card key={stat.label} className="bg-card/50 border-border/50">
                <CardContent className="pt-5">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Tracks</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton h-20 rounded-lg" />
                  ))}
                </div>
              ) : tracks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <LayoutDashboard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No tracks yet. Click "Add Track" to create one.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tracks.map(track => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-border transition-colors bg-background/50"
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                      <div
                        className="w-3 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: track.color || '#00CC00' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{track.name}</span>
                          <Badge
                            variant={track.status === 'active' ? 'default' : 'secondary'}
                            className={cn(
                              'text-xs',
                              track.status === 'active' ? 'bg-primary/20 text-primary border-primary/30' : ''
                            )}
                          >
                            {track.status}
                          </Badge>
                          {track.slug && (
                            <span className="text-xs text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">
                              /{track.slug}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {track.description || <span className="italic">No description</span>}
                        </p>
                        <Link
                          to={`/admin/track/${track.slug}`}
                          className="flex items-center gap-2 mt-1.5 text-primary hover:underline"
                        >
                          <LayoutDashboard className="w-3 h-3" />
                          Manage Students
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(track)}
                          className="text-xs h-8"
                        >
                          {track.status === 'active' ? 'Archive' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(track)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(track)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTrack ? 'Edit Track' : 'New Track'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Track Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Fundamentals Level 1"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/track/</span>
                <Input
                  id="slug"
                  placeholder="fundamentals-1"
                  value={form.slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Short description of this track"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all',
                      form.color === c ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : 'opacity-70 hover:opacity-100'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{form.color}</span>
                </div>
              </div>
            </div>
            <div className="border border-border rounded-xl p-4 space-y-4 bg-secondary/20">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Google Sheet Connection</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sheet_url">Google Sheet URL</Label>
                <Input
                  id="sheet_url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={form.sheet_url}
                  onChange={e => handleSheetUrlChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sheet_id">Sheet ID</Label>
                <Input
                  id="sheet_id"
                  placeholder="Auto-extracted or enter manually"
                  value={form.sheet_id}
                  onChange={e => setForm(f => ({ ...f, sheet_id: e.target.value }))}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="flex gap-3">
                {['active', 'archived', 'upcoming'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-sm font-medium capitalize border transition-all',
                      form.status === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingTrack ? 'Save Changes' : 'Create Track'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Track</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}