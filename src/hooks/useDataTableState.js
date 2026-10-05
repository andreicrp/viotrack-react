// @ts-check
import { useCallback, useDeferredValue, useState } from 'react';

/**
 * Shared interaction state for searchable, sortable, paginated data tables.
 * @param {{ initialSortField?: string, initialSortOrder?: 'asc'|'desc', initialPageSize?: number }} [options]
 */
export const useDataTableState = ({
  initialSortField = '',
  initialSortOrder = 'asc',
  initialPageSize = 10
} = {}) => {
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(initialSortField);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [selectedIds, setSelectedIds] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(initialPageSize);
  const deferredSearch = useDeferredValue(searchValue);

  const setSearchTerm = useCallback((value) => {
    setSearchValue(value);
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortOrder((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  }, [sortField]);

  return {
    searchTerm: searchValue,
    setSearchTerm,
    deferredSearch,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    handleSort,
    selectedIds,
    setSelectedIds,
    entriesPerPage,
    setEntriesPerPage,
    currentPage,
    setCurrentPage
  };
};
