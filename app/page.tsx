'use client';

// HOME / COMMAND CENTER — spec §03.

import { Hero } from '@/components/home/hero';
import { AskAtlas } from '@/components/home/ask-atlas';
import { TodaySection } from '@/components/home/today-section';
import { NextBestAction } from '@/components/home/next-best-action';
import { Momentum } from '@/components/home/momentum';
import { HomeBottom } from '@/components/home/home-bottom';

export default function HomePage() {
  return (
    <div className="space-y-10 pb-6">
      <Hero />
      <AskAtlas />
      <TodaySection />
      <NextBestAction />
      <Momentum />
      <HomeBottom />
    </div>
  );
}
