import React, { useState, useEffect } from 'react';
import type { Clase, VerifiedStudentSession } from '../types';
import { GLOBAL_CONFIG } from '../constants';
import CountdownTimer from './CountdownTimer';
import PincelinPath from './PincelinPath';
import PWAInstallButton from './PWAInstallButton';

interface HeaderProps {
    classes: Clase[];
    selectedClassId: string;
    onSelectClass: (id: string) => void;
    currentTime: Date;
    completedClassIds: string[];
    studentSession: VerifiedStudentSession | null;
    isBlocked: boolean;
    onOpenStudentAccess: () => void;
}

const computeEventStatus = (nowDate: Date): { started: boolean; finished: boolean; day: number } => {
    const start = GLOBAL_CONFIG.MAIN_EVENT_START_DATE;
    const end = GLOBAL_CONFIG.MAIN_EVENT_END_DATE;
    const diff = nowDate.getTime() - start.getTime();

    if (nowDate.getTime() > end.getTime()) {
        return { started: true, finished: true, day: GLOBAL_CONFIG.TOTAL_DIAS };
    }
    if (diff >= 0) {
        let day = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
        if (day > GLOBAL_CONFIG.TOTAL_DIAS) day = GLOBAL_CONFIG.TOTAL_DIAS;
        return { started: true, finished: false, day };
    }
    return { started: false, finished: false, day: 1 };
};

