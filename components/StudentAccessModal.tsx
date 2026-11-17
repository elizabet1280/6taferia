import React, { useState, useEffect } from 'react';
import { GLOBAL_CONFIG } from '../constants';
import {
    saveStudentClassroomCredentials,
    verifyStudentAccess,
} from '../services/accessService';
import type { AccessVerificationResult, VerifiedStudentSession } from '../types';

interface StudentAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentSession: VerifiedStudentSession | null;
    blockAlert: AccessVerificationResult | null;
    targetClassTitle?: string;
    onVerified: (session: VerifiedStudentSession) => void;
    onBlocked: (alertResult: AccessVerificationResult) => void;
    onClearBlock: () => void;
    onLogout: () => void;
}

const StudentAccessModal: React.FC<StudentAccessModalProps> = ({
    isOpen,
    onClose,
    studentSession,
    blockAlert,
    targetClassTitle,
    onVerified,
    onBlocked,
    onClearBlock,
    onLogout,
}) => {
    const [email, setEmail] = useState('');
    const [accessPassword, setAccessPassword] = useState('');
    const [showInputPassword, setShowInputPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showSavedPassword, setShowSavedPassword] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [editedPassword, setEditedPassword] = useState('');
    const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);
    const [passwordSavedNotice, setPasswordSavedNotice] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        setPasswordSavedNotice(false);
        if (studentSession) {
            setEditedPassword(studentSession.classroomPassword || '');
            setIsEditingPassword(!studentSession.classroomPassword);
        }
    }, [isOpen, studentSession]);

    if (!isOpen) return null;

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !accessPassword.trim()) {
            setError('Ingresa tu correo electrónico de compra y la clave asignada que recibiste.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await verifyStudentAccess({
                email,
                purchaseCode: accessPassword,
                classroomPasswordDraft: accessPassword,
            });

            if (res.ok && res.student) {
                onVerified(res.student);
            } else if (res.status === 'BLOCKED_MAX_DEVICES' || res.status === 'BLOCKED_GEO') {
                onBlocked(res);
            } else {
                setError(res.message || 'No pudimos validar tu inscripción.');
            }
        } catch {
            setError('Error de conexión al validar tu inscripción. Intenta nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async (value: string, field: 'email' | 'password') => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            // Ignorar si portapapeles no está disponible
        }
    };

    const handleSaveEditedPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentSession) return;
        const cleanPass = editedPassword.trim();
        await saveStudentClassroomCredentials({
            email: studentSession.email,
            purchaseCode: studentSession.purchaseCode,
            classroomPassword: cleanPass,
        });
        onVerified({
            ...studentSession,
            classroomPassword: cleanPass,
        });
        setIsEditingPassword(false);
        setPasswordSavedNotice(true);
        setTimeout(() => setPasswordSavedNotice(false), 3000);
    };

    const classroomTargetUrl =
        studentSession?.classroomUrl?.trim() || GLOBAL_CONFIG.URL_ACCESO_PLATAFORMA;

    const handlePrepareClassroomClipboard = () => {
        const pass = studentSession?.classroomPassword?.trim();
        if (pass && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            void navigator.clipboard.writeText(pass).then(() => {
                setCopiedField('password');
                setTimeout(() => setCopiedField(null), 2500);
            }).catch(() => {
                // Ignorar si portapapeles no está disponible
            });
        }
    };

    const isIpMismatch = blockAlert?.reason === 'IP_MISMATCH';

    return (
        <div className="fixed inset-0 bg-[#2B2B2B]/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
            <div className="bg-[#FFFDF7] rounded-[26px] shadow-2xl p-6 md:p-8 max-w-lg w-full border-2 border-[#3F6B45] relative my-auto">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar ventana"
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] text-[#2B2B2B] hover:border-[#A3363D] hover:text-[#A3363D] font-bold flex items-center justify-center transition-colors"
                >
                    ✕
                </button>

                {blockAlert ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 pr-10 rounded-2xl bg-[#A3363D]/10 border border-[#A3363D]">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-7 h-7 text-[#A3363D] shrink-0 mt-0.5"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A3363D]">
                                    Acceso bloqueado por seguridad
                                </p>
                                <h3 className="font-title text-xl font-bold text-[#2B2B2B] mt-1">
                                    {isIpMismatch
                                        ? 'Conexión desde una IP distinta'
                                        : 'Límite de dispositivos excedido'}
                                </h3>
                            </div>
                        </div>

                        <p className="text-sm md:text-base text-[#2B2B2B] font-semibold leading-relaxed bg-[#FBF5E6] p-4 rounded-2xl border border-[#E5DAC0]">
                            {blockAlert.message}
                        </p>

                        <div className="grid grid-cols-2 gap-3 text-xs bg-[#FBF5E6] p-3.5 rounded-2xl border border-[#E5DAC0] tabular-nums">
                            <div>
                                <span className="block text-[#2B2B2B]/65">Dispositivos detectados</span>
                                <strong className="text-sm text-[#A3363D]">
                                    {blockAlert.detectedDevicesCount ?? '2+'} dispositivos
                                </strong>
                            </div>
                            <div>
                                <span className="block text-[#2B2B2B]/65">Límite permitido</span>
                                <strong className="text-sm text-[#2E4F35]">
                                    Máx. {blockAlert.maxDevices ?? 2} en la misma IP
                                </strong>
                            </div>
                            {blockAlert.primaryIp && (
                                <div>
                                    <span className="block text-[#2B2B2B]/65">IP autorizada</span>
                                    <strong className="text-[#2B2B2B] font-mono">
                                        {blockAlert.primaryIp}
                                    </strong>
                                </div>
                            )}
                            {blockAlert.attemptedIp && (
                                <div>
                                    <span className="block text-[#2B2B2B]/65">IP detectada</span>
                                    <strong className="text-[#A3363D] font-mono">
                                        {blockAlert.attemptedIp}
                                    </strong>
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-[#2B2B2B]/80 leading-relaxed">
                            Para evitar enlaces compartidos con terceros, cada pase funciona hasta en{' '}
                            <strong>2 dispositivos conectados desde la misma IP</strong>. Si cambiaste de red, router o equipo, solicita al administrador restablecer tus dispositivos.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 pt-1">
                            <button
                                type="button"
                                onClick={onClearBlock}
                                className="flex-1 py-3 px-4 rounded-full bg-[#3F6B45] hover:bg-[#2E4F35] text-white text-sm font-bold transition-colors"
                            >
                                Intentar con otra cuenta
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 px-4 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] hover:border-[#A3363D] text-[#2B2B2B] text-sm font-semibold transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                ) : studentSession ? (
                    <div className="space-y-5">
                        <div className="pr-12">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3F6B45]">
                                Puerta de acceso verificada
                            </p>
                            <h3 className="font-title italic text-2xl font-bold text-[#A3363D] mt-1">
                                ¡Bienvenida{studentSession.fullName ? `, ${studentSession.fullName}` : ''}!
                            </h3>
                            <p className="text-xs text-[#2B2B2B]/75 mt-1 tabular-nums">
                                Dispositivos activos: {studentSession.activeDevicesCount} de {studentSession.maxDevices}
                                {studentSession.primaryIp ? ` · IP autorizada: ${studentSession.primaryIp}` : ''}
                            </p>
                            {targetClassTitle && (
                                <p className="text-xs font-semibold text-[#2E4F35] mt-2">
                                    Lista para entrar a: {targetClassTitle}
                                </p>
                            )}
                        </div>

                        {/* Bóveda local con los datos de acceso ya guardados */}
                        <div className="bg-[#FBF5E6] border border-[#E5DAC0] rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#3F6B45]">
                                    Tus datos guardados de acceso
                                </span>
                                <span className="text-[11px] font-semibold text-[#2E4F35]">
                                    Guardado en este equipo
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 bg-[#FFFDF7] border border-[#E5DAC0] rounded-xl px-3.5 py-2.5">
                                <div className="min-w-0">
                                    <span className="block text-[11px] text-[#2B2B2B]/65">Usuario (correo)</span>
                                    <span className="block text-sm font-bold text-[#2B2B2B] truncate">
                                        {studentSession.email}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(studentSession.email, 'email')}
                                    className="px-3 py-1.5 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] hover:border-[#3F6B45] text-xs font-bold text-[#2B2B2B] shrink-0"
                                >
                                    {copiedField === 'email' ? '¡Copiado!' : 'Copiar'}
                                </button>
                            </div>

                            {isEditingPassword ? (
                                <form onSubmit={handleSaveEditedPassword} className="space-y-2">
                                    <label htmlFor="vault-pass" className="block text-xs font-bold text-[#2B2B2B]">
                                        Tu clave asignada para ClassOnLive (aulavirtual-premium.com)
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            id="vault-pass"
                                            type="text"
                                            value={editedPassword}
                                            onChange={(e) => setEditedPassword(e.target.value)}
                                            placeholder="La clave asignada al comprar"
                                            className="flex-1 px-3.5 py-2 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                                        />
                                        <button
                                            type="submit"
                                            className="px-4 py-2 rounded-full bg-[#3F6B45] hover:bg-[#2E4F35] text-white text-xs font-bold whitespace-nowrap"
                                        >
                                            Guardar clave
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-[#2B2B2B]/70">
                                        Guárdala una sola vez aquí para tener tu usuario y clave siempre a mano sin buscar correos.
                                    </p>
                                </form>
                            ) : (
                                <div className="flex items-center justify-between gap-2 bg-[#FFFDF7] border border-[#E5DAC0] rounded-xl px-3.5 py-2.5">
                                    <div className="min-w-0">
                                        <span className="block text-[11px] text-[#2B2B2B]/65">
                                            Clave asignada (plataforma de clases)
                                        </span>
                                        <span className="block text-sm font-bold text-[#2B2B2B] truncate font-mono">
                                            {studentSession.classroomPassword
                                                ? showSavedPassword
                                                    ? studentSession.classroomPassword
                                                    : '••••••••••••'
                                                : 'Sin clave guardada'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {studentSession.classroomPassword && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSavedPassword((prev) => !prev)}
                                                    className="px-2.5 py-1.5 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] text-xs font-semibold text-[#2B2B2B]"
                                                >
                                                    {showSavedPassword ? 'Ocultar' : 'Ver'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(studentSession.classroomPassword, 'password')}
                                                    className="px-3 py-1.5 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] hover:border-[#3F6B45] text-xs font-bold text-[#2B2B2B]"
                                                >
                                                    {copiedField === 'password' ? '¡Copiada!' : 'Copiar'}
                                                </button>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingPassword(true)}
                                            className="px-2.5 py-1.5 rounded-full bg-[#FFFDF7] border border-[#E5DAC0] hover:border-[#A3363D] text-xs font-semibold text-[#A3363D]"
                                        >
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {passwordSavedNotice && (
                                <p className="text-xs font-bold text-[#3F6B45]">
                                    ✓ Clave guardada de forma segura para tus próximos ingresos.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2.5">
                            <a
                                href={classroomTargetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handlePrepareClassroomClipboard}
                                className="block w-full text-center py-3.5 px-6 rounded-full bg-[#A3363D] hover:bg-[#862B31] text-white font-bold text-base shadow-[0_6px_16px_rgba(163,54,61,0.30)] transition-colors"
                            >
                                Entrar directo a ClassOnLive (Aula Virtual) →
                            </a>

                            <p className="text-[11px] text-[#2B2B2B]/75 leading-relaxed bg-[#FBF5E6] border border-[#E5DAC0] rounded-xl px-3 py-2">
                                Al abrir <strong>ClassOnLive</strong>, si aún no has iniciado sesión allí, pega tu{' '}
                                <strong>correo</strong> y tu <strong>clave asignada</strong> (al tocar el botón rojo copiamos tu clave automáticamente para facilitarte el ingreso).
                            </p>

                            <div className="flex items-center justify-between text-xs pt-1">
                                <span className="text-[#2B2B2B]/70 tabular-nums">
                                    {studentSession.primaryIp
                                        ? `Protegido en IP ${studentSession.primaryIp}`
                                        : 'Acceso verificado'}
                                </span>
                                <button
                                    type="button"
                                    onClick={onLogout}
                                    className="text-[#A3363D] hover:underline font-semibold"
                                >
                                    Cerrar sesión en este equipo
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="pr-12">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3F6B45]">
                                Acceso exclusivo para inscritas
                            </p>
                            <h3 className="font-title italic text-2xl font-bold text-[#A3363D] mt-1">
                                Valida tu pase a la feria
                            </h3>
                            <p className="text-xs md:text-sm text-[#2B2B2B]/80 mt-1.5 leading-relaxed">
                                Ingresa el <strong>correo con el que compraste</strong> y la{' '}
                                <strong>clave asignada</strong> que recibiste. Podrás entrar hasta en{' '}
                                <strong>2 dispositivos conectados desde la misma IP</strong> y guardarás tu progreso de clases vistas.
                            </p>
                        </div>

                        <form onSubmit={handleVerifySubmit} className="space-y-3.5">
                            <div>
                                <label htmlFor="student-access-email" className="block text-xs font-bold text-[#2B2B2B] mb-1">
                                    Usuario (correo electrónico de compra)
                                </label>
                                <input
                                    id="student-access-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu-correo@ejemplo.com"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF5E6] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                                />
                            </div>

                            <div>
                                <label htmlFor="student-access-password" className="block text-xs font-bold text-[#2B2B2B] mb-1">
                                    Clave de acceso (contraseña asignada)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        id="student-access-password"
                                        type={showInputPassword ? 'text' : 'password'}
                                        required
                                        value={accessPassword}
                                        onChange={(e) => setAccessPassword(e.target.value)}
                                        placeholder="La clave que te asignaron al comprar"
                                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FBF5E6] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowInputPassword((prev) => !prev)}
                                        className="px-3.5 py-2 rounded-xl bg-[#FBF5E6] border border-[#E5DAC0] text-xs font-semibold text-[#2B2B2B]"
                                    >
                                        {showInputPassword ? 'Ocultar' : 'Ver'}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <p className="text-xs font-semibold text-[#A3363D] bg-[#A3363D]/10 p-3 rounded-xl border border-[#A3363D]/30" role="alert">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 px-6 rounded-full bg-[#A3363D] hover:bg-[#862B31] disabled:opacity-60 text-white font-bold text-sm md:text-base shadow-[0_6px_16px_rgba(163,54,61,0.30)] transition-colors"
                            >
                                {isLoading ? 'Verificando inscripción...' : 'Validar y guardar mi acceso'}
                            </button>
                        </form>

                        <div className="pt-4 border-t border-[#E5DAC0] text-center">
                            <p className="text-xs text-[#2B2B2B]/75 mb-2">¿Todavía no estás inscrita en la 6ta Feria?</p>
                            <a
                                href={GLOBAL_CONFIG.URL_INSCRIPCION_CTA}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block w-full py-2.5 px-4 rounded-full bg-[#2E4F35] hover:bg-[#3F6B45] text-white text-xs sm:text-sm font-bold transition-colors"
                            >
                                Adquirir mi pase en la página oficial
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentAccessModal;
