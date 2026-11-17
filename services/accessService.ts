import { isSupabaseConfigured } from '../lib/supabaseClient';
import type {
    AccessVerificationResult,
    AdminStudentRecord,
    AdminUserSummary,
    DeviceAccessAlert,
    SavedAdminCredentials,
    VerifiedStudentSession,
} from '../types';

const DEVICE_ID_KEY = 'territorio_canva_6ta_device_id_v1';
const STUDENT_VAULT_KEY = 'territorio_canva_6ta_student_vault_v1';
const ADMIN_VAULT_KEY = 'territorio_canva_6ta_admin_vault_v1';
const LOCAL_DB_KEY = 'territorio_canva_6ta_local_db_v1';

interface LocalDeviceEntry {
    deviceId: string;
    deviceLabel: string;
    ipAddress: string;
    countryCode: string;
    isAuthorized: boolean;
    lastSeenAt: string;
}

interface LocalStudentEntry extends AdminStudentRecord {
    devices: LocalDeviceEntry[];
}

interface LocalAdminEntry {
    id: string;
    adminEmail: string;
    accessKey: string;
    displayName: string;
    isActive: boolean;
    createdAt: string;
}

interface LocalDbState {
    admin?: { email: string; accessKey: string; displayName: string } | null;
    admins?: LocalAdminEntry[];
    students: LocalStudentEntry[];
    alerts: DeviceAccessAlert[];
}

export const getOrCreateDeviceId = (): string => {
    try {
        const existing = localStorage.getItem(DEVICE_ID_KEY);
        if (existing) return existing;
        const generated =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(DEVICE_ID_KEY, generated);
        return generated;
    } catch {
        return `dev_${Date.now()}`;
    }
};

export const getDeviceLabel = (): string => {
    if (typeof navigator === 'undefined') return 'Dispositivo Web';
    const ua = navigator.userAgent;

    let browser = 'Navegador';
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
    else if (ua.includes('Firefox/')) browser = 'Firefox';

    let os = 'Equipo';
    if (ua.includes('iPhone')) os = 'iPhone';
    else if (ua.includes('iPad')) os = 'iPad';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS X')) os = 'Mac';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} · ${os}`;
};

