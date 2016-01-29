import React from 'react';

export default function Filters({ filter, categories, onChange }) {
  return (
    <div className="filters">
      <input type="search" placeholder="Search products" value={filter.query} onChange={(e) => onChange({ query: e.target.value })} />
      <select value={filter.category} onChange={(e) => onChange({ category: e.target.value })}>
        <option value="all">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={filter.sort} onChange={(e) => onChange({ sort: e.target.value })}>
        <option value="featured">Featured</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="name">Name</option>
      </select>
      <label>
        <input type="checkbox" checked={filter.inStockOnly} onChange={(e) => onChange({ inStockOnly: e.target.checked })} /> In stock
      </label>
    </div>
  );
}
