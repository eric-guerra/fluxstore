import React from 'react';
import { money } from './format';

export default class CartPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = { code: '', email: '' };
  }

  render() {
    const { cart, summary, actions } = this.props;
    if (cart.lastOrder && !summary.items.length) {
      return (
        <aside className="cart">
          <h2>Thanks!</h2>
          <p>Order <strong>{cart.lastOrder.id}</strong> placed — {money(cart.lastOrder.total)}.</p>
        </aside>
      );
    }
    return (
      <aside className="cart">
        <h2>Your cart</h2>
        {!summary.items.length && <p className="muted">Your cart is empty.</p>}
        <ul>
          {summary.items.map(({ product, qty, lineTotal }) => (
            <li key={product.id}>
              <span className="name">{product.name}</span>
              <input type="number" min="0" max={Math.min(product.stock, 10)} value={qty}
                     onChange={(e) => actions.setQuantity(product.id, parseInt(e.target.value || '0', 10))} />
              <span className="amount">{money(lineTotal)}</span>
              <button className="link" onClick={() => actions.removeFromCart(product.id)} aria-label={`Remove ${product.name}`}>×</button>
            </li>
          ))}
        </ul>

        {summary.items.length > 0 && (
          <div>
            <form className="promo" onSubmit={(e) => { e.preventDefault(); actions.applyPromo(this.state.code); }}>
              <input placeholder="Promo code" value={this.state.code} onChange={(e) => this.setState({ code: e.target.value })} />
              <button>Apply</button>
            </form>
            {cart.promo && <p className="ok">Applied: {cart.promo.label}</p>}
            {cart.promoError && <p className="error">{cart.promoError}</p>}

            <dl className="totals">
              <dt>Subtotal</dt><dd>{money(summary.subtotal)}</dd>
              {summary.discount > 0 && [<dt key="d">Discount</dt>, <dd key="dv">−{money(summary.discount)}</dd>]}
              <dt>Shipping</dt><dd>{summary.shipping ? money(summary.shipping) : 'Free'}</dd>
              <dt>Tax</dt><dd>{money(summary.tax)}</dd>
              <dt className="grand">Total</dt><dd className="grand">{money(summary.total)}</dd>
            </dl>
            {summary.shipping > 0 && <p className="muted">Add {money(summary.freeShippingRemaining)} more for free shipping.</p>}

            <form onSubmit={(e) => { e.preventDefault(); actions.checkout(cart, { email: this.state.email }); }}>
              <input type="email" required placeholder="Email for receipt" value={this.state.email} onChange={(e) => this.setState({ email: e.target.value })} />
              <button className="primary" disabled={cart.checkingOut}>{cart.checkingOut ? 'Placing order…' : `Pay ${money(summary.total)}`}</button>
            </form>
            {cart.checkoutError && <p className="error">{cart.checkoutError}</p>}
          </div>
        )}
      </aside>
    );
  }
}
