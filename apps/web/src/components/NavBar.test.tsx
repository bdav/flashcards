import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavBar } from './NavBar';

function renderNavBar() {
  return render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>,
  );
}

describe('NavBar', () => {
  it('renders Home link pointing to /', () => {
    renderNavBar();

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders Stats link pointing to /stats', () => {
    renderNavBar();

    const statsLink = screen.getByRole('link', { name: /stats/i });
    expect(statsLink).toHaveAttribute('href', '/stats');
  });
});
