import React from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import Curves from './components/Curves';
import About from './components/About';
import TradeZcb from './components/TradeZcb';
import YieldCurve from './components/YieldCurve';

import {Route, BrowserRouter as Router} from 'react-router-dom';

function App() {
	return (
		<Router>
			<div className="App">
				<Header />
				<Route path="/" exact component={Home}/>
				<Route path="/curves" component={Curves}/>
				<Route path="/about" component={About}/>
				<Route path="/trade/zcb" component={TradeZcb}/>
				<Route path="/YieldCurve" component={YieldCurve}/>
				<Footer />
			</div>
		</Router>
	);
}

export default App;
