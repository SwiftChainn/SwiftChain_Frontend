// @ts-nocheck
'use client';

import { render, screen } from '@testing-library/react';
import * as hookModule from '@/hooks/useCommandPalette';
import CommandPalette from '../CommandPalette';

const mockUseCommandPalette = jest.spyOn(hookModule, 'useCommandPalette');

describe('CommandPalette', () => {
  beforeEach(() => {
    mockUseCommandPalette.mockReturnValue({
      open: true,
      setOpen: jest.fn(),
      query: '',
      setQuery: jest.fn(),
      actionItems: [
        {
          id: 'settings',
          title: 'Open settings',
          description: 'Go to app settings',
          path: '/settings',
          type: 'static',
        },
      ],
      deliverySectionItems: [],
      loading: false,
      error: null,
      inputRef: { current: null },
      onSelect: jest.fn(),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the command palette input and action items', () => {
    render(<CommandPalette />);

    expect(screen.getByPlaceholderText('Search deliveries, settings, FAQ...')).toBeInTheDocument();
    expect(screen.getByText('Open settings')).toBeInTheDocument();
  });
});
