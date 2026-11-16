import React from 'react';
import type { Clase } from '../types';
import { GLOBAL_CONFIG } from '../constants';

interface PincelinPathProps {
    classes: Clase[];
    selectedClassId: string;
    onSelectClass: (id: string) => void;
    currentTime: Date;
    completedClassIds: string[];
}

const PATH_POINTS = [
    { x: 50, y: 86 },
    { x: 150, y: 46 },
    { x: 250, y: 86 },
    { x: 350, y: 46 },
    { x: 450, y: 86 },
    { x: 550, y: 46 },
    { x: 650, y: 86 },
    { x: 750, y: 46 },
    { x: 850, y: 86 },
];

function buildSmoothSvgPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cx = (p0.x + p1.x) / 2;
        d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
}

const PineTreeDecor: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        <path d="M12 2L6.5 10h3L5 17h5v4h4v-4h5l-4.5-7h3L12 2z" />
    </svg>
);

const StarDecor: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        <path d="M12 2l2.6 5.6 6.2.8-4.5 4.3 1.1 6.1L12 15.9l-5.4 2.9 1.1-6.1L3.2 8.4l6.2-.8L12 2z" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
);

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
    </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
);

interface SantaBootprintProps {
    fill: string;
    stroke: string;
    isRightFoot?: boolean;
    className?: string;
    children: React.ReactNode;
}

const SantaBootprint: React.FC<SantaBootprintProps> = ({
    fill,
    stroke,
    isRightFoot = false,
    className = '',
    children,
}) => (
    <div
        className={`relative inline-flex items-center justify-center select-none ${
            isRightFoot ? 'rotate-[7deg]' : '-rotate-[7deg]'
        } ${className}`}
    >
        <svg
            viewBox="0 0 40 54"
            className="w-full h-full overflow-visible drop-shadow-[0_3px_6px_rgba(43,43,43,0.20)]"
            aria-hidden="true"
        >
            {/* Suela delantera de la bota de Santa */}
            <path
                d={
                    isRightFoot
                        ? 'M20 3 C29 3 34 10 33 19 C32 25 29 29 27 32 L13 32 C10 28 8 23 8 17 C8 9 13 3 20 3 Z'
                        : 'M20 3 C27 3 32 9 32 17 C32 23 30 28 27 32 L13 32 C11 29 8 25 7 19 C6 10 11 3 20 3 Z'
                }
                fill={fill}
                stroke={stroke}
                strokeWidth="2.4"
                strokeLinejoin="round"
            />
            {/* Tacón característico de la bota navideña */}
            <rect
                x="11"
                y="35.5"
                width="18"
                height="13.5"
                rx="5"
                fill={fill}
                stroke={stroke}
                strokeWidth="2.4"
            />
        </svg>
        <span
            className="absolute inset-x-0 top-[21%] flex items-center justify-center leading-none"
            style={{ transform: isRightFoot ? 'rotate(-7deg)' : 'rotate(7deg)' }}
        >
            {children}
        </span>
    </div>
);