const Header: React.FC<HeaderProps> = ({
    classes,
    selectedClassId,
    onSelectClass,
    currentTime,
    completedClassIds,
    studentSession,
    isBlocked,
    onOpenStudentAccess,
}) => {
    const [eventStatus, setEventStatus] = useState(() => computeEventStatus(currentTime));

    const refreshEventStatus = React.useCallback(() => {
        setEventStatus(computeEventStatus(new Date()));
    }, []);

    useEffect(() => {
        setEventStatus(computeEventStatus(currentTime));
    }, [currentTime]);

    const renderStatusContent = () => {
        if (!eventStatus.started) {
            return (
                <>
                    <h2 className="font-bold text-[#3F6B45] uppercase tracking-[0.16em] text-xs sm:text-sm">
                        La feria empieza en
                    </h2>
                    <CountdownTimer
                        targetTimestamp={GLOBAL_CONFIG.MAIN_EVENT_START_DATE.getTime()}
                        onComplete={refreshEventStatus}
                    />
                </>
            );
        }

        if (eventStatus.finished) {
            return (
                <div className="flex flex-col items-center justify-center py-1">
                    <h2 className="font-title italic font-bold text-[#A3363D] text-xl md:text-2xl text-center">
                        ¡Edición Navideña · Acceso a Grabaciones!
                    </h2>
                    <p className="text-[#3F6B45] text-sm font-semibold mt-1 text-center">
                        Accede para siempre a los 9 talleres en la plataforma
                    </p>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center py-1 text-center">
                <p className="font-bold text-[#3F6B45] uppercase tracking-[0.18em] text-xs sm:text-sm">
                    ¡La feria ya comenzó!
                </p>
                <h2 className="font-title italic font-bold text-[#A3363D] text-3xl sm:text-4xl mt-1 tabular-nums">
                    Día {eventStatus.day} de {GLOBAL_CONFIG.TOTAL_DIAS}
                </h2>
                <p className="text-xs sm:text-sm text-[#2B2B2B]/75 font-medium mt-1">
                    {GLOBAL_CONFIG.EVENT_DATES_LABEL}
                </p>
            </div>
        );
    };

    return (
        <header className="w-full">
            {/* Contador ubicado inmediatamente debajo del cintillo fijo */}
            <div className="w-full px-4 pt-6 md:pt-7">
                <div className="container mx-auto max-w-3xl">
                    <div className="bg-[#FFFDF7] px-4 sm:px-8 py-4 sm:py-5 rounded-3xl border border-[#E5DAC0] shadow-card-warm flex flex-col items-center gap-3">
                        {renderStatusContent()}
                    </div>
                </div>
            </div>

            {/* Hero sobre fondo sólido */}
            <div className="py-6 md:py-8 px-4">
                <div className="container mx-auto max-w-6xl space-y-6">
                    {/* Tarjeta Hero estilo .hero-card */}
                    <div className="bg-[#FBF5E6] rounded-[34px] p-2.5 md:p-3.5 shadow-[0_20px_50px_rgba(43,43,43,0.22)]">
                        <div className="border-2 border-[#3F6B45] rounded-[26px] px-5 py-6 md:px-10 md:py-8 bg-[#FFFDF7]">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                {/* Banner oficial */}
                                <div className="lg:col-span-6 flex justify-center">
                                    <div className="w-full max-w-[440px] md:max-w-[490px] aspect-[16/10] overflow-hidden flex items-center justify-center">
                                        <img
                                            src={GLOBAL_CONFIG.URL_BANNER}
                                            alt="6ta Feria Latinoamérica Territorio Canva Edición Navideña"
                                            className="w-full h-full object-cover object-[50%_46%] drop-shadow-[0_8px_18px_rgba(43,43,43,0.25)]"
                                        />
                                    </div>
                                </div>

                                {/* Resumen y botones de acceso / inscripción */}
                                <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3F6B45] mb-2">
                                        {GLOBAL_CONFIG.EVENT_EDITION}
                                    </p>
                                    <p className="text-[#2B2B2B] text-base md:text-lg max-w-xl mb-6 leading-relaxed font-medium">
                                        {GLOBAL_CONFIG.EVENT_SUMMARY}
                                    </p>

                                    <div className="w-full sm:w-auto space-y-3">
                                        <div className="flex flex-row items-stretch justify-center lg:justify-start gap-2.5 sm:gap-3">
                                            <a
                                                href={GLOBAL_CONFIG.URL_INSCRIPCION_CTA}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-5 sm:px-7 py-3.5 text-sm sm:text-base font-bold rounded-full transition-all transform hover:scale-[1.03] hover:bg-[#862B31] whitespace-nowrap text-center ${GLOBAL_CONFIG.ANIMACION_CTA_PULSO_NEON}`}
                                                style={{
                                                    backgroundColor: GLOBAL_CONFIG.COLOR_ACCENTO_CTA,
                                                    color: GLOBAL_CONFIG.COLOR_TEXTO_BOTON,
                                                }}
                                            >
                                                Quiero mi lugar
                                            </a>

                                            <button
                                                type="button"
                                                onClick={onOpenStudentAccess}
                                                className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-5 sm:px-7 py-3.5 text-sm sm:text-base font-bold rounded-full border-2 transition-colors whitespace-nowrap text-center shadow-[0_6px_16px_rgba(63,107,69,0.28)] ${
                                                    isBlocked
                                                        ? 'bg-[#A3363D]/10 border-[#A3363D] text-[#A3363D] hover:bg-[#A3363D] hover:text-white'
                                                        : 'bg-[#3F6B45] border-[#3F6B45] text-white hover:bg-[#2E4F35] hover:border-[#2E4F35]'
                                                }`}
                                            >
                                                {isBlocked
                                                    ? 'Ver alerta acceso'
                                                    : studentSession
                                                        ? 'Mi pase activo'
                                                        : 'Validar mi acceso'}
                                            </button>
                                        </div>

                                        <div className="flex justify-center lg:justify-start">
                                            <PWAInstallButton />
                                        </div>
                                    </div>

                                    <p className="text-xs md:text-sm text-[#3F6B45] font-semibold mt-4">
                                        8 colaboradores · 9 temas · Bonos incluidos
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ruta navideña interactiva con Pincelín */}
                    <PincelinPath
                        classes={classes}
                        selectedClassId={selectedClassId}
                        onSelectClass={onSelectClass}
                        currentTime={currentTime}
                        completedClassIds={completedClassIds}
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;
