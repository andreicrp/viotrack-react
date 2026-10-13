import { parseCsvString } from './csvHelper';

const normalizeHeader = (value) => String(value || '')
  .replace(/^\uFEFF/, '')
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/[^\p{L}\p{N} ]/gu, '')
  .replace(/\s+/g, ' ');

export const parseEntityCsv = (text, aliases, legacyOrder = []) => {
  const rows = parseCsvString(String(text || '').replace(/^\uFEFF/, ''));
  if (rows.length === 0) return [];

  const aliasToField = new Map(
    Object.entries(aliases).flatMap(([field, names]) =>
      names.map(name => [normalizeHeader(name), field])
    )
  );
  const firstRowFields = rows[0].map(value => aliasToField.get(normalizeHeader(value)));
  const hasHeader = firstRowFields.filter(Boolean).length >= 2;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const fieldIndexes = hasHeader
    ? firstRowFields.reduce((indexes, field, index) => {
      if (field && indexes[field] === undefined) indexes[field] = index;
      return indexes;
    }, {})
    : Object.fromEntries(legacyOrder.map((field, index) => [field, index]));

  return dataRows
    .filter(row => row.some(value => value.trim()))
    .map(row => Object.entries(fieldIndexes).reduce((record, [field, index]) => {
      if (index !== undefined && row[index] !== undefined) record[field] = row[index].trim();
      return record;
    }, {}));
};
