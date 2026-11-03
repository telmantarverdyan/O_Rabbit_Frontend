import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { AuthProvider } from '../../auth/AuthContext';
import { AppLayout } from './AppLayout';

function renderLayout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/runs']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/runs" element={<span className="sr-only">Actions</span>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('AppLayout', () => {
  it('positions the page scroll area so absolute page content stays inside it', () => {
    // An absolute element (e.g. an sr-only table header label) with no positioned
    // ancestor escapes <main>'s overflow, stretches the document, and lets the whole
    // shell scroll up past the header and sidebar (TID-978).
    renderLayout();

    const main = screen.getByRole('main');

    expect(main).toHaveClass('relative');
    expect(main).toContainElement(screen.getByText('Actions'));
  });
});
