import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDataTableState } from './useDataTableState';

describe('useDataTableState', () => {
  it('resets pagination when search changes', () => {
    const { result } = renderHook(() => useDataTableState({ initialSortField: 'name' }));

    act(() => result.current.setCurrentPage(4));
    act(() => result.current.setSearchTerm('maria'));

    expect(result.current.searchTerm).toBe('maria');
    expect(result.current.currentPage).toBe(1);
  });

  it('toggles a selected sort field and resets direction for a new field', () => {
    const { result } = renderHook(() => useDataTableState({ initialSortField: 'grade', initialSortOrder: 'asc' }));

    act(() => result.current.handleSort('grade'));
    expect(result.current.sortOrder).toBe('desc');

    act(() => result.current.handleSort('name'));
    expect(result.current.sortField).toBe('name');
    expect(result.current.sortOrder).toBe('asc');
  });
});
