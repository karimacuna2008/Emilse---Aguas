// src/lib/catalog.test.js
import { describe, it, expect } from 'vitest'
import { uniqueCategories, filterProducts } from './catalog'

const products = [
  { id: '1', name: 'Garrafón 20L',  category: 'Garrafones' },
  { id: '2', name: 'Agua 5L',       category: 'Botellas' },
  { id: '3', name: 'Botella 1L',    category: 'Botellas' },
  { id: '4', name: 'Hielo',         category: null },
]

describe('uniqueCategories', () => {
  it('returns sorted unique non-empty categories', () => {
    expect(uniqueCategories(products)).toEqual(['Botellas', 'Garrafones'])
  })
  it('handles empty/undefined input', () => {
    expect(uniqueCategories([])).toEqual([])
    expect(uniqueCategories(undefined)).toEqual([])
  })
})

describe('filterProducts', () => {
  it('sorts alphabetically by name by default', () => {
    expect(filterProducts(products, {}).map(p => p.name))
      .toEqual(['Agua 5L', 'Botella 1L', 'Garrafón 20L', 'Hielo'])
  })
  it('filters by case-insensitive name substring', () => {
    expect(filterProducts(products, { query: 'agua' }).map(p => p.id)).toEqual(['2'])
  })
  it('filters by category', () => {
    expect(filterProducts(products, { category: 'Botellas' }).map(p => p.id)).toEqual(['2', '3'])
  })
  it('combines category + query', () => {
    expect(filterProducts(products, { category: 'Botellas', query: 'botella' }).map(p => p.id)).toEqual(['3'])
  })
})
