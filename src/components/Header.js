import React from 'react';
import './css/Header.css';
import {Link} from 'react-router-dom';

function Header() {
	return (
		<div className="navbar">
			<div className="logo">
				<Link to="/"><img src={require("../images/FeldmexCapitalMarkets.png")} alt="Feldmex Logo" /></Link>
			</div>
			<div className="links">
				<ul>
					<li><Link to="/about">About</Link></li>
					<li><Link to="/curves">Yield Curves</Link></li>
					<li><Link to="/">Home</Link></li>
				</ul>
			</div>
		</div>
		);
}

export default Header;