export const getSavedStudentSession = (): VerifiedStudentSession | null => {
    try {
        const raw = localStorage.getItem(STUDENT_VAULT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<VerifiedStudentSession>;
        if (!parsed.email) return null;
        return {
            studentId: parsed.studentId || '',
            email: parsed.email,
            fullName: parsed.fullName || '',
            purchaseCode: parsed.purchaseCode || '',
            classroomPassword: parsed.classroomPassword || '',
            classroomUrl: parsed.classroomUrl || '',
            primaryCountry: parsed.primaryCountry || '',
            primaryIp: parsed.primaryIp || '',
            activeDevicesCount: parsed.activeDevicesCount ?? 1,
            maxDevices: parsed.maxDevices ?? 2,
            completedClassIds: Array.isArray(parsed.completedClassIds) ? parsed.completedClassIds : [],
            verifiedAt: parsed.verifiedAt || new Date().toISOString(),
        };
    } catch {
        return null;
    }
};

export const saveStudentSessionLocally = (session: VerifiedStudentSession): void => {
    try {
        localStorage.setItem(STUDENT_VAULT_KEY, JSON.stringify(session));
    } catch {
        // Ignore storage quota issues
    }
};

export const clearStudentSessionLocally = (): void => {
    try {
        localStorage.removeItem(STUDENT_VAULT_KEY);
    } catch {
        // Ignore
    }
};

export const getSavedAdminCredentials = (): SavedAdminCredentials | null => {
    try {
        const raw = localStorage.getItem(ADMIN_VAULT_KEY);
        return raw ? (JSON.parse(raw) as SavedAdminCredentials) : null;
    } catch {
        return null;
    }
};

export const saveAdminCredentialsLocally = (creds: SavedAdminCredentials): void => {
    try {
        localStorage.setItem(ADMIN_VAULT_KEY, JSON.stringify(creds));
    } catch {
        // Ignore
    }
};

export const clearAdminCredentialsLocally = (): void => {
    try {
        localStorage.removeItem(ADMIN_VAULT_KEY);
    } catch {
        // Ignore
    }
};

const normalizeLocalDb = (raw: LocalDbState): Required<Pick<LocalDbState, 'admins' | 'students' | 'alerts'>> & {
    admin: LocalDbState['admin'];
} => {
    const admins: LocalAdminEntry[] = Array.isArray(raw.admins) ? [...raw.admins] : [];
    if (raw.admin && raw.admin.email) {
        const legacyEmail = raw.admin.email.trim().toLowerCase();
        if (!admins.some((a) => a.adminEmail.toLowerCase() === legacyEmail)) {
            admins.push({
                id: `adm_legacy_${legacyEmail}`,
                adminEmail: legacyEmail,
                accessKey: raw.admin.accessKey,
                displayName: raw.admin.displayName || 'Administrador',
                isActive: true,
                createdAt: new Date().toISOString(),
            });
        }
    }

    const students: LocalStudentEntry[] = Array.isArray(raw.students)
        ? raw.students.map((s) => ({
              ...s,
              primaryIp: s.primaryIp ?? null,
              completedClassIds: Array.isArray(s.completedClassIds) ? s.completedClassIds : [],
              devices: Array.isArray(s.devices) ? s.devices : [],
          }))
        : [];

    const alerts: DeviceAccessAlert[] = Array.isArray(raw.alerts) ? raw.alerts : [];
    return {
        admin: raw.admin ?? null,
        admins,
        students,
        alerts,
    };
};

const readLocalDb = () => {
    try {
        const raw = localStorage.getItem(LOCAL_DB_KEY);
        if (raw) {
            return normalizeLocalDb(JSON.parse(raw) as LocalDbState);
        }
    } catch {
        // Fallback below
    }
    return normalizeLocalDb({ admin: null, admins: [], students: [], alerts: [] });
};

const writeLocalDb = (db: ReturnType<typeof normalizeLocalDb>): void => {
    try {
        localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
    } catch {
        // Ignore
    }
};

export const hasLocalAdminConfigured = (): boolean => {
    return readLocalDb().admins.some((a) => a.isActive);
};

async function detectClientIp(): Promise<string> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
        return '127.0.0.1';
    }
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1400);
        const res = await fetch('/api/client-ip', { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (res.ok) {
            const data = (await res.json()) as { ip?: string };
            if (data.ip) return data.ip.trim();
        }
    } catch {
        // Fallback below
    }
    return '127.0.0.1';
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return (await response.json()) as T;
}

const findValidLocalAdmin = (
    db: ReturnType<typeof normalizeLocalDb>,
    email: string,
    accessKey: string
): LocalAdminEntry | undefined => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanKey = accessKey.trim();
    return db.admins.find(
        (a) => a.isActive && a.adminEmail.toLowerCase() === cleanEmail && a.accessKey === cleanKey
    );
};

