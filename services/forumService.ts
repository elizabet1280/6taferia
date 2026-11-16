import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { ForumQuestion, ForumReply } from '../types';

const FORUM_LOCAL_KEY = 'territorio_canva_6ta_forum_v1';

const SEED_QUESTIONS: ForumQuestion[] = [
    {
        id: 'seed-q-1',
        workshopId: 'clase-9',
        workshopTitle: 'Taller 9: Diseños para sublimar franelas familiares con motivo navideño',
        authorName: 'María Fernanda R.',
        title: '¿En qué formato debo descargar los diseños de Canva para sublimar?',
        body: 'Quiero saber si conviene exportarlos en PNG con fondo transparente o en PDF para impresión en la estampadora.',
        status: 'answered',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        replies: [
            {
                id: 'seed-r-1',
                questionId: 'seed-q-1',
                authorName: 'Lisbeth Mora · Colaboradora',
                authorRole: 'teacher',
                body: 'Lo ideal es exportar en PNG de alta resolución (o PDF para impresión en CMYK/RGB según tu impresora) y activar el modo espejo al imprimir en papel de sublimación. En el taller veremos el paso a paso completo.',
                isOfficial: true,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
            },
        ],
    },
    {
        id: 'seed-q-2',
        workshopId: 'clase-7',
        workshopTitle: 'Taller 7: Calendario de adviento',
        authorName: 'Carolina Díaz',
        title: '¿Las plantillas del calendario de adviento funcionan con Canva gratuito?',
        body: 'Aún no tengo Canva Pro y quiero saber si podré editar todos los elementos incluidos en el bono.',
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        replies: [],
    },
];

function readLocalQuestions(): ForumQuestion[] {
    try {
        const raw = localStorage.getItem(FORUM_LOCAL_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as ForumQuestion[];
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        // Fallback a ejemplos iniciales
    }
    writeLocalQuestions(SEED_QUESTIONS);
    return SEED_QUESTIONS;
}

function writeLocalQuestions(questions: ForumQuestion[]): void {
    try {
        localStorage.setItem(FORUM_LOCAL_KEY, JSON.stringify(questions));
    } catch {
        // Ignorar errores de cuota
    }
}

export async function fetchForumQuestions(): Promise<ForumQuestion[]> {
    if (isSupabaseConfigured && supabase) {
        const { data: qRows, error: qError } = await supabase
            .from('forum_questions')
            .select('id, workshop_id, workshop_title, author_name, title, body, status, created_at')
            .order('created_at', { ascending: false })
            .limit(100);

        if (qError || !qRows) {
            return readLocalQuestions();
        }

        const questionIds = qRows.map((q) => q.id);
        let repliesByQuestion: Record<string, ForumReply[]> = {};

        if (questionIds.length > 0) {
            const { data: rRows } = await supabase
                .from('forum_replies')
                .select('id, question_id, author_name, author_role, body, is_official, created_at')
                .in('question_id', questionIds)
                .order('created_at', { ascending: true });

            if (rRows) {
                repliesByQuestion = rRows.reduce<Record<string, ForumReply[]>>((acc, r) => {
                    const qId = String(r.question_id);
                    if (!acc[qId]) acc[qId] = [];
                    acc[qId].push({
                        id: String(r.id),
                        questionId: qId,
                        authorName: r.author_name,
                        authorRole: r.author_role === 'teacher' ? 'teacher' : 'student',
                        body: r.body,
                        isOfficial: Boolean(r.is_official),
                        createdAt: r.created_at,
                    });
                    return acc;
                }, {});
            }
        }

        return qRows.map((q) => ({
            id: String(q.id),
            workshopId: q.workshop_id,
            workshopTitle: q.workshop_title,
            authorName: q.author_name,
            title: q.title,
            body: q.body || '',
            status: q.status === 'answered' ? 'answered' : 'pending',
            createdAt: q.created_at,
            replies: repliesByQuestion[String(q.id)] || [],
        }));
    }

    return readLocalQuestions();
}

export async function createForumQuestion(params: {
    workshopId: string;
    workshopTitle: string;
    authorName: string;
    authorEmail?: string;
    title: string;
    body: string;
}): Promise<{ ok: boolean; question?: ForumQuestion; message?: string }> {
    const cleanAuthor = params.authorName.trim();
    const cleanTitle = params.title.trim();
    const cleanBody = params.body.trim();

    if (!cleanAuthor || !cleanTitle) {
        return { ok: false, message: 'Escribe tu nombre y el título de tu duda.' };
    }

    if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
            .from('forum_questions')
            .insert({
                workshop_id: params.workshopId || 'general',
                workshop_title: params.workshopTitle || 'Consulta general',
                author_name: cleanAuthor,
                author_email: (params.authorEmail || '').trim().toLowerCase(),
                title: cleanTitle,
                body: cleanBody,
                status: 'pending',
            })
            .select('id, workshop_id, workshop_title, author_name, title, body, status, created_at')
            .single();

        if (error || !data) {
            return { ok: false, message: 'No pudimos publicar tu duda en este momento. Inténtalo de nuevo.' };
        }

        return {
            ok: true,
            question: {
                id: String(data.id),
                workshopId: data.workshop_id,
                workshopTitle: data.workshop_title,
                authorName: data.author_name,
                title: data.title,
                body: data.body || '',
                status: 'pending',
                createdAt: data.created_at,
                replies: [],
            },
        };
    }

    const newQuestion: ForumQuestion = {
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        workshopId: params.workshopId || 'general',
        workshopTitle: params.workshopTitle || 'Consulta general',
        authorName: cleanAuthor,
        title: cleanTitle,
        body: cleanBody,
        status: 'pending',
        createdAt: new Date().toISOString(),
        replies: [],
    };

    const current = readLocalQuestions();
    writeLocalQuestions([newQuestion, ...current]);
    return { ok: true, question: newQuestion };
}

