import React, { useMemo } from 'react';

interface SnowfallProps {
    aboveIntro?: boolean;
}

const SNOWFLAKE_COUNT = 42;

interface Snowflake {
    id: number;
    left: string;
    size: number;
    opacity: number;
    duration: number;
    delay: number;
}

const Snowfall: React.FC<SnowfallProps> = ({ aboveIntro = false }) => {
    const flakes = useMemo<Snowflake[]>(() => {
        return Array.from({ length: SNOWFLAKE_COUNT }).map((_, i) => {
            const size = 8 + (i % 5) * 2; // 8px a 16px
            const duration = 10 + (i % 7) * 2; // 10s a ~22s
            const delay = -((i * 1.45) % duration); // Visibles desde el primer instante
            const opacity = 0.15 + (i % 5) * 0.04; // 0.15 a 0.31 sutil para no estorbar la lectura
            const left = `${((i * 23 + (i % 4) * 7) % 97) + 1.5}%`;

            return {
                id: i,
                left,
                size,
                opacity,
                duration,
                delay,
            };
        });
    }, []);

    return (
        <div
            aria-hidden="true"
            className={`fixed inset-0 pointer-events-none overflow-hidden ${
                aboveIntro ? 'z-[72]' : 'z-30'
            }`}
        >
            {flakes.map((flake) => (
                <div
                    key={flake.id}
                    className="snowflake-item absolute top-0"
                    style={{
                        left: flake.left,
                        width: `${flake.size}px`,
                        height: `${flake.size}px`,
                        opacity: flake.opacity,
                        animation: `snowfall ${flake.duration}s ${flake.delay}s linear infinite`,
                        willChange: 'transform',
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FFFDF7"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        className="w-full h-full drop-shadow-[0_0_2px_rgba(255,253,247,0.28)]"
                    >
                        <path d="M12 2v20M3.34 7l17.32 10M20.66 7L3.34 17" />
                        <path d="M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" />
                    </svg>
                </div>
            ))}
        </div>
    );
};

export default Snowfall;
