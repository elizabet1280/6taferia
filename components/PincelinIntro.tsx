import React, { useEffect, useRef, useState } from 'react';
import { GLOBAL_CONFIG } from '../constants';

interface PincelinIntroProps {
    onFinish: () => void;
}

interface FrostParticle {
    x: number;
    y: number;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    r: number;
    g: number;
    b: number;
    size: number;
    delay: number;
    twinkleOffset: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const PincelinIntro: React.FC<PincelinIntroProps> = ({ onFinish }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [phase, setPhase] = useState<'assembling' | 'revealed' | 'fading'>('assembling');
    const [imageRect, setImageRect] = useState<{ left: number; top: number; width: number; height: number } | null>(
        null
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            onFinish();
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            onFinish();
            return;
        }

        let animationFrameId = 0;
        let revealTimeout: ReturnType<typeof setTimeout> | undefined;
        let fadeTimeout: ReturnType<typeof setTimeout> | undefined;
        let finishTimeout: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onerror = () => {
            if (!cancelled) onFinish();
        };

        img.onload = () => {
            if (cancelled) return;

            const maxMascotW = Math.min(width * 0.72, 310);
            const maxMascotH = Math.min(height * 0.46, 360);
            const scale = Math.min(maxMascotW / img.naturalWidth, maxMascotH / img.naturalHeight);

            const drawW = Math.max(120, Math.round(img.naturalWidth * scale));
            const drawH = Math.max(140, Math.round(img.naturalHeight * scale));
            const offsetX = Math.round((width - drawW) / 2);
            const offsetY = Math.round((height - drawH) / 2);

            setImageRect({ left: offsetX, top: offsetY, width: drawW, height: drawH });

            const offscreen = document.createElement('canvas');
            offscreen.width = drawW;
            offscreen.height = drawH;
            const offCtx = offscreen.getContext('2d');
            if (!offCtx) {
                onFinish();
                return;
            }

            offCtx.drawImage(img, 0, 0, drawW, drawH);
            const imgData = offCtx.getImageData(0, 0, drawW, drawH).data;

            const step = width < 640 ? 5 : 4;
            const particles: FrostParticle[] = [];

            for (let y = 0; y < drawH; y += step) {
                for (let x = 0; x < drawW; x += step) {
                    const idx = (y * drawW + x) * 4;
                    const alpha = imgData[idx + 3];
                    if (alpha < 60) continue;

                    const targetX = offsetX + x;
                    const targetY = offsetY + y;

                    // Todas las partículas inician arriba fuera de la pantalla para caer en lluvia dorada
                    const horizontalSpread = Math.min(width * 0.28, 130);
                    const startX = Math.max(
                        8,
                        Math.min(width - 8, targetX + (Math.random() - 0.5) * horizontalSpread)
                    );
                    const startY = -20 - Math.random() * (height * 0.45 + 60);

                    // Escalonado suave: la base de la figura asienta ligeramente antes que la coronilla
                    const verticalOrderDelay = ((drawH - y) / drawH) * 0.18;

                    particles.push({
                        x: startX,
                        y: startY,
                        startX,
                        startY,
                        targetX,
                        targetY,
                        r: imgData[idx],
                        g: imgData[idx + 1],
                        b: imgData[idx + 2],
                        size: width < 640 ? 1.7 + Math.random() * 1.4 : 1.6 + Math.random() * 1.5,
                        delay: Math.min(0.32, verticalOrderDelay + Math.random() * 0.14),
                        twinkleOffset: Math.random() * Math.PI * 2,
                    });
                }
            }

            // Lluvia continua de escarcha dorada ambiental por toda la pantalla
            const ambientSparkles = Array.from({ length: 65 }, () => ({
                x: Math.random() * width,
                y: Math.random() * height - height * 0.2,
                radius: 1 + Math.random() * 2.2,
                speedY: 1.2 + Math.random() * 1.8,
                driftX: (Math.random() - 0.5) * 0.35,
                phase: Math.random() * Math.PI * 2,
                isBright: Math.random() > 0.72,
            }));

            const assembleDuration = 2100;
            const startTime = performance.now();

            const renderFrame = (now: number) => {
                if (cancelled) return;
                const elapsed = now - startTime;
                const globalProgress = Math.min(elapsed / assembleDuration, 1);

                ctx.clearRect(0, 0, width, height);

                // Lluvia de escarcha dorada ambiental cayendo desde arriba
                for (const s of ambientSparkles) {
                    s.y += s.speedY;
                    s.x += s.driftX + Math.sin(now * 0.0025 + s.phase) * 0.25;
                    if (s.y > height + 12) {
                        s.y = -12;
                        s.x = Math.random() * width;
                    }

                    const alpha = 0.35 + 0.55 * Math.abs(Math.sin(now * 0.005 + s.phase));
                    ctx.fillStyle = s.isBright
                        ? `rgba(255, 240, 175, ${alpha.toFixed(2)})`
                        : `rgba(245, 198, 72, ${(alpha * 0.85).toFixed(2)})`;

                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                    ctx.fill();

                    if (s.isBright && alpha > 0.72) {
                        ctx.strokeStyle = `rgba(255, 248, 214, ${(alpha * 0.7).toFixed(2)})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(s.x - s.radius * 2, s.y);
                        ctx.lineTo(s.x + s.radius * 2, s.y);
                        ctx.moveTo(s.x, s.y - s.radius * 2);
                        ctx.lineTo(s.x, s.y + s.radius * 2);
                        ctx.stroke();
                    }
                }

                for (const p of particles) {
                    const localProgress = Math.min(
                        Math.max((globalProgress - p.delay) / (1 - p.delay), 0),
                        1
                    );
                    if (localProgress <= 0) continue;

                    const eased = easeOutCubic(localProgress);

                    // Caída en lluvia con vaivén lateral sutil que se alinea exactamente al aterrizar
                    const sway = (1 - eased) * 14 * Math.sin(localProgress * 7 + p.twinkleOffset);
                    const curX = p.startX + (p.targetX - p.startX) * eased + sway;
                    const curY = p.startY + (p.targetY - p.startY) * eased;

                    // Durante la caída brilla como escarcha dorada (#FFD55A / #FFE99E) antes de revelar su color real
                    const goldMix = Math.max(0, 1 - Math.pow(eased, 1.8) * 1.08);
                    const goldR = 255;
                    const goldG = 214 + Math.round(28 * Math.sin(p.twinkleOffset));
                    const goldB = 88 + Math.round(45 * Math.cos(p.twinkleOffset));

                    const r = Math.round(p.r + (goldR - p.r) * goldMix);
                    const g = Math.round(p.g + (goldG - p.g) * goldMix);
                    const b = Math.round(p.b + (goldB - p.b) * goldMix);
                    const twinkle = 0.7 + 0.3 * Math.sin(now * 0.01 + p.twinkleOffset);
                    const particleAlpha = Math.min(1, 0.45 + eased * 0.55) * twinkle;

                    // Estela sutil de caída dorada mientras desciende
                    if (goldMix > 0.25 && localProgress < 0.92) {
                        ctx.fillStyle = `rgba(255, 224, 120, ${(particleAlpha * 0.35).toFixed(2)})`;
                        ctx.beginPath();
                        ctx.ellipse(curX, curY - 4, p.size * 0.7, p.size * 2.1, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particleAlpha.toFixed(2)})`;
                    ctx.beginPath();
                    ctx.arc(curX, curY, p.size * (1 + goldMix * 0.35), 0, Math.PI * 2);
                    ctx.fill();
                }

                if (globalProgress < 1 || !cancelled) {
                    animationFrameId = requestAnimationFrame(renderFrame);
                }
            };

            animationFrameId = requestAnimationFrame(renderFrame);

            revealTimeout = setTimeout(() => {
                if (!cancelled) setPhase('revealed');
            }, 1900);

            fadeTimeout = setTimeout(() => {
                if (!cancelled) setPhase('fading');
            }, 3100);

            finishTimeout = setTimeout(() => {
                if (!cancelled) onFinish();
            }, 3650);
        };

        img.src = GLOBAL_CONFIG.URL_MASCOTA_PINCELIN;

        return () => {
            cancelled = true;
            cancelAnimationFrame(animationFrameId);
            if (revealTimeout) clearTimeout(revealTimeout);
            if (fadeTimeout) clearTimeout(fadeTimeout);
            if (finishTimeout) clearTimeout(finishTimeout);
        };
    }, [onFinish]);

