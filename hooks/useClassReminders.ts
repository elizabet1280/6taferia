import { useState, useEffect, useCallback } from 'react';
import type { Clase } from '../types';

const STORAGE_KEY = 'territorio_canva_reminders';
const REMINDER_MINUTES_BEFORE = 15;

export const useClassReminders = (classes: Clase[]) => {
    const [reminderClassIds, setReminderClassIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load reminders from local storage', e);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reminderClassIds));
    }, [reminderClassIds]);

    const requestPermission = async (): Promise<boolean> => {
        if (!('Notification' in window)) {
            alert('Tu navegador no soporta notificaciones de escritorio.');
            return false;
        }
        
        if (Notification.permission === 'granted') return true;
        
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        
        return false;
    };

    const toggleReminder = useCallback(async (classId: string) => {
        if (reminderClassIds.includes(classId)) {
            setReminderClassIds(prev => prev.filter(id => id !== classId));
            return false; // Removed
        } else {
            const granted = await requestPermission();
            if (granted) {
                setReminderClassIds(prev => [...prev, classId]);
                return true; // Added
            } else {
                alert('Necesitas activar las notificaciones para recibir el recordatorio.');
                return false;
            }
        }
    }, [reminderClassIds]);

    // Schedule notifications
    useEffect(() => {
        if (Notification.permission !== 'granted') return;

        const timeouts: ReturnType<typeof setTimeout>[] = [];
        const now = Date.now();

        reminderClassIds.forEach(classId => {
            const clase = classes.find(c => c.id === classId);
            if (!clase || !clase.startTime) return;

            const reminderTime = clase.startTime.getTime() - (REMINDER_MINUTES_BEFORE * 60 * 1000);
            const delay = reminderTime - now;

            // Only schedule if the time hasn't passed yet
            if (delay > 0) {
                const timeoutId = setTimeout(() => {
                    new Notification('¡La clase está por comenzar!', {
                        body: `"${clase.titulo}" comienza en ${REMINDER_MINUTES_BEFORE} minutos.`,
                        icon: '/assets/aistudio/Copia_de_ARTES_6TA_FERIA_CANVA_NAVIDAD__3__6f474642.png',
                        tag: `reminder-${classId}` // Prevent duplicate notifications
                    });
                }, delay);
                timeouts.push(timeoutId);
            }
        });

        return () => {
            timeouts.forEach(clearTimeout);
        };
    }, [reminderClassIds, classes]);

    return {
        reminderClassIds,
        toggleReminder,
        isReminderSet: (id: string) => reminderClassIds.includes(id)
    };
};