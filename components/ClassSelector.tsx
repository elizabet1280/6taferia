import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Clase } from '../types';
import { GLOBAL_CONFIG } from '../constants';
import { filterWorkshopsByQuery } from '../utils/workshopSearch';

interface ClassSelectorProps {
    classes: Clase[];
    selectedClassId: string;
    onSelectClass: (id: string) => void;
    completedClassIds: string[];
    currentTime: Date;
}

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
    </svg>
);

function getFairProgress(classes: Clase[], currentTime: Date): { givenCount: number; statusLabel: string } {
    const nowMs = currentTime.getTime();
    const startMs = GLOBAL_CONFIG.MAIN_EVENT_START_DATE.getTime();
    const endMs = GLOBAL_CONFIG.MAIN_EVENT_END_DATE.getTime();
    const total = classes.length;

    const hasConfirmedSchedules = classes.some((c) => c.horarioConfirmado && c.endTime);

    if (hasConfirmedSchedules) {
        const givenCount = classes.filter((c) => c.horarioConfirmado && c.endTime && nowMs >= c.endTime.getTime()).length;
        if (nowMs < startMs) return { givenCount: 0, statusLabel: 'Inicia el 23 nov' };
        if (nowMs > endMs) return { givenCount: total, statusLabel: 'Feria finalizada' };
        const day = Math.min(GLOBAL_CONFIG.TOTAL_DIAS, Math.floor((nowMs - startMs) / 86400000) + 1);
        return { givenCount, statusLabel: `Día ${day} de ${GLOBAL_CONFIG.TOTAL_DIAS}` };
    }

    if (nowMs < startMs) {
        return { givenCount: 0, statusLabel: 'Inicia el 23 nov' };
    }
    if (nowMs > endMs) {
        return { givenCount: total, statusLabel: 'Grabaciones completas' };
    }

    const elapsedMs = nowMs - startMs;
    const day = Math.min(GLOBAL_CONFIG.TOTAL_DIAS, Math.floor(elapsedMs / 86400000) + 1);
    const hoursIntoCurrentDay = (elapsedMs % 86400000) / (1000 * 60 * 60);
    // Estimado progresivo de la feria: ~2 talleres por día (al entrar en Día 3 ya hay 4 clases dadas)
    const completedPreviousDays = (day - 1) * 2;
    const extraToday = day === 5 ? (hoursIntoCurrentDay >= 19 ? 1 : 0) : hoursIntoCurrentDay >= 19 ? 2 : 0;
    const givenCount = Math.min(total, completedPreviousDays + extraToday);

    return { givenCount, statusLabel: `Día ${day} de ${GLOBAL_CONFIG.TOTAL_DIAS}` };
}

