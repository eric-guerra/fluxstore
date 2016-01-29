import React from 'react';
import ReactDOM from 'react-dom';
import Dispatcher from './flux/Dispatcher';
import ProductStore from './stores/ProductStore';
import CartStore from './stores/CartStore';
import createActions from './actions/createActions';
import api from './api';
import App from './components/App';

const dispatcher = new Dispatcher();
const productStore = new ProductStore(dispatcher);
const cartStore = new CartStore(dispatcher, productStore);
const actions = createActions(dispatcher, api);

ReactDOM.render(<App productStore={productStore} cartStore={cartStore} actions={actions} />, document.getElementById('root'));
actions.loadProducts();
