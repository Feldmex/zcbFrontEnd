import React from 'react';
import './css/master.css';

function Footer() {
	return (
		<div className="footer">
			<a href="https://discord.gg/HrBM8zV" target="_blank" rel="noopener noreferrer"><img alt="Discord Logo" src={require("../images/discord.svg")} /></a>
			<a href="https://github.com/Feldmex/zeroCouponAaveBonds.git" target="_blank" rel="noopener noreferrer"><img alt="Github Logo" src={require("../images/github.png")} /></a>
		</div>
		);
}

export default Footer;