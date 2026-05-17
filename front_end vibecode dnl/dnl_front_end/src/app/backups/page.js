"use client";

import { useEffect, useState } from "react";
import {
    ActionButton,
    DataBadge,
    DataTable,
    DeleteIcon,
    DownloadIcon,
    HeaderCell,
    TableEmptyState,
} from "../../components/DataTable";
import {
    createBackupNow,
    deleteBackup,
    downloadBackup,
    getBackups,
} from "../../utils/api";

function formatSize(sizeBytes) {
    const value = Number(sizeBytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatTimestamp(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString();
}

function BackupIcon({ className = "h-4 w-4" }) {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M10 2.75a.75.75 0 01.75.75v6.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72V3.5A.75.75 0 0110 2.75z" />
            <path d="M4.5 13.25a.75.75 0 01.75.75v.5c0 .414.336.75.75.75h8a.75.75 0 00.75-.75V14a.75.75 0 011.5 0v.5A2.25 2.25 0 0114 16.75H6A2.25 2.25 0 013.75 14.5V14a.75.75 0 01.75-.75z" />
        </svg>
    );
}

export default function BackupsPage() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [busyFileName, setBusyFileName] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const items = await getBackups();
            setFiles(items);
            setError("");
        } catch (e) {
            setError(e.message || "Failed to load backups.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleCreateBackup = async () => {
        setCreating(true);
        setError("");
        setNotice("");
        try {
            const result = await createBackupNow();
            setNotice(result?.message || "Backup created.");
            await fetchBackups();
        } catch (e) {
            setError(e.message || "Failed to create backup.");
        }
        setCreating(false);
    };

    const handleDownload = async (fileName) => {
        setBusyFileName(fileName);
        setError("");
        setNotice("");
        try {
            await downloadBackup(fileName);
            setNotice(`Downloaded ${fileName}.`);
        } catch (e) {
            setError(e.message || "Failed to download backup.");
        }
        setBusyFileName("");
    };

    const handleDelete = async (fileName) => {
        if (!window.confirm(`Delete backup ${fileName}?`)) {
            return;
        }

        setBusyFileName(fileName);
        setError("");
        setNotice("");
        try {
            const result = await deleteBackup(fileName);
            setNotice(result?.message || "Backup deleted.");
            await fetchBackups();
        } catch (e) {
            setError(e.message || "Failed to delete backup.");
        }
        setBusyFileName("");
    };

    return (
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <div className="mb-8 mt-2 rounded-2xl bg-white p-6 shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-blue-600">Admin tools</div>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-blue-950">Database Backups</h1>
                        <p className="mt-2 max-w-3xl text-sm text-slate-600">
                            Create an on-demand backup, download a backup file to your machine, or delete old backups from the server to free disk space.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <DataBadge tone="info">{files.length} stored</DataBadge>
                        <ActionButton variant="primary" icon={<BackupIcon />} onClick={handleCreateBackup} disabled={creating}>
                            {creating ? "Creating..." : "Create Backup Now"}
                        </ActionButton>
                    </div>
                </div>

                {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
                {notice ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div> : null}

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Storage</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">Mounted backup directory</div>
                        <div className="mt-1 text-sm text-slate-500">Files are stored on the server in the daily backups folder and can be removed from this page.</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Downloads</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">Admin-only access</div>
                        <div className="mt-1 text-sm text-slate-500">Each download uses the same admin JWT protection as the rest of the secure API.</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cleanup</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">Manual disk control</div>
                        <div className="mt-1 text-sm text-slate-500">Delete old backups here when you want to free space, even though daily retention still runs on the server.</div>
                    </div>
                </div>

                <div className="mt-6">
                    <DataTable hint="Swipe to review backup inventory">
                        <thead>
                            <tr>
                                <HeaderCell>Backup File</HeaderCell>
                                <HeaderCell>Saved</HeaderCell>
                                <HeaderCell>Size</HeaderCell>
                                <HeaderCell>Type</HeaderCell>
                                <HeaderCell>Actions</HeaderCell>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {!loading && files.length === 0 ? (
                                <TableEmptyState colSpan={5} title="No backups found" description="Use Create Backup Now to generate the first on-demand backup file." />
                            ) : files.map((file) => (
                                <tr key={file.name} className="transition hover:bg-sky-50/70">
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{file.name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{formatTimestamp(file.modifiedAt)}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{formatSize(file.sizeBytes)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <DataBadge tone={String(file.name).endsWith('.gz') ? 'success' : 'neutral'}>
                                            {String(file.name).endsWith('.gz') ? 'Compressed SQL' : 'SQL'}
                                        </DataBadge>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex flex-wrap gap-2">
                                            <ActionButton
                                                variant="primary"
                                                icon={<DownloadIcon />}
                                                onClick={() => handleDownload(file.name)}
                                                disabled={busyFileName === file.name}
                                            >
                                                {busyFileName === file.name ? 'Working...' : 'Download'}
                                            </ActionButton>
                                            <ActionButton
                                                variant="danger"
                                                icon={<DeleteIcon />}
                                                onClick={() => handleDelete(file.name)}
                                                disabled={busyFileName === file.name}
                                            >
                                                Delete
                                            </ActionButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </DataTable>
                </div>
            </div>
        </div>
    );
}