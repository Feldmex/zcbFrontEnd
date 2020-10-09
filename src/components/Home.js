import React, { Component } from 'react';
import './css/master.css';
import Web3 from 'web3';
import zcbOrganizerAbi from '../abi/zcbOrganizer.js';
import zcbCapitalHandlerAbi from '../abi/capitalHandler.js';
import ZcbProduct from './ZcbProduct.js';

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
];

function getDateFormat(timestamp) { 
	var d = new Date(timestamp*1000);
	var day = d.getUTCDate();
	var month = monthNames[d.getUTCMonth()];
	var year = d.getUTCFullYear();
	return month+' '+day+', '+year;
}

class Home extends Component {

	constructor() {
		super();
		this.state = {
			zcbOrganizerAddress: "0x9b4e383192a089C8177f5E1293FC037956Cfd884",
			jsxBondElements: []
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
		await this.getWeb3();
		var zcbOrganizerContract = new window.web3.eth.Contract(zcbOrganizerAbi, this.state.zcbOrganizerAddress);
		var capitalHandlers = await Promise.all((await zcbOrganizerContract.methods.allCapitalHandlerInstances().call())
			.map(addr => new window.web3.eth.Contract(zcbCapitalHandlerAbi, addr))
			.map(async (contract) => ({
					address: contract._address,
					symbol: (await contract.methods.symbol().call()),
					maturity: getDateFormat(parseInt(await contract.methods.maturity().call()))
			})));
		capitalHandlers = capitalHandlers
			.map(obj => {obj.symbol = obj.symbol.substring(1, obj.symbol.length-3); return obj;})
			.map(obj => <ZcbProduct key={obj.address} address={obj.address} symbol={obj.symbol} maturity={obj.maturity} listItem={true}/>);
		this.setState({
			jsxCapitalHandlers: capitalHandlers,
			set: true
		});
	}

	render() {
		if (!this.state.set)
			this.fetchState();
		return (
			<div className="content">
				<h1 className="header">Rate Exposure With Zero Coupon Bonds for Ethereum Assets</h1>
				<ul className="productMenu">
					<h1>Products:</h1>
					{this.state.jsxCapitalHandlers}
				</ul>
			</div>);
	}
}

export default Home;