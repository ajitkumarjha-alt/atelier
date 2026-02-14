import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../src/components/ProtectedRoute';

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    renderWithRouter(
      <ProtectedRoute user={{ email: 'a@b.com' }} userLevel="L2">
        <div data-testid="protected">Secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('redirects to / when user is null', () => {
    const { container } = renderWithRouter(
      <ProtectedRoute user={null} userLevel={null}>
        <div data-testid="protected">Secret</div>
      </ProtectedRoute>
    );
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('redirects when user role not in allowed roles', () => {
    renderWithRouter(
      <ProtectedRoute user={{ email: 'a@b.com' }} userLevel="L4" roles={['SUPER_ADMIN', 'L1']}>
        <div data-testid="protected">Secret</div>
      </ProtectedRoute>
    );
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('renders when user role is in allowed roles', () => {
    renderWithRouter(
      <ProtectedRoute user={{ email: 'a@b.com' }} userLevel="L1" roles={['SUPER_ADMIN', 'L1']}>
        <div data-testid="protected">Secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('renders for any role when roles prop is omitted', () => {
    renderWithRouter(
      <ProtectedRoute user={{ email: 'a@b.com' }} userLevel="L4">
        <div data-testid="protected">Secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });
});