const ClassSelector: React.FC<ClassSelectorProps> = ({
    classes,
    selectedClassId,
    onSelectClass,
    completedClassIds,
    currentTime,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
    const fairProgress = useMemo(() => getFairProgress(classes, currentTime), [classes, currentTime]);

    const filteredClasses = useMemo(() => {
        return filterWorkshopsByQuery(classes, searchQuery);
    }, [classes, searchQuery]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const handleSelect = (id: string) => {
        onSelectClass(id);
        setIsOpen(false);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (value.trim()) {
            setIsOpen(true);
            const nextMatches = filterWorkshopsByQuery(classes, value);
            if (nextMatches.length > 0 && !nextMatches.some((c) => c.id === selectedClassId)) {
                onSelectClass(nextMatches[0].id);
            }
        }
    };

    return (
        <div ref={containerRef} className="w-full max-w-4xl mx-auto mb-8 relative z-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                <span className="text-sm md:text-base text-[#FFE9B8] font-semibold">
                    Explora o busca tu taller favorito
                </span>

                <div className="flex flex-wrap items-center gap-2 text-xs font-bold tabular-nums">
                    <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#243E29] border border-[#CFE5D2]/30 text-[#FFE9B8]"
                        title="Clases ya impartidas y disponibles en la plataforma según el día de la feria"
                    >
                        <span>
                            Feria ({fairProgress.statusLabel}): {fairProgress.givenCount} de {classes.length} dadas
                        </span>
                    </span>
                    <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3F6B45] border border-[#CFE5D2]/40 text-white"
                        title="Tu avance personal marcado manualmente con el botón Marcar vista en cada taller"
                    >
                        <span>
                            Mi progreso: {completedClassIds.length} de {classes.length} vistas
                        </span>
                    </span>
                </div>
            </div>

            {/* Buscador inteligente por palabras clave (sublimar/sublimación, calendario/calendarios, etc.) */}
            <div className="mb-2.5 relative">
                <label htmlFor="workshop-keyword-filter" className="sr-only">
                    Buscar taller por palabra clave
                </label>
                <SearchIcon className="w-4 h-4 text-[#3F6B45] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                    id="workshop-keyword-filter"
                    type="text"
                    value={searchQuery}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Buscar clase por palabra clave (ej. sublimación, calendario, tarjetas, santa...)"
                    className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-[#FFFDF7] border border-[#E5DAC0] focus:border-[#A3363D] text-xs sm:text-sm text-[#2B2B2B] placeholder:text-[#2B2B2B]/50 shadow-xs focus:outline-none transition-colors"
                />
                {searchQuery.trim() && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[#3F6B45] tabular-nums">
                            {filteredClasses.length}/{classes.length}
                        </span>
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label="Limpiar búsqueda de talleres"
                            className="w-6 h-6 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] hover:border-[#A3363D] text-[#2B2B2B] text-xs font-bold flex items-center justify-center"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Botón colapsable principal (oculto solo mientras escribe filtro activo para mostrar resultados directos debajo del buscador) */}
            {!searchQuery.trim() && (
                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-expanded={isOpen}
                    aria-controls="collapsible-workshop-menu"
                    className="w-full p-4 bg-[#FFFDF7] border-2 border-[#3F6B45] hover:border-[#A3363D] rounded-2xl text-left flex items-center justify-between gap-4 shadow-card-warm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3F6B45]"
                >
                    <div className="min-w-0 flex-1">
                        <span className="block text-[11px] uppercase tracking-wider text-[#3F6B45] font-bold">
                            Taller seleccionado (clic para ver los {classes.length} talleres)
                        </span>
                        <span className="block text-sm md:text-base font-bold text-[#2B2B2B] truncate mt-0.5">
                            {selectedClass.titulo}
                        </span>
                        <span className="block text-xs text-[#A3363D] font-semibold mt-0.5">
                            Con {selectedClass.ponentes.map((p) => p.nombre).join(', ')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {completedClassIds.includes(selectedClass.id) && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#3F6B45] px-2.5 py-1 rounded-full">
                                <CheckIcon className="w-3.5 h-3.5" />
                                <span>Vista</span>
                            </span>
                        )}
                        <ChevronDownIcon
                            className={`w-6 h-6 text-[#A3363D] transition-transform duration-200 ${
                                isOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </div>
                </button>
            )}

            {/* Lista desplegable / colapsable o resultados de búsqueda */}
            {(isOpen || searchQuery.trim().length > 0) && (
                <div
                    id="collapsible-workshop-menu"
                    role="listbox"
                    aria-label="Lista de talleres navideños"
                    className="mt-2 bg-[#FFFDF7] border border-[#E5DAC0] rounded-2xl shadow-2xl overflow-hidden divide-y divide-[#E5DAC0]"
                >
                    {filteredClasses.length === 0 ? (
                        <div className="px-4 py-6 text-center space-y-2">
                            <p className="text-sm font-semibold text-[#2B2B2B]">
                                No encontramos talleres que coincidan con «{searchQuery.trim()}».
                            </p>
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="text-xs font-bold text-[#A3363D] hover:underline"
                            >
                                Mostrar los {classes.length} talleres
                            </button>
                        </div>
                    ) : (
                        filteredClasses.map((clase) => {
                            const isSelected = clase.id === selectedClassId;
                            const isCompleted = completedClassIds.includes(clase.id);

                            return (
                                <button
                                    key={clase.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => handleSelect(clase.id)}
                                    className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors ${
                                        isSelected
                                            ? 'bg-[#FBF5E6] text-[#A3363D]'
                                            : 'hover:bg-[#FBF5E6]/70 text-[#2B2B2B]'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-[#A3363D]' : 'text-[#2B2B2B]'}`}>
                                            {clase.titulo}
                                        </p>
                                        <p className="text-xs text-[#2B2B2B]/75 truncate">
                                            {clase.ponentes.map((p) => p.nombre).join(', ')} · {clase.date} · {clase.time}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {isCompleted && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#3F6B45] px-2.5 py-0.5 rounded-full">
                                                <CheckIcon className="w-3.5 h-3.5" />
                                                <span>Listo</span>
                                            </span>
                                        )}
                                        {isSelected && (
                                            <span className="text-[11px] font-bold text-[#A3363D] uppercase tracking-wider">
                                                Actual
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default ClassSelector;