export async function verifyStudentAccess(params: {
    email: string;
    purchaseCode: string;
    classroomPasswordDraft?: string;
    deviceIdOverride?: string;
    countryOverride?: string;
    ipOverride?: string;
}): Promise<AccessVerificationResult> {
    const deviceId = params.deviceIdOverride || getOrCreateDeviceId();
    const deviceLabel = getDeviceLabel();
    const cleanEmail = params.email.trim().toLowerCase();
    const rawCredential = params.purchaseCode.trim();
    const upperCredential = rawCredential.toUpperCase();

    if (isSupabaseConfigured) {
        const result = await postJson<AccessVerificationResult & { notConfigured?: boolean }>(
            '/api/verify-access',
            {
                action: 'verify',
                email: cleanEmail,
                purchaseCode: rawCredential,
                deviceId,
                deviceLabel,
            }
        );

        if (result.ok && result.student) {
            const existingLocal = getSavedStudentSession();
            const mergedPassword =
                params.classroomPasswordDraft?.trim() ||
                result.student.classroomPassword ||
                (existingLocal?.email === result.student.email ? existingLocal.classroomPassword : '') ||
                rawCredential;

            const mergedStudent: VerifiedStudentSession = {
                ...result.student,
                classroomPassword: mergedPassword,
                primaryIp: result.student.primaryIp || '',
                completedClassIds: Array.isArray(result.student.completedClassIds)
                    ? result.student.completedClassIds
                    : [],
                verifiedAt: new Date().toISOString(),
            };

            saveStudentSessionLocally(mergedStudent);

            if (params.classroomPasswordDraft?.trim() && !result.student.classroomPassword) {
                await saveStudentClassroomCredentials({
                    email: cleanEmail,
                    purchaseCode: rawCredential,
                    classroomPassword: params.classroomPasswordDraft.trim(),
                });
            }

            return { ...result, student: mergedStudent };
        }

        return result;
    }

    // Respaldo local funcional cuando Supabase aún no está conectado
    const db = readLocalDb();
    const student = db.students.find((s) => {
        if (s.email.toLowerCase() !== cleanEmail) return false;
        const matchesCode = Boolean(s.purchaseCode) && s.purchaseCode.toUpperCase() === upperCredential;
        const matchesPass = Boolean(s.classroomPassword) && s.classroomPassword.trim() === rawCredential;
        return matchesCode || matchesPass;
    });

    if (!student) {
        return {
            ok: false,
            status: 'INVALID_CREDENTIALS',
            message:
                'No encontramos ese correo o clave en la lista de alumnas registradas. Verifica tus datos o pide a coordinación que registre tu inscripción en el Panel de Administración.',
        };
    }

    if (!student.isActive) {
        return {
            ok: false,
            status: 'INACTIVE',
            message: 'Tu pase se encuentra suspendido temporalmente. Contacta al equipo de soporte.',
        };
    }

    const detectedIp = (params.ipOverride || (await detectClientIp()) || '127.0.0.1')
        .trim()
        .replace(/^::ffff:/, '')
        .replace(/^::1$/, '127.0.0.1');

    if (!student.primaryIp && detectedIp) {
        student.primaryIp = detectedIp;
    }

    const simulatedCountry = (params.countryOverride || student.primaryCountry || '').toUpperCase();
    if (!student.primaryCountry && simulatedCountry) {
        student.primaryCountry = simulatedCountry;
    }

    // 1. Bloqueo estricto si la IP detectada es diferente a la IP autorizada de la alumna
    if (student.primaryIp && detectedIp && student.primaryIp !== detectedIp) {
        const existingDev = student.devices.find((d) => d.deviceId === deviceId);
        if (existingDev) {
            existingDev.isAuthorized = false;
            existingDev.ipAddress = detectedIp;
            existingDev.countryCode = simulatedCountry;
            existingDev.lastSeenAt = new Date().toISOString();
        } else {
            student.devices.push({
                deviceId,
                deviceLabel,
                ipAddress: detectedIp,
                countryCode: simulatedCountry,
                isAuthorized: false,
                lastSeenAt: new Date().toISOString(),
            });
        }

        const totalDevices = student.devices.length;
        student.totalDevicesCount = totalDevices;

        const ipsSeen = Array.from(
            new Set([student.primaryIp, ...student.devices.map((d) => d.ipAddress).filter(Boolean)])
        );
        const countriesSeen = Array.from(
            new Set(
                [student.primaryCountry || '', ...student.devices.map((d) => d.countryCode)].filter(
                    Boolean
                )
            )
        );

        db.alerts.unshift({
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            studentId: student.id,
            email: student.email,
            fullName: student.fullName,
            detectedDevicesCount: totalDevices,
            countriesSeen,
            ipsSeen,
            attemptedDeviceLabel: deviceLabel,
            attemptedIp: detectedIp,
            attemptedCountry: simulatedCountry,
            reason: 'IP_MISMATCH',
            resolved: false,
            createdAt: new Date().toISOString(),
        });
        writeLocalDb(db);

        return {
            ok: false,
            status: 'BLOCKED_GEO',
            reason: 'IP_MISMATCH',
            detectedDevicesCount: totalDevices,
            maxDevices: student.maxDevices,
            primaryCountry: student.primaryCountry || '',
            attemptedCountry: simulatedCountry,
            countriesSeen,
            primaryIp: student.primaryIp,
            attemptedIp: detectedIp,
            ipsSeen,
            message: `Alerta de seguridad: este acceso solo está permitido hasta en ${student.maxDevices} dispositivos conectados desde la misma IP (${student.primaryIp}). Se bloqueó el intento desde otra IP (${detectedIp}).`,
        };
    }

    // 2. Bloqueo geográfico de respaldo si cambian países explícitos
    if (student.primaryCountry && simulatedCountry && student.primaryCountry !== simulatedCountry) {
        const existingDev = student.devices.find((d) => d.deviceId === deviceId);
        if (existingDev) {
            existingDev.isAuthorized = false;
            existingDev.countryCode = simulatedCountry;
            existingDev.lastSeenAt = new Date().toISOString();
        } else {
            student.devices.push({
                deviceId,
                deviceLabel,
                ipAddress: detectedIp,
                countryCode: simulatedCountry,
                isAuthorized: false,
                lastSeenAt: new Date().toISOString(),
            });
        }

        const countriesSeen = Array.from(
            new Set([student.primaryCountry, ...student.devices.map((d) => d.countryCode).filter(Boolean)])
        );
        const ipsSeen = Array.from(
            new Set([student.primaryIp || '', ...student.devices.map((d) => d.ipAddress)].filter(Boolean))
        );
        const totalDevices = student.devices.length;
        student.totalDevicesCount = totalDevices;

        db.alerts.unshift({
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            studentId: student.id,
            email: student.email,
            fullName: student.fullName,
            detectedDevicesCount: totalDevices,
            countriesSeen,
            ipsSeen,
            attemptedDeviceLabel: deviceLabel,
            attemptedIp: detectedIp,
            attemptedCountry: simulatedCountry,
            reason: 'COUNTRY_MISMATCH',
            resolved: false,
            createdAt: new Date().toISOString(),
        });
        writeLocalDb(db);

        return {
            ok: false,
            status: 'BLOCKED_GEO',
            reason: 'COUNTRY_MISMATCH',
            detectedDevicesCount: totalDevices,
            maxDevices: student.maxDevices,
            primaryCountry: student.primaryCountry,
            attemptedCountry: simulatedCountry,
            countriesSeen,
            primaryIp: student.primaryIp || detectedIp,
            attemptedIp: detectedIp,
            ipsSeen,
            message: `Alerta de seguridad: esta alumna ha ingresado en ${totalDevices} dispositivos y se detectó un intento desde un país distinto (${student.primaryCountry} vs ${simulatedCountry}).`,
        };
    }

    const existingAuthorized = student.devices.find((d) => d.deviceId === deviceId && d.isAuthorized);
    const authorizedCount = student.devices.filter((d) => d.isAuthorized).length;

    if (existingAuthorized || authorizedCount < student.maxDevices) {
        if (existingAuthorized) {
            existingAuthorized.ipAddress = detectedIp;
            existingAuthorized.lastSeenAt = new Date().toISOString();
        } else {
            student.devices.push({
                deviceId,
                deviceLabel,
                ipAddress: detectedIp,
                countryCode: simulatedCountry,
                isAuthorized: true,
                lastSeenAt: new Date().toISOString(),
            });
        }

        if (params.classroomPasswordDraft?.trim()) {
            student.classroomPassword = params.classroomPasswordDraft.trim();
        } else if (!student.classroomPassword) {
            student.classroomPassword = rawCredential;
        }

        student.authorizedDevicesCount = student.devices.filter((d) => d.isAuthorized).length;
        student.totalDevicesCount = student.devices.length;
        writeLocalDb(db);

        const session: VerifiedStudentSession = {
            studentId: student.id,
            email: student.email,
            fullName: student.fullName,
            purchaseCode: student.purchaseCode,
            classroomPassword: student.classroomPassword || rawCredential,
            classroomUrl: student.classroomUrl,
            primaryCountry: student.primaryCountry || simulatedCountry,
            primaryIp: student.primaryIp || detectedIp,
            activeDevicesCount: student.authorizedDevicesCount,
            maxDevices: student.maxDevices,
            completedClassIds: [...(student.completedClassIds || [])],
            verifiedAt: new Date().toISOString(),
        };
        saveStudentSessionLocally(session);

        return {
            ok: true,
            status: 'VERIFIED',
            message: 'Dispositivo autorizado en tu IP. Tus datos quedan guardados para entrar directo.',
            student: session,
        };
    }

    // 3. Excedió el límite de 2 dispositivos: bloquear y registrar alerta para el admin
    const alreadyRecorded = student.devices.find((d) => d.deviceId === deviceId);
    if (alreadyRecorded) {
        alreadyRecorded.ipAddress = detectedIp;
        alreadyRecorded.isAuthorized = false;
        alreadyRecorded.lastSeenAt = new Date().toISOString();
    } else {
        student.devices.push({
            deviceId,
            deviceLabel,
            ipAddress: detectedIp,
            countryCode: simulatedCountry,
            isAuthorized: false,
            lastSeenAt: new Date().toISOString(),
        });
    }

    const totalDevices = student.devices.length;
    student.totalDevicesCount = totalDevices;
    const countriesSeen = Array.from(
        new Set(student.devices.map((d) => d.countryCode).filter(Boolean))
    );
    const ipsSeen = Array.from(
        new Set([student.primaryIp || '', ...student.devices.map((d) => d.ipAddress)].filter(Boolean))
    );

    db.alerts.unshift({
        id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        studentId: student.id,
        email: student.email,
        fullName: student.fullName,
        detectedDevicesCount: totalDevices,
        countriesSeen,
        ipsSeen,
        attemptedDeviceLabel: deviceLabel,
        attemptedIp: detectedIp,
        attemptedCountry: simulatedCountry,
        reason: 'MAX_DEVICES',
        resolved: false,
        createdAt: new Date().toISOString(),
    });
    writeLocalDb(db);

    return {
        ok: false,
        status: 'BLOCKED_MAX_DEVICES',
        reason: 'MAX_DEVICES',
        detectedDevicesCount: totalDevices,
        maxDevices: student.maxDevices,
        primaryCountry: student.primaryCountry || simulatedCountry,
        attemptedCountry: simulatedCountry,
        countriesSeen,
        primaryIp: student.primaryIp || detectedIp,
        attemptedIp: detectedIp,
        ipsSeen,
        message: `Alerta de seguridad: se detectaron ${totalDevices} dispositivos intentando usar esta clave. El máximo permitido es ${student.maxDevices} dispositivos en la misma IP.`,
    };
}

