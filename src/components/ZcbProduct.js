import React from 'react';
import './css/ZcbProduct.css';
import {Link} from 'react-router-dom';

function ZcbProduct(props) {
	var balances = typeof(props.balanceBond) === "undefined" ? 
		<div></div>: 
		<div>
			Your Balance {props.symbol} zero coupon bonds: {props.balanceBond} <br />
			Your Collateral in this Contract: {props.balanceYield}
		</div>;
	var extraCollateralInfo = typeof(props.balanceLocked) === "undefined" ?
		<div></div>: 
		<div>
			Your Collateral Locked in this Contract: {props.balanceLocked} <br />
			Your Collateral that may be Withdrawn: {props.balanceFree}
		</div>
	var otherBalances = typeof(props.balanceWrapped) === "undefined" ?
		<div></div>:
		<div>
			Your Balance of Wrapped {props.symbol}: {props.balanceWrapped} <br />
			Your Balance of non-Wrapped {props.symbol}: {props.balanceAToken}
		</div>
	var approvals = typeof(props.balanceWrapped) === "undefined" ?
		<div></div>:
		<div>
			Approval of {props.symbol} to be Wrapped: {props.approvalWrapped} <br />
			Approval of Wrapped {props.symbol} to be Deposited: {props.approvalDeposit}
		</div>;
	if (props.listItem)
		return (
			<li>
				<Link to={'/trade/zcb/'+props.address}>
					{props.symbol} Zero Coupon Bond, Matures on: {props.maturity}
					{balances}
					{extraCollateralInfo}
					{otherBalances}
					{approvals}
				</Link>
			</li>
		);

	else
		return (
			<div className="productDiv">
				{props.symbol} Zero Coupon Bond, Matures on: {props.maturity} <br /><br />
				{balances}
				{extraCollateralInfo}
				{otherBalances}
				{approvals}
			</div>
		);

}

export default ZcbProduct;
