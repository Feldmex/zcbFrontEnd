import React, {Component} from 'react';
import './css/Form.css';

class Form extends Component {

	constructor(props) {
		super(props);
		this.state = {
			value: '',
			prevValue: '',
			label: props.label,
			onSubmit: props.onSubmit
		};
	}

	onChangeOnlyNum = (event) => {
		let val = event.target.value;
		if (isNaN(val) || val.includes(' ')) {
			event.target.value = this.state.prevValue;
		} else {
			this.setState({
				value: val,
				prevValue: val
			});
		}
	}

	static getDerivedStateFromProps(props, state) {
		return {
			label: props.label,
			onSubmit: props.onSubmit
		};
	}

	handleSubmit = async (event) => {
		this.state.onSubmit(this.state.value);
		event.preventDefault();
	}

	clearInputField = () => {
		this.setState({
			value: '',
			prevValue: ''
		});
	}

	render() {
		if (this.state.label === "") return <div></div>;
		return (
			<div>
				<form onSubmit={this.handleSubmit}>
					<label>{this.state.label}</label>
					<input type="text" onChange={this.onChangeOnlyNum} value={this.state.value}/>
					<button type="submit">Send Transaction</button>
					<button type="button" onClick={this.clearInputField}>Clear Input Field</button>
				</form>
			</div>);
	}
}

export default Form;