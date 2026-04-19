/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ToolkitHub from '../ToolkitHub';

function renderToolkitHub() {
  return render(
    <MemoryRouter>
      <ToolkitHub />
    </MemoryRouter>,
  );
}

describe('ToolkitHub', () => {
  it('renders all four toolkit cards', () => {
    renderToolkitHub();
    expect(screen.getByText('Taxi Card')).toBeTruthy();
    expect(screen.getByText('Phrasebook')).toBeTruthy();
    expect(screen.getByText('Currency Converter')).toBeTruthy();
    expect(screen.getByText('Emergency Info')).toBeTruthy();
  });

  it('has proper ARIA labels on cards', () => {
    renderToolkitHub();
    expect(screen.getByLabelText(/Taxi Card/)).toBeTruthy();
    expect(screen.getByLabelText(/Phrasebook/)).toBeTruthy();
    expect(screen.getByLabelText(/Currency Converter/)).toBeTruthy();
    expect(screen.getByLabelText(/Emergency Info/)).toBeTruthy();
  });

  it('renders links to correct routes', () => {
    renderToolkitHub();
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/toolkit/taxi');
    expect(hrefs).toContain('/toolkit/phrasebook');
    expect(hrefs).toContain('/toolkit/currency');
    expect(hrefs).toContain('/toolkit/emergency');
  });
});
