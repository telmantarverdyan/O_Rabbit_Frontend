import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders SUCCEEDED status with correct text and indicator', () => {
    render(<StatusBadge status="SUCCEEDED" />);
    const badge = screen.getByText('SUCCEEDED');
    expect(badge).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders RUNNING status with pulse animation indicator', () => {
    const { container } = render(<StatusBadge status="RUNNING" />);
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
    expect(screen.getByText('●')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('renders FAILED status with failure indicator and rose styling', () => {
    const { container } = render(<StatusBadge status="FAILED" />);
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('✖')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('text-rose-300');
  });

  it('renders PENDING status with amber styling', () => {
    const { container } = render(<StatusBadge status="PENDING" />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('▲')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('text-amber-300');
  });

  it('normalizes lowercase status values to uppercase', () => {
    render(<StatusBadge status="healthy" />);
    expect(screen.getByText('HEALTHY')).toBeInTheDocument();
  });

  it('applies custom size classes correctly', () => {
    const { container: smContainer } = render(<StatusBadge status="ACTIVE" size="sm" />);
    expect(smContainer.firstChild).toHaveClass('text-[10px]');

    const { container: lgContainer } = render(<StatusBadge status="ACTIVE" size="lg" />);
    expect(lgContainer.firstChild).toHaveClass('px-3');
  });
});