export async function addStudentForumReply(params: {
    questionId: string;
    authorName: string;
    body: string;
}): Promise<{ ok: boolean; reply?: ForumReply; message?: string }> {
    const cleanAuthor = params.authorName.trim();
    const cleanBody = params.body.trim();

    if (!cleanAuthor || !cleanBody) {
        return { ok: false, message: 'Escribe tu nombre y tu comentario.' };
    }

    if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
            .from('forum_replies')
            .insert({
                question_id: params.questionId,
                author_name: cleanAuthor,
                author_role: 'student',
                body: cleanBody,
                is_official: false,
            })
            .select('id, question_id, author_name, author_role, body, is_official, created_at')
            .single();

        if (error || !data) {
            return { ok: false, message: 'No pudimos guardar tu comentario en el hilo.' };
        }

        return {
            ok: true,
            reply: {
                id: String(data.id),
                questionId: String(data.question_id),
                authorName: data.author_name,
                authorRole: 'student',
                body: data.body,
                isOfficial: false,
                createdAt: data.created_at,
            },
        };
    }

    const newReply: ForumReply = {
        id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        questionId: params.questionId,
        authorName: cleanAuthor,
        authorRole: 'student',
        body: cleanBody,
        isOfficial: false,
        createdAt: new Date().toISOString(),
    };

    const current = readLocalQuestions();
    const updated = current.map((q) =>
        q.id === params.questionId ? { ...q, replies: [...q.replies, newReply] } : q
    );
    writeLocalQuestions(updated);
    return { ok: true, reply: newReply };
}

export async function adminReplyForumQuestion(params: {
    adminEmail: string;
    accessKey: string;
    questionId: string;
    teacherName: string;
    replyBody: string;
}): Promise<{ ok: boolean; reply?: ForumReply; message?: string }> {
    const cleanTeacher = params.teacherName.trim() || 'Profesor / Colaborador';
    const cleanBody = params.replyBody.trim();

    if (!cleanBody) {
        return { ok: false, message: 'Escribe la respuesta antes de enviarla.' };
    }

    if (isSupabaseConfigured) {
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'reply_forum_question',
                adminEmail: params.adminEmail,
                accessKey: params.accessKey,
                questionId: params.questionId,
                teacherName: cleanTeacher,
                replyBody: cleanBody,
            }),
        });
        return (await res.json()) as { ok: boolean; reply?: ForumReply; message?: string };
    }

    const newReply: ForumReply = {
        id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        questionId: params.questionId,
        authorName: cleanTeacher,
        authorRole: 'teacher',
        body: cleanBody,
        isOfficial: true,
        createdAt: new Date().toISOString(),
    };

    const current = readLocalQuestions();
    const updated = current.map((q) =>
        q.id === params.questionId
            ? { ...q, status: 'answered' as const, replies: [...q.replies, newReply] }
            : q
    );
    writeLocalQuestions(updated);
    return { ok: true, reply: newReply };
}

export async function adminDeleteForumQuestion(params: {
    adminEmail: string;
    accessKey: string;
    questionId: string;
}): Promise<{ ok: boolean; message?: string }> {
    if (isSupabaseConfigured) {
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_forum_question',
                adminEmail: params.adminEmail,
                accessKey: params.accessKey,
                questionId: params.questionId,
            }),
        });
        return (await res.json()) as { ok: boolean; message?: string };
    }

    const current = readLocalQuestions();
    writeLocalQuestions(current.filter((q) => q.id !== params.questionId));
    return { ok: true };
}
