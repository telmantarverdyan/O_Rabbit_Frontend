import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Activity } from 'lucide-react';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('renders title, value, and subtitle correctly', () => {
    render(
      <MetricCard
        title="Active Ingestion Runs"
        value="12"
        subtitle="3 running, 9 queued"
        icon={Activity}
      />
    );

    expect(screen.getByText('Active Ingestion Runs')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3 running, 9 queued')).toBeInTheDocument();
  });

  it('renders trend badge when trend prop is provided', () => {
    render(
      <MetricCard
        title="Throughput"
        value="48.2 MB/s"
        trend="+14.5% vs avg"
        icon={Activity}
        color="cyan"
      />
    );

    expect(screen.getByText('+14.5% vs avg')).toBeInTheDocument();
  });
});
