const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { createGzip } = require('zlib');

const BACKUP_DIR = path.resolve(
    process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups', 'daily')
);
const BACKUP_RETENTION_DAYS = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS || 30));

function getSafeBackupName(rawName) {
    const name = path.basename(String(rawName || '').trim());
    if (!/^[A-Za-z0-9._-]+\.sql(?:\.gz)?$/.test(name)) {
        return null;
    }
    return name;
}

async function ensureBackupDir() {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
}

function formatTimestamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

async function cleanupOldBackups() {
    await ensureBackupDir();
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
    const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    await Promise.all(entries.map(async (entry) => {
        if (!entry.isFile()) return;
        const safeName = getSafeBackupName(entry.name);
        if (!safeName) return;
        const fullPath = path.join(BACKUP_DIR, safeName);
        const stats = await fs.stat(fullPath);
        if (stats.mtimeMs < cutoff) {
            await fs.unlink(fullPath);
        }
    }));
}

async function createBackupFile() {
    await ensureBackupDir();

    const fileName = `dnl-backup-${formatTimestamp()}.sql.gz`;
    const fullPath = path.join(BACKUP_DIR, fileName);
    const dumpArgs = [
        '--single-transaction',
        '--quick',
        '--lock-tables=false',
        '-h', String(process.env.DB_HOST || 'db'),
        '-P', String(process.env.DB_PORT || '3306'),
        '-u', String(process.env.DB_USER || 'root'),
        `-p${String(process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || '')}`,
        String(process.env.DB_NAME || process.env.MYSQL_DATABASE || 'dispatch_todo_app'),
    ];

    const dumpProcess = spawn('mysqldump', dumpArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    dumpProcess.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });

    const closePromise = new Promise((resolve, reject) => {
        dumpProcess.on('error', reject);
        dumpProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(stderr.trim() || `mysqldump exited with code ${code}`));
            }
        });
    });

    try {
        await Promise.all([
            pipeline(dumpProcess.stdout, createGzip(), require('fs').createWriteStream(fullPath)),
            closePromise,
        ]);
        await cleanupOldBackups();
        const stats = await fs.stat(fullPath);
        return {
            name: fileName,
            sizeBytes: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            downloadPath: `/api/backups/${encodeURIComponent(fileName)}/download`,
        };
    } catch (error) {
        await fs.unlink(fullPath).catch(() => { });
        throw error;
    }
}

async function resolveBackupPath(fileName) {
    const safeName = getSafeBackupName(fileName);
    if (!safeName) {
        return null;
    }

    const fullPath = path.join(BACKUP_DIR, safeName);

    try {
        const stats = await fs.stat(fullPath);
        if (!stats.isFile()) {
            return null;
        }
        return { fullPath, safeName, stats };
    } catch {
        return null;
    }
}

async function listBackups(_req, res) {
    try {
        await ensureBackupDir();
        const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });

        const files = [];
        for (const entry of entries) {
            if (!entry.isFile()) continue;

            const safeName = getSafeBackupName(entry.name);
            if (!safeName) continue;

            const fullPath = path.join(BACKUP_DIR, safeName);
            const stats = await fs.stat(fullPath);

            files.push({
                name: safeName,
                sizeBytes: stats.size,
                modifiedAt: stats.mtime.toISOString(),
                downloadPath: `/api/backups/${encodeURIComponent(safeName)}/download`,
            });
        }

        files.sort((left, right) => new Date(right.modifiedAt) - new Date(left.modifiedAt));
        return res.json({ files });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to list backups.' });
    }
}

async function createBackup(_req, res) {
    try {
        const file = await createBackupFile();
        return res.status(201).json({
            message: 'Backup created.',
            file,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to create backup.' });
    }
}

async function downloadBackup(req, res) {
    try {
        const file = await resolveBackupPath(req.params.fileName);
        if (!file) {
            return res.status(404).json({ error: 'Backup file not found.' });
        }

        return res.download(file.fullPath, file.safeName);
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to download backup.' });
    }
}

async function deleteBackup(req, res) {
    try {
        const file = await resolveBackupPath(req.params.fileName);
        if (!file) {
            return res.status(404).json({ error: 'Backup file not found.' });
        }

        await fs.unlink(file.fullPath);
        return res.json({ message: 'Backup deleted.', name: file.safeName });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to delete backup.' });
    }
}

module.exports = {
    listBackups,
    createBackup,
    downloadBackup,
    deleteBackup,
};