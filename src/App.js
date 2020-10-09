import React from 'react';
import './App.css';
import Header from './components/Header';
import Home from './components/Home';
import Balances from './components/Balances';
import About from './components/About';
import TradeZcb from './components/TradeZcb';

import {Route, BrowserRouter as Router} from 'react-router-dom';

function App() {
	return (
		<Router>
			<div className="App">
				<Header />
				<Route path="/" exact component={Home}/>
				<Route path="/balances" component={Balances}/>
				<Route path="/about" component={About}/>
				<Route path="/trade/zcb" component={TradeZcb}/>
			</div>
		</Router>
	);
}

export default App;
