import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { classData, EVENT_DAYS, EVENT_INCLUDES, GLOBAL_CONFIG } from './constants';
import { useCurrentTime } from './hooks/useCurrentTime';
import {
    clearStudentSessionLocally,
    getSavedStudentSession,
    verifyStudentAccess,
} from './services/accessService';
import type { AccessVerificationResult, VerifiedStudentSession } from './types';

import Header from './components/Header';
import Footer from './components/Footer';
import ClassSelector from './components/ClassSelector';
import ClassCard from './components/ClassCard';
import ChristmasLights from './components/ChristmasLights';
import WhatsAppButton from './components/WhatsAppButton';
import Confetti from './components/Confetti';
import Snowfall from './components/Snowfall';
import DoubtForum from './components/DoubtForum';
import StudentAccessModal from './components/StudentAccessModal';
import AdminPortalModal from './components/AdminPortalModal';
import PincelinIntro from './components/PincelinIntro';

const COMPLETED_STORAGE_KEY = 'territorio_canva_6ta_completed_v1';

const App: React.FC = () => {
    const [selectedClassId, setSelectedClassId] = useState<string>(classData[0].id);
    const currentTime = useCurrentTime(5000);

    const [completedClassIds, setCompletedClassIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(COMPLETED_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [studentSession, setStudentSession] = useState<VerifiedStudentSession | null>(() =>
        getSavedStudentSession()
    );
    const [blockAlert, setBlockAlert] = useState<AccessVerificationResult | null>(null);
    const [accessModalOpen, setAccessModalOpen] = useState(false);
    const [targetClassTitle, setTargetClassTitle] = useState<string | undefined>(undefined);
    const [adminModalOpen, setAdminModalOpen] = useState(false);
    const [adminInitialTab, setAdminInitialTab] = useState<'students' | 'alerts' | 'forum'>('students');
    const [forumRefreshTrigger, setForumRefreshTrigger] = useState(0);
    const [programTab, setProgramTab] = useState<'talleres' | 'foro'>('talleres');
    const [forumWorkshopFilter, setForumWorkshopFilter] = useState<string>('all');
    const [showIntro, setShowIntro] = useState(true);
    const [confettiBurst, setConfettiBurst] = useState<number>(0);

    const handleFinishIntro = useCallback(() => {
        setShowIntro(false);
    }, []);

    const handleOpenClassForum = useCallback((classId: string) => {
        setForumWorkshopFilter(classId);
        setProgramTab('foro');
        document.getElementById('talleres-navidenos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    // Revalidación silenciosa al abrir la app: comprueba IP/país y límite de 2 dispositivos
    useEffect(() => {
        const saved = getSavedStudentSession();
        if (!saved) return;

        let active = true;
        verifyStudentAccess({
            email: saved.email,
            purchaseCode: saved.purchaseCode,
        })
            .then((res) => {
                if (!active) return;
                if (res.ok && res.student) {
                    setStudentSession(res.student);
                    setBlockAlert(null);
                } else if (res.status === 'BLOCKED_MAX_DEVICES' || res.status === 'BLOCKED_GEO') {
                    clearStudentSessionLocally();
                    setStudentSession(null);
                    setBlockAlert(res);
                } else if (res.status === 'INVALID_CREDENTIALS' || res.status === 'INACTIVE') {
                    clearStudentSessionLocally();
                    setStudentSession(null);
                }
            })
            .catch(() => {
                // Mantiene sesión local si hay falla temporal de red
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedClassIds));
    }, [completedClassIds]);

    useEffect(() => {
        if (confettiBurst === 0) return;

        const timer = setTimeout(() => {
            setConfettiBurst(0);
        }, 4200);

        return () => clearTimeout(timer);
    }, [confettiBurst]);

    const selectedClass = useMemo(
        () => classData.find((c) => c.id === selectedClassId) || classData[0],
        [selectedClassId]
    );

    const toggleCompleteClass = (classId: string) => {
        const isMarkingComplete = !completedClassIds.includes(classId);

        setCompletedClassIds((prev) =>
            prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
        );

        if (isMarkingComplete) {
            setConfettiBurst((prev) => prev + 1);
        }
    };

    const handleGoToClass = async (classId: string) => {
        const clase = classData.find((c) => c.id === classId);
        if (!clase) return;

        setTargetClassTitle(clase.titulo);

        if (studentSession) {
            // Verifica que siga dentro del límite de 2 dispositivos y mismo país antes de abrir
            const freshCheck = await verifyStudentAccess({
                email: studentSession.email,
                purchaseCode: studentSession.purchaseCode,
            }).catch(() => null);

            if (freshCheck && (freshCheck.status === 'BLOCKED_MAX_DEVICES' || freshCheck.status === 'BLOCKED_GEO')) {
                clearStudentSessionLocally();
                setStudentSession(null);
                setBlockAlert(freshCheck);
                setAccessModalOpen(true);
                return;
            }

            if (freshCheck?.ok && freshCheck.student) {
                setStudentSession(freshCheck.student);
            }
        }

        setAccessModalOpen(true);
    };

    const handleOpenStudentAccessFromHeader = () => {
        setTargetClassTitle(undefined);
        setAccessModalOpen(true);
    };

    const handleStudentVerified = (session: VerifiedStudentSession) => {
        setStudentSession(session);
        setBlockAlert(null);
    };

    const handleStudentBlocked = (alertResult: AccessVerificationResult) => {
        clearStudentSessionLocally();
        setStudentSession(null);
        setBlockAlert(alertResult);
    };

    const handleStudentLogout = () => {
        clearStudentSessionLocally();
        setStudentSession(null);
        setBlockAlert(null);
    };

    return (
        <div
            className="min-h-screen text-[#2B2B2B] relative"
            style={{ backgroundColor: GLOBAL_CONFIG.FONDO_GRADIENTE }}
        >
            {showIntro && <PincelinIntro onFinish={handleFinishIntro} />}
            <Snowfall aboveIntro={showIntro} />
            {confettiBurst > 0 && <Confetti key={confettiBurst} />}

            {/* Cintillo superior fijo mientras se hace scroll */}
            <div className="sticky top-0 z-40 w-full bg-[#A3363D] text-white py-2.5 px-4 text-center text-xs md:text-sm font-semibold tracking-wide border-b border-[#FFE9B8]/35 shadow-[0_4px_14px_rgba(0,0,0,0.22)]">
                <strong className="text-[#FFE9B8]">{GLOBAL_CONFIG.EVENT_DATES_LABEL}</strong>
                <ChristmasLights />
            </div>

            <div className="relative z-10">
                <Header
                    classes={classData}
                    selectedClassId={selectedClassId}
                    onSelectClass={setSelectedClassId}
                    currentTime={currentTime}
                    completedClassIds={completedClassIds}
                    studentSession={studentSession}
                    isBlocked={Boolean(blockAlert)}
                    onOpenStudentAccess={handleOpenStudentAccessFromHeader}
                />

                <main className="container mx-auto px-4 py-8 md:py-12 space-y-12">
                    {/* Sección unificada: Talleres Navideños con pestañas Talleres y Foro de Dudas */}
                    <section id="talleres-navidenos" aria-label="Talleres Navideños" className="max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FFE9B8]/85 mb-1">
                                    Programa y comunidad
                                </p>
                                <h2 className="font-title italic text-3xl md:text-4xl font-bold text-[#FFE9B8]">
                                    Talleres Navideños
                                </h2>
                            </div>

                            <div
                                role="tablist"
                                aria-label="Cambiar entre Talleres y Foro de Dudas"
                                className="inline-flex p-1.5 rounded-full bg-[#243E29] border border-[#CFE5D2]/30 shadow-md self-start md:self-auto"
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={programTab === 'talleres'}
                                    onClick={() => setProgramTab('talleres')}
                                    className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                                        programTab === 'talleres'
                                            ? 'bg-[#FFFDF7] text-[#A3363D] shadow-sm'
                                            : 'text-[#FFE9B8] hover:text-white'
                                    }`}
                                >
                                    <span>🎨</span>
                                    <span>Talleres</span>
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={programTab === 'foro'}
                                    onClick={() => setProgramTab('foro')}
                                    className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                                        programTab === 'foro'
                                            ? 'bg-[#FFFDF7] text-[#3F6B45] shadow-sm'
                                            : 'text-[#FFE9B8] hover:text-white'
                                    }`}
                                >
                                    <span>💬</span>
                                    <span>Foro de Dudas</span>
                                </button>
                            </div>
                        </div>

                        {programTab === 'talleres' ? (
                            <div role="tabpanel" aria-label="Lista y detalle de talleres">
                                <ClassSelector
                                    classes={classData}
                                    selectedClassId={selectedClassId}
                                    onSelectClass={setSelectedClassId}
                                    completedClassIds={completedClassIds}
                                    currentTime={currentTime}
                                />

                                <div className="max-w-4xl mx-auto">
                                    <ClassCard
                                        clase={selectedClass}
                                        currentTime={currentTime}
                                        onGoToClass={handleGoToClass}
                                        isCompleted={completedClassIds.includes(selectedClass.id)}
                                        onToggleComplete={toggleCompleteClass}
                                        studentSession={studentSession}
                                        isBlocked={Boolean(blockAlert)}
                                        onOpenClassForum={handleOpenClassForum}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div role="tabpanel" aria-label="Foro de dudas por clase">
                                <DoubtForum
                                    classes={classData}
                                    selectedClassId={selectedClassId}
                                    studentSession={studentSession}
                                    refreshTrigger={forumRefreshTrigger}
                                    externalWorkshopFilter={forumWorkshopFilter}
                                    onWorkshopFilterChange={setForumWorkshopFilter}
                                    onOpenTeacherReview={() => {
                                        setAdminInitialTab('forum');
                                        setAdminModalOpen(true);
                                    }}
                                />
                            </div>
                        )}
                    </section>

                    {/* Referencia rápida por días: clases, horarios y colaboradores */}
                    <section className="max-w-6xl mx-auto bg-[#FFFDF7] border border-[#E5DAC0] rounded-[22px] shadow-card-warm p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3F6B45] mb-1">
                                    Referencia rápida
                                </p>
                                <h2 className="font-title italic text-2xl md:text-3xl font-bold text-[#A3363D]">
                                    Agenda de clases por día
                                </h2>
                            </div>
                            <p className="text-xs md:text-sm text-[#2B2B2B]/75">
                                Horarios expresados en hora de Venezuela (VET) · Toca una clase para abrirla
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                            {EVENT_DAYS.map((day, dayIndex) => {
                                const dayClasses = classData.filter((c) =>
                                    c.date.toLowerCase().includes(day.diaSemana.toLowerCase())
                                );

                                return (
                                    <div
                                        key={day.numero}
                                        className="rounded-2xl bg-[#FBF5E6] border border-[#E5DAC0] p-3.5 flex flex-col gap-2.5"
                                    >
                                        <div className="flex items-baseline justify-between border-b border-[#E5DAC0] pb-2">
                                            <span className="font-bold text-xs uppercase tracking-wider text-[#2E4F35]">
                                                {day.diaSemana}
                                            </span>
                                            <span className="font-title text-lg font-bold text-[#A3363D] tabular-nums">
                                                {day.numero} Nov
                                            </span>
                                        </div>

                                        <div className="space-y-2 flex-1">
                                            {dayClasses.map((clase) => {
                                                const isActive = clase.id === selectedClassId;
                                                return (
                                                    <button
                                                        key={clase.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedClassId(clase.id);
                                                            setProgramTab('talleres');
                                                            document
                                                                .getElementById('talleres-navidenos')
                                                                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                        }}
                                                        className={`w-full text-left rounded-xl p-2.5 border transition-colors ${
                                                            isActive
                                                                ? 'bg-[#FFFDF7] border-[#A3363D] ring-1 ring-[#A3363D]/30'
                                                                : 'bg-[#FFFDF7] border-[#E5DAC0] hover:border-[#3F6B45]'
                                                        }`}
                                                    >
                                                        <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-[#3F6B45]">
                                                            {clase.time}
                                                        </span>
                                                        <p className="text-xs font-bold text-[#2B2B2B] leading-snug mt-0.5">
                                                            {clase.titulo.replace(/^Taller \d+:\s*/i, '')}
                                                        </p>
                                                        <p className="text-[11px] text-[#A3363D] font-semibold mt-1">
                                                            {clase.ponentes.map((p) => p.nombre).join(', ')}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {dayIndex === 4 && (
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#3F6B45] text-center pt-1">
                                                Cierre de la feria
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Qué incluye */}
                    <section className="max-w-6xl mx-auto">
                        <div className="bg-[#FFFDF7] border border-[#E5DAC0] rounded-[22px] shadow-card-warm p-6 md:p-8">
                            <div className="mb-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3F6B45] mb-1">
                                    Qué incluye
                                </p>
                                <h2 className="font-title italic text-2xl md:text-3xl font-bold text-[#A3363D]">
                                    Con tu inscripción recibes
                                </h2>
                            </div>
                            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {EVENT_INCLUDES.map((item, index) => (
                                    <li
                                        key={index}
                                        className="p-4 rounded-2xl bg-[#FBF5E6] border border-[#E5DAC0] flex items-start gap-3.5"
                                    >
                                        <span className="font-title text-2xl font-bold text-[#A3363D] min-w-[2rem] text-center leading-tight">
                                            {item.highlight}
                                        </span>
                                        <span className="text-[#2B2B2B] text-sm">{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                </main>

                <Footer
                    onOpenAdmin={() => {
                        setAdminInitialTab('students');
                        setAdminModalOpen(true);
                    }}
                />
            </div>

            <StudentAccessModal
                isOpen={accessModalOpen}
                onClose={() => setAccessModalOpen(false)}
                studentSession={studentSession}
                blockAlert={blockAlert}
                targetClassTitle={targetClassTitle}
                onVerified={handleStudentVerified}
                onBlocked={handleStudentBlocked}
                onClearBlock={() => setBlockAlert(null)}
                onLogout={handleStudentLogout}
            />

            <AdminPortalModal
                isOpen={adminModalOpen}
                onClose={() => setAdminModalOpen(false)}
                initialTab={adminInitialTab}
                onForumUpdated={() => setForumRefreshTrigger((prev) => prev + 1)}
            />

            <WhatsAppButton />
        </div>
    );
};

export default App;