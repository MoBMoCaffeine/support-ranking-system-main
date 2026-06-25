import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
    fetchTrackBySlug,
    getTrackStudents,
    addStudent,
    updateStudents,
    deleteStudent,
    calculateScore,
    Track,
    StudentRecord,
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
    ArrowLeft,
    Search,
    Plus,
    Trash2,
    Save,
    Loader2,
    Users,
    TrendingUp,
    Trophy,
    TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EditableField =
    | 'name'
    | 'image'
    | 'score'
    | 'attendency'
    | 'tasks'
    | 'activity'
    | 'contAttendance'
    | 'bonus';

const NUMERIC_FIELDS: EditableField[] = [
    'score',
    'attendency',
    'tasks',
    'activity',
    'contAttendance',
    'bonus',
];

type NewStudentForm = {
    id: string;
    name: string;
    image: string;
    attendency: string;
    tasks: string;
    activity: string;
    contAttendance: string;
    bonus: string;
};

const emptyNewStudent: NewStudentForm = {
    id: '',
    name: '',
    image: '',
    attendency: '',
    tasks: '',
    activity: '',
    contAttendance: '',
    bonus: '',
};

const swalTheme = {
    background: 'var(--card)',
    color: 'var(--foreground)',
    confirmButtonColor: '#00CC00',
    cancelButtonColor: '#6B7280',
};

