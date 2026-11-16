import React, { useMemo } from 'react';

const CONFETTI_COLORS = ['#A3363D', '#3F6B45', '#F59E0B', '#FFE9B8', '#FFFDF7'];
const PARTICLE_COUNT = 120;

interface ConfettiParticle {
    id: number;
    style: React.CSSProperties;
}

const Confetti: React.FC = () => {
    const particles = useMemo<ConfettiParticle[]>(() => {
        return Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
            const size = Math.random() * 9 + 5;
            return {
                id: i,
                style: {
                    position: 'absolute',
                    width: `${size}px`,
                    height: `${size / 2}px`,
                    backgroundColor: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                    top: `${-15 - Math.random() * 20}px`,
                    left: `${Math.random() * 100}%`,
                    opacity: 1,
                    transform: `rotate(${Math.random() * 360}deg)`,
                    animation: `fall ${Math.random() * 2 + 2.5}s ${Math.random() * 0.6}s linear forwards`,
                },
            };
        });
    }, []);

    return (
        <div
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
        >
            {particles.map((particle) => (
                <div key={particle.id} style={particle.style} />
            ))}
        </div>
    );
};

export default Confetti;
