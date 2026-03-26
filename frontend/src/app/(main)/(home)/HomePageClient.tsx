'use client';

import { useEffect, useRef, useState } from 'react';
import { ChartCard } from '@/src/components/ChartCard/ChartCard';
import * as ChartAPI from '@/src/lib/api/ChartAPI';
import { PublicChart } from '@/src/lib/types/models';
import styles from './HomePageClient.module.css';

const displayedCharts = [1, 2, 3];

export default function HomePageClient() {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [slides, setSlides] = useState<(PublicChart | null)[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const sectionRefs = useRef<Array<HTMLElement | null>>([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const results = await Promise.allSettled(
                    displayedCharts.map(id => ChartAPI.getChart(id))
                );
                if (cancelled) return;
                const next: (PublicChart | null)[] = results.map(r =>
                    r.status === 'fulfilled' ? r.value : null
                );
                if (next.every(c => c === null)) {
                    setError('Could not load featured charts.');
                }
                setSlides(next);
            } catch {
                if (!cancelled) setError('Could not load featured charts.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        // When the featured charts load, reset to the first slide.
        setActiveIndex(0);
        sectionRefs.current = [];
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollTo({ top: 0, behavior: 'auto' });
    }, [slides.length]);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;

        let raf = 0;
        const onScroll = () => {
            window.cancelAnimationFrame(raf);
            raf = window.requestAnimationFrame(() => {
                const scrollTop = el.scrollTop;

                let bestIdx = 0;
                let bestDist = Number.POSITIVE_INFINITY;

                for (let i = 0; i < sectionRefs.current.length; i++) {
                    const node = sectionRefs.current[i];
                    if (!node) continue;
                    const dist = Math.abs(node.offsetTop - scrollTop);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                    }
                }

                setActiveIndex(bestIdx);
            });
        };

        el.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => {
            window.cancelAnimationFrame(raf);
            el.removeEventListener('scroll', onScroll);
        };
    }, [slides.length]);

    const findPrevAvailableIndex = (from: number) => {
        for (let i = from - 1; i >= 0; i--) {
            if (slides[i]) return i;
        }
        return null;
    };

    const findNextAvailableIndex = (from: number) => {
        for (let i = from + 1; i < slides.length; i++) {
            if (slides[i]) return i;
        }
        return null;
    };

    const prevIndex = findPrevAvailableIndex(activeIndex);
    const nextIndex = findNextAvailableIndex(activeIndex);

    const goToIndex = (idx: number | null) => {
        if (idx === null) return;
        const el = scrollerRef.current;
        const target = sectionRefs.current[idx];
        if (!el || !target) return;

        el.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    };

    const validCount = slides.filter(Boolean).length;

    if (loading) {
        return (
            <div className="fixed left-1/2 -translate-x-1/2 w-full flex-1 flex items-center justify-center min-h-[50vh]">
                <p className="text-gray-600 font-medium">Loading…</p>
            </div>
        );
    }

    if (error && validCount === 0) {
        return (
            <div className="fixed left-1/2 -translate-x-1/2 w-full flex-1 flex items-center justify-center min-h-[50vh]">
                <p className="text-red-600 font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="fixed left-1/2 -translate-x-1/2 w-full h-dvh min-h-0 flex flex-col">
            <div
                ref={scrollerRef}
                className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory ${styles.scroller}`}
            >
                {slides.map((chart, i) => (
                    <section
                        key={displayedCharts[i] ?? i}
                        ref={node => {
                            sectionRefs.current[i] = node;
                        }}
                        className="relative h-dvh snap-start snap-always flex flex-col items-center justify-center px-6 sm:px-10 py-10"
                    >
                        <div className="relative z-10 w-[88vw] max-w-xl">
                            {chart ? (
                                <ChartCard chart={chart} variant="hero" />
                            ) : (
                                <div className="border border-white/20 bg-black/30 text-white/80 px-6 py-12 text-center font-medium rounded-sm">
                                    Chart unavailable.
                                </div>
                            )}
                        </div>
                    </section>
                ))}
            </div>

            {/* Navigation indicators */}
            <button
                type="button"
                onClick={() => goToIndex(prevIndex)}
                disabled={prevIndex === null}
                aria-label="Previous chart"
                style={{ opacity: prevIndex === null ? 0 : undefined }}
                className={[
                    styles.navTop,
                    'fixed left-1/2 -translate-x-1/2 top-0 z-30 h-28 w-[110vw]',
                    'flex flex-col items-center justify-start pt-4 border-0',
                    prevIndex === null ? 'pointer-events-none' : 'pointer-events-auto',
                ].join(' ')}
            >
                <span
                    className={[
                        styles.arrow,
                        styles.arrowFloatUp,
                        'text-white/90 text-3xl font-light leading-none mt-1',
                    ].join(' ')}
                    aria-hidden
                >
                    ↑
                </span>
            </button>

            <button
                type="button"
                onClick={() => goToIndex(nextIndex)}
                disabled={nextIndex === null}
                aria-label="Next chart"
                style={{ opacity: nextIndex === null ? 0 : undefined }}
                className={[
                    styles.navBottom,
                    'fixed left-1/2 -translate-x-1/2 bottom-0 z-30 h-28 w-[110vw]',
                    'flex flex-col items-center justify-end pb-4 border-0',
                    nextIndex === null ? 'pointer-events-none' : 'pointer-events-auto',
                ].join(' ')}
            >
                <span
                    className={[
                        styles.arrow,
                        styles.arrowFloatDown,
                        'text-white/90 text-3xl font-light leading-none mb-1',
                    ].join(' ')}
                    aria-hidden
                >
                    ↓
                </span>
            </button>
        </div>
    );
}