export function AdminTrackPage() {
    const { slug } = useParams<{ slug: string }>();

    const [track, setTrack] = useState<Track | null>(null);
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [originalStudents, setOriginalStudents] = useState<Record<string, StudentRecord>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const [addOpen, setAddOpen] = useState(false);
    const [newStudent, setNewStudent] = useState<NewStudentForm>(emptyNewStudent);

    useEffect(() => {
        if (slug) {
            loadData(slug);
        } else {
            setError('Track slug is missing from URL');
            setLoading(false);
        }
    }, [slug]);

    const loadData = async (trackSlug: string) => {
        setLoading(true);
        setError('');
        try {
            const [trackData, studentData] = await Promise.all([
                fetchTrackBySlug(trackSlug),
                getTrackStudents(trackSlug),
            ]);

            if (!trackData) {
                setError('Track not found');
                setLoading(false);
                return;
            }

            setTrack(trackData);
            setStudents(studentData);
            setOriginalStudents(
                Object.fromEntries(studentData.map(s => [s.id, { ...s }]))
            );
        } catch (e: any) {
            console.error('Error loading track data:', e);
            if (e.message?.includes('Session expired') || e.message?.includes('Unauthorized')) {
                window.location.href = '/admin';
            } else {
                setError(e.message || 'Failed to load track data');
            }
        } finally {
            setLoading(false);
        }
    };

    const dirtyIds = useMemo(() => {
        return students
            .filter(s => {
                const original = originalStudents[s.id];
                if (!original) return false;
                return (Object.keys(original) as (keyof StudentRecord)[]).some(
                    key => original[key] !== s[key]
                );
            })
            .map(s => s.id);
    }, [students, originalStudents]);

    const hasChanges = dirtyIds.length > 0;

    const stats = useMemo(() => {
        if (students.length === 0) {
            return { total: 0, average: 0, highest: 0, lowest: 0 };
        }
        const scores = students.map(s => s.score);
        return {
            total: students.length,
            average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
            highest: Math.max(...scores),
            lowest: Math.min(...scores),
        };
    }, [students]);

    const distribution = useMemo(() => {
        const buckets = [
            { label: '0-50', min: 0, max: 50, count: 0 },
            { label: '50-70', min: 50, max: 70, count: 0 },
            { label: '70-85', min: 70, max: 85, count: 0 },
            { label: '85-100', min: 85, max: 100, count: 0 },
        ];
        students.forEach(s => {
            const bucket = buckets.find((b, i) =>
                i === buckets.length - 1 ? s.score >= b.min && s.score <= b.max : s.score >= b.min && s.score < b.max
            );
            if (bucket) bucket.count += 1;
        });
        const max = Math.max(1, ...buckets.map(b => b.count));
        return buckets.map(b => ({ ...b, pct: Math.round((b.count / max) * 100) }));
    }, [students]);

    const filteredStudents = useMemo(() => {
        if (!search.trim()) return students;
        const q = search.trim().toLowerCase();
        return students.filter(
            s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
        );
    }, [students, search]);

    const handleFieldChange = (id: string, field: EditableField, value: string) => {
        setStudents(prev =>
            prev.map(s => {
                if (s.id !== id) return s;
                const updated = { ...s };
                if (NUMERIC_FIELDS.includes(field)) {
                    const num = value === '' ? 0 : Number(value);
                    (updated as any)[field] = Number.isFinite(num) ? num : s[field as keyof StudentRecord];
                } else {
                    (updated as any)[field] = value;
                }
                updated.score = calculateScore(updated);
                return updated;
            })
        );
    };

    const handleSaveAll = async () => {
        if (!hasChanges || !slug) return;

        const confirm = await Swal.fire({
            title: 'Save all changes?',
            text: `Are you sure you want to save all changes? (${dirtyIds.length} student${dirtyIds.length > 1 ? 's' : ''})`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, save',
            cancelButtonText: 'Cancel',
            ...swalTheme,
        });

        if (!confirm.isConfirmed) return;

        setSaving(true);
        try {
            const changed = students.filter(s => dirtyIds.includes(s.id));
            await updateStudents(slug, changed);
            setOriginalStudents(Object.fromEntries(students.map(s => [s.id, { ...s }])));
            await Swal.fire({
                title: 'Saved!',
                text: 'All changes were saved successfully.',
                icon: 'success',
                ...swalTheme,
            });
        } catch (e: any) {
            console.error('Save error:', e);
            if (e.message?.includes('Session expired')) {
                window.location.href = '/admin';
            } else {
                await Swal.fire({ title: 'Error', text: e.message || 'Failed to save changes', icon: 'error', ...swalTheme });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (student: StudentRecord) => {
        const confirm = await Swal.fire({
            title: 'Delete student?',
            text: `Are you sure you want to delete this student? (${student.name})`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#EF4444',
            background: swalTheme.background,
            color: swalTheme.color,
        });

        if (!confirm.isConfirmed || !slug) return;

        setSaving(true);
        try {
            await deleteStudent(slug, student.id);
            setStudents(prev => prev.filter(s => s.id !== student.id));
            setOriginalStudents(prev => {
                const next = { ...prev };
                delete next[student.id];
                return next;
            });
            await Swal.fire({ title: 'Deleted', icon: 'success', timer: 1200, showConfirmButton: false, ...swalTheme });
        } catch (e: any) {
            console.error('Delete error:', e);
            if (e.message?.includes('Session expired')) {
                window.location.href = '/admin';
            } else {
                await Swal.fire({ title: 'Error', text: e.message || 'Failed to delete student', icon: 'error', ...swalTheme });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAddStudent = async () => {
        if (!newStudent.name.trim() || !slug) {
            await Swal.fire({ title: 'Error', text: 'Student name is required', icon: 'error', ...swalTheme });
            return;
        }

        setSaving(true);
        try {
            await addStudent(slug, {
                id: newStudent.id.trim() || undefined,
                name: newStudent.name.trim(),
                image: newStudent.image.trim(),
                attendency: Number(newStudent.attendency) || 0,
                tasks: Number(newStudent.tasks) || 0,
                activity: Number(newStudent.activity) || 0,
                contAttendance: Number(newStudent.contAttendance) || 0,
                bonus: Number(newStudent.bonus) || 0,
            });

            await loadData(slug);
            setNewStudent(emptyNewStudent);
            setAddOpen(false);
            await Swal.fire({ title: 'Added!', text: 'Student added successfully.', icon: 'success', ...swalTheme });
        } catch (e: any) {
            console.error('Add error:', e);
            if (e.message?.includes('Session expired')) {
                window.location.href = '/admin';
            } else {
                await Swal.fire({ title: 'Error', text: e.message || 'Failed to add student', icon: 'error', ...swalTheme });
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="pt-28 pb-12">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton h-20 rounded-lg" />
                        ))}
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !track) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="pt-28 pb-12">
                    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <p className="text-destructive mb-4">{error || 'Track not found'}</p>
                        <Link to="/admin" className="text-primary hover:underline inline-flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Admin Panel
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="pt-28 pb-12">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <Link
                                to="/admin"
                                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-3"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Admin Panel
                            </Link>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-3 h-8 rounded-full shrink-0"
                                    style={{ backgroundColor: track.color || '#00CC00' }}
                                />
                                <h1 className="text-3xl font-bold">{track.name}</h1>
                            </div>
                            <p className="text-muted-foreground mt-1">
                                {track.description || <span className="italic">No description</span>}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setAddOpen(true)} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Student
                            </Button>
                            <Button
                                onClick={handleSaveAll}
                                disabled={!hasChanges || saving}
                                className="gap-2 glow-green-sm"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save All Changes
                                {hasChanges && (
                                    <span className="ml-1 text-xs bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">
                                        {dirtyIds.length}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Total Students', value: stats.total, icon: Users },
                            { label: 'Average Score', value: stats.average, icon: TrendingUp },
                            { label: 'Highest Score', value: stats.highest, icon: Trophy },
                            { label: 'Lowest Score', value: stats.lowest, icon: TrendingDown },
                        ].map(stat => (
                            <Card key={stat.label} className="bg-card/50 border-border/50">
                                <CardContent className="pt-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                                    </div>
                                    <stat.icon className="w-5 h-5 text-primary/60" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="bg-card/50 border-border/50 mb-6">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Score Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-4 h-32">
                                {distribution.map(bucket => (
                                    <div key={bucket.label} className="flex-1 flex flex-col items-center gap-2">
                                        <span className="text-sm font-semibold">{bucket.count}</span>
                                        <div className="w-full bg-secondary rounded-t-md relative flex-1 flex items-end overflow-hidden">
                                            <div
                                                className="w-full rounded-t-md transition-all"
                                                style={{
                                                    height: `${bucket.pct}%`,
                                                    backgroundColor: track.color || '#00CC00',
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground">{bucket.label}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="relative mb-4 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Card className="bg-card/50 border-border/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Students ({filteredStudents.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            {filteredStudents.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No students found.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-muted-foreground border-b border-border/50">
                                            <th className="py-2 pr-3 font-medium">ID</th>
                                            <th className="py-2 pr-3 font-medium">Name</th>
                                            <th className="py-2 pr-3 font-medium">Score</th>
                                            <th className="py-2 pr-3 font-medium">Attendency</th>
                                            <th className="py-2 pr-3 font-medium">Tasks</th>
                                            <th className="py-2 pr-3 font-medium">Activity</th>
                                            <th className="py-2 pr-3 font-medium">Cont. Attendance</th>
                                            <th className="py-2 pr-3 font-medium">Bonus</th>
                                            <th className="py-2 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map(student => {
                                            const isDirty = dirtyIds.includes(student.id);
                                            return (
                                                <tr
                                                    key={student.id}
                                                    className={cn(
                                                        'border-b border-border/30 last:border-0',
                                                        isDirty && 'bg-primary/5'
                                                    )}
                                                >
                                                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                                                        {student.id}
                                                    </td>
                                                    <td className="py-2 pr-3 min-w-[140px]">
                                                        <Input
                                                            value={student.name}
                                                            onChange={e => handleFieldChange(student.id, 'name', e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="py-2 pr-3 min-w-[90px]">
                                                        <Input
                                                            type="number"
                                                            value={String(student.score)}
                                                            disabled
                                                            className="h-8 opacity-70 cursor-not-allowed"
                                                            title='score = Attendency + Tasks + Activity + Cont. Attendance + Bonus'
                                                        />
                                                    </td>
                                                    {(['attendency', 'tasks', 'activity', 'contAttendance', 'bonus'] as EditableField[]).map(field => (
                                                        <td key={field} className="py-2 pr-3 min-w-[90px]">
                                                            <Input
                                                                type="number"
                                                                value={String(student[field as keyof StudentRecord])}
                                                                onChange={e => handleFieldChange(student.id, field, e.target.value)}
                                                                className="h-8"
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="py-2 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDelete(student)}
                                                            disabled={saving}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Student</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="ns-id">ID (optional)</Label>
                                <Input
                                    id="ns-id"
                                    placeholder="Auto-generated if empty"
                                    value={newStudent.id}
                                    onChange={e => setNewStudent(f => ({ ...f, id: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ns-name">Student Name *</Label>
                                <Input
                                    id="ns-name"
                                    value={newStudent.name}
                                    onChange={e => setNewStudent(f => ({ ...f, name: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="ns-image">Student Image URL</Label>
                            <Input
                                id="ns-image"
                                placeholder="https://..."
                                value={newStudent.image}
                                onChange={e => setNewStudent(f => ({ ...f, image: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="ns-attendency">Attendency</Label>
                                <Input
                                    id="ns-attendency"
                                    type="number"
                                    value={newStudent.attendency}
                                    onChange={e => setNewStudent(f => ({ ...f, attendency: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ns-tasks">Tasks</Label>
                                <Input
                                    id="ns-tasks"
                                    type="number"
                                    value={newStudent.tasks}
                                    onChange={e => setNewStudent(f => ({ ...f, tasks: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ns-activity">Activity</Label>
                                <Input
                                    id="ns-activity"
                                    type="number"
                                    value={newStudent.activity}
                                    onChange={e => setNewStudent(f => ({ ...f, activity: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ns-cont">Cont. Attendance</Label>
                                <Input
                                    id="ns-cont"
                                    type="number"
                                    value={newStudent.contAttendance}
                                    onChange={e => setNewStudent(f => ({ ...f, contAttendance: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ns-bonus">Bonus</Label>
                                <Input
                                    id="ns-bonus"
                                    type="number"
                                    value={newStudent.bonus}
                                    onChange={e => setNewStudent(f => ({ ...f, bonus: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddStudent} disabled={saving} className="gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add Student
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}