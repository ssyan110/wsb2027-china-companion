/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Phrasebook from '../Phrasebook';

const mockGetDb = vi.fn();
vi.mock('../../lib/db', () => ({
  getDb: () => mockGetDb(),
}));

function makeDb(cachedPhrases: unknown[] = []) {
  return {
    getAll: vi.fn().mockResolvedValue(cachedPhrases),
    transaction: vi.fn().mockReturnValue({
      store: { put: vi.fn().mockResolvedValue(undefined) },
      done: Promise.resolve(),
    }),
  };
}

describe('Phrasebook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue(makeDb());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all six category headers', async () => {
    render(<Phrasebook />);

    await waitFor(() => {
      expect(screen.getByText('Greetings')).toBeTruthy();
    });
    expect(screen.getByText('Directions')).toBeTruthy();
    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.getByText('Emergency')).toBeTruthy();
    expect(screen.getByText('Shopping')).toBeTruthy();
    expect(screen.getByText('Transportation')).toBeTruthy();
  });

  it('expands a category to show phrases with English, Chinese, and Pinyin', async () => {
    render(<Phrasebook />);

    await waitFor(() => {
      expect(screen.getByText('Greetings')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Greetings'));

    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByText('你好')).toBeTruthy();
    expect(screen.getByText('Nǐ hǎo')).toBeTruthy();
  });

  it('has speak buttons with proper ARIA labels', async () => {
    render(<Phrasebook />);

    await waitFor(() => {
      expect(screen.getByText('Greetings')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Greetings'));

    const speakBtn = screen.getByLabelText('Speak Hello in Chinese');
    expect(speakBtn).toBeTruthy();
  });
});
