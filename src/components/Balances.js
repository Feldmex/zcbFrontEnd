import React, { Component } from 'react';
import './css/master.css';
import Web3 from 'web3';
import zcbOrganizerAbi from '../abi/zcbOrganizer.js';
import zcbCapitalHandlerAbi from '../abi/capitalHandler.js';
import aaveWrapperAbi from '../abi/aaveWrapper.js';
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

function stringMul(str, amount) {
        var ret = "";
        str += ""; //convert str to string if necessary
	for (var i = 1; i <= amount; i<<=1) {
                if ((amount&i)+"" !== '0'){
                        ret+=str;
                }
                str += str;
        }
        return ret;
}

function getBalanceString(bn, decimals) {
	if (typeof bn === 'object' || typeof bn === "number") bn = bn.toString();
	var ret;
	if (bn.length <= decimals) ret = "0."+stringMul('0', decimals-bn.length)+bn;
	else ret = bn.substring(0, bn.length-decimals)+'.'+bn.substring(bn.length-decimals);
	//remove trailing 0s
	for (var i = ret.length-1; ret[i] === '0'; ret = ret.substring(0,i), i=ret.length-1){}
	if (ret[ret.length-1]==='.')ret = ret.substring(0,ret.length-1);
	return ret;
}

class Home extends Component {

	constructor() {
		super();
		this.state = {
			zcbOrganizerAddress: "0x4038a6249aC11610D28E86C0350AaeCAB38391Df",
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
		(new Promise(async (resolve, reject) => {
			await this.getWeb3();
			var zcbOrganizerContract = new window.web3.eth.Contract(zcbOrganizerAbi, this.state.zcbOrganizerAddress);
			var capitalHandlers = await Promise.all((await zcbOrganizerContract.methods.allCapitalHandlerInstances().call())
				.map(addr => new window.web3.eth.Contract(zcbCapitalHandlerAbi, addr))
				.map(async (contract) => {
					var balYield = await contract.methods.balanceYield(window.web3.eth.defaultAccount).call();
					if (balYield !== "0"){
						var aaveWrapperContract = new window.web3.eth.Contract(aaveWrapperAbi, await contract.methods.aw().call());
						balYield = await aaveWrapperContract.methods.WrappedTokenToAToken(balYield).call();
					}
					return ({
						address: contract._address,
						symbol: (await contract.methods.symbol().call()),
						maturity: getDateFormat(parseInt(await contract.methods.maturity().call())),
						decimals: parseInt(await contract.methods.decimals().call()),
						balanceBond: await contract.methods.balanceBonds(window.web3.eth.defaultAccount).call(),
						balanceYield: balYield,
					});
				 } ));
			capitalHandlers = capitalHandlers
				.map(obj => {
					obj.symbol = obj.symbol.substring(1, obj.symbol.length-3);
					obj.balanceBond = getBalanceString(obj.balanceBond, obj.decimals);
					obj.balanceYield = getBalanceString(obj.balanceYield, obj.decimals);
					return obj;
				})
				.map(obj => 
					<ZcbProduct
						key={obj.address}
						address={obj.address}
						symbol={obj.symbol}
						maturity={obj.maturity}
						balanceBond={obj.balanceBond}
						balanceYield={obj.balanceYield}
						listItem={true}
					/>);
			this.setState({
				jsxCapitalHandlers: capitalHandlers,
				set: true
			});
			resolve();
		}));
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