import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('shows the status as a readable label', () => {
    render(<StatusBadge status="SUCCEEDED" />);
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });

  it('normalizes the case of the status', () => {
    render(<StatusBadge status="healthy" />);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it.each([
    ['SUCCEEDED', 'text-accent'],
    ['RUNNING', 'text-info'],
    ['PENDING', 'text-warn'],
    ['FAILED', 'text-danger'],
    ['CANCELED', 'text-fg-muted'],
  ])('uses the matching tone for %s', (status, toneClass) => {
    const { container } = render(<StatusBadge status={status} />);
    expect(container.firstChild).toHaveClass(toneClass);
  });

  it('pulses the dot only for active states, and only when motion is allowed', () => {
    const { container: running } = render(<StatusBadge status="RUNNING" />);
    expect(running.querySelector('[aria-hidden]')).toHaveClass('motion-safe:animate-pulse');

    const { container: done } = render(<StatusBadge status="SUCCEEDED" />);
    expect(done.querySelector('[aria-hidden]')).not.toHaveClass('motion-safe:animate-pulse');
  });

  it('applies size classes', () => {
    const { container: sm } = render(<StatusBadge status="ACTIVE" size="sm" />);
    expect(sm.firstChild).toHaveClass('px-2');

    const { container: lg } = render(<StatusBadge status="ACTIVE" size="lg" />);
    expect(lg.firstChild).toHaveClass('px-3', 'text-sm');
  });
});
