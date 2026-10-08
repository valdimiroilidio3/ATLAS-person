'use client';

import { MotionConfig as FramerMotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Respects the user's reduced-motion preference for every
 * framer-motion animation in the tree.
 */
export function MotionConfig({ children }: { children: ReactNode }) {
  return <FramerMotionConfig reducedMotion="user">{children}</FramerMotionConfig>;
}