export async function saveStudentClassroomCredentials(params: {
    email: string;
    purchaseCode: string;
    classroomPassword: string;
    deviceIdOverride?: string;
}): Promise<{ ok: boolean; message?: string }> {
    const existing = getSavedStudentSession();
    if (existing && existing.email.toLowerCase() === params.email.trim().toLowerCase()) {
        saveStudentSessionLocally({
            ...existing,
            classroomPassword: params.classroomPassword,
        });
    }

    if (isSupabaseConfigured) {
        return postJson<{ ok: boolean; message?: string }>('/api/verify-access', {
            action: 'save_credentials',
            email: params.email,
            purchaseCode: params.purchaseCode,
            deviceId: params.deviceIdOverride || getOrCreateDeviceId(),
            classroomPassword: params.classroomPassword,
        });
    }

    const db = readLocalDb();
    const student = db.students.find((s) => s.email.toLowerCase() === params.email.trim().toLowerCase());
    if (student) {
        student.classroomPassword = params.classroomPassword;
        writeLocalDb(db);
    }
    return { ok: true };
}

export async function saveStudentProgress(params: {
    email: string;
    purchaseCode: string;
    completedClassIds: string[];
    deviceIdOverride?: string;
}): Promise<{ ok: boolean; completedClassIds?: string[]; message?: string }> {
    const cleanCompleted = Array.from(new Set(params.completedClassIds.filter(Boolean)));
    const existing = getSavedStudentSession();
    if (existing && existing.email.toLowerCase() === params.email.trim().toLowerCase()) {
        saveStudentSessionLocally({
            ...existing,
            completedClassIds: cleanCompleted,
        });
    }

    if (isSupabaseConfigured) {
        return postJson<{ ok: boolean; completedClassIds?: string[]; message?: string }>('/api/verify-access', {
            action: 'save_progress',
            email: params.email,
            purchaseCode: params.purchaseCode,
            deviceId: params.deviceIdOverride || getOrCreateDeviceId(),
            completedClassIds: cleanCompleted,
        });
    }

    const db = readLocalDb();
    const student = db.students.find((s) => s.email.toLowerCase() === params.email.trim().toLowerCase());
    if (student) {
        student.completedClassIds = cleanCompleted;
        writeLocalDb(db);
    }
    return { ok: true, completedClassIds: cleanCompleted };
}

