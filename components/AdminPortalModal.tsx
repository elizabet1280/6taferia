import React, { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
    bulkUpsertAdminStudents,
    clearAdminCredentialsLocally,
    deleteAdminStudent,
    fetchAdminDashboard,
    getSavedAdminCredentials,
    hasLocalAdminConfigured,
    resetAdminStudentDevices,
    saveAdminCredentialsLocally,
    upsertAdminStudent,
    verifyAdminAccess,
} from '../services/accessService';
import {
    downloadStudentsTemplate,
    parseStudentsSpreadsheet,
    type ParsedStudentImportRow,
} from '../utils/spreadsheetImport';
import {
    adminDeleteForumQuestion,
    adminReplyForumQuestion,
    fetchForumQuestions,
} from '../services/forumService';
import type { AdminStudentRecord, DeviceAccessAlert, ForumQuestion } from '../types';

interface AdminPortalModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'students' | 'alerts' | 'forum';
    onForumUpdated?: () => void;
}

const generateRandomCode = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `CANVA-${num}`;
};

const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
    isOpen,
    onClose,
    initialTab = 'students',
    onForumUpdated,
}) => {
    const [adminEmail, setAdminEmail] = useState('');
    const [accessKey, setAccessKey] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [rememberCredentials, setRememberCredentials] = useState(true);
    const [showKey, setShowKey] = useState(false);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [hasSavedCreds, setHasSavedCreds] = useState(false);

    const [activeTab, setActiveTab] = useState<'students' | 'alerts' | 'forum'>(initialTab);
    const [students, setStudents] = useState<AdminStudentRecord[]>([]);
    const [alerts, setAlerts] = useState<DeviceAccessAlert[]>([]);
    const [forumQuestions, setForumQuestions] = useState<ForumQuestion[]>([]);
    const [forumFilter, setForumFilter] = useState<'pending' | 'all'>('pending');
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    const [teacherReplyName, setTeacherReplyName] = useState('');
    const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

    // Formulario de alta / edición de alumna
    const [stuFullName, setStuFullName] = useState('');
    const [stuEmail, setStuEmail] = useState('');
    const [stuCode, setStuCode] = useState('');
    const [stuPassword, setStuPassword] = useState('');
    const [stuUrl, setStuUrl] = useState('');
    const [stuMaxDevices, setStuMaxDevices] = useState(2);
    const [stuActive, setStuActive] = useState(true);
    const [bulkText, setBulkText] = useState('');
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [importFileName, setImportFileName] = useState('');
    const [parsedImportRows, setParsedImportRows] = useState<ParsedStudentImportRow[]>([]);
    const [importSkippedCount, setImportSkippedCount] = useState(0);
    const [importAutoCodedCount, setImportAutoCodedCount] = useState(0);
    const [isImportingFile, setIsImportingFile] = useState(false);

    const loadDashboard = useCallback(async (email: string, key: string) => {
        setDashboardLoading(true);
        const [res, forumList] = await Promise.all([
            fetchAdminDashboard({ adminEmail: email, accessKey: key }),
            fetchForumQuestions(),
        ]);
        setDashboardLoading(false);
        setForumQuestions(forumList);
        if (res.ok) {
            setStudents(res.students || []);
            setAlerts(res.alerts || []);
        } else {
            setFeedbackMsg(res.message || 'No se pudo cargar la información.');
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        setActiveTab(initialTab);
        const saved = getSavedAdminCredentials();
        if (saved && saved.remember) {
            setAdminEmail(saved.email);
            setAccessKey(saved.accessKey);
            setDisplayName(saved.displayName);
            setTeacherReplyName((prev) => prev || saved.displayName);
            setRememberCredentials(true);
            setHasSavedCreds(true);
        } else {
            setHasSavedCreds(false);
        }
        setAuthError(null);
        setFeedbackMsg(null);
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    const isFirstLocalSetup = !isSupabaseConfigured && !hasLocalAdminConfigured();

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);

        const res = await verifyAdminAccess({
            adminEmail,
            accessKey,
            displayName: displayName || 'Administrador',
        });

        setAuthLoading(false);

        if (!res.ok) {
            setAuthError(res.message || 'Credenciales de administrador inválidas.');
            return;
        }

        const resolvedDisplay = res.displayName || displayName || 'Administrador';
        setDisplayName(resolvedDisplay);

        if (rememberCredentials) {
            saveAdminCredentialsLocally({
                email: adminEmail.trim().toLowerCase(),
                accessKey: accessKey.trim(),
                displayName: resolvedDisplay,
                remember: true,
            });
            setHasSavedCreds(true);
        } else {
            clearAdminCredentialsLocally();
            setHasSavedCreds(false);
        }

        setIsAuthenticated(true);
        await loadDashboard(adminEmail.trim().toLowerCase(), accessKey.trim());
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stuEmail.trim() || !stuCode.trim()) return;

        const res = await upsertAdminStudent({
            adminEmail,
            accessKey,
            email: stuEmail,
            purchaseCode: stuCode,
            fullName: stuFullName,
            classroomPassword: stuPassword,
            classroomUrl: stuUrl,
            maxDevices: stuMaxDevices,
            isActive: stuActive,
        });

        if (res.ok) {
            setFeedbackMsg(`Alumna ${stuEmail.trim().toLowerCase()} guardada correctamente.`);
            setStuFullName('');
            setStuEmail('');
            setStuCode('');
            setStuPassword('');
            setStuUrl('');
            setStuMaxDevices(2);
            setStuActive(true);
            await loadDashboard(adminEmail, accessKey);
        } else {
            setFeedbackMsg(res.message || 'Error al guardar la alumna.');
        }
    };

    const handleSpreadsheetSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFeedbackMsg(null);

        try {
            const parsed = await parseStudentsSpreadsheet(file);
            setImportFileName(file.name);
            setParsedImportRows(parsed.rows);
            setImportSkippedCount(parsed.skippedCount);
            setImportAutoCodedCount(parsed.autoCodedCount);

            if (parsed.rows.length === 0) {
                setFeedbackMsg(
                    `No se encontraron filas con correo válido en "${file.name}". Descarga la plantilla para verificar las columnas.`
                );
            }
        } catch {
            setFeedbackMsg('No pudimos leer el archivo. Asegúrate de que sea un .xlsx, .xls o .csv válido.');
            setParsedImportRows([]);
        } finally {
            e.target.value = '';
        }
    };

    const handleConfirmSpreadsheetImport = async () => {
        if (parsedImportRows.length === 0) return;
        setIsImportingFile(true);
        const res = await bulkUpsertAdminStudents({
            adminEmail,
            accessKey,
            students: parsedImportRows,
        });
        setIsImportingFile(false);

        if (res.ok) {
            setFeedbackMsg(
                `Se importaron ${res.importedCount ?? parsedImportRows.length} alumnas desde "${importFileName}".`
            );
            setParsedImportRows([]);
            setImportFileName('');
            setImportSkippedCount(0);
            setImportAutoCodedCount(0);
            await loadDashboard(adminEmail, accessKey);
        } else {
            setFeedbackMsg(res.message || 'No se pudo completar la importación masiva.');
        }
    };

    const handleBulkImport = async (e: React.FormEvent) => {
        e.preventDefault();
        const lines = bulkText
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);

        if (lines.length === 0) return;

        const batch: ParsedStudentImportRow[] = [];
        for (const line of lines) {
            const parts = line.split(/[;,]/).map((p) => p.trim());
            const emailPart = (parts[0] || '').toLowerCase();
            const codePart = (parts[1] || generateRandomCode()).toUpperCase();
            const namePart = parts[2] || '';
            const passPart = parts[3] || '';
            if (!emailPart.includes('@')) continue;

            batch.push({
                email: emailPart,
                purchaseCode: codePart,
                fullName: namePart,
                classroomPassword: passPart,
                classroomUrl: '',
                maxDevices: 2,
                isActive: true,
            });
        }

        const res = await bulkUpsertAdminStudents({
            adminEmail,
            accessKey,
            students: batch,
        });

        if (res.ok) {
            setBulkText('');
            setShowBulkImport(false);
            setFeedbackMsg(`Se importaron ${res.importedCount ?? batch.length} alumnas correctamente.`);
            await loadDashboard(adminEmail, accessKey);
        } else {
            setFeedbackMsg(res.message || 'Error al importar la lista.');
        }
    };

    const handleEditStudent = (s: AdminStudentRecord) => {
        setStuFullName(s.fullName);
        setStuEmail(s.email);
        setStuCode(s.purchaseCode);
        setStuPassword(s.classroomPassword);
        setStuUrl(s.classroomUrl);
        setStuMaxDevices(s.maxDevices);
        setStuActive(s.isActive);
    };

    const handleResetDevices = async (studentId: string, email: string) => {
        const res = await resetAdminStudentDevices({ adminEmail, accessKey, studentId });
        if (res.ok) {
            setFeedbackMsg(`Dispositivos y ubicación restablecidos para ${email}.`);
            await loadDashboard(adminEmail, accessKey);
        }
    };

    const handleDeleteStudent = async (studentId: string, email: string) => {
        const res = await deleteAdminStudent({ adminEmail, accessKey, studentId });
        if (res.ok) {
            setFeedbackMsg(`Se eliminó el registro de ${email}.`);
            await loadDashboard(adminEmail, accessKey);
        }
    };

    const handleForgetSavedCredentials = () => {
        clearAdminCredentialsLocally();
        setHasSavedCreds(false);
        setRememberCredentials(false);
        setFeedbackMsg('Credenciales guardadas eliminadas de este navegador.');
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        if (!rememberCredentials) {
            setAccessKey('');
        }
    };

    const handleSendOfficialReply = async (questionId: string) => {
        const draft = (replyDrafts[questionId] || '').trim();
        if (!draft) return;

        setSendingReplyId(questionId);
        const res = await adminReplyForumQuestion({
            adminEmail,
            accessKey,
            questionId,
            teacherName: teacherReplyName.trim() || displayName || 'Profesor / Colaborador',
            replyBody: draft,
        });
        setSendingReplyId(null);

        if (res.ok && res.reply) {
            setForumQuestions((prev) =>
                prev.map((q) =>
                    q.id === questionId
                        ? { ...q, status: 'answered', replies: [...q.replies, res.reply!] }
                        : q
                )
            );
            setReplyDrafts((prev) => ({ ...prev, [questionId]: '' }));
            setFeedbackMsg('Respuesta oficial publicada en el foro de dudas.');
            onForumUpdated?.();
        } else {
            setFeedbackMsg(res.message || 'No se pudo publicar la respuesta.');
        }
    };

    const handleDeleteForumQuestion = async (questionId: string) => {
        const res = await adminDeleteForumQuestion({ adminEmail, accessKey, questionId });
        if (res.ok) {
            setForumQuestions((prev) => prev.filter((q) => q.id !== questionId));
            setFeedbackMsg('Duda eliminada del foro.');
            onForumUpdated?.();
        }
    };

    const filteredStudents = students.filter((s) => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return (
            s.email.toLowerCase().includes(q) ||
            s.fullName.toLowerCase().includes(q) ||
            s.purchaseCode.toLowerCase().includes(q)
        );
    });

    const unresolvedAlertsCount = alerts.filter((a) => !a.resolved).length;
    const pendingForumCount = forumQuestions.filter((q) => q.status === 'pending').length;
    const visibleForumQuestions =
        forumFilter === 'pending'
            ? forumQuestions.filter((q) => q.status === 'pending')
            : forumQuestions;

    return (
        <div className="fixed inset-0 bg-[#2B2B2B]/75 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
            <div className="bg-[#FFFDF7] rounded-[26px] shadow-2xl p-6 md:p-8 max-w-4xl w-full border-2 border-[#3F6B45] relative my-auto max-h-[90vh] overflow-y-auto">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar panel de administrador"
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] text-[#2B2B2B] hover:border-[#A3363D] hover:text-[#A3363D] font-bold flex items-center justify-center transition-colors"
                >
                    ✕
                </button>

                {!isAuthenticated ? (
                    <div className="max-w-md mx-auto py-4 space-y-4">
                        <div className="text-center">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3F6B45]">
                                Gestión de la feria
                            </p>
                            <h2 className="font-title italic text-2xl md:text-3xl font-bold text-[#A3363D] mt-1">
                                Acceso Administrador
                            </h2>
                            <p className="text-xs text-[#2B2B2B]/75 mt-1.5">
                                {isFirstLocalSetup
                                    ? 'Configura por primera vez tu correo y clave de administrador local para gestionar alumnas y alertas en este navegador.'
                                    : 'Ingresa con tu correo y clave de administrador para gestionar alumnas inscritas y alertas de dispositivos.'}
                            </p>
                        </div>

                        {!isSupabaseConfigured && (
                            <p className="text-xs bg-[#FBF5E6] border border-[#E5DAC0] rounded-xl p-3 text-[#2B2B2B]/85">
                                Modo vista previa local activo (sin variables de Supabase conectadas). Al conectar Supabase en Vercel, validará contra la tabla <strong>admin_users</strong>.
                            </p>
                        )}

                        <form onSubmit={handleAdminLogin} className="space-y-3.5">
                            {isFirstLocalSetup && (
                                <div>
                                    <label htmlFor="admin-display-name" className="block text-xs font-bold text-[#2B2B2B] mb-1">
                                        Nombre del profesor / coordinador
                                    </label>
                                    <input
                                        id="admin-display-name"
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Ej. Coordinación Feria Canva"
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF5E6] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                                    />
                                </div>
                            )}

                            <div>
                                <label htmlFor="admin-email" className="block text-xs font-bold text-[#2B2B2B] mb-1">
                                    Correo de administrador
                                </label>
                                <input
                                    id="admin-email"
                                    type="email"
                                    required
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                    placeholder="admin@territoriocanva.com"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF5E6] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                                />
                            </div>

                            <div>
                                <label htmlFor="admin-key" className="block text-xs font-bold text-[#2B2B2B] mb-1">
                                    Clave de acceso
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        id="admin-key"
                                        type={showKey ? 'text' : 'password'}
                                        required
                                        value={accessKey}
                                        onChange={(e) => setAccessKey(e.target.value)}
                                        placeholder="Tu clave secreta de administrador"
                                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FBF5E6] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey((prev) => !prev)}
                                        className="px-3.5 py-2 rounded-xl bg-[#FBF5E6] border border-[#E5DAC0] text-xs font-semibold text-[#2B2B2B]"
                                    >
                                        {showKey ? 'Ocultar' : 'Ver'}
                                    </button>
                                </div>
                            </div>

                            <label className="flex items-center gap-2.5 text-xs text-[#2B2B2B] cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberCredentials}
                                    onChange={(e) => setRememberCredentials(e.target.checked)}
                                    className="w-4 h-4 accent-[#3F6B45]"
                                />
                                <span>Guardar mis credenciales de administrador en este dispositivo</span>
                            </label>

                            {authError && (
                                <p className="text-xs font-semibold text-[#A3363D] bg-[#A3363D]/10 p-3 rounded-xl border border-[#A3363D]/30" role="alert">
                                    {authError}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={authLoading}
                                className="w-full py-3 px-6 rounded-full bg-[#A3363D] hover:bg-[#862B31] disabled:opacity-60 text-white font-bold text-sm shadow-md transition-colors"
                            >
                                {authLoading
                                    ? 'Verificando...'
                                    : isFirstLocalSetup
                                        ? 'Guardar clave y entrar'
                                        : 'Entrar al panel'}
                            </button>

                            {hasSavedCreds && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleForgetSavedCredentials();
                                        setAdminEmail('');
                                        setAccessKey('');
                                    }}
                                    className="w-full text-xs text-[#A3363D] hover:underline font-semibold pt-1"
                                >
                                    Olvidar credenciales guardadas en este navegador
                                </button>
                            )}
                        </form>
                    </div>
                ) : (
                    <div className="space-y-6 pr-2">
                        {/* Cabecera del panel autenticado */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5DAC0] pb-4 pr-8">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3F6B45]">
                                    Panel de Administración · {displayName}
                                </p>
                                <h2 className="font-title italic text-2xl font-bold text-[#A3363D]">
                                    Alumnas, Credenciales y Seguridad
                                </h2>
                                <p className="text-xs text-[#2B2B2B]/70 mt-0.5">
                                    {adminEmail} · {isSupabaseConfigured ? 'Conectado a Supabase' : 'Modo vista previa local'}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {hasSavedCreds && (
                                    <button
                                        type="button"
                                        onClick={handleForgetSavedCredentials}
                                        className="px-3.5 py-1.5 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] text-xs font-semibold text-[#2B2B2B] hover:border-[#A3363D]"
                                    >
                                        Olvidar credenciales
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => loadDashboard(adminEmail, accessKey)}
                                    className="px-3.5 py-1.5 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] text-xs font-bold text-[#3F6B45] hover:border-[#3F6B45]"
                                >
                                    {dashboardLoading ? 'Cargando...' : 'Actualizar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="px-3.5 py-1.5 rounded-full bg-[#A3363D] text-white text-xs font-bold hover:bg-[#862B31]"
                                >
                                    Cerrar sesión
                                </button>
                            </div>
                        </div>

                        {feedbackMsg && (
                            <div className="p-3 rounded-xl bg-[#3F6B45]/10 border border-[#3F6B45] text-xs font-semibold text-[#2E4F35] flex items-center justify-between gap-2">
                                <span>{feedbackMsg}</span>
                                <button type="button" onClick={() => setFeedbackMsg(null)} className="font-bold">
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* Pestañas */}
                        <div className="flex flex-wrap items-center gap-2 p-1 bg-[#FBF5E6] border border-[#E5DAC0] rounded-2xl w-fit">
                            <button
                                type="button"
                                onClick={() => setActiveTab('students')}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                                    activeTab === 'students'
                                        ? 'bg-[#3F6B45] text-white'
                                        : 'text-[#2B2B2B] hover:text-[#A3363D]'
                                }`}
                            >
                                Alumnas inscritas ({students.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('forum')}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors tabular-nums ${
                                    activeTab === 'forum'
                                        ? 'bg-[#2E4F35] text-white'
                                        : 'text-[#2B2B2B] hover:text-[#3F6B45]'
                                }`}
                            >
                                Dudas pendientes ({pendingForumCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('alerts')}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors tabular-nums ${
                                    activeTab === 'alerts'
                                        ? 'bg-[#A3363D] text-white'
                                        : 'text-[#2B2B2B] hover:text-[#A3363D]'
                                }`}
                            >
                                Alertas de dispositivos ({unresolvedAlertsCount})
                            </button>
                        </div>

                        {activeTab === 'students' ? (
                            <div className="space-y-6">
                                {/* Formulario agregar / editar alumna */}
                                <form
                                    onSubmit={handleSaveStudent}
                                    className="bg-[#FBF5E6] border border-[#E5DAC0] rounded-2xl p-4 md:p-5 space-y-3"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="font-bold text-sm text-[#2B2B2B]">
                                            Registrar o actualizar alumna
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowBulkImport((prev) => !prev)}
                                            className="text-xs font-bold text-[#A3363D] hover:underline"
                                        >
                                            {showBulkImport
                                                ? 'Ocultar importación Excel / CSV'
                                                : '+ Importar Excel (.xlsx, .xls) o CSV'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        <input
                                            type="text"
                                            value={stuFullName}
                                            onChange={(e) => setStuFullName(e.target.value)}
                                            placeholder="Nombre de la alumna"
                                            className="px-3 py-2 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-xs sm:text-sm text-[#2B2B2B]"
                                        />
                                        <input
                                            type="email"
                                            required
                                            value={stuEmail}
                                            onChange={(e) => setStuEmail(e.target.value)}
                                            placeholder="Correo de inscripción *"
                                            className="px-3 py-2 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-xs sm:text-sm text-[#2B2B2B]"
                                        />
                                        <div className="flex gap-1.5">
                                            <input
                                                type="text"
                                                required
                                                value={stuCode}
                                                onChange={(e) => setStuCode(e.target.value.toUpperCase())}
                                                placeholder="Código único *"
                                                className="flex-1 px-3 py-2 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-xs sm:text-sm font-mono uppercase text-[#2B2B2B]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setStuCode(generateRandomCode())}
                                                className="px-2.5 py-2 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-xs font-bold text-[#3F6B45]"
                                            >
                                                Generar
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={stuPassword}
                                            onChange={(e) => setStuPassword(e.target.value)}
                                            placeholder="Contraseña aula virtual (opcional)"
                                            className="px-3 py-2 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-xs sm:text-sm text-[#2B2B2B]"
                                        />
                                        <input
                                            type="url"
                                            value={stuUrl}
                                            onChange={(e) => setStuUrl(e.target.value)}
                                            placeholder="URL directa aula (opcional)"
                                            className="px-3 py-2 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-xs sm:text-sm text-[#2B2B2B]"
                                        />
                                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-xs">
                                            <label className="flex items-center gap-1.5 font-semibold text-[#2B2B2B]">
                                                <span>Máx. equipos:</span>
                                                <select
                                                    value={stuMaxDevices}
                                                    onChange={(e) => setStuMaxDevices(Number(e.target.value))}
                                                    className="bg-[#FBF5E6] border border-[#E5DAC0] rounded px-1.5 py-0.5 font-bold"
                                                >
                                                    <option value={1}>1</option>
                                                    <option value={2}>2</option>
                                                    <option value={3}>3</option>
                                                </select>
                                            </label>
                                            <label className="flex items-center gap-1.5 font-semibold text-[#2B2B2B] cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={stuActive}
                                                    onChange={(e) => setStuActive(e.target.checked)}
                                                    className="accent-[#3F6B45]"
                                                />
                                                <span>Activa</span>
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 rounded-full bg-[#3F6B45] hover:bg-[#2E4F35] text-white text-xs sm:text-sm font-bold transition-colors"
                                    >
                                        Guardar alumna
                                    </button>
                                </form>

                                {showBulkImport && (
                                    <div className="bg-[#FBF5E6] border border-[#E5DAC0] rounded-2xl p-4 md:p-5 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h4 className="font-bold text-sm text-[#2B2B2B]">
                                                    Importar archivo Excel (.xlsx, .xls) o CSV
                                                </h4>
                                                <p className="text-xs text-[#2B2B2B]/75 mt-0.5">
                                                    Columnas admitidas: <strong>correo</strong>, <strong>codigo_compra</strong>,{' '}
                                                    <strong>nombre</strong>, <strong>clave_aula</strong>, <strong>url_aula</strong>,{' '}
                                                    <strong>max_dispositivos</strong>, <strong>activo</strong>
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => downloadStudentsTemplate('xlsx')}
                                                    className="px-3.5 py-1.5 rounded-full bg-[#FFFDF7] border border-[#3F6B45] text-[#2E4F35] hover:bg-[#3F6B45] hover:text-white text-xs font-bold transition-colors"
                                                >
                                                    Descargar plantilla .xlsx
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadStudentsTemplate('csv')}
                                                    className="px-3.5 py-1.5 rounded-full bg-[#FFFDF7] border border-[#E5DAC0] hover:border-[#3F6B45] text-[#2B2B2B] text-xs font-bold transition-colors"
                                                >
                                                    Plantilla .csv
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <label className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#A3363D] hover:bg-[#862B31] text-white text-xs sm:text-sm font-bold cursor-pointer transition-colors">
                                                <span>Seleccionar archivo (.xlsx, .xls, .csv)</span>
                                                <input
                                                    type="file"
                                                    accept=".xlsx,.xls,.csv"
                                                    onChange={handleSpreadsheetSelected}
                                                    className="sr-only"
                                                />
                                            </label>
                                            {importFileName && (
                                                <span className="text-xs font-semibold text-[#3F6B45]">
                                                    Archivo cargado: {importFileName}
                                                </span>
                                            )}
                                        </div>

                                        {parsedImportRows.length > 0 && (
                                            <div className="bg-[#FFFDF7] border border-[#E5DAC0] rounded-xl p-3.5 space-y-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                                    <span className="font-bold text-[#2E4F35] tabular-nums">
                                                        Listas para importar: {parsedImportRows.length} alumnas
                                                        {importAutoCodedCount > 0
                                                            ? ` (${importAutoCodedCount} con código autogenerado)`
                                                            : ''}
                                                        {importSkippedCount > 0
                                                            ? ` · ${importSkippedCount} filas omitidas sin correo`
                                                            : ''}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setParsedImportRows([]);
                                                                setImportFileName('');
                                                            }}
                                                            className="text-xs text-[#2B2B2B]/70 hover:text-[#A3363D] font-semibold"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isImportingFile}
                                                            onClick={handleConfirmSpreadsheetImport}
                                                            className="px-4 py-2 rounded-full bg-[#3F6B45] hover:bg-[#2E4F35] disabled:opacity-60 text-white text-xs font-bold"
                                                        >
                                                            {isImportingFile
                                                                ? 'Importando...'
                                                                : `Confirmar e importar (${parsedImportRows.length})`}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-xs border-collapse">
                                                        <thead>
                                                            <tr className="border-b border-[#E5DAC0] text-[#2B2B2B]/70">
                                                                <th className="py-1.5 pr-3">Correo</th>
                                                                <th className="py-1.5 pr-3">Código</th>
                                                                <th className="py-1.5 pr-3">Nombre</th>
                                                                <th className="py-1.5 pr-3">Clave aula</th>
                                                                <th className="py-1.5">Equipos</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[#E5DAC0]/60 tabular-nums">
                                                            {parsedImportRows.slice(0, 5).map((row, idx) => (
                                                                <tr key={`${row.email}-${idx}`}>
                                                                    <td className="py-1.5 pr-3 font-medium">{row.email}</td>
                                                                    <td className="py-1.5 pr-3 font-mono font-bold text-[#A3363D]">
                                                                        {row.purchaseCode}
                                                                    </td>
                                                                    <td className="py-1.5 pr-3">{row.fullName || '—'}</td>
                                                                    <td className="py-1.5 pr-3">
                                                                        {row.classroomPassword ? '••••••' : '—'}
                                                                    </td>
                                                                    <td className="py-1.5">{row.maxDevices}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {parsedImportRows.length > 5 && (
                                                        <p className="text-[11px] text-[#2B2B2B]/65 mt-1.5">
                                                            Mostrando las primeras 5 de {parsedImportRows.length} filas.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <form onSubmit={handleBulkImport} className="pt-3 border-t border-[#E5DAC0] space-y-2">
                                            <label className="block text-xs font-bold text-[#2B2B2B]">
                                                O pega texto directo (una por línea: correo, codigo, nombre, clave_aula)
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={bulkText}
                                                onChange={(e) => setBulkText(e.target.value)}
                                                placeholder={'maria@correo.com, CANVA-1001, María Pérez, ClaveAula123\nana@correo.com, CANVA-1002, Ana Gómez, ClaveAula456'}
                                                className="w-full px-3 py-2 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-xs font-mono text-[#2B2B2B]"
                                            />
                                            <button
                                                type="submit"
                                                className="px-5 py-2 rounded-full bg-[#3F6B45] hover:bg-[#2E4F35] text-white text-xs font-bold"
                                            >
                                                Importar texto
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* Listado de alumnas */}
                                <div className="space-y-3">
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar por correo, nombre o código de compra..."
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#FBF5E6] border border-[#E5DAC0] text-sm text-[#2B2B2B]"
                                    />

                                    {filteredStudents.length === 0 ? (
                                        <p className="text-center text-sm text-[#2B2B2B]/70 py-6 bg-[#FBF5E6] rounded-2xl border border-[#E5DAC0]">
                                            No hay alumnas registradas que coincidan.
                                        </p>
                                    ) : (
                                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                            {filteredStudents.map((s) => (
                                                <div
                                                    key={s.id}
                                                    className="p-3.5 rounded-2xl bg-[#FBF5E6] border border-[#E5DAC0] flex flex-col md:flex-row md:items-center justify-between gap-3"
                                                >
                                                    <div className="min-w-0 space-y-0.5">
                                                        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#2B2B2B]">
                                                            <span>{s.fullName || s.email}</span>
                                                            {!s.isActive && (
                                                                <span className="text-xs text-[#A3363D]">· Suspendida</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-[#2B2B2B]/80 truncate">
                                                            {s.email} · Código: <strong className="font-mono">{s.purchaseCode}</strong>
                                                        </p>
                                                        <p className="text-xs text-[#3F6B45] font-semibold tabular-nums">
                                                            Equipos: {s.authorizedDevicesCount}/{s.maxDevices}
                                                            {s.primaryCountry ? ` · País: ${s.primaryCountry}` : ' · País pendiente'}
                                                            {s.classroomPassword ? ' · Clave guardada' : ''}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditStudent(s)}
                                                            className="px-3 py-1.5 rounded-full bg-[#FFFDF7] border border-[#E5DAC0] hover:border-[#3F6B45] text-xs font-bold text-[#2B2B2B]"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleResetDevices(s.id, s.email)}
                                                            className="px-3 py-1.5 rounded-full bg-[#FFFDF7] border border-[#E5DAC0] hover:border-[#3F6B45] text-xs font-bold text-[#3F6B45]"
                                                        >
                                                            Restablecer equipos
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteStudent(s.id, s.email)}
                                                            className="px-3 py-1.5 rounded-full bg-[#FFFDF7] border border-[#E5DAC0] hover:border-[#A3363D] text-xs font-bold text-[#A3363D]"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'forum' ? (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBF5E6] border border-[#E5DAC0] rounded-2xl p-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setForumFilter('pending')}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                                                forumFilter === 'pending'
                                                    ? 'bg-[#A3363D] text-white'
                                                    : 'bg-[#FFFDF7] border border-[#E5DAC0] text-[#2B2B2B]'
                                            }`}
                                        >
                                            Pendientes ({pendingForumCount})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForumFilter('all')}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                                                forumFilter === 'all'
                                                    ? 'bg-[#3F6B45] text-white'
                                                    : 'bg-[#FFFDF7] border border-[#E5DAC0] text-[#2B2B2B]'
                                            }`}
                                        >
                                            Todas ({forumQuestions.length})
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={teacherReplyName}
                                        onChange={(e) => setTeacherReplyName(e.target.value)}
                                        placeholder="Tu nombre visible al responder (ej. Prof. Yussef)"
                                        className="px-3 py-1.5 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-xs text-[#2B2B2B] sm:w-64"
                                    />
                                </div>

                                {visibleForumQuestions.length === 0 ? (
                                    <p className="text-center text-sm text-[#2B2B2B]/75 py-8 bg-[#FBF5E6] rounded-2xl border border-[#E5DAC0]">
                                        {forumFilter === 'pending'
                                            ? '¡Excelente! No hay dudas pendientes por responder.'
                                            : 'Aún no hay preguntas publicadas en el foro.'}
                                    </p>
                                ) : (
                                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                        {visibleForumQuestions.map((q) => (
                                            <div
                                                key={q.id}
                                                className="p-4 rounded-2xl bg-[#FBF5E6] border border-[#E5DAC0] space-y-2.5"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-xs font-bold text-[#3F6B45]">
                                                            {q.workshopTitle}
                                                        </p>
                                                        <p className="text-sm font-bold text-[#2B2B2B] mt-0.5">
                                                            {q.title}
                                                        </p>
                                                        <p className="text-xs text-[#2B2B2B]/70">
                                                            Por {q.authorName}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span
                                                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                                                q.status === 'answered'
                                                                    ? 'bg-[#3F6B45]/15 text-[#2E4F35]'
                                                                    : 'bg-[#FFF4C7] border border-[#E5C158] text-[#8A5A00]'
                                                            }`}
                                                        >
                                                            {q.status === 'answered' ? 'Respondida' : 'Pendiente'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteForumQuestion(q.id)}
                                                            className="text-xs font-bold text-[#A3363D] hover:underline"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </div>

                                                {q.body && (
                                                    <p className="text-xs text-[#2B2B2B]/90 bg-[#FFFDF7] p-2.5 rounded-xl border border-[#E5DAC0]">
                                                        {q.body}
                                                    </p>
                                                )}

                                                {q.replies.length > 0 && (
                                                    <div className="space-y-1.5 pl-3 border-l-2 border-[#3F6B45]">
                                                        {q.replies.map((r) => (
                                                            <p key={r.id} className="text-xs text-[#2B2B2B]/85">
                                                                <strong className={r.isOfficial ? 'text-[#3F6B45]' : 'text-[#2B2B2B]'}>
                                                                    {r.authorName}:
                                                                </strong>{' '}
                                                                {r.body}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                                    <input
                                                        type="text"
                                                        value={replyDrafts[q.id] || ''}
                                                        onChange={(e) =>
                                                            setReplyDrafts((prev) => ({
                                                                ...prev,
                                                                [q.id]: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="Escribe la respuesta oficial del profesor/colaborador..."
                                                        className="flex-1 px-3 py-2 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-xs text-[#2B2B2B]"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={sendingReplyId === q.id || !(replyDrafts[q.id] || '').trim()}
                                                        onClick={() => handleSendOfficialReply(q.id)}
                                                        className="px-4 py-2 rounded-full bg-[#3F6B45] hover:bg-[#2E4F35] disabled:opacity-50 text-white text-xs font-bold shrink-0"
                                                    >
                                                        {sendingReplyId === q.id
                                                            ? 'Publicando...'
                                                            : 'Responder oficialmente'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {alerts.length === 0 ? (
                                    <p className="text-center text-sm text-[#2B2B2B]/75 py-8 bg-[#FBF5E6] rounded-2xl border border-[#E5DAC0]">
                                        No hay alertas de uso compartido o cambios de país registradas.
                                    </p>
                                ) : (
                                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                                        {alerts.map((alert) => (
                                            <div
                                                key={alert.id}
                                                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                    alert.resolved
                                                        ? 'bg-[#FBF5E6]/60 border-[#E5DAC0] opacity-75'
                                                        : 'bg-[#A3363D]/10 border-[#A3363D]'
                                                }`}
                                            >
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-[#A3363D]">
                                                        {alert.reason === 'COUNTRY_MISMATCH'
                                                            ? 'Bloqueo por país distinto'
                                                            : 'Bloqueo por exceso de dispositivos'}
                                                        {alert.resolved ? ' · Resuelta' : ''}
                                                    </p>
                                                    <p className="text-sm font-bold text-[#2B2B2B] tabular-nums">
                                                        {alert.fullName ? `${alert.fullName} (${alert.email})` : alert.email} ha ingresado en{' '}
                                                        {alert.detectedDevicesCount} dispositivos
                                                    </p>
                                                    <p className="text-xs text-[#2B2B2B]/80 tabular-nums">
                                                        Equipo bloqueado: {alert.attemptedDeviceLabel}
                                                        {alert.attemptedCountry ? ` · País intento: ${alert.attemptedCountry}` : ''}
                                                        {alert.countriesSeen.length > 0 ? ` · Países vistos: ${alert.countriesSeen.join(', ')}` : ''}
                                                        {alert.attemptedIp ? ` · IP: ${alert.attemptedIp}` : ''}
                                                    </p>
                                                </div>

                                                {!alert.resolved && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResetDevices(alert.studentId, alert.email)}
                                                        className="px-4 py-2 rounded-full bg-[#3F6B45] hover:bg-[#2E4F35] text-white text-xs font-bold shrink-0"
                                                    >
                                                        Restablecer y desbloquear
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPortalModal;
