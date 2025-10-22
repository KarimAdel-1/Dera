import React from 'react';
import ContentLoader from 'react-content-loader';

export const StatCardSkeleton = () => (
  <ContentLoader
    speed={2}
    width="100%"
    height={120}
    viewBox="0 0 300 120"
    backgroundColor="var(--color-bg-tertiary)"
    foregroundColor="var(--color-bg-secondary)"
  >
    <rect x="20" y="20" rx="4" ry="4" width="60" height="12" />
    <rect x="250" y="15" rx="4" ry="4" width="24" height="24" />
    <rect x="20" y="70" rx="4" ry="4" width="120" height="24" />
  </ContentLoader>
);

export const WalletCardSkeleton = () => (
  <ContentLoader
    speed={2}
    width="100%"
    height={200}
    viewBox="0 0 800 200"
    backgroundColor="var(--color-bg-tertiary)"
    foregroundColor="var(--color-bg-secondary)"
  >
    <rect x="20" y="20" rx="16" ry="16" width="280" height="160" />
    <rect x="320" y="20" rx="4" ry="4" width="150" height="16" />
    <rect x="320" y="50" rx="4" ry="4" width="80" height="12" />
    <rect x="320" y="80" rx="4" ry="4" width="100" height="12" />
    <rect x="320" y="100" rx="4" ry="4" width="120" height="12" />
    <rect x="320" y="130" rx="4" ry="4" width="90" height="12" />
    <rect x="320" y="150" rx="4" ry="4" width="110" height="12" />
  </ContentLoader>
);

export const WalletDetailsSkeleton = () => (
  <ContentLoader
    speed={2}
    width="100%"
    height={400}
    viewBox="0 0 350 400"
    backgroundColor="var(--color-bg-tertiary)"
    foregroundColor="var(--color-bg-secondary)"
  >
    <rect x="20" y="20" rx="4" ry="4" width="120" height="16" />
    <rect x="300" y="20" rx="4" ry="4" width="20" height="20" />
    <rect x="20" y="60" rx="8" ry="8" width="310" height="80" />
    <rect x="20" y="160" rx="4" ry="4" width="80" height="12" />
    <rect x="250" y="160" rx="4" ry="4" width="80" height="12" />
    <rect x="20" y="190" rx="4" ry="4" width="80" height="12" />
    <rect x="250" y="190" rx="4" ry="4" width="80" height="12" />
    <rect x="20" y="220" rx="4" ry="4" width="80" height="12" />
    <rect x="250" y="220" rx="4" ry="4" width="80" height="12" />
    <rect x="20" y="270" rx="8" ry="8" width="310" height="36" />
    <rect x="20" y="320" rx="8" ry="8" width="310" height="36" />
  </ContentLoader>
);