    return (
        <div
            aria-label="Animación de bienvenida con Pincelín"
            className={`fixed inset-0 z-[70] bg-[#2E4F35] overflow-hidden transition-opacity duration-500 ${
                phase === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
        >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Mascota nítida revelada sobre las partículas al completarse la formación */}
            {imageRect && (
                <img
                    src={GLOBAL_CONFIG.URL_MASCOTA_PINCELIN}
                    alt="Pincelín Edición Navideña"
                    style={{
                        left: `${imageRect.left}px`,
                        top: `${imageRect.top}px`,
                        width: `${imageRect.width}px`,
                        height: `${imageRect.height}px`,
                    }}
                    className={`absolute object-contain pointer-events-none transition-opacity duration-700 drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)] ${
                        phase === 'revealed' || phase === 'fading' ? 'opacity-100' : 'opacity-0'
                    }`}
                />
            )}

            {/* Botón discreto para saltar */}
            <button
                type="button"
                onClick={onFinish}
                className="absolute top-5 right-5 px-4 py-1.5 rounded-full bg-[#FFFDF7]/15 hover:bg-[#FFFDF7]/25 border border-[#FFE9B8]/40 text-xs font-bold text-[#FFE9B8] transition-colors"
            >
                Saltar intro
            </button>
        </div>
    );
};

export default PincelinIntro;
