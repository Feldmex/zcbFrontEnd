import React, { Component } from 'react';
import './css/master.css';
import Web3 from 'web3';
import zcbCapitalHandlerAbi from '../abi/capitalHandler.js';
import aaveWrapperAbi from '../abi/aaveWrapper.js';
import IERC20Abi from '../abi/IERC20.js';
import ZcbProduct from './ZcbProduct.js';
import Form from './Form.js';

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
];

var BN;

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

const _10To18 = '1'+stringMul('0', 18);

function getAmountFromAdjustedString(str, decimals) {
	str = str+"";
	var halves = str.split('.');
	if (halves.length > 2) throw new Error('invalid string');
	var ret;
	if (halves.length === 1) ret = halves[0]+stringMul('0', decimals);
	else if (halves[1].length <= decimals) ret = halves[0]+halves[1]+stringMul('0', decimals-halves[1].length);
	else ret = halves[0]+halves[1].substring(0, decimals);
	var counter = 0;
	for(;counter<ret.length&&ret[counter]==='0';counter++){}
	ret = ret.substring(counter);
	return ret === "" ? "0" : ret;
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

	constructor(props) {
		super(props);
		this.state = {
			zcbCapitalHandlerAddress: window.location.href.split('/')[window.location.href.split('/').length -1],
			formIndex: 0,
			label: '',
			engaged: false,
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
		var contract = new window.web3.eth.Contract(zcbCapitalHandlerAbi, this.state.zcbCapitalHandlerAddress);
		var symbol, maturity, decimals, balanceOf, balanceBond, balanceYield, aaveWrapperContract,
			balanceWrapped, balanceAToken, approvalWrapped, approvalDeposit, inPayoutPhase, maturityTimestamp;
		[
			symbol,
			maturity,
			decimals,
			balanceOf,
			balanceBond,
			balanceYield,
			aaveWrapperContract,
			inPayoutPhase
		] = await Promise.all([
			contract.methods.symbol().call().then(res => res.substring(0, res.length-3)),
			contract.methods.maturity().call().then(res => {maturityTimestamp = res; return getDateFormat(parseInt(res))}),
			contract.methods.decimals().call().then(res => parseInt(res)),
			contract.methods.balanceOf(window.web3.eth.defaultAccount).call(),
			contract.methods.balanceBonds(window.web3.eth.defaultAccount).call(),
			contract.methods.balanceYield(window.web3.eth.defaultAccount).call(),
			contract.methods.aw().call().then(addr => new window.web3.eth.Contract(aaveWrapperAbi, addr)),
			contract.methods.inPayoutPhase().call()
		]);

		var aTokenAddress, conversionRate;

		[
			balanceWrapped,
			balanceAToken,
			approvalDeposit,
			conversionRate
		] = await Promise.all([
			aaveWrapperContract.methods.balanceOf(window.web3.eth.defaultAccount).call(),
			aaveWrapperContract.methods.aToken().call()
				.then(res => {
					aTokenAddress = res;
					return (new window.web3.eth.Contract(IERC20Abi, res)).methods.balanceOf(window.web3.eth.defaultAccount).call();
				}).then(res => getBalanceString(res, decimals)),
			aaveWrapperContract.methods.allowance(window.web3.eth.defaultAccount, contract._address).call(),
			(inPayoutPhase ? contract.methods.maturityConversionRate().call(): aaveWrapperContract.methods.WrappedTokenToAToken(_10To18).call())
				.then(res => new BN(res))
		]);

		console.log(aTokenAddress, maturityTimestamp);

		approvalWrapped = await (new window.web3.eth.Contract(IERC20Abi, aTokenAddress))
			.methods.allowance(window.web3.eth.defaultAccount, aaveWrapperContract._address).call()
			.then(res => getBalanceString(res, decimals));

		//convert to aToken equivalent
		approvalDeposit = (new BN(approvalDeposit)).mul(conversionRate).div(new BN(_10To18));
		balanceWrapped = (new BN(balanceWrapped)).mul(conversionRate).div(new BN(_10To18));
		balanceYield = (new BN(balanceYield)).mul(conversionRate).div(new BN(_10To18));

		var collateralLocked = new BN(balanceBond[0] === "-" ? balanceBond.substring(1) : "0");
		var collateralFree = balanceYield.sub(collateralLocked);

		approvalDeposit = getBalanceString(approvalDeposit, decimals);
		balanceOf = getBalanceString(balanceOf, decimals);
		balanceWrapped = getBalanceString(balanceWrapped, decimals);
		balanceBond = getBalanceString(balanceBond, decimals);
		balanceYield = getBalanceString(balanceYield, decimals);
		collateralLocked = getBalanceString(collateralLocked, decimals);
		collateralFree = getBalanceString(collateralFree, decimals);

		var capitalHandler = 
			<ZcbProduct 
				key={contract._address}
				address={contract._address}
				symbol={symbol}
				maturity={maturity}
				balanceOf={balanceOf}
				balanceBond={balanceBond}
				balanceYield={balanceYield}
				balanceWrapped={balanceWrapped}
				balanceAToken={balanceAToken}
				approvalWrapped={approvalWrapped}
				approvalDeposit={approvalDeposit}
				balanceLocked={collateralLocked}
				balanceFree={collateralFree}
			/>;

		this.setState({
			jsxCapitalHandler: capitalHandler,
			set: true,
			decimals,
			symbol,
			maturity: maturityTimestamp,
			contract,
			aaveWrapperContract,
			balanceBond,
			collateralLocked,
			collateralFree,
			aTokenAddress,
			conversionRate,
			aTokenContract: new window.web3.eth.Contract(IERC20Abi, aTokenAddress)
		});
	}
	
	clickWrap = () => {
		this.setState({
			formIndex: 1,
			label: 'Amount to Wrap'
		});
	}

	clickUnWrap = () => {
		this.setState({
			formIndex: 2,
			label: 'Amount to Unwrap'
		});
	}

	clickDeposit = () => {
		this.setState({
			formIndex: 3,
			label: 'Amount to Deposit'
		});
	}

	clickApproveWrap = () => {
		this.setState({
			formIndex: 4,
			label: `Amount ${this.state.symbol} to Approve to be Wrapped`
		});
	}

	clickApproveDeposit = () => {
		this.setState({
			formIndex: 5,
			label: `Amount of Wrapped ${this.state.symbol} to Approve to Deposit`
		});
	}

	clickWithdraw = () => {
		this.setState({
			formIndex: 6,
			label: `Amount of Wrapped ${this.state.symbol} to Withdraw`
		});
	}

	clickFind1 = () => {
		this.setState({
			formIndex: 7,
			label: `Price of ${this.state.symbol}zcb/${this.state.symbol}`
		});
	}

	clickFind2 = () => {
		this.setState({
			formIndex: 8,
			label: `Annualized Yield (in %)`
		});
	}

	async wrap(amount) {
		const {aTokenContract, aaveWrapperContract, decimals, symbol} = this.state;
		var totalSupply = await aaveWrapperContract.methods.totalSupply().call();
		var bal = new BN(await aTokenContract.methods.balanceOf(window.web3.eth.defaultAccount).call());
		var approved = new BN(await aTokenContract.methods.allowance(window.web3.eth.defaultAccount, aaveWrapperContract._address).call());
		if (amount === "MAX")
			amount = (bal.cmp(approved) === 1? approved : bal).toString();
		else {
			if (bal.cmp(new BN(amount)) === -1) {
				alert(`Your balance is too low, try to wrap a smaller amount of ${symbol}.`);
				return;
			}
			if (approved.cmp(new BN(amount)) === -1) {
				alert(`Please approve at least ${getBalanceString(amount, decimals)} ${symbol} to be wrapped`);
				return;
			}
		}
		if (amount === "0") {
			alert(`Please deposit a non 0 amount`);
			return;
		}
		if (totalSupply === "0")
			await aaveWrapperContract.methods.firstDeposit(window.web3.eth.defaultAccount, amount).send({from: window.web3.eth.defaultAccount});
		else
			await aaveWrapperContract.methods.deposit(window.web3.eth.defaultAccount, amount).send({from: window.web3.eth.defaultAccount});
	}

	async unWrap(amount) {
		const {aaveWrapperContract, symbol, conversionRate} = this.state;
		var bal = new BN(await aaveWrapperContract.methods.balanceOf(window.web3.eth.defaultAccount).call());
		if (amount === "MAX")
			amount = bal.toString();
		else {
			amount = (new BN(amount)).mul(new BN(_10To18)).div(conversionRate).toString();
			if (bal.cmp(new BN(amount)) === -1) {
				alert(`Your balance is too low, try to unwrap a smaller amount of wrapped ${symbol}.`);
				return;
			}
		}
		await aaveWrapperContract.methods.withdrawWrappedToken(window.web3.eth.defaultAccount, amount).send({from: window.web3.eth.defaultAccount});
	}

	async deposit(amount) {
		const {contract, aaveWrapperContract, symbol, decimals, conversionRate} = this.state;
		var bal = new BN(await aaveWrapperContract.methods.balanceOf(window.web3.eth.defaultAccount).call());
		var approved = new BN(await aaveWrapperContract.methods.allowance(window.web3.eth.defaultAccount, contract._address).call());
		if (amount === "MAX")
			amount = (bal.cmp(approved) === 1? approved : bal).toString();
		else {
			amount = (new BN(amount)).mul(new BN(_10To18)).div(conversionRate).toString();
			if (bal.cmp(new BN(amount)) === -1) {
				alert(`Your balance is too low, try to deposit a smaller amount of wrapped ${symbol}.`);
				return;
			}
			if (approved.cmp(new BN(amount)) === -1) {
				alert(`Please approve at least ${getBalanceString(amount, decimals)} wrapped ${symbol} to be deposited`);
				return;
			}
		}
		await contract.methods.depositWrappedToken(window.web3.eth.defaultAccount, amount).send({from: window.web3.eth.defaultAccount});
	}

	async approveToWrap(amount) {
		const {aaveWrapperContract, aTokenContract} = this.state;
		if (amount === "MAX")
			amount = (new BN(_10To18)).pow(new BN(2)).toString();
		await aTokenContract.methods.approve(aaveWrapperContract._address, amount).send({from: window.web3.eth.defaultAccount});
	}

	async approveToDeposit(amount) {
		const {contract, aaveWrapperContract, conversionRate} = this.state;
		if (amount === "MAX")
			amount = (new BN(_10To18)).pow(new BN(2)).toString();
		else
			amount = (new BN(amount)).mul(new BN(_10To18)).div(conversionRate).toString();
		await aaveWrapperContract.methods.approve(contract._address, amount).send({from: window.web3.eth.defaultAccount});
	}

	async withdraw(amount) {
		const {contract, aaveWrapperContract, collateralFree, decimals} = this.state;
		console.log(amount);
		if (amount === "MAX") {
			await contract.methods.withdrawAll(window.web3.eth.defaultAccount, false).send({from: window.web3.eth.defaultAccount});
			return;
		}
		amount = await aaveWrapperContract.methods.ATokenToWrappedToken(amount).call();
		if ((new BN(getAmountFromAdjustedString(collateralFree, decimals))).cmp(new BN(amount)) === -1) {
			alert(`You don't have enough non-utilised collateral, try to withdraw a smaller amount`);
			return;
		}
		await contract.methods.withdraw(window.web3.eth.defaultAccount, amount, false).send({from: window.web3.eth.defaultAccount});
	}

	async findYield(price) {
		if (price === "MAX") price = "0";
		const {symbol, maturity} = this.state;
		var priceString = price;
		price = parseFloat(price);
		if (price <= 0) {
			alert('Price Must Be Positive and Non Zero');
			return;
		}
		const secondsPerYear = 31556925.216;
		var years = (parseInt(maturity) - ((new Date()).getTime()/1000))/secondsPerYear;
		// 1.0 == price*(1+(annualizedPctYield)/100)**years
		// price**-1 == (1+(annualizedPctYield)/100)**years
		// (price**-1)**(1/years) == 1+(annualizedPctYield)/100)
		// ((price**(-1/years))-1)*100 == annualizedPctYield
		var annualizedPctYield = 100*((price**(-1/years))-1);
		alert(`With a Price of ${priceString} the Annualized Yield of ${symbol}zcb is ${annualizedPctYield.toPrecision(6)}%`);
	}

	async findPrice(_yield) {
		if (_yield === "MAX") _yield = "0";
		const {symbol, maturity} = this.state;
		var yieldString = _yield;
		_yield = parseFloat(_yield);
		const secondsPerYear = 31556925.216;
		var years = (parseInt(maturity) - ((new Date()).getTime()/1000))/secondsPerYear;
		// 1.0 == price*(1+(annualizedPctYield)/100)**years
		// price == (1+(annualizedPctYield)/100)**(-years)
		var price = (1+(_yield)/100)**(-years);
		alert(`With an Annualized Yield of ${yieldString}% the Price of ${symbol}zcb is ${price.toPrecision(6)} ${symbol}`);
	}

	claim = async () => {
		await (new Promise((res, rej) => this.setState({engaged: true}, res)));
		const {contract} = this.state;
		try {
			await contract.methods.claimBondPayout(window.web3.eth.defaultAccount).send({from: window.web3.eth.defaultAccount});

		} catch (err) {console.error(err);alert('Transaction Failed');}
		this.setState({set: false, engaged: false});
	}


	onFormSubmit = async (param) => {
		var {formIndex, decimals, engaged} = this.state;
		if (engaged) return;
		await (new Promise((res, rej) => this.setState({engaged: true}, res)));
		try {
			if (formIndex < 7 && param !== "MAX")
				param = getAmountFromAdjustedString(param, decimals);
			switch(formIndex) {
				case 1:
					await this.wrap(param);
					break;
				case 2:
					await this.unWrap(param);
					break;
				case 3:
					await this.deposit(param);
					break;
				case 4:
					await this.approveToWrap(param);
					break;
				case 5:
					await this.approveToDeposit(param);
					break;
				case 6:
					await this.withdraw(param);
					break;
				case 7:
					await this.findYield(param);
					break;
				case 8:
					await this.findPrice(param);
					break;
				default:
					alert('please select one of the options before submitting your transaction');
					break;
			}
		} catch (err) {console.error(err);alert('Transaction Failed');}
		this.setState({set: false, engaged: false});
	}

	render() {
		if (!this.state.set)
			this.fetchState();
		const {maturity} = this.state;

		let swapUrl0 = `https://app.uniswap.org/#/swap?inputCurrency=${this.state.zcbCapitalHandlerAddress}&outputCurrency=${this.state.aTokenAddress}`;
		let swapUrl1 = `https://app.uniswap.org/#/swap?inputCurrency=${this.state.aTokenAddress}&outputCurrency=${this.state.zcbCapitalHandlerAddress}`;
		let addLiquidityUrl = `https://app.uniswap.org/#/add/${this.state.aTokenAddress}/${this.state.zcbCapitalHandlerAddress}`;
		let removeLiquidityUrl = `https://app.uniswap.org/#/remove/${this.state.aTokenAddress}/${this.state.zcbCapitalHandlerAddress}`;
		let buttons = <div></div>;

		if (maturity > parseInt((new Date()).getTime()/1000))
			buttons = 
				<div>
					<button onClick={this.clickFind1}>Find Annualized Yield From Price</button>
					<button onClick={this.clickFind2}>Find Price From Annualized Yield</button>
					<br /><br />
					<button onClick={this.clickWrap}>Wrap {this.state.symbol}</button>
					<button onClick={this.clickUnWrap}>Unwrap {this.state.symbol}</button>
					<button onClick={this.clickDeposit}>Deposit Wrapped {this.state.symbol} as Collateral</button>
					<button onClick={this.clickWithdraw}>Withdraw Funds {this.state.withdraw}</button>
					<br /><br />
					<button onClick={this.clickApproveWrap}>Approve to Wrap {this.state.symbol}</button>
					<button onClick={this.clickApproveDeposit}>Approve to Deposit Wrapped {this.state.symbol}</button>
					<br /><br />
					<a target="_blank" rel="noopener noreferrer" href={swapUrl0}>
						<button>Sell Bonds Against Your Collateral</button>
					</a>
					<a target="_blank" rel="noopener noreferrer" href={swapUrl1}>
						<button>Buy Bonds</button>
					</a>
					<br /><br />
					<a target="_blank" rel="noopener noreferrer" href={addLiquidityUrl}>
						<button>Add Liquidity to Uniswap</button>
					</a>
					<a target="_blank" rel="noopener noreferrer" href={removeLiquidityUrl}>
						<button>Remove Liquidity From Uniswap</button>
					</a>
					
				</div>;
		else if (maturity < parseInt((new Date()).getTime()/1000))
			buttons =
				<div>
					<h1 className="subHeader">This Bond has matured</h1>
					<button onClick={this.claim}>Claim Payout</button>
					<br /><br />
					<a target="_blank" rel="noopener noreferrer" href={removeLiquidityUrl}>
						<button>Remove Liquidity From Uniswap</button>
					</a>
				</div>;

		return (
			<div className="content">
				<h1 className="header">Rate Exposure With Zero Coupon Bonds for Ethereum Assets</h1>
				{this.state.jsxCapitalHandler}
				<br />
				{buttons}
				<Form label={this.state.label} onSubmit={this.onFormSubmit}/>
				<br />
			</div>);
	}
}

export default Home;