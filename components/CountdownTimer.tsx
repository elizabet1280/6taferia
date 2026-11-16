import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
    targetTimestamp: number;
    onComplete?: () => void;
}

interface TimeLeft {
    días: number;
    horas: number;
    minutos: number;
    segundos: number;
}

const calculateTimeLeft = (targetTimestamp: number): TimeLeft | null => {
    const difference = targetTimestamp - Date.now();

    if (difference <= 0) {
        return null;
    }

    return {
        días: Math.floor(difference / (1000 * 60 * 60 * 24)),
        horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutos: Math.floor((difference / 1000 / 60) % 60),
        segundos: Math.floor((difference / 1000) % 60),
    };
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetTimestamp, onComplete }) => {
    const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetTimestamp));

    useEffect(() => {
        const update = () => {
            const next = calculateTimeLeft(targetTimestamp);
            setTimeLeft(next);
            if (!next) {
                onComplete?.();
            }
        };

        update();
        const timerId = setInterval(update, 1000);

        return () => clearInterval(timerId);
    }, [targetTimestamp, onComplete]);

    if (!timeLeft) {
        return null;
    }

    const timeUnits = [
        { key: 'días', full: 'Días', short: 'Días', value: String(timeLeft.días).padStart(2, '0') },
        { key: 'horas', full: 'Horas', short: 'Hrs', value: String(timeLeft.horas).padStart(2, '0') },
        { key: 'minutos', full: 'Minutos', short: 'Min', value: String(timeLeft.minutos).padStart(2, '0') },
        { key: 'segundos', full: 'Segundos', short: 'Seg', value: String(timeLeft.segundos).padStart(2, '0') },
    ];

    return (
        <div className="flex justify-center gap-2.5 sm:gap-4 w-full" role="timer" aria-live="polite">
            {timeUnits.map(({ key, full, short, value }) => (
                <div
                    key={key}
                    className="flex flex-col items-center justify-center bg-[#FBF5E6] border border-[#E5DAC0] rounded-2xl py-2.5 px-3 sm:py-3 sm:px-5 min-w-[70px] sm:min-w-[110px] md:min-w-[126px] shadow-sm"
                >
                    <span className="font-title text-2xl sm:text-3xl md:text-4xl font-bold text-[#A3363D] leading-none tabular-nums">
                        {value}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold text-[#2B2B2B] uppercase tracking-wide mt-1.5 whitespace-nowrap">
                        <span className="sm:hidden">{short}</span>
                        <span className="hidden sm:inline">{full}</span>
                    </span>
                </div>
            ))}
        </div>
    );
};

export default CountdownTimer;