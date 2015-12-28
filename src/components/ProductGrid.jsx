import React from 'react';
import { money } from './format';

function ProductCard({ product, inCart, onAdd }) {
  const soldOut = product.stock <= 0;
  const maxed = inCart >= Math.min(product.stock, 10);
  return (
    <article className={'card' + (soldOut ? ' sold-out' : '')}>
      <div className="swatch" style={{ background: product.color }} />
      {product.featured && <span className="badge">Featured</span>}
      <h3>{product.name}</h3>
      <p className="muted">{product.description}</p>
      <div className="row">
        <strong>{money(product.price)}</strong>
        <button disabled={soldOut || maxed} onClick={() => onAdd(product.id)}>
          {soldOut ? 'Sold out' : maxed ? 'Max in cart' : inCart ? `Add another (${inCart})` : 'Add to cart'}
        </button>
      </div>
      {!soldOut && product.stock <= 3 && <p className="warn">Only {product.stock} left</p>}
    </article>
  );
}

export default function ProductGrid({ products, cartLines, onAdd }) {
  if (!products.length) return <p className="muted">No products match your filters.</p>;
  return (
    <div className="grid">
      {products.map((p) => <ProductCard key={p.id} product={p} inCart={cartLines[p.id] || 0} onAdd={onAdd} />)}
    </div>
  );
}