export async function verifyAdminAccess(params: {
    adminEmail: string;
    accessKey: string;
    displayName?: string;
}): Promise<{ ok: boolean; displayName?: string; email?: string; message?: string }> {
    const cleanEmail = params.adminEmail.trim().toLowerCase();
    const cleanKey = params.accessKey.trim();

    if (!cleanEmail || !cleanKey) {
        return { ok: false, message: 'Ingresa tu correo y clave de administrador.' };
    }

    if (isSupabaseConfigured) {
        return postJson<{ ok: boolean; displayName?: string; email?: string; message?: string }>(
            '/api/admin',
            {
                action: 'verify',
                adminEmail: cleanEmail,
                accessKey: cleanKey,
            }
        );
    }

    const db = readLocalDb();
    const matched = findValidLocalAdmin(db, cleanEmail, cleanKey);
    if (matched) {
        db.admin = {
            email: matched.adminEmail,
            accessKey: matched.accessKey,
            displayName: matched.displayName,
        };
        writeLocalDb(db);
        return { ok: true, email: matched.adminEmail, displayName: matched.displayName };
    }

    if (db.admins.length === 0) {
        return {
            ok: false,
            message:
                'Aún no hay administradores registrados en este navegador. Usa la pestaña "Registrar administrador" para crear tu cuenta.',
        };
    }

    return {
        ok: false,
        message:
            'Correo o clave de administrador incorrectos. Si necesitas crear una nueva cuenta de administrador, usa la pestaña "Registrar administrador".',
    };
}

