import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import './css/master.css';
import Web3 from 'web3';
import UniswapV2FactoryAbi from '../abi/UniswapV2Factory.js';
import UniswapV2PairAbi from '../abi/UniswapV2Pair.js';
import zcbOrganizerAbi from '../abi/zcbOrganizer.js';
import IERC20Abi from '../abi/IERC20.js';

const nullAddress = "0x0000000000000000000000000000000000000000";

const zcbOrganizerAddress = "0x4038a6249aC11610D28E86C0350AaeCAB38391Df";
const UniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

var BN;

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

const _10To18 = '1'+stringMul('0', 18);

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

class YieldCurve extends Component {

	constructor(props) {
		super(props);
		this.state = {
			asset: window.location.href.split('/')[window.location.href.split('/').length -1],
			gotWeb3: false
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
		                BN = window.web3.utils.BN;
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
		}).then(res => this.setState({gotWeb3: true}));
	}

	async fetchState() {
		if (!this.state.gotWeb3)
			await this.getWeb3();
		const {asset} = this.state;
		const organizerContract = new window.web3.eth.Contract(zcbOrganizerAbi, zcbOrganizerAddress);
		const factoryContract = new window.web3.eth.Contract(UniswapV2FactoryAbi, UniswapV2FactoryAddress);
		const currentYear = (new Date()).getFullYear();

		const symbol = await (new window.web3.eth.Contract(IERC20Abi, asset)).methods.symbol().call()
			.then(res => res.substring(1));

		var dates = [];
		for (let i = 1; i < 11; i++) {
			var timestamp = parseInt(Date.UTC(currentYear+i, 0, 1)/1000);
			dates.push(organizerContract.methods.capitalHandlerMapping(asset, timestamp).call());
		}
		var info = (await Promise.all(dates))
			.map((res, i) => ({address: res, yearOffset: i+1}))
			.filter(obj => obj.address !== nullAddress);
		info = await Promise.all(info.map(obj => (
			new Promise(async (resolve, reject) => {


				factoryContract.methods.getPair(asset, obj.address).call().then((res) => {
					var pairContract = (new window.web3.eth.Contract(UniswapV2PairAbi, res));

					let count = 0;
					let possibleResolve = () => {count++; if (count === 2) resolve(obj);}

					pairContract.methods.getReserves().call().then(res => {
						obj.reserves = res;
						possibleResolve();
					});

					pairContract.methods.token0().call().then(res => {
						obj.flipReserves = res === asset;
						possibleResolve();
					});

				});

			}))
		));

		info = info.map(obj => {
			if (obj.flipReserves){
				[obj.reserves._reserve0, obj.reserves._reserve1] = [obj.reserves._reserve1, obj.reserves._reserve0];
			}
			var price = (new BN(obj.reserves._reserve1)).mul(new BN(_10To18)).div(new BN(obj.reserves._reserve0)).toString();
			price = getBalanceString(price, 18);
			var year = (obj.yearOffset+currentYear)
			var maturity = parseInt(Date.UTC(year, 0, 1)/1000);
			var _yield = this.findYield(price, maturity);
			var maturityString = 'Jan 1 '+year;
			return {price, year, maturity, _yield, maturityString};
		});

		//create line chart
		const data = {
			labels: info.map(obj => obj.maturityString),
			datasets: [
				{
					label: 'Annualized Yield (%)',
					data: info.map(obj => obj._yield)
				}
			]
		};

		const chart = <Line data={data} lineTension={0}/>;

		this.setState({
			symbol,
			chart,
			organizer: organizerContract,
			set: true
		});
	}

	findYield(price, maturity) {
		price = parseFloat(price);
		const secondsPerYear = 31556925.216;
		var years = (parseInt(maturity) - ((new Date()).getTime()/1000))/secondsPerYear;
		// 1.0 == price*(1+(annualizedPctYield)/100)**years
		// price**-1 == (1+(annualizedPctYield)/100)**years
		// (price**-1)**(1/years) == 1+(annualizedPctYield)/100)
		// ((price**(-1/years))-1)*100 == annualizedPctYield
		var annualizedPctYield = 100*((price**(-1/years))-1);
		return annualizedPctYield;
	}

	render() {
		const {symbol, chart, set} = this.state;

		if (!set){
			this.fetchState();
			return (<div></div>);
		}

		return (
			<div className="content">
				<h1 className="header">{symbol} Yield Curve</h1>
				{chart}		
			</div>
			);
	}
}

export default YieldCurve;