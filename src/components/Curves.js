import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import './css/master.css';
import Web3 from 'web3';
import zcbOrganizerAbi from '../abi/zcbOrganizer.js';
import zcbCapitalHandlerAbi from '../abi/capitalHandler.js';
import IERC20Abi from '../abi/IERC20.js';


function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function getUnique(array) {
	return array.filter(onlyUnique);
}

class Balances extends Component {

	constructor() {
		super();
		this.state = {
			zcbOrganizerAddress: "0x4038a6249aC11610D28E86C0350AaeCAB38391Df",
			elements: []
		};
	}

	async getWeb3() {
		return new Promise(async (resolve, reject) => {
		   	if (typeof web3 !== 'undefined') {
		    	await window.ethereum.send('eth_requestAccounts');
		    	//await window.ethereum.enable();
		        window.web3 = new Web3(window.web3.currentProvider)

		        if (window.web3.currentProvider.isMetaMask === true) {
		            window.web3.eth.getAccounts((error, accounts) => {
		                if (accounts.length === 0) {
		                    // there is no active accounts in MetaMask
		                    alert('There appear to be no active accounts in your meta mask wallet');
		                }
		                else {
		                    // It's ok
		                    window.web3.eth.accounts = accounts;
		                    window.web3.eth.defaultAccount = accounts[0];
		                }
		                resolve();
		            });
		        } else {
		            // Another web3 provider
		            alert('meta mask must be enabled for this website to function');
		            reject();
		        }
		    } else {
		        // No web 3 provider
	            alert('meta mask must be enabled for this website to function');
	            reject();
		    }
		});
	}

	async fetchState() {
		(new Promise(async (resolve, reject) => {
			await this.getWeb3();
			var zcbOrganizerContract = new window.web3.eth.Contract(zcbOrganizerAbi, this.state.zcbOrganizerAddress);
			var aTokens = getUnique(await Promise.all((await zcbOrganizerContract.methods.allCapitalHandlerInstances().call())
				.map(addr => (new window.web3.eth.Contract(zcbCapitalHandlerAbi, addr)).methods.aToken().call())));


			var elements = await Promise.all(aTokens.map(addr => 
				(new window.web3.eth.Contract(IERC20Abi, addr)).methods.symbol().call()
					.then(res => res.substring(1))
					.then(res => (
						<li key={addr}>
							<Link to={`/YieldCurve/${addr}`}>
								{res}
							</Link>
						</li>))
			));

			this.setState({
				set: true,
				elements
			}, resolve);
		}));
	}

	render() {
		if (!this.state.set)
			this.fetchState();
		const {elements} = this.state;
		return (
			<div className="content">
				<h1 className="header">Yield Curves for Ethereum Assets</h1>
				<ul className="productMenu">
					<h1>Assets:</h1>
					{elements}
				</ul>
			</div>);
	}
}

export default Balances;