const PincelinPath: React.FC<PincelinPathProps> = ({
    classes,
    selectedClassId,
    onSelectClass,
    currentTime,
    completedClassIds,
}) => {
    const activeIndex = Math.max(
        0,
        classes.findIndex((c) => c.id === selectedClassId)
    );
    const activeClass = classes[activeIndex] || classes[0];

    const fullPathD = buildSmoothSvgPath(PATH_POINTS);
    const activePathD = buildSmoothSvgPath(PATH_POINTS.slice(0, activeIndex + 1));

    const handlePrev = () => {
        if (activeIndex > 0) {
            onSelectClass(classes[activeIndex - 1].id);
        }
    };

    const handleNext = () => {
        if (activeIndex < classes.length - 1) {
            onSelectClass(classes[activeIndex + 1].id);
        }
    };

    const getStepStatus = (clase: Clase, index: number) => {
        const isLive =
            Boolean(clase.horarioConfirmado && clase.startTime && clase.endTime) &&
            currentTime >= clase.startTime! &&
            currentTime <= clase.endTime!;
        const isPast =
            Boolean(clase.horarioConfirmado && clase.endTime) &&
            currentTime > clase.endTime!;
        const isSelected = index === activeIndex;
        const isPassedOnRoute = index < activeIndex;
        const isCompleted = completedClassIds.includes(clase.id);

        return { isLive, isPast, isSelected, isPassedOnRoute, isCompleted };
    };

    const getBootColors = (status: ReturnType<typeof getStepStatus>) => {
        if (status.isLive || status.isSelected) {
            return { fill: '#A3363D', stroke: '#FFE9B8', textClass: 'text-white' };
        }
        if (status.isCompleted) {
            return { fill: '#3F6B45', stroke: '#2E4F35', textClass: 'text-white' };
        }
        if (status.isPassedOnRoute) {
            return { fill: '#4E7B54', stroke: '#3F6B45', textClass: 'text-white' };
        }
        return { fill: '#FBF5E6', stroke: '#D5C7A6', textClass: 'text-[#2B2B2B]' };
    };

    return (
        <section
            aria-label="Ruta navideña de talleres con Pincelín"
            className="w-full rounded-[28px] bg-[#FFFDF7] border-2 border-[#3F6B45] shadow-[0_16px_38px_rgba(43,43,43,0.14)] p-5 md:p-7 relative overflow-hidden"
        >
            {/* Encabezado de la ruta */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#3F6B45]">
                        <PineTreeDecor className="w-4 h-4 text-[#3F6B45]" />
                        <span>Ruta Navideña de la Feria</span>
                    </div>
                    <h2 className="font-title italic text-xl md:text-2xl font-bold text-[#A3363D] mt-0.5">
                        Sigue el camino de Pincelín por los {classes.length} talleres
                    </h2>
                </div>

                {/* Controles Anterior / Siguiente para avanzar clase a clase */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={handlePrev}
                        disabled={activeIndex === 0}
                        className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-full border border-[#E5DAC0] bg-[#FBF5E6] text-xs font-bold text-[#2B2B2B] hover:border-[#A3363D] hover:text-[#A3363D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                        aria-label="Taller anterior en el camino"
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                        <span>Anterior</span>
                    </button>
                    <span className="text-xs font-bold tabular-nums text-white px-3 py-2 rounded-full bg-[#2E4F35] whitespace-nowrap">
                        {activeIndex + 1} / {classes.length}
                    </span>
                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={activeIndex === classes.length - 1}
                        className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-full border border-[#E5DAC0] bg-[#FBF5E6] text-xs font-bold text-[#2B2B2B] hover:border-[#A3363D] hover:text-[#A3363D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                        aria-label="Siguiente taller en el camino"
                    >
                        <span>Siguiente</span>
                        <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* DESKTOP (md+): Camino sinuoso navideño con pisadas de bota de Santa 1..9 */}
            <div className="hidden md:block relative z-10 pt-20 pb-2">
                <svg
                    viewBox="0 0 900 130"
                    preserveAspectRatio="none"
                    className="w-full h-32 block"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id="navidadTrailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3F6B45" />
                            <stop offset="100%" stopColor="#A3363D" />
                        </linearGradient>
                    </defs>

                    <path
                        d={fullPathD}
                        fill="none"
                        stroke="#E5DAC0"
                        strokeWidth="6"
                        strokeDasharray="8 8"
                        strokeLinecap="round"
                    />

                    {activeIndex > 0 && (
                        <path
                            d={activePathD}
                            fill="none"
                            stroke="url(#navidadTrailGrad)"
                            strokeWidth="6"
                            strokeLinecap="round"
                        />
                    )}
                </svg>

                {/* 9 Pisadas de bota numeradas sobre la ruta */}
                <div className="grid grid-cols-9 items-start -mt-32 relative">
                    {classes.map((clase, index) => {
                        const status = getStepStatus(clase, index);
                        const { isSelected, isCompleted } = status;
                        const colors = getBootColors(status);
                        const isTopRow = index % 2 === 1;

                        return (
                            <div
                                key={clase.id}
                                className={`flex flex-col items-center relative ${
                                    isTopRow ? 'pt-[18px]' : 'pt-[58px]'
                                }`}
                            >
                                <div className="relative flex flex-col items-center">
                                    {isSelected && (
                                        <div className="absolute bottom-full mb-0.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                            <img
                                                src={GLOBAL_CONFIG.URL_MASCOTA_PINCELIN}
                                                alt={`Pincelín en ${clase.titulo}`}
                                                className="w-20 h-20 object-contain drop-shadow-[0_6px_10px_rgba(43,43,43,0.28)] animate-levitate"
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => onSelectClass(clase.id)}
                                        aria-current={isSelected ? 'step' : undefined}
                                        title={clase.titulo}
                                        className={`group relative flex items-center justify-center transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3F6B45] rounded-xl ${
                                            isSelected ? 'scale-115' : 'hover:scale-110'
                                        }`}
                                    >
                                        <SantaBootprint
                                            fill={colors.fill}
                                            stroke={colors.stroke}
                                            isRightFoot={index % 2 === 1}
                                            className="w-11 h-14"
                                        >
                                            <span className={`font-extrabold text-sm tabular-nums ${colors.textClass} flex items-center gap-0.5`}>
                                                {isCompleted && !isSelected ? (
                                                    <CheckIcon className="w-4 h-4 text-white" />
                                                ) : (
                                                    index + 1
                                                )}
                                            </span>
                                        </SantaBootprint>
                                    </button>
                                </div>

                                <span
                                    className={`mt-1.5 text-[11px] font-bold tracking-wide ${
                                        isSelected
                                            ? 'text-[#A3363D]'
                                            : isCompleted
                                              ? 'text-[#3F6B45]'
                                              : 'text-[#2B2B2B]/75'
                                    }`}
                                >
                                    Taller {index + 1}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MÓVIL (< md): Escenario con Pincelín + pisadas numeradas 1..9 */}
            <div className="md:hidden relative z-10 space-y-4">
                <div className="flex items-center gap-4 bg-[#FBF5E6] border border-[#E5DAC0] rounded-2xl p-3.5">
                    <div className="relative shrink-0">
                        <img
                            src={GLOBAL_CONFIG.URL_MASCOTA_PINCELIN}
                            alt={`Pincelín en ${activeClass.titulo}`}
                            className="w-20 h-20 object-contain drop-shadow-[0_4px_10px_rgba(43,43,43,0.22)]"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wider font-bold text-[#3F6B45]">
                            Parada {activeIndex + 1} de {classes.length}
                        </p>
                        <p className="text-sm font-bold text-[#A3363D] leading-snug">
                            {activeClass.titulo}
                        </p>
                        <p className="text-xs text-[#2B2B2B] mt-1 truncate">
                            Con {activeClass.ponentes.map((p) => p.nombre).join(', ')}
                        </p>
                    </div>
                </div>

                {/* Pisadas de bota numeradas 1..9 */}
                <div className="grid grid-cols-9 gap-1">
                    {classes.map((clase, index) => {
                        const status = getStepStatus(clase, index);
                        const { isSelected, isCompleted } = status;
                        const colors = getBootColors(status);
                        return (
                            <button
                                key={clase.id}
                                type="button"
                                onClick={() => onSelectClass(clase.id)}
                                aria-current={isSelected ? 'step' : undefined}
                                aria-label={clase.titulo}
                                className={`flex items-center justify-center py-0.5 transition-transform ${
                                    isSelected ? 'scale-110' : ''
                                }`}
                            >
                                <SantaBootprint
                                    fill={colors.fill}
                                    stroke={colors.stroke}
                                    isRightFoot={index % 2 === 1}
                                    className="w-8 h-11"
                                >
                                    <span className={`font-extrabold text-[11px] tabular-nums ${colors.textClass}`}>
                                        {isCompleted && !isSelected ? (
                                            <CheckIcon className="w-3.5 h-3.5 text-white" />
                                        ) : (
                                            index + 1
                                        )}
                                    </span>
                                </SantaBootprint>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Franja llamativa con efecto visual indicando en qué taller está Pincelín */}
            <div className="relative z-10 mt-5 rounded-2xl border-2 px-4 py-3.5 bg-[#2E4F35] text-white animate-attention-glow flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start sm:items-center gap-2.5 text-sm md:text-base min-w-0">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#A3363D] border border-[#FFE9B8] shrink-0 animate-pulse mt-0.5 sm:mt-0">
                        <StarDecor className="w-4 h-4 text-[#FFE9B8]" />
                    </span>
                    <div className="min-w-0">
                        <p className="leading-snug">
                            <strong className="text-[#FFE9B8] uppercase tracking-wide text-xs md:text-sm mr-1.5">
                                Pincelín está en:
                            </strong>
                            <strong className="text-white font-bold">
                                {activeClass.titulo}
                            </strong>
                        </p>
                        <p className="text-xs sm:text-sm text-[#FFE9B8] font-semibold mt-0.5">
                            Con{' '}
                            {activeClass.ponentes.map((p, idx) => (
                                <span key={p.nombre} className="whitespace-nowrap">
                                    {idx > 0 ? ', ' : ''}
                                    {p.nombre}
                                </span>
                            ))}
                        </p>
                    </div>
                </div>
                <span className="text-xs font-bold text-[#FFE9B8] whitespace-nowrap sm:text-right pl-9 sm:pl-0">
                    {activeClass.horarioConfirmado ? `${activeClass.date} · ${activeClass.time}` : 'Horario oficial por confirmar'}
                </span>
            </div>
        </section>
    );
};

export default PincelinPath;
