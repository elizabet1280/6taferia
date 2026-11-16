import React, { useState, useEffect, useMemo } from 'react';
import type { Clase, ForumQuestion, VerifiedStudentSession } from '../types';
import {
    addStudentForumReply,
    createForumQuestion,
    fetchForumQuestions,
} from '../services/forumService';
import { matchesTextQuery } from '../utils/workshopSearch';

interface DoubtForumProps {
    classes: Clase[];
    selectedClassId: string;
    studentSession: VerifiedStudentSession | null;
    onOpenTeacherReview: () => void;
    refreshTrigger?: number;
    externalWorkshopFilter?: string;
    onWorkshopFilterChange?: (workshopId: string) => void;
}

const formatForumDate = (isoString: string): string => {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const DoubtForum: React.FC<DoubtForumProps> = ({
    classes,
    selectedClassId,
    studentSession,
    onOpenTeacherReview,
    refreshTrigger = 0,
    externalWorkshopFilter,
    onWorkshopFilterChange,
}) => {
    const [questions, setQuestions] = useState<ForumQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filtros del foro
    const [searchTerm, setSearchTerm] = useState('');
    const [internalWorkshopFilter, setInternalWorkshopFilter] = useState<string>(
        externalWorkshopFilter ?? 'all'
    );
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered'>('all');

    const workshopFilter = externalWorkshopFilter ?? internalWorkshopFilter;
    const updateWorkshopFilter = (value: string) => {
        setInternalWorkshopFilter(value);
        onWorkshopFilterChange?.(value);
    };

    // Modal de nueva pregunta
    const [showNewModal, setShowNewModal] = useState(false);
    const [authorName, setAuthorName] = useState(studentSession?.fullName || '');
    const [questionWorkshopId, setQuestionWorkshopId] = useState<string>(selectedClassId || 'general');
    const [questionTitle, setQuestionTitle] = useState('');
    const [questionBody, setQuestionBody] = useState('');
    const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);

    // Respuesta de alumna en el hilo
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyAuthor, setReplyAuthor] = useState(studentSession?.fullName || '');
    const [replyBody, setReplyBody] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);

    useEffect(() => {
        if (externalWorkshopFilter !== undefined) {
            setInternalWorkshopFilter(externalWorkshopFilter);
        }
    }, [externalWorkshopFilter]);

    useEffect(() => {
        if (studentSession?.fullName) {
            setAuthorName((prev) => prev || studentSession.fullName);
            setReplyAuthor((prev) => prev || studentSession.fullName);
        }
    }, [studentSession]);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        fetchForumQuestions()
            .then((data) => {
                if (active) setQuestions(data);
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => {
            active = false;
        };
    }, [refreshTrigger]);

    const activeFilterDescription = useMemo(() => {
        if (workshopFilter === 'all') {
            return 'Mostrando todas las consultas y dudas de la feria.';
        }
        if (workshopFilter === 'general') {
            return 'Mostrando consultas específicas para: Consultas generales de la feria.';
        }
        const matched = classes.find((c) => c.id === workshopFilter);
        return matched
            ? `Mostrando consultas específicas para: ${matched.titulo}`
            : 'Mostrando consultas específicas de la clase seleccionada.';
    }, [workshopFilter, classes]);

    const counts = useMemo(() => {
        const scoped =
            workshopFilter === 'all'
                ? questions
                : questions.filter((q) => q.workshopId === workshopFilter);

        return {
            all: scoped.length,
            pending: scoped.filter((q) => q.status === 'pending').length,
            answered: scoped.filter((q) => q.status === 'answered').length,
        };
    }, [questions, workshopFilter]);

    const filteredQuestions = useMemo(() => {
        return questions.filter((q) => {
            if (workshopFilter !== 'all' && q.workshopId !== workshopFilter) return false;
            if (statusFilter !== 'all' && q.status !== statusFilter) return false;
            if (searchTerm.trim()) {
                return matchesTextQuery(
                    [
                        q.title,
                        q.body,
                        q.authorName,
                        q.workshopTitle,
                        ...q.replies.map((r) => `${r.authorName} ${r.body}`),
                    ],
                    searchTerm
                );
            }
            return true;
        });
    }, [questions, workshopFilter, statusFilter, searchTerm]);

    const handleOpenNewModal = () => {
        const defaultTarget =
            workshopFilter !== 'all' ? workshopFilter : selectedClassId || 'general';
        setQuestionWorkshopId(defaultTarget);
        setFormError(null);
        setShowNewModal(true);
    };

    const handlePublishQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormSuccess(null);

        const chosenClass = classes.find((c) => c.id === questionWorkshopId);
        const workshopTitle = chosenClass ? chosenClass.titulo : 'Consulta general de la feria';

        setIsSubmittingQuestion(true);
        const res = await createForumQuestion({
            workshopId: questionWorkshopId,
            workshopTitle,
            authorName,
            authorEmail: studentSession?.email,
            title: questionTitle,
            body: questionBody,
        });
        setIsSubmittingQuestion(false);

        if (!res.ok || !res.question) {
            setFormError(res.message || 'No pudimos publicar tu duda.');
            return;
        }

        setQuestions((prev) => [res.question!, ...prev]);
        setQuestionTitle('');
        setQuestionBody('');
        setShowNewModal(false);
        if (workshopFilter !== 'all' && workshopFilter !== questionWorkshopId) {
            updateWorkshopFilter(questionWorkshopId);
        }
        setFormSuccess('¡Tu duda quedó publicada en el foro! Todas las alumnas y profesores ya pueden verla.');
        setTimeout(() => setFormSuccess(null), 5000);
    };

    const handlePublishReply = async (e: React.FormEvent, questionId: string) => {
        e.preventDefault();
        if (!replyBody.trim() || !replyAuthor.trim()) return;

        setIsSubmittingReply(true);
        const res = await addStudentForumReply({
            questionId,
            authorName: replyAuthor,
            body: replyBody,
        });
        setIsSubmittingReply(false);

        if (res.ok && res.reply) {
            setQuestions((prev) =>
                prev.map((q) =>
                    q.id === questionId ? { ...q, replies: [...q.replies, res.reply!] } : q
                )
            );
            setReplyBody('');
            setReplyingToId(null);
        }
    };

    return (
        <div
            aria-label="Foro de dudas de la feria"
            className="bg-[#FFFDF7] border border-[#E5DAC0] rounded-[22px] shadow-card-warm p-5 md:p-8 space-y-6"
        >
            {/* Cabecera del Foro */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#3F6B45]">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 shrink-0" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                        <h3 className="font-title italic text-2xl md:text-3xl font-bold text-[#A3363D]">
                            Atención Organizada de Dudas por Clase
                        </h3>
                    </div>
                    <p className="text-sm text-[#2B2B2B]/80">
                        {activeFilterDescription}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={handleOpenNewModal}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#3F6B45] hover:bg-[#2E4F35] text-white text-sm font-bold shadow-sm transition-colors"
                    >
                        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-base leading-none">
                            +
                        </span>
                        <span>Nueva Pregunta</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenTeacherReview}
                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] hover:border-[#A3363D] text-xs font-bold text-[#A3363D] transition-colors tabular-nums"
                    >
                        <span>Revisar pendientes ({questions.filter((q) => q.status === 'pending').length})</span>
                    </button>
                </div>
            </div>

            {formSuccess && (
                <div className="p-3.5 rounded-2xl bg-[#3F6B45]/10 border border-[#3F6B45] text-xs sm:text-sm font-semibold text-[#2E4F35]">
                    {formSuccess}
                </div>
            )}

            {/* Barra de búsqueda, filtro por clase y pestañas de estado */}
            <div className="space-y-3 bg-[#FBF5E6] border border-[#E5DAC0] rounded-2xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por pregunta, concepto de Canva o respuesta..."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                    />

                    <select
                        aria-label="Filtrar dudas por clase"
                        value={workshopFilter}
                        onChange={(e) => updateWorkshopFilter(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                    >
                        <option value="all">Todas las clases y dudas generales ({questions.length})</option>
                        <option value="general">Consultas generales de la feria</option>
                        {classes.map((c, idx) => (
                            <option key={c.id} value={c.id}>
                                Clase {idx + 1}: {c.titulo}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 tabular-nums">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                            statusFilter === 'all'
                                ? 'bg-[#3F6B45] text-white'
                                : 'bg-[#FFFDF7] border border-[#E5DAC0] text-[#2B2B2B] hover:border-[#3F6B45]'
                        }`}
                    >
                        Todas ({counts.all})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('pending')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                            statusFilter === 'pending'
                                ? 'bg-[#A3363D] text-white'
                                : 'bg-[#FFFDF7] border border-[#E5DAC0] text-[#2B2B2B] hover:border-[#A3363D]'
                        }`}
                    >
                        ⏳ Sin Responder ({counts.pending})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('answered')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                            statusFilter === 'answered'
                                ? 'bg-[#2E4F35] text-white'
                                : 'bg-[#FFFDF7] border border-[#E5DAC0] text-[#2B2B2B] hover:border-[#2E4F35]'
                        }`}
                    >
                        ✓ Respondidas ({counts.answered})
                    </button>
                </div>
            </div>

            {/* Hilo de preguntas y conversaciones */}
            {isLoading ? (
                <p className="text-center text-sm text-[#2B2B2B]/70 py-8">
                    Cargando dudas de la comunidad...
                </p>
            ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-[#FBF5E6] border border-[#E5DAC0] space-y-2">
                    <p className="text-sm font-semibold text-[#2B2B2B]">
                        No hay dudas registradas con este filtro.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            updateWorkshopFilter('all');
                            setStatusFilter('all');
                        }}
                        className="text-xs font-bold text-[#A3363D] hover:underline"
                    >
                        Ver todas las preguntas
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredQuestions.map((q) => (
                        <article
                            key={q.id}
                            className="rounded-2xl bg-[#FBF5E6] border border-[#E5DAC0] p-4 md:p-5 space-y-3"
                        >
                            {/* Cabecera de la pregunta */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-sm text-[#2B2B2B] uppercase tracking-wide">
                                            {q.authorName}
                                        </span>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFFDF7] border border-[#E5DAC0] text-[#2B2B2B]/75">
                                            Alumna
                                        </span>
                                        <span className="text-xs text-[#2B2B2B]/60">
                                            {formatForumDate(q.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-bold text-[#3F6B45]">
                                        {q.workshopTitle}
                                    </p>
                                </div>

                                <span
                                    className={`text-[11px] font-bold px-3 py-1 rounded-full shrink-0 ${
                                        q.status === 'answered'
                                            ? 'bg-[#3F6B45]/15 border border-[#3F6B45]/40 text-[#2E4F35]'
                                            : 'bg-[#FFF4C7] border border-[#E5C158] text-[#8A5A00]'
                                    }`}
                                >
                                    {q.status === 'answered'
                                        ? '✓ Resuelta · Sello Oficial'
                                        : '⏳ Pendiente por responder'}
                                </span>
                            </div>

                            {/* Cuerpo de la pregunta */}
                            <div>
                                <h3 className="font-bold text-base md:text-lg text-[#2B2B2B] leading-snug">
                                    {q.title}
                                </h3>
                                {q.body && (
                                    <p className="text-sm text-[#2B2B2B]/85 mt-1 leading-relaxed">
                                        {q.body}
                                    </p>
                                )}
                            </div>

                            {/* Hilo de respuestas visibles para todas las alumnas */}
                            {q.replies.length > 0 && (
                                <div className="space-y-2.5 pt-2 border-t border-[#E5DAC0]">
                                    {q.replies.map((reply) =>
                                        reply.isOfficial || reply.authorRole === 'teacher' ? (
                                            <div
                                                key={reply.id}
                                                className="rounded-xl bg-[#FFFDF7] border-l-4 border-l-[#3F6B45] border border-[#E5DAC0] p-3.5 space-y-1"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#3F6B45]">
                                                        ✓ Respuesta oficial · {reply.authorName}
                                                    </span>
                                                    <span className="text-[11px] text-[#2B2B2B]/55">
                                                        {formatForumDate(reply.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-[#2B2B2B] leading-relaxed">
                                                    {reply.body}
                                                </p>
                                            </div>
                                        ) : (
                                            <div
                                                key={reply.id}
                                                className="rounded-xl bg-[#FFFDF7]/75 border border-[#E5DAC0] p-3 space-y-1 ml-2 sm:ml-4"
                                            >
                                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                                    <span className="font-bold text-[#2B2B2B]">
                                                        {reply.authorName} · Alumna
                                                    </span>
                                                    <span className="text-[#2B2B2B]/55">
                                                        {formatForumDate(reply.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-[#2B2B2B]/90 leading-relaxed">
                                                    {reply.body}
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}

                            {/* Pie de tarjeta: botón para comentar en el hilo */}
                            <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setReplyingToId((prev) => (prev === q.id ? null : q.id))
                                    }
                                    className="text-xs font-bold text-[#A3363D] hover:underline"
                                >
                                    {replyingToId === q.id
                                        ? 'Ocultar comentario'
                                        : `Comentar en el hilo (${q.replies.length})`}
                                </button>
                            </div>

                            {replyingToId === q.id && (
                                <form
                                    onSubmit={(e) => handlePublishReply(e, q.id)}
                                    className="bg-[#FFFDF7] border border-[#E5DAC0] rounded-xl p-3 space-y-2.5"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <input
                                            type="text"
                                            required
                                            value={replyAuthor}
                                            onChange={(e) => setReplyAuthor(e.target.value)}
                                            placeholder="Tu nombre *"
                                            className="px-3 py-2 rounded-lg bg-[#FBF5E6] border border-[#E5DAC0] text-xs text-[#2B2B2B]"
                                        />
                                        <input
                                            type="text"
                                            required
                                            value={replyBody}
                                            onChange={(e) => setReplyBody(e.target.value)}
                                            placeholder="Escribe un aporte o seguimiento en este hilo..."
                                            className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#FBF5E6] border border-[#E5DAC0] text-xs text-[#2B2B2B]"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingReply}
                                        className="px-4 py-1.5 rounded-full bg-[#3F6B45] hover:bg-[#2E4F35] text-white text-xs font-bold"
                                    >
                                        {isSubmittingReply ? 'Enviando...' : 'Publicar en el hilo'}
                                    </button>
                                </form>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {/* Modal centrado para Nueva Pregunta */}
            {showNewModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="forum-new-question-title"
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowNewModal(false);
                    }}
                >
                    <div className="w-full max-w-lg rounded-[26px] bg-[#FFFDF7] border-2 border-[#E5DAC0] shadow-2xl p-6 md:p-7 relative max-h-[90vh] overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => setShowNewModal(false)}
                            aria-label="Cerrar formulario de nueva pregunta"
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] hover:border-[#A3363D] text-[#2B2B2B] font-bold flex items-center justify-center transition-colors"
                        >
                            ✕
                        </button>

                        <div className="flex items-start gap-3.5 pr-12 mb-5">
                            <span
                                aria-hidden="true"
                                className="w-11 h-11 rounded-2xl bg-[#FBF5E6] border border-[#E5DAC0] flex items-center justify-center text-[#3F6B45] font-bold text-xl shrink-0"
                            >
                                ?
                            </span>
                            <div>
                                <h4
                                    id="forum-new-question-title"
                                    className="font-title text-xl md:text-2xl font-bold text-[#2B2B2B] leading-tight"
                                >
                                    Nueva Pregunta en la Feria
                                </h4>
                                <p className="text-xs md:text-sm text-[#2B2B2B]/70 mt-0.5">
                                    Atención organizada y respuesta validada por los profesores
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handlePublishQuestion} className="space-y-4">
                            <div>
                                <label htmlFor="forum-workshop" className="block text-xs font-bold text-[#2B2B2B] mb-1.5">
                                    Tema o Taller de la Clase <span className="text-[#A3363D]">*</span>
                                </label>
                                <select
                                    id="forum-workshop"
                                    value={questionWorkshopId}
                                    onChange={(e) => setQuestionWorkshopId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                                >
                                    <option value="general">Consulta general de la feria</option>
                                    {classes.map((c, idx) => (
                                        <option key={c.id} value={c.id}>
                                            Clase {idx + 1}: {c.titulo}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="forum-author" className="block text-xs font-bold text-[#2B2B2B] mb-1.5">
                                    Tu Nombre <span className="text-[#A3363D]">*</span>
                                </label>
                                <input
                                    id="forum-author"
                                    type="text"
                                    required
                                    maxLength={120}
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    placeholder="Ej. María González"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                                />
                            </div>

                            <div>
                                <label htmlFor="forum-title" className="block text-xs font-bold text-[#2B2B2B] mb-1.5">
                                    Título Resumido de tu Consulta <span className="text-[#A3363D]">*</span>
                                </label>
                                <input
                                    id="forum-title"
                                    type="text"
                                    required
                                    maxLength={200}
                                    value={questionTitle}
                                    onChange={(e) => setQuestionTitle(e.target.value)}
                                    placeholder="Ej. ¿Cómo ajustar las medidas navideñas para sublimar?"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45]"
                                />
                            </div>

                            <div>
                                <label htmlFor="forum-body" className="block text-xs font-bold text-[#2B2B2B] mb-1.5">
                                    Detalle de tu Pregunta o Situación
                                </label>
                                <textarea
                                    id="forum-body"
                                    rows={3}
                                    maxLength={2000}
                                    value={questionBody}
                                    onChange={(e) => setQuestionBody(e.target.value)}
                                    placeholder="Cuéntanos qué herramientas usaste en Canva, qué intentas lograr y qué resultado estás obteniendo..."
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF7] border border-[#E5DAC0] text-sm text-[#2B2B2B] focus:outline-none focus:border-[#3F6B45] resize-y"
                                />
                            </div>

                            {formError && (
                                <p className="text-xs font-semibold text-[#A3363D]" role="alert">
                                    {formError}
                                </p>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#2B2B2B]/80 hover:bg-[#FBF5E6] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingQuestion}
                                    className="px-6 py-2.5 rounded-xl bg-[#3F6B45] hover:bg-[#2E4F35] disabled:opacity-60 text-white text-sm font-bold shadow-sm transition-colors"
                                >
                                    {isSubmittingQuestion ? 'Publicando...' : 'Publicar Pregunta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoubtForum;
