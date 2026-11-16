import { isSupabaseConfigured } from '../lib/supabaseClient';
import type {
    AccessVerificationResult,
    AdminStudentRecord,
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

interface LocalDbState {
    admin: { email: string; accessKey: string; displayName: string } | null;
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
        return raw ? (JSON.parse(raw) as VerifiedStudentSession) : null;
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

const readLocalDb = (): LocalDbState => {
    try {
        const raw = localStorage.getItem(LOCAL_DB_KEY);
        if (raw) {
            return JSON.parse(raw) as LocalDbState;
        }
    } catch {
        // Fallback below
    }
    return { admin: null, students: [], alerts: [] };
};

const writeLocalDb = (db: LocalDbState): void => {
    try {
        localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
    } catch {
        // Ignore
    }
};

export const hasLocalAdminConfigured = (): boolean => {
    return Boolean(readLocalDb().admin);
};

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return (await response.json()) as T;
}

export async function verifyStudentAccess(params: {
    email: string;
    purchaseCode: string;
    classroomPasswordDraft?: string;
    deviceIdOverride?: string;
    countryOverride?: string;
}): Promise<AccessVerificationResult> {
    const deviceId = params.deviceIdOverride || getOrCreateDeviceId();
    const deviceLabel = getDeviceLabel();
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanCode = params.purchaseCode.trim().toUpperCase();

    if (isSupabaseConfigured) {
        const result = await postJson<AccessVerificationResult & { notConfigured?: boolean }>(
            '/api/verify-access',
            {
                action: 'verify',
                email: cleanEmail,
                purchaseCode: cleanCode,
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
                '';

            const mergedStudent: VerifiedStudentSession = {
                ...result.student,
                classroomPassword: mergedPassword,
                verifiedAt: new Date().toISOString(),
            };

            saveStudentSessionLocally(mergedStudent);

            if (params.classroomPasswordDraft?.trim() && !result.student.classroomPassword) {
                await saveStudentClassroomCredentials({
                    email: cleanEmail,
                    purchaseCode: cleanCode,
                    classroomPassword: params.classroomPasswordDraft.trim(),
                });
            }

            return { ...result, student: mergedStudent };
        }

        return result;
    }

    // Respaldo local funcional cuando Supabase aún no está conectado
    const db = readLocalDb();
    const student = db.students.find(
        (s) => s.email.toLowerCase() === cleanEmail && s.purchaseCode.toUpperCase() === cleanCode
    );

    if (!student) {
        return {
            ok: false,
            status: 'INVALID_CREDENTIALS',
            message: 'El correo electrónico o el código de compra no coinciden con una inscripción registrada.',
        };
    }

    if (!student.isActive) {
        return {
            ok: false,
            status: 'INACTIVE',
            message: 'Tu pase se encuentra suspendido temporalmente. Contacta al equipo de soporte.',
        };
    }

    const simulatedCountry = (params.countryOverride || student.primaryCountry || 'VE').toUpperCase();
    if (!student.primaryCountry) {
        student.primaryCountry = simulatedCountry;
    }

    if (student.primaryCountry !== simulatedCountry) {
        const existingDev = student.devices.find((d) => d.deviceId === deviceId);
        if (existingDev) {
            existingDev.isAuthorized = false;
            existingDev.countryCode = simulatedCountry;
            existingDev.lastSeenAt = new Date().toISOString();
        } else {
            student.devices.push({
                deviceId,
                deviceLabel,
                ipAddress: 'IP-detectada',
                countryCode: simulatedCountry,
                isAuthorized: false,
                lastSeenAt: new Date().toISOString(),
            });
        }

        const countriesSeen = Array.from(
            new Set([student.primaryCountry, ...student.devices.map((d) => d.countryCode).filter(Boolean)])
        );
        const totalDevices = student.devices.length;
        student.totalDevicesCount = totalDevices;

        db.alerts.unshift({
            id: `alert_${Date.now()}`,
            studentId: student.id,
            email: student.email,
            fullName: student.fullName,
            detectedDevicesCount: totalDevices,
            countriesSeen,
            attemptedDeviceLabel: deviceLabel,
            attemptedIp: 'IP-detectada',
            attemptedCountry: simulatedCountry,
            reason: 'COUNTRY_MISMATCH',
            resolved: false,
            createdAt: new Date().toISOString(),
        });
        writeLocalDb(db);

        return {
            ok: false,
            status: 'BLOCKED_GEO',
            detectedDevicesCount: totalDevices,
            maxDevices: student.maxDevices,
            primaryCountry: student.primaryCountry,
            attemptedCountry: simulatedCountry,
            countriesSeen,
            message: `Alerta de seguridad: esta alumna ha ingresado en ${totalDevices} dispositivos y se detectó un intento desde un país distinto (${student.primaryCountry} vs ${simulatedCountry}).`,
        };
    }

    const existingAuthorized = student.devices.find((d) => d.deviceId === deviceId && d.isAuthorized);
    const authorizedCount = student.devices.filter((d) => d.isAuthorized).length;

    if (existingAuthorized || authorizedCount < student.maxDevices) {
        if (existingAuthorized) {
            existingAuthorized.lastSeenAt = new Date().toISOString();
        } else {
            student.devices.push({
                deviceId,
                deviceLabel,
                ipAddress: 'Red local',
                countryCode: simulatedCountry,
                isAuthorized: true,
                lastSeenAt: new Date().toISOString(),
            });
        }

        if (params.classroomPasswordDraft?.trim()) {
            student.classroomPassword = params.classroomPasswordDraft.trim();
        }

        student.authorizedDevicesCount = student.devices.filter((d) => d.isAuthorized).length;
        student.totalDevicesCount = student.devices.length;
        writeLocalDb(db);

        const session: VerifiedStudentSession = {
            studentId: student.id,
            email: student.email,
            fullName: student.fullName,
            purchaseCode: student.purchaseCode,
            classroomPassword: student.classroomPassword,
            classroomUrl: student.classroomUrl,
            primaryCountry: student.primaryCountry || simulatedCountry,
            activeDevicesCount: student.authorizedDevicesCount,
            maxDevices: student.maxDevices,
            verifiedAt: new Date().toISOString(),
        };
        saveStudentSessionLocally(session);

        return {
            ok: true,
            status: 'VERIFIED',
            message: 'Dispositivo autorizado. Tus datos quedan guardados para entrar directo.',
            student: session,
        };
    }

    const alreadyRecorded = student.devices.find((d) => d.deviceId === deviceId);
    if (!alreadyRecorded) {
        student.devices.push({
            deviceId,
            deviceLabel,
            ipAddress: 'Red local',
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

    db.alerts.unshift({
        id: `alert_${Date.now()}`,
        studentId: student.id,
        email: student.email,
        fullName: student.fullName,
        detectedDevicesCount: totalDevices,
        countriesSeen,
        attemptedDeviceLabel: deviceLabel,
        attemptedIp: 'Red local',
        attemptedCountry: simulatedCountry,
        reason: 'MAX_DEVICES',
        resolved: false,
        createdAt: new Date().toISOString(),
    });
    writeLocalDb(db);

    return {
        ok: false,
        status: 'BLOCKED_MAX_DEVICES',
        detectedDevicesCount: totalDevices,
        maxDevices: student.maxDevices,
        primaryCountry: student.primaryCountry || simulatedCountry,
        attemptedCountry: simulatedCountry,
        countriesSeen,
        message: `Alerta de seguridad: esta alumna ha ingresado en ${totalDevices} dispositivos distintos. El máximo permitido es ${student.maxDevices} dispositivos por cuenta.`,
    };
}

export async function saveStudentClassroomCredentials(params: {
    email: string;
    purchaseCode: string;
    classroomPassword: string;
}): Promise<{ ok: boolean; message?: string }> {
    const existing = getSavedStudentSession();
    if (existing) {
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
            deviceId: getOrCreateDeviceId(),
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
    if (!db.admin) {
        db.admin = {
            email: cleanEmail,
            accessKey: cleanKey,
            displayName: params.displayName?.trim() || 'Administrador',
        };
        writeLocalDb(db);
        return { ok: true, email: db.admin.email, displayName: db.admin.displayName };
    }

    if (db.admin.email === cleanEmail && db.admin.accessKey === cleanKey) {
        return { ok: true, email: db.admin.email, displayName: db.admin.displayName };
    }

    return { ok: false, message: 'Correo o clave de administrador incorrectos.' };
}

export async function fetchAdminDashboard(params: {
    adminEmail: string;
    accessKey: string;
}): Promise<{
    ok: boolean;
    students?: AdminStudentRecord[];
    alerts?: DeviceAccessAlert[];
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
    if (!db.admin || db.admin.email !== params.adminEmail.trim().toLowerCase() || db.admin.accessKey !== params.accessKey.trim()) {
        return { ok: false, message: 'Acceso no autorizado.' };
    }

    return {
        ok: true,
        students: db.students,
        alerts: db.alerts,
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
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanCode = params.purchaseCode.trim().toUpperCase();
    const existing = db.students.find((s) => s.email === cleanEmail);

    if (existing) {
        existing.purchaseCode = cleanCode;
        if (params.fullName.trim()) existing.fullName = params.fullName.trim();
        if (params.classroomPassword) existing.classroomPassword = params.classroomPassword;
        if (params.classroomUrl.trim()) existing.classroomUrl = params.classroomUrl.trim();
        existing.maxDevices = params.maxDevices || 2;
        existing.isActive = params.isActive;
    } else {
        db.students.unshift({
            id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            email: cleanEmail,
            fullName: params.fullName.trim(),
            purchaseCode: cleanCode,
            classroomPassword: params.classroomPassword,
            classroomUrl: params.classroomUrl.trim(),
            primaryCountry: null,
            maxDevices: params.maxDevices || 2,
            isActive: params.isActive,
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
    let count = 0;
    for (const item of params.students) {
        const cleanEmail = item.email.trim().toLowerCase();
        const cleanCode = item.purchaseCode.trim().toUpperCase();
        if (!cleanEmail || !cleanCode) continue;

        const existing = db.students.find((s) => s.email === cleanEmail);
        if (existing) {
            existing.purchaseCode = cleanCode;
            if (item.fullName.trim()) existing.fullName = item.fullName.trim();
            if (item.classroomPassword) existing.classroomPassword = item.classroomPassword;
            if (item.classroomUrl.trim()) existing.classroomUrl = item.classroomUrl.trim();
            existing.maxDevices = item.maxDevices || 2;
            existing.isActive = item.isActive;
        } else {
            db.students.unshift({
                id: `stu_${Date.now()}_${count}_${Math.random().toString(36).slice(2, 6)}`,
                email: cleanEmail,
                fullName: item.fullName.trim(),
                purchaseCode: cleanCode,
                classroomPassword: item.classroomPassword,
                classroomUrl: item.classroomUrl.trim(),
                primaryCountry: null,
                maxDevices: item.maxDevices || 2,
                isActive: item.isActive,
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
    const student = db.students.find((s) => s.id === params.studentId);
    if (student) {
        student.devices = [];
        student.primaryCountry = null;
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
    db.students = db.students.filter((s) => s.id !== params.studentId);
    db.alerts = db.alerts.filter((a) => a.studentId !== params.studentId);
    writeLocalDb(db);
    return { ok: true };
}