export async function registerAdminAccount(params: {
    adminEmail: string;
    accessKey: string;
    displayName: string;
    requesterEmail?: string;
    requesterKey?: string;
}): Promise<{ ok: boolean; displayName?: string; email?: string; message?: string }> {
    const cleanEmail = params.adminEmail.trim().toLowerCase();
    const cleanKey = params.accessKey.trim();
    const cleanName = params.displayName.trim() || 'Administrador';

    if (!cleanEmail || !cleanEmail.includes('@') || cleanKey.length < 4) {
        return {
            ok: false,
            message: 'Ingresa un correo válido y una clave de al menos 4 caracteres.',
        };
    }

    if (isSupabaseConfigured) {
        return postJson<{ ok: boolean; displayName?: string; email?: string; message?: string }>(
            '/api/admin',
            {
                action: 'register_admin',
                adminEmail: cleanEmail,
                accessKey: cleanKey,
                displayName: cleanName,
                requesterEmail: params.requesterEmail?.trim().toLowerCase() || '',
                requesterKey: params.requesterKey?.trim() || '',
            }
        );
    }

    const db = readLocalDb();
    const existingIdx = db.admins.findIndex((a) => a.adminEmail.toLowerCase() === cleanEmail);
    const entry: LocalAdminEntry = {
        id: existingIdx >= 0 ? db.admins[existingIdx].id : `adm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        adminEmail: cleanEmail,
        accessKey: cleanKey,
        displayName: cleanName,
        isActive: true,
        createdAt: existingIdx >= 0 ? db.admins[existingIdx].createdAt : new Date().toISOString(),
    };

    if (existingIdx >= 0) {
        db.admins[existingIdx] = entry;
    } else {
        db.admins.push(entry);
    }

    db.admin = {
        email: entry.adminEmail,
        accessKey: entry.accessKey,
        displayName: entry.displayName,
    };
    writeLocalDb(db);

    return {
        ok: true,
        email: entry.adminEmail,
        displayName: entry.displayName,
        message: 'Administrador registrado correctamente.',
    };
}

export async function deleteAdminAccount(params: {
    adminEmail: string;
    accessKey: string;
    targetAdminId: string;
}): Promise<{ ok: boolean; message?: string }> {
    if (isSupabaseConfigured) {
        return postJson('/api/admin', {
            action: 'delete_admin',
            ...params,
        });
    }

    const db = readLocalDb();
    if (!findValidLocalAdmin(db, params.adminEmail, params.accessKey)) {
        return { ok: false, message: 'Acceso no autorizado.' };
    }

    const target = db.admins.find((a) => a.id === params.targetAdminId);
    if (target && target.adminEmail.toLowerCase() === params.adminEmail.trim().toLowerCase()) {
        return { ok: false, message: 'No puedes eliminar tu propia cuenta activa.' };
    }

    db.admins = db.admins.filter((a) => a.id !== params.targetAdminId);
    writeLocalDb(db);
    return { ok: true };
}

export async function fetchAdminDashboard(params: {
    adminEmail: string;
    accessKey: string;
}): Promise<{
    ok: boolean;
    students?: AdminStudentRecord[];
    alerts?: DeviceAccessAlert[];
    admins?: AdminUserSummary[];
    message?: string;
}> {
    if (isSupabaseConfigured) {
        return postJson('/api/admin', {
            action: 'dashboard',
            adminEmail: params.adminEmail,
            accessKey: params.accessKey,
        });
    }

    const db = readLocalDb();
    if (!findValidLocalAdmin(db, params.adminEmail, params.accessKey)) {
        return { ok: false, message: 'Acceso no autorizado.' };
    }

    const adminsSummary: AdminUserSummary[] = db.admins.map((a) => ({
        id: a.id,
        adminEmail: a.adminEmail,
        displayName: a.displayName,
        isActive: a.isActive,
        createdAt: a.createdAt,
    }));

    return {
        ok: true,
        students: db.students,
        alerts: db.alerts,
        admins: adminsSummary,
    };
}

export async function upsertAdminStudent(params: {
    adminEmail: string;
    accessKey: string;
    email: string;
    purchaseCode: string;
    fullName: string;
    classroomPassword: string;
    classroomUrl: string;
    maxDevices: number;
    isActive: boolean;
}): Promise<{ ok: boolean; message?: string }> {
    if (isSupabaseConfigured) {
        return postJson('/api/admin', {
            action: 'upsert_student',
            ...params,
        });
    }

    const db = readLocalDb();
    if (!findValidLocalAdmin(db, params.adminEmail, params.accessKey)) {
        return { ok: false, message: 'Acceso no autorizado.' };
    }

    const cleanEmail = params.email.trim().toLowerCase();
    const rawPass = params.classroomPassword.trim();
    const rawCode = params.purchaseCode.trim();
    const effectiveCode = (rawCode || rawPass).toUpperCase();
    const effectivePass = rawPass || rawCode;

    if (!cleanEmail || (!effectiveCode && !effectivePass)) {
        return { ok: false, message: 'El correo y la clave asignada son obligatorios.' };
    }

    const existing = db.students.find((s) => s.email === cleanEmail);

    if (existing) {
        existing.purchaseCode = effectiveCode;
        if (params.fullName.trim()) existing.fullName = params.fullName.trim();
        if (effectivePass) existing.classroomPassword = effectivePass;
        if (params.classroomUrl.trim()) existing.classroomUrl = params.classroomUrl.trim();
        existing.maxDevices = params.maxDevices || 2;
        existing.isActive = params.isActive;
    } else {
        db.students.unshift({
            id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            email: cleanEmail,
            fullName: params.fullName.trim(),
            purchaseCode: effectiveCode,
            classroomPassword: effectivePass,
            classroomUrl: params.classroomUrl.trim(),
            primaryCountry: null,
            primaryIp: null,
            maxDevices: params.maxDevices || 2,
            isActive: params.isActive,
            completedClassIds: [],
            authorizedDevicesCount: 0,
            totalDevicesCount: 0,
            createdAt: new Date().toISOString(),
            devices: [],
        });
    }

    writeLocalDb(db);
    return { ok: true };
}

export interface BulkStudentPayload {
    email: string;
    purchaseCode: string;
    fullName: string;
    classroomPassword: string;
    classroomUrl: string;
    maxDevices: number;
    isActive: boolean;
}

export async function bulkUpsertAdminStudents(params: {
    adminEmail: string;
    accessKey: string;
    students: BulkStudentPayload[];
}): Promise<{ ok: boolean; importedCount?: number; message?: string }> {
    if (params.students.length === 0) {
        return { ok: false, message: 'No hay registros válidos para importar.' };
    }

    if (isSupabaseConfigured) {
        return postJson('/api/admin', {
            action: 'bulk_upsert_students',
            adminEmail: params.adminEmail,
            accessKey: params.accessKey,
            students: params.students,
        });
    }

    const db = readLocalDb();
    if (!findValidLocalAdmin(db, params.adminEmail, params.accessKey)) {
        return { ok: false, message: 'Acceso no autorizado.' };
    }

    let count = 0;
    for (const item of params.students) {
        const cleanEmail = item.email.trim().toLowerCase();
        const rawCode = item.purchaseCode.trim();
        const rawPass = item.classroomPassword.trim();
        const effectiveCode = (rawCode || rawPass).toUpperCase();
        const effectivePass = rawPass || rawCode;
        if (!cleanEmail || (!effectiveCode && !effectivePass)) continue;

        const existing = db.students.find((s) => s.email === cleanEmail);
        if (existing) {
            existing.purchaseCode = effectiveCode;
            if (item.fullName.trim()) existing.fullName = item.fullName.trim();
            if (effectivePass) existing.classroomPassword = effectivePass;
            if (item.classroomUrl.trim()) existing.classroomUrl = item.classroomUrl.trim();
            existing.maxDevices = item.maxDevices || 2;
            existing.isActive = item.isActive;
        } else {
            db.students.unshift({
                id: `stu_${Date.now()}_${count}_${Math.random().toString(36).slice(2, 6)}`,
                email: cleanEmail,
                fullName: item.fullName.trim(),
                purchaseCode: effectiveCode,
                classroomPassword: effectivePass,
                classroomUrl: item.classroomUrl.trim(),
                primaryCountry: null,
                primaryIp: null,
                maxDevices: item.maxDevices || 2,
                isActive: item.isActive,
                completedClassIds: [],
                authorizedDevicesCount: 0,
                totalDevicesCount: 0,
                createdAt: new Date().toISOString(),
                devices: [],
            });
        }
        count += 1;
    }

    writeLocalDb(db);
    return { ok: true, importedCount: count };
}

export async function resetAdminStudentDevices(params: {
    adminEmail: string;
    accessKey: string;
    studentId: string;
}): Promise<{ ok: boolean; message?: string }> {
    if (isSupabaseConfigured) {
        return postJson('/api/admin', {
            action: 'reset_devices',
            ...params,
        });
    }

    const db = readLocalDb();
    if (!findValidLocalAdmin(db, params.adminEmail, params.accessKey)) {
        return { ok: false, message: 'Acceso no autorizado.' };
    }

    const student = db.students.find((s) => s.id === params.studentId);
    if (student) {
        student.devices = [];
        student.primaryCountry = null;
        student.primaryIp = null;
        student.authorizedDevicesCount = 0;
        student.totalDevicesCount = 0;
    }
    db.alerts.forEach((a) => {
        if (a.studentId === params.studentId) a.resolved = true;
    });
    writeLocalDb(db);
    return { ok: true };
}

export async function deleteAdminStudent(params: {
    adminEmail: string;
    accessKey: string;
    studentId: string;
}): Promise<{ ok: boolean; message?: string }> {
    if (isSupabaseConfigured) {
        return postJson('/api/admin', {
            action: 'delete_student',
            ...params,
        });
    }

    const db = readLocalDb();
    if (!findValidLocalAdmin(db, params.adminEmail, params.accessKey)) {
        return { ok: false, message: 'Acceso no autorizado.' };
    }

    db.students = db.students.filter((s) => s.id !== params.studentId);
    db.alerts = db.alerts.filter((a) => a.studentId !== params.studentId);
    writeLocalDb(db);
    return { ok: true };
}
