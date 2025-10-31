'use client';
import React, { useState, useEffect } from 'react';

export function HeroSection() {
  // Symmetric pillar heights (percent). Tall at edges, low at center.
  const pillars = [
    92, 84, 78, 70, 62, 54, 46, 34, 18, 34, 46, 54, 62, 70, 78, 84, 92,
  ];

  // State to trigger animations once the component is mounted.
  // This ensures animations play on load.
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Set isMounted to true after a short delay to allow the component to render first.
    // This is a common trick to ensure CSS transitions apply on the initial render.
    const timer = setTimeout(() => setIsMounted(true), 100);
    // Cleanup the timer if the component unmounts.
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative isolate h-screen overflow-hidden bg-black text-white">
      {/* ================== BACKGROUND ================== */}
      {/* Luminous elliptical gradients to emulate the red→violet band and right cool rim */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30"
        style={{
          backgroundImage: [
            // Main central dome/band (slightly below center)
            'radial-gradient(80% 55% at 50% 52%, rgba(254,120,0,0.45) 0%, rgba(254,78,0,0.46) 27%, rgba(120,40,0,0.38) 47%, rgba(60,30,10,0.45) 60%, rgba(20,10,5,0.85) 78%, rgba(0,0,0,1) 88%)',

            // Warm sweep from top-left
            'radial-gradient(85% 60% at 14% 0%, rgba(255,180,120,0.65) 0%, rgba(254,100,0,0.58) 30%, rgba(48,24,0,0.0) 64%)',

            // Warm rim on top-right (replacing blue tint with orange glow)
            'radial-gradient(70% 50% at 86% 22%, rgba(255,120,60,0.40) 0%, rgba(16,8,0,0.0) 55%)',

            // Soft top vignette
            'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0) 40%)',
          ].join(','),
          backgroundColor: '#000',
        }}
      />
      {/* Vignette corners for extra contrast */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(140%_120%_at_50%_0%,transparent_60%,rgba(0,0,0,0.85))]"
      />

      {/* Grid overlay: vertical columns + subtle curved horizontal arcs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 mix-blend-screen opacity-30"
        style={{
          backgroundImage: [
            // Vertical grid lines (major & minor)
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0 1px, transparent 1px 96px)',
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 24px)',
            // Curved horizontal arcs via repeating elliptical radial gradient
            'repeating-radial-gradient(80% 55% at 50% 52%, rgba(255,255,255,0.08) 0 1px, transparent 1px 120px)',
          ].join(','),
          backgroundBlendMode: 'screen',
        }}
      />

      {/* ================== NAV ================== */}
      {/* <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-8">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-white" />
            <span className="text-lg font-semibold tracking-tight">MoraAI</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm/6 text-white/80 md:flex">
            {[
              'Product',
              'Docs',
              'Customers',
              'Resources',
              'Partners',
              'Pricing',
            ].map((i) => (
              <a key={i} className="hover:text-white" href="#">
                {i}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button className="rounded-full px-4 py-2 text-sm text-white/80 hover:text-white">
              Sign in
            </button>
            <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-white/90">
              Request Demo
            </button>
          </div>

          <button className="md:hidden rounded-full bg-white/10 px-3 py-2 text-sm">
            Menu
          </button>
        </div>
      </header> */}

      {/* ================== COPY ================== */}
      <div className="relative z-10 mx-auto grid w-full max-w-5xl place-items-center px-6 py-16 md:py-24 lg:py-28">
        {/* We set opacity to 0 and apply the animation class to trigger the fade-in effect */}
        <div
          className={`mx-auto text-center ${
            isMounted ? 'animate-fadeInUp' : 'opacity-0'
          }`}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wider text-white/70 ring-1 ring-white/10 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" /> Hedera
            DeFi
          </span>
          {/* Stagger animations with inline animation-delay */}
          <h1
            style={{ animationDelay: '200ms' }}
            className={`mt-6 text-4xl font-bold tracking-tight md:text-6xl ${
              isMounted ? 'animate-fadeInUp' : 'opacity-0'
            }`}
          >
            Decentralized Lending on Hedera
          </h1>
          <p
            style={{ animationDelay: '300ms' }}
            className={`mx-auto mt-5 max-w-2xl text-balance text-white/80 md:text-lg ${
              isMounted ? 'animate-fadeInUp' : 'opacity-0'
            }`}
          >
            Supply assets to earn interest, borrow against collateral, and
            benefit from dual yield through DeFi + Hedera node staking rewards.
            Low fees, fast finality, and transparent operations.
          </p>
          <div
            style={{ animationDelay: '400ms' }}
            className={`mt-8 flex flex-col items-center justify-center ${
              isMounted ? 'animate-fadeInUp' : 'opacity-0'
            }`}
          >
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-black shadow-lg transition hover:bg-white/90 hover:scale-105"
            >
              Launch App
            </a>
          </div>
        </div>
      </div>

      {/* ================== PARTNERS ================== */}
      {/* <div className="relative z-10 mx-auto mt-10 w-full max-w-6xl px-6 pb-24">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-70">
          {[
            'git',
            'npm',
            'Lucidchart',
            'wrike',
            'jquery',
            'openstack',
            'servicenow',
            'Paysafe',
          ].map((brand) => (
            <div
              key={brand}
              className="text-xs uppercase tracking-wider text-white/70"
            >
              {brand}
            </div>
          ))}
        </div>
      </div> */}

      {/* ================== FOREGROUND ================== */}
      {/* Center-bottom rectangular glow with pulse animation */}
      {/* <div
        className="pointer-events-none absolute bottom-[128px] left-1/2 z-0 h-36 w-28 -translate-x-1/2 rounded-md bg-gradient-to-b from-white/75 via-rose-100/60 to-transparent"
        style={{ animation: 'subtlePulse 6s ease-in-out infinite' }}
      /> */}

      {/* Stepped pillars silhouette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[54vh]">
        {/* dark fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
        {/* bars */}
        <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-px px-[2px]">
          {pillars.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-black transition-height duration-1000 ease-in-out"
              style={{
                // Animate height from 0% to its target value when isMounted is true.
                height: isMounted ? `${h}%` : '0%',
                // Stagger the animation delay to create a wave effect from the center out.
                transitionDelay: `${
                  Math.abs(i - Math.floor(pillars.length / 2)) * 60
                }ms`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
