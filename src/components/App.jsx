import React from 'react';
import Filters from './Filters';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';

/**
 * Controller-view: the only component that listens to stores. It reads state and passes it down
 * as props, so every child is a plain function of its props.
 */
export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.readStores();
    this.onChange = () => this.setState(this.readStores());
  }

  readStores() {
    const { productStore, cartStore } = this.props;
    return {
      products: productStore.getState(),
      visible: productStore.visible(),
      categories: productStore.categories(),
      cart: cartStore.getState(),
      summary: cartStore.summary()
    };
  }

  componentDidMount() {
    this.unsubscribe = [this.props.productStore.addChangeListener(this.onChange), this.props.cartStore.addChangeListener(this.onChange)];
  }

  componentWillUnmount() {
    this.unsubscribe.forEach((off) => off());
  }

  render() {
    const { actions } = this.props;
    const { products, visible, categories, cart, summary } = this.state;
    return (
      <div className="app">
        <header className="topbar">
          <h1>FluxStore</h1>
          <span className="cart-count">Cart · {summary.count}</span>
        </header>
        <div className="layout">
          <main>
            <Filters filter={products.filter} categories={categories} onChange={actions.setFilter} />
            {products.loading && <p className="muted">Loading products…</p>}
            {products.error && <p className="error">Couldn't load products: {products.error}</p>}
            <ProductGrid products={visible} cartLines={cart.lines} onAdd={actions.addToCart} />
          </main>
          <CartPanel cart={cart} summary={summary} actions={actions} />
        </div>
      </div>
    );
  }
}
