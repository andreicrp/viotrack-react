import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataSearchField } from './DataSearchField';
import { DataTableFrame } from './DataTableFrame';

describe('shared table controls', () => {
  it('forwards a search value and exposes a clear action', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(
      <DataSearchField
        label="Search students"
        placeholder="Find a student"
        value="Ana"
        onChange={onChange}
        onClear={onClear}
      />
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search students' }), { target: { value: 'Ana Cruz' } });
    expect(onChange).toHaveBeenCalledWith('Ana Cruz');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search students' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('provides a labeled, keyboard-focusable region for wide tables', () => {
    render(
      <DataTableFrame label="Students table" className="legacy-responsive-table">
        <table><tbody><tr><td>Ana</td></tr></tbody></table>
      </DataTableFrame>
    );

    const region = screen.getByRole('region', { name: 'Students table' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('legacy-responsive-table');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
