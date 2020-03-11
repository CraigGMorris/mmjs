'use strict';

// formula operators

/**
 * @class MMFormulaOperator
 * super class for all formula operators
 */
class MMFormulaOperator {
	/**
	 * @virtual value
	 * @returns {MMValue}
	 */
	value() {
		return null;
	}

	/**
	 * @virtual precedence
	 * @returns {Number}
	 */
	precedence() {
		return 0;
	}

	/**
	 * @virtual addInputSourcesToSet
	 * @param {Set} sources
	 */
	addInputSourcesToSet(sources) {}
}

var MMFormulaOpDictionary = {
	'+': () => {return new MMAddOperator()},
	'-': () => {return new MMSubtractOperator()},
	'*': () => {return new MMMultiplyOperator()},
	'/': () => {return new MMDivideOperator()},
	'%': () => {return new MMModOperator()},
	'^': () => {return new MMPowerOperator()},
	':': (f) => {return new MMRangeOperator(f)}
};

var mmFunctionDictionary = {
	'cc': (f) => {return new MMConcatFunction(f)},
	'concat': (f) => {return new MMConcatFunction(f)},
	'ln': (f) => {return new MMLnFunction(f)},
	'array': (f) => {return new MMArrayFunction(f)},
	'table': (f) => {return new MMTableFunction(f)},
	'cell': (f) => {return new MMMatrixCellFunction(f)},
	'row': (f) => {return new MMMatrixRowFunction(f)},
	'col': (f) => {return new MMMatrixColumnFunction(f)},
}

/**
 * @class MMParenthesisOperator
 * really just a marker
 * @extends MMFormulaOperator
 */
class MMParenthesisOperator extends MMFormulaOperator {
}

/**
 * @class MMOperandMarker
 * @extends MMFormulaOperator
 */
class MMOperandMarker extends MMFormulaOperator {
}

/**
 * @class MMMonadicOperator
 * @extends MMFormulaOperator
 */
class MMMonadicOperator extends MMFormulaOperator {
	/**
	 * @method setInput
	 * @param {MMFormulaOperator} inputOperator
	 */
	setInput(inputOperator) {
		this.input = inputOperator;
	}

	/**
	 * @method value
	 * @override
	 * @returns MMNumberValue
	 */
	value() {
		const v = (this.input) ? this.input.value() : null;
		if (v) {
			if (v instanceof MMNumberValue) {
				return this.operationOn(v);
			}
		}
		return null;
	}

	/**
	 * @virtual operationOn
	 * @param {MMNumberValue} value
	 * @returns {MMValue}
	 */
	operationOn(value) {
		return null;
	}

	/**
	 * @method addInputSourcesToSet
	 * @param {Set} sources
	 */
	addInputSourcesToSet(sources) {
		if (this.input) {
			this.input.addInputSourcesToSet(sources);
		}
	}
}

/**
 * @class MMDyadicOperator
 * @extends MMFormulaOperator
 */
class MMDyadicOperator extends MMFormulaOperator {
	/**
	 * @method setInputs
	 * @param {MMFormulaOperator} firstInput;
	 * @param {MMFormulaOperator} secondInput;
	 */
	setInputs(firstInput, secondInput) {
		this.firstInput = firstInput;
		this.secondInput = secondInput;
	}

	/**
	 * @method valueFor
	 * @param {MMValue} v1
	 * @param {MMValue} v2
	 * @returns {MMValue}
	 */
	valueFor(v1, v2) {
		if (v1 instanceof MMNumberValue && v2 instanceof MMNumberValue) {
			return this.operationOn(v1, v2);
		}

		// much to add for all other value classes
		return null;
	}

	/**
	 * @method value
	 * @override
	 * @returns MMValue
	 */
	value() {
		if (this.firstInput && this.secondInput) {
			const input1 = this.firstInput;
			if (input1) {
				const v1 = input1.value();
				if (v1 && v1.valueCount) {
					const input2 = this.secondInput;
					if (input2) {
						const v2 = input2.value();
						if (v2 && v2.valueCount) {
							return this.valueFor(v1, v2);
						}
					}
				}
			}
		}
		return null;
	}

	/**
	 * @virtual operationOn
	 * @param {MMNumberValue} firstValue;
	 * @param {MMNumberValue} secondValue;
	 */
	operationOn(firstValue, secondValue) {
		return null;
	}

	/**
	 * @method addInputSourcesToSet
	 * @param {Set} sources
	 */
	addInputSourcesToSet(sources) {
		if (this.firstInput) {
			this.firstInput.addInputSourcesToSet(sources);
		}
		if (this.secondInput) {
			this.secondInput.addInputSourcesToSet(sources);
		}
	}
}

/**
 * @class MMUnaryMinusOperator
 * @extends MMFormulaOperator
 */
class MMUnaryMinusOperator extends MMFormulaOperator {
	/**
	 * @method operationOn
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	operationOn(value) {
		return value.negative();
	}
	
	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 150;
	}
}

/**
 * @class MMToolReferenceOperator
 * @extends MMFormulaOperator
 * @member {MMFormula} formula
 * @member {String} referencePath
 * @member {Number} recursionCount
 */
class MMToolReferenceOperator extends MMFormulaOperator {
	/**
	 * @constructor
	 * @param {String} path
	 * @param {MMFormula} formula
	 */
	constructor(path, formula) {
		super();
		this.referencePath = path;
		this.formula = formula;
		this.recusionCount = 0;
	}

	/**
	 * @method value
	 * @override
	 * @returns MMValue
	 */
	value() {
		if (this.formula.isInError || this.referencePath.length < 1) {
			return null;
		}

		if (this.recusionCount > 2) {
			this.formula.setError('mmcmd:formulaRecursion', {
				formula: this.formula.truncatedFormula(),
				path: this.formula.parent.getPath()
			});
			return null;
		}

		let tool;
		let parts = this.referencePath.split('.');
		let toolName = parts[0];
		if (toolName == '$' && this.formula.parent instanceof MMTool) {
			tool = this.formula.parent;
		}
		else {
			tool = this.formula.nameSpace.childNamed(toolName);
		}
		if (tool) {
			let args;
			if (parts.length > 1) {
				args = parts.slice(1).join('.');
			}

			let returnValue;
			this.recusionCount++;
			try {
				this.recursionCount++;
				returnValue = tool.valueDescribedBy(args, this.formula.parent);
			}
			finally {
				this.recusionCount--;
			}
			return returnValue;
		}
		else {
			this.formula.setError('mmcmd:formulaMissingTool', {
				name: toolName,
				formula: this.formula.truncatedFormula(),
				path: this.formula.parent.getPath()
			});
		}
		return null;
	}

	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 10;
	}

	/**
	 * @method addInputSourcesToSet
	 * @param {Set} sources
	 */
	addInputSourcesToSet(sources) {
		let tool;
		if (this.referencePath.length > 0) {
			let toolName = this.referencePath.split('.')[0];
			if (toolName == '$' && this.formula.parent instanceof MMTool) {
				tool = this.formula.parent;
			}
			else {
				tool = this.formula.nameSpace.childNamed(toolName);
			}
			if (tool) {
				sources.add(tool);
			}
		}
	}
}

/**
 * @class MMConstantOperator
 * @extends MMFormulaOperator
 */
class MMConstantOperator extends MMFormulaOperator {
	/**
	 * @constructor
	 * @param {MMValue} value
	 */
	constructor(value) {
		super();
		this._value = value;
	}

	/**
	 * @method value
	 * @override
	 * @returns MMValue
	 */
	value() {
		return this._value;
	}

	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 10;
	}}

/**
 * @class MMScalarWithUnitOperator
 * @extends MMFormulaOperator
 */
class MMScalarWithUnitOperator extends MMFormulaOperator {
	/**
	 * @constructor
	 * @param {Number} value
	 * @param {MMUnit} unit
	 */
	constructor(value, unit) {
		super();
		let baseValue = unit.convertToBase(value);
		this._value = MMNumberValue.scalarValue(baseValue, unit.dimensions);
	}

	/**
	 * @method value
	 * @override
	 * @returns MMValue
	 */
	value() {
		return this._value;
	}

	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 10;
	}
}

/**
 * @class MMIndexOperator
 * @extends MMFormulaOperator
 * @member {MMFormula} formula
 * @member {MMFormulaOperator} sourceArgument
 * @member {MMFormulaOperator} rowArgument
 * @member {MMFormulaOperator} columnArgument
 */
class MMIndexOperator extends MMFormulaOperator {
	/**
	 * @constructor
	 * @param {MMFormula} formula
	 */
	constructor(formula) {
		super();
		this.formula = formula;
	}

	/**
	 * @method processArguments
	 * @override
	 * @param {MMFormulaOperator[]} operandStack
	 * @returns {Boolean}
	 */
	processArguments(operandStack) {
		if (operandStack.length < 3) {
			return false;
		}
		this.columnArgument = operandStack.pop();
		let arg = operandStack.pop();
		if (arg instanceof MMOperandMarker) {
			this.rowArgument = this.columnArgument;
			this.columnArgument = null;
		}
		else {
			this.rowArgument = arg;
			arg = operandStack.pop();
			if (!(arg instanceof MMOperandMarker)) {
				return false;
			}
		}
		this.sourceArgument = operandStack.pop();
		return true;
	}

	/**
	 * @method value
	 * @override
	 * @returns {MMValue}
	 */
	value() {
		const sourceValue = this.sourceArgument.value();
		if (sourceValue instanceof MMToolValue) {
			const rowValue = this.rowArgument.value();
			if (rowValue instanceof MMStringValue) {
				const tool = sourceValue.valueAtRowColumn(1, 1);
				const valueDescription = rowValue.valueAtRowColumn(1, 1);
				return tool.valueDescribedBy(valueDescription, this.formula.owner);
			}
		}
		else if (sourceValue instanceof MMValue) {
			const rowValue = this.rowArgument ? this.rowArgument.value() : null;
			const columnValue = this.columnArgument ? this.columnArgument.value() : null;
			return sourceValue.valueForIndexRowColumn(rowValue, columnValue);
		}
		return null;
	}

	/**
	 * @method addInputSourcesToSet
	 * @override
	 * @param  {Set} sources
	 */
	addInputSourcesToSet(sources) {
		if (this.sourceArgument) {
			this.sourceArgument.addInputSourcesToSet(sources);
		}
		if (this.rowArgument) {
			this.rowArgument.addInputSourcesToSet(sources);
		}
		if (this.columnArgument) {
			this.columnArgument.addInputSourcesToSet(sources);
		}
	}
 }

/**
 * @class MMAddOperator
 * @extends MMDyadicOperator
 */
class MMAddOperator extends MMDyadicOperator {
	/**
	 * @override operationOn
	 * @param {MMNumberValue} firstValue;
	 * @param {MMNumberValue} secondValue;
	 * @returns {MMNumberValue}
	 */
	operationOn(firstValue, secondValue) {
		return firstValue.add(secondValue);
	}

	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 20;
	}
}

/**
 * @class MMSubtractOperator
 * @extends MMDyadicOperator
 */
class MMSubtractOperator extends MMDyadicOperator {
	/**
	 * @override operationOn
	 * @param {MMNumberValue} firstValue;
	 * @param {MMNumberValue} secondValue;
	 * @returns {MMNumberValue}
	 */
	operationOn(firstValue, secondValue) {
		return firstValue.subtract(secondValue);
	}

	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 20;
	}
}

/**
 * @class MMMultiplyOperator
 * @extends MMDyadicOperator
 */
class MMMultiplyOperator extends MMDyadicOperator {
	/**
	 * @override operationOn
	 * @param {MMNumberValue} firstValue;
	 * @param {MMNumberValue} secondValue;
	 * @returns {MMNumberValue}
	 */
	operationOn(firstValue, secondValue) {
		return firstValue.multiply(secondValue);
	}

	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 30;
	}
}

/**
 * @class MMDivideOperator
 * @extends MMDyadicOperator
 */
class MMDivideOperator extends MMDyadicOperator {
	/**
	 * @override operationOn
	 * @param {MMNumberValue} firstValue;
	 * @param {MMNumberValue} secondValue;
	 * @returns {MMNumberValue}
	 */
	operationOn(firstValue, secondValue) {
		return firstValue.divide(secondValue);
	}

	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 30;
	}
}

/**
 * @class MMModOperator
 * @extends MMDyadicOperator
 */
class MMModOperator extends MMDyadicOperator {
	/**
	 * @override operationOn
	 * @param {MMNumberValue} firstValue;
	 * @param {MMNumberValue} secondValue;
	 * @returns {MMNumberValue}
	 */
	operationOn(firstValue, secondValue) {
		return firstValue.mod(secondValue);
	}

	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 30;
	}
}

/**
 * @class MMPowerOperator
 * @extends MMDyadicOperator
 * @member {MMFormula} formula
 */
class MMPowerOperator extends MMDyadicOperator {
	/**
	 * @override operationOn
	 * @param {MMNumberValue} firstValue;
	 * @param {MMNumberValue} secondValue;
	 * @returns {MMNumberValue}
	 */
	operationOn(firstValue, secondValue) {
		return firstValue.power(secondValue);
	}

	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 40;
	}
}

/**
 * @class MMRangeOperator
 * @extends MMDyadicOperator
 */
class MMRangeOperator extends MMDyadicOperator {
	/**
	 * @constructor
	 * @param {MMFormula} formula
	 */
	constructor(formula) {
		super();
		this.formula = formula;
	}

	/**
	 * @method value
	 * @override
	 * @returns MMValue
	 */
	value() {
		let rv = null;
		let v1 = this.firstInput.value();
		if (v1 instanceof MMNumberValue) {
			let v2 = this.secondInput.value();
			if (v2 instanceof MMNumberValue) {
				if (v1.hasUnitDimensions() || v2.hasUnitDimensions()) {
					this.formula.setError('mmcmd:formulaRangeUnits', {
						path: this.formula.parent.getPath(),
						formula: this.formula.truncatedFormula()
					});
					return null;
				}
				const start = v1.valueAtRowColumn(1, 1);
				const end = v2.valueAtRowColumn(1, 1);
				if (start < end) {
					const nRows = end - start + 1;
					const nColumns = 1;
					rv = new MMNumberValue(nRows, nColumns);
					for (let i = start; i <= end; i++) {
						rv.setValue(i, i - start + 1, 1);
					}
				}
				else {
					const nRows = start - end + 1;
					const nColumns = 1;
					rv = new MMNumberValue(nRows, nColumns);
					for (let i = start; i >= end; i--) {
						rv.setValue(i, start - i + 1, 1);
					}
				}
			}
		}
		return rv;
	}

	/**
	 * @override precedence
	 * @returns {Number}
	 */
	precedence() {
		return 50;
	}
}

/**
 * @class MMFunctionOperator
 * @extends MMFormulaOperator
 * base class for different functions
 */
class MMFunctionOperator extends MMFormulaOperator {
	/**
	 * @constructor
	 * @param {MMFormula} formula
	 */
	constructor(formula) {
		super();
		this.formula = formula;
	}

	/**
	 * @function processArguments
	 * @param {MMFormulaOperator[]} operandStack
	 * @returns {boolean}
	 */
	processArguments(operandStack) {
		// override for each function
		return false;
	}

	precedence() {
		return 100;
	}
}

// function operator classeses
/**
 * @class MMSingleValueFunction
 * @extends MMFunctionOperator
 * @member {MMFormulaOperator} argument
 * @member {boolean} needsNumericArgument
 */
class MMSingleValueFunction extends MMFunctionOperator {
	/**
	 * @constructor
	 * @param {MMFormula} formula
	 */
	constructor(formula) {
		super(formula);
		this.needsNumericArgument = true;
		this.argument = null;
	}

	/**
	 * @override
	 * @function processArguments
	 * @param {MMFormulaOperator[]} operandStack
	 * @returns {boolean}
	 */
	processArguments(operandStack) {
		if (operandStack.length < 1) {
			return false;
		}
		this.argument = operandStack.pop();
		if (operandStack.length > 0 && operandStack[operandStack.length - 1] instanceof MMOperandMarker) {
			operandStack.pop()
			return true;
		}
		return false;
	}

	/**
	 * @method value
	 * @override
	 * @returns {MMValue}
	 */
	value() {
		let v = this.argument ? this.argument.value() : null;
		if (v instanceof MMNumberValue) {
			return this.operationOn(v);
		}
		else if (v instanceof MMStringValue) {
			return this.operationOnString(v);
		}
		else if (v instanceof MMTableValue) {
			return this.operationOnTable(v);
		}
		return null;
	}

	/**
	 * @method operationOn
	 * @param {MMNumberValue} value
	 * @returns {MMValue}
	 */
	operationOn(value) {
		return null;
	}

		/**
	 * @method operationOnString
	 * @param {MMStringValue} value
	 * @returns {MMValue}
	 */
	operationOnString(value) {
		return null;
	}

	/**
	 * @method operationOnTable
	 * @param {MMTablerValue} value
	 * @returns {MMValue}
	 */
	operationOn(value) {
		// unimplemented
		return null;
	}

	/**
	 * @method addInputSourcesToSet
	 * @override
	 * @param  {Set} sources
	 */
	addInputSourcesToSet(sources) {
		if (this.argument) {
			this.argument.addInputSourcesToSet(sources);
		}
	}
}

/**
 * @class MMLnFunction
 * @extends MMSingleValueFunction
 */
class MMLnFunction extends MMSingleValueFunction {
	/**
	 * @method operationOn
	 * @override
	 * @param {MMNumberValue} value
	 * @returns {MMValue}
	 */
	operationOn(value) {
		return value.ln();
	}
}

/**
 * @class MMMultipleArgunebtFunction
 * @extends MMFunctionOperator
 * @member {MMFormulaOperator[]} arguments
 */
class MMMultipleArgumentFunction extends MMFunctionOperator {
	/**
	 * @constructor
	 * @param {MMFormula} formula
	 */
	constructor(formula) {
		super(formula);
		this.arguments = [];
	}

	/**
	 * @override
	 * @function processArguments
	 * @param {MMFormulaOperator[]} operandStack
	 * @returns {boolean}
	 */
	processArguments(operandStack) {
		if (operandStack.length < 1) {
			return false;
		}
		let arg = operandStack.pop();
		let foundMarker = arg instanceof MMOperandMarker;
		if (foundMarker) {
			return true;  // no arguments
		}

		while (!(arg instanceof MMOperandMarker)) {
			this.arguments.push(arg);
			if (!operandStack.length) {
				this.arguments = [];
				return false;
			}
			arg = operandStack.pop();
		}
		return true;
	}

	/**
	 * @method addInputSourcesToSet
	 * @override
	 * @param  {Set} sources
	 */
	addInputSourcesToSet(sources) {
		for (let arg of this.arguments) {
			arg.addInputSourcesToSet(sources);
		}
	}
}

/**
 * @class MMArrayFunction
 * @extends MMMultipleArgumentFunction
 */
class MMArrayFunction extends MMMultipleArgumentFunction {

	/**
	 * @override
	 * @function processArguments
	 * @param {MMFormulaOperator[]} operandStack
	 * @returns {boolean}
	 */
	processArguments(operandStack) {
		let rv = super.processArguments(operandStack);
		if (rv && this.arguments.length < 2) {
			return false; // needs at least two arguments
		}
		return rv;
	}

	/**
	 * @method value
	 * @override
	 * @returns {MMValue}
	 */
	value() {
		let argCount = this.arguments.length;
		let initValue = this.arguments[0].value();
		if (!initValue || !initValue.valueCount) {
			return null;
		}

		let columnCount = 1, rowCount = 1, rowArg = 1;
		if (argCount > 2) {
			let v = this.arguments[1].value();
			if (!v || !v.valueCount) {
				return null;
			}
			columnCount = Math.floor(v._values[0] + 0.0001);
			rowArg = 2;
		}

		let v = this.arguments[rowArg].value();
		v = v && v.numberValue();
		if (!v.valueCount) {
			return null;
		}
		rowCount = Math.floor(v._values[0] + 0.0001);

		let rv = null;
		if (initValue instanceof MMNumberValue) {
			rv = new MMNumberValue(rowCount, columnCount, initValue.unitDimensions);
			const initCount = initValue.valueCount;
			if (initCount == 1) {
				rv.setAllValuesTo(initValue._values[0]);
			}
			else {
				const valueCount = rv.valueCount;
				const vRv = rv._values;
				const vInit = initValue._values;
				for (let i = 0; i < valueCount; i++) {
					vRv[i] = vInit[i % initCount];
				}
			}
		}
		else if (initValue instanceof MMStringValue) {
			rv = new MMStringValue(rowCount, columnCount);
			const initCount = initValue.valueCount;
			if (initCount == 1) {
				rv.setAllValuesTo(initValue._values[0]);
			}
			else {
				const valueCount = rv.valueCount;
				const vInit = initValue._values;
				for (let i = 0; i < valueCount; i++) {
					const s = vInit[i % initCount];
					rv.setValueAtCount(s, i);
				}
			}
		}
		else {
			this.formula.functionError('Array', 'mmcmd:formulaArrayInitError');
			return null;
		}
		return rv;
	}
}

/**
 * @class MMConcatFunction
 * @extends MMMultipleArgumentFunction
 */
class MMConcatFunction extends MMMultipleArgumentFunction {

	/**
	 * @override
	 * @function processArguments
	 * @param {MMFormulaOperator[]} operandStack
	 * @returns {boolean}
	 */
	processArguments(operandStack) {
		let rv = super.processArguments(operandStack);
		if (rv && this.arguments.length < 1) {
			return false; // needs at least one arguments
		}
		return rv;
	}

	/**
	 * @method value
	 * @override
	 * @returns {MMValue}
	 */
	value() {
		let valueCount = 0;
		let rowCount = 0;
		let first;
		let argCount = this.arguments.length;
		while (argCount-- > 0) {
			const obj = this.arguments[argCount].value();
		
			if (!first) {
				first = obj;
				rowCount = obj.rowCount;
			}
			else if (Object.getPrototypeOf(obj).constructor == Object.getPrototypeOf(first).constructor) {
				if (first instanceof MMNumberValue) {
					first.checkUnitDimensionsAreEqualTo(obj.unitDimensions);
				}
				else if (first instanceof MMTableValue) {
					rowCount += obj.rowCount;
					if (first.columnCount !== obj.columnCount) {
						this.formula.functionError('concatTableColumnMismatch','mmcmd:concat');
						return null;
					}
				}
			}
			else {
				return null;
			}
			valueCount += obj.valueCount;
		}

		if (valueCount) {
			if (first instanceof MMTableValue) {
				const columnCount =  first.columnCount;
				let a = [];
				for (let column in first.columns) {
					if (column.value) {
						a.push(column.value);
					}
				}
				argCount = this.arguments.length;
				while (argCount-- > 0) {
					const tableValue = this.arguments[argCount].value();
					if (!(tableValue instanceof MMTableValue)) {
						return null;
					}
					for (let i = 0; i < columnCount; i++) {
						let v1 = a[i];
						const v2 = tableValue.columns[i].value;
						if (v2 && Object.getPrototypeOf(v1).constructor == Object.getPrototypeOf(v2).constructor) {
							v1 = v1.concat(v2);
							if (v1) {
								a[i] = v1;
							}
							else {
								return null;
							}
						}
						else  {
							return null;
						}
					}
				}

				for (let i = 0; i < columnCount; i++)  {
					const firstColumn = first.columns[i];
					a[i] = new MMTableValueColumn({
						name: firstColumn.name,
						displayUnit: firstColumn.displayUnit,
						value: a[i]
					});
				}
				return new MMTableValue({columns: a});
			}
			else {
				argCount = this.arguments.length - 1;
				while (argCount-- >  0) {
					first = first.concat(this.arguments[argCount].value());
				}
				return first;
			}
		}
	}	
}

/**
 * @class MMTableFunction
 * @extends MMMultipleArgumentFunction
 */
class MMTableFunction extends MMMultipleArgumentFunction {

	/**
	 * @override
	 * @function processArguments
	 * @param {MMFormulaOperator[]} operandStack
	 * @returns {boolean}
	 */
	processArguments(operandStack) {
		let rv = super.processArguments(operandStack);
		if (rv && this.arguments.length < 1) {
			return false; // needs at least one arguments
		}
		return rv;
	}

	/**
	 * @method value
	 * @override
	 * @returns {MMValue}
	 */
	value() {
		const argCount = this.arguments.length;
		const nameParam = this.arguments[argCount -  1].value();
		let names = [];
		let templateColumns;
		let nameCount = 0;
		if (nameParam instanceof MMStringValue) {
			if (argCount > 1) {
				nameCount = nameParam.valueCount;
				for (let  i = 0;  i < nameCount; i++) {
					names.push(nameParam.valueAtCount(i));
				}
			}
			else {
				// should be CSV
				if (nameParam.valueCount) {
					return new MMTableValue({csv: nameParam.valueAtCount(1)});
				}
				return null;
			}
		}
		else if (nameParam instanceof MMTableValue) {
			nameCount = nameParam.columnCount;
			templateColumns = nameParam.columns
			for (let  i = 0;  i < nameCount; i++) {
				names.push(templateColumns[i].name);
			}
		}

		if (argCount < 2) {
			return null;
		}

		let columns = []
		let addColumnCount = 0;
		for (let argNo = argCount - 2; argNo >= 0; argNo--) {
			const arg = this.arguments[argNo];
			const v = arg.value();
			if (v instanceof MMValue) {
				for (let i = 0; i < v.columnCount && addColumnCount < nameCount; i++) {
					const cValue = v.columnNumber(i + 1);
					if (!(cValue instanceof  MMNumberValue) && !(cValue instanceof MMStringValue)) {
						return null;
					}
					const column = new MMTableValueColumn({
						name: names[addColumnCount],
						value: cValue
					});

					if (templateColumns && !column.isString) {
						const templateColumn = templateColumns[addColumnCount];
						if (MMUnitSystem.areDimensionsEqual(templateColumn.displayUnit, cValue.unitDimensions)) {
							column.displayUnit = templateColumn.displayUnit;
							column.format = templateColumn.format;
						}
					}
					columns.push(column);
					addColumnCount++;
				}
			}	else {
				return null;
			}
		}
		return new MMTableValue({columns: columns});
	}
}

/**
 * @class MMMatrixCellFunction
 * @extends MMMultipleArgumentFunction
 */
class MMMatrixCellFunction extends MMMultipleArgumentFunction {
	/**
	 * @override
	 * @function processArguments
	 * @param {MMFormulaOperator[]} operandStack
	 * @returns {boolean}
	 */
	processArguments(operandStack) {
		let rv = super.processArguments(operandStack);
		if (rv && this.arguments.length < 1) {
			return false; // needs at least one arguments
		}
		if ((this.formula.owner instanceof MMMatrix)) {
			return false;
		}

		return rv;
	}

	/**
	 * @method value
	 * @override
	 * @returns {MMValue}
	 */
	value() {
		const matrix = this.formula.parent;
		let rv = null;
		const savedRow = matrix.currentRow;
		const savedColumn = matrix.currentColumn;
		const v1 = this.arguments[1].value();
		if (v1) {
			const v2 = this.arguments[0].value();
			if (v2) {
				if (v1 instanceof MMNumberValue && v2 instanceof MMNumberValue) {
					const rowOffset = v1.valueAtRowColumn(1,1);
					const columnOffset = v2.valueAtRowColumn(1,1);
					if (rowOffset != 0 || columnOffset != 0) {
						rv = matrix.numberValueAtOffsets(rowOffset, columnOffset);
					}
				}
			}
		}
		matrix.currentRow = savedRow;
		matrix.currentColumn = savedColumn;
		return rv;	
	}
}

/**
 * @class MMMatrixRowFunction
 * @extends MMMultipleArgumentFunction
 */
class MMMatrixRowFunction extends MMFunctionOperator {
	/**
	 * @override
	 * @function processArguments
	 * @param {MMFormulaOperator[]} operandStack
	 * @returns {boolean}
	 */
	processArguments(operandStack) {
		if ((this.formula.owner instanceof MMMatrix)) {
			return false;
		}

		if (!operandStack || operandStack.length < 1) {
			return false;
		}

		const arg = operandStack[operandStack.length - 1];
		if (arg && arg instanceof MMOperandMarker) {
			operandStack.pop();
			return true;
		}
	
		return false;
	}

	/**
	 * @method value
	 * @override
	 * @returns {MMValue}
	 */
	value() {
		const matrix = this.formula.parent;
		return MMNumberValue.scalarValue(matrix.currentRow, null);
	}
}

/**
 * @class MMMatrixColumnFunction
 * @extends MMMultipleArgumentFunction
 */
class MMMatrixColumnFunction extends MMFunctionOperator {
	/**
	 * @override
	 * @function processArguments
	 * @param {MMFormulaOperator[]} operandStack
	 * @returns {boolean}
	 */
	processArguments(operandStack) {
		if ((this.formula.owner instanceof MMMatrix)) {
			return false;
		}

		if (!operandStack || operandStack.length < 1) {
			return false;
		}

		const arg = operandStack[operandStack.length - 1];
		if (arg && arg instanceof MMOperandMarker) {
			operandStack.pop();
			return true;
		}
	
		return false;
	}

	/**
	 * @method value
	 * @override
	 * @returns {MMValue}
	 */
	value() {
		const matrix = this.formula.parent;
		return MMNumberValue.scalarValue(matrix.currentColumn, null);
	}
}

/**
 * @class MMFormula
 * @extends MMCommandObject
 * @member {string} formula
 * @member {MMModel} nameSpace
 * @member {boolean} isInError
 */
class MMFormula extends MMCommandObject {
	/** @constructor
	 * @param {string} name
	 * @param {MMTool} parentTool
	 */
	constructor(name, parentTool) {
		super(name, parentTool, 'MMFormula');
		this._formula = '';
		this._resultOperator = null;
		this._nameSpace = theMMSession.currentModel;
		this.isInError = false;
	}

	/** @override */
	get properties() {
		let d = super.properties;
		d['formula'] = {type: PropertyType.string, readOnly: false};
		return d;
	}

	get formula() {
		return this._formula;
	}

	set formula(newFormula) {
		if (newFormula && newFormula.length == 0) {
			newFormula = nil;
		}

		if (newFormula == this._formula) {
			return;
		}

		if (this.parent) {
			this.parent.isHidingInfo = true;
		}

		// is this a bare numeric constant
		let re = /^\-{0,1}\d+(\.\d+){0,1}([eE]\-{0,1}\d+){0,1}$/;
		if(newFormula && re.test(newFormula)) {
			// is valid numeric
			let unit = this.parent.displayUnit;
			if (unit) {
				newFormula = `${newFormula} ${unit.name}`;
			}
		}

		let needToPop = false;
		if (this.nameSpace != theMMSession.currentModel) {
			theMMSession.pushModel(this.nameSpace);
			needToPop = true;
		}
		this.nameSpace.isMissingObject = false;
		try {
			this._formula = newFormula;
			this._resultOperator = null;
			this.isInError = false;
			this.parent.changedFormula(this);
			this.parseFormula();
		}
		finally {
			if (needToPop) {
				this.parent.popModel();
			}
		}
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
//			addTool: 'mmcmd:?modelUseAddTool'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	get nameSpace() {
		return this._nameSpace;
	}

	/** @param {MMModel} newSpace */
	set nameSpace(newSpace) {
		if (newSpace !== this._nameSpace) {
			this._nameSpace = newSpace;
			this.parent.forgetAllCalculations();
			this.parseFormula();
		}
	}

	/**
	 * @method value
	 * @returns {MMValue}
	 */
	value() {
		try {
			if (this._resultOperator) {
				return this._resultOperator.value();
			}
		}
		catch(e) {
			this.setExceptionError(e);
		}
		return null;
	}

	/**
	 * @param {@method} numberValue
	 * @returns MMNumberValue or null 
	 */
	numberValue() {
		const value = this.value();
		if (value) {
			return value.numberValue();
		}
	}

	/**
	 * @method setExceptionError
	 * @param {e} formula 
	 */
	setExceptionError(e) {
		let child;
		if (e instanceof MMCommandMessage) {
			child = e
		}
		else if (e instanceof Error) {
			child = this.t('mmcmd:formulaJSError', {error: e.message});
		}
		else {
			child = this.t('mmcmd:formulaJSError', {error: e});
		}
		this.setError('mmcmd:formulaException', {
			formula: this.truncatedFormula(),
			path: this.parent.getPath(),
		}, child);
	}

	/**
	 * @method isEqualToFormula
	 * @param {MMFormula}
	 * @returns {boolean}
	 */
	isEqualToFormula(formula) {
		if (this === formula || this._formula == formula._formula) {
			return true;
		}
		return false;
	}

	/**
	 * @method truncatedFormula
	 * @returns {String}  - formula truncated to less than 250 char
	 */
	truncatedFormula() {
		return this._formula.substring(0,249);
	}

	/**
	 * @method syntaxError
	 * @param {MMCommandMessage} child - optional
	 */
	syntaxError(child) {
		this.isInError = true;
		this.setError('mmcmd:formulaSyntaxError', {
			path: this.parent.getPath(),
			formula: this.truncatedFormula()
		}, child);
	}

	/**
	 * @method argumentCountError
	 */
	argumentCountError() {
		this.isInError = true;
		this.setError('mmcmd:formulaArgCountError', {
			path: this.parent.getPath(),
			formula: this.truncatedFormula()
		});
	}

	/**
	 * @method parenthesisMismatch
	 */
	parenthesisMismatch() {
		this.isInError = true;
		this.setError('mmcmd:formulaParenMismatch', {
			path: this.parent.getPath(),
			formula: this.truncatedFormula()
		});
	}

	/**
	 * @method indexMismatch
	 */
	indexMismatch() {
		this.isInError = true;
		this.setError('mmcmd:formulaIndexMismatch', {
			path: this.parent.getPath(),
			formula: this.truncatedFormula()
		});
	}

	/**
	 * @method functionError
	 * @param {String} funcName
	 * @param {String} msgKey
	 * @param {Object} msgArgs
	 */
	functionError(funcName, msgKey, msgArgs) {
		this.setError('mmcmd:formulaFunctionError', {
			name: funcName,
			path: this.parent.getPath(),
			formula: this.truncatedFormula()
		}, this.t(msgKey, msgArgs));
	}

	/**
	 * @method parseFormula
	 * @returns {MMFormulaOperator}
	 */
	parseFormula() {
		let operatorStack = [];
		let operandStack = [];

		// helper functions
		let filterFloat = (value) => {
			const parts = value.split('e');
			if (/^(\-|\+)?([0-9]+(\.[0-9]+)?|Infinity)$/.test(parts[0])) {
				if (parts.length === 1) {
					return Number(value);
				}
				if (parts.length === 2 && /^(\-|\+)?([0-9]+$)/.test(parts[1])) {
					return Number(value);
				}
			}
			return NaN;
		}

		/** @function addParenOp */
		let addParenOp = () => {
			operatorStack.push(new MMParenthesisOperator());
			parenCount++
		}

		/**
		 * @function processTopOperator
		 * @returns {boolean}
		 */
		let processTopOperator = () => {
			/*
	 			take the top operator off of the stack and connect it appropriately
	 			with its operand(s) then push it back onto operand stack
			 */
			 if (operatorStack.length < 1) {
				 this.syntaxError();
				 return false;
			 }

			 let op = operatorStack.pop();
			 if (op instanceof MMMonadicOperator) {
				 if (operandStack.length < 1) {
					 this.syntaxError();
					 return false;
				 }
				 op.setInput(operandStack.pop());
			 }
			 else if (op instanceof MMDyadicOperator) {
				if (operandStack.length < 2) {
					this.syntaxError();
					return false;
				}
				let secondOp = operandStack.pop();
				let firstOp = operandStack.pop();
				op.setInputs(firstOp, secondOp);
			 }
			 operandStack.push(op);
			 return true;
		}

		/**
		 * @function processParenthesis
		 * @returns {boolean}
		 */
		let processParenthesis = () => {
			// work back up operator stack until matching '(' is found
			while (1) {
				let stackCount = operatorStack.length;
				if (stackCount > 0) {
					let op = operatorStack[stackCount - 1];
					if (op instanceof MMParenthesisOperator) {
						operatorStack.pop()
						parenCount--;
						return true;
					}
					else {
						if (!processTopOperator()) {
							return false;
						}
					}
				}
				else {
					this.parenthesisMismatch()
					return false;
				}
			}
		}

		/**
		 * @function processFunction
		 * @returns {boolean}
		 */
		let processFunction = () => {
			// work back up operator stack until function operator is found
			while (1) {
				if (operatorStack.length > 0) {
					let op = operatorStack.pop();
					if (op instanceof MMFunctionOperator) {
						if (!op.processArguments(operandStack)) {
							this.argumentCountError();
							return false;
						}
						else {
							operandStack.push(op);
							return true;
						}
					}
					else {
						operatorStack.push(op);
						if (!processTopOperator()) {
							return false;
						}
					}
				}
				else {
					this.syntaxError(this.t('mmcmd:formulaBraceMismatch'));
					return false;
				}
			}
		}

		/**
		 * @function processIndex
		 * @returns {boolean}
		 */
		let processIndex = () => {
			// work back up operator stack until '[' is found
			while (1) {
				if (operatorStack.length > 0) {
					let op = operatorStack.pop();
					if (op instanceof MMIndexOperator) {
						if (!op.processArguments(operandStack)) {
							this.argumentCountError();
							return false;
						}
						else {
							operandStack.push(op);
							return true;
						}
					}
					else {
						operatorStack.push(op);
						if (!processTopOperator()) {
							return false;
						}
					}
				}
				else {
					this.indexMismatch();
					return false;
				}
			}
		}

		// end helper functions start actual parse

		if (this.isInError) {
			return null;   // prevents multiple error messages about same problem
		}
		this._resultOperator = null;
		let parenCount = 0;
		if (this._formula.length > 0) {
			// if entire formula is comment, make it a string
			if (this._formula.startsWith("'")) {
				let s = MMStringValue.scalarValue(this._formula.substring(1));
				this._resultOperator = new MMConstantOperator(s);
				return this._resultOperator;
			}

			// trim white space, if any
			let workingFormula = this._formula.trim();

			// first check for number and unit separated by spaces
			let tokens = workingFormula.split(/\s/);
			let tokenCount = tokens.length;
			if (tokenCount == 2 || (tokenCount > 2 && tokens[2] == "'")) {
				let value = filterFloat(tokens[0]);
				if (!isNaN(value)) {
					let unitName = tokens[1];
					if (unitName.startsWith('"') && unitName.length > 1) {
						unitName = unitName.substring(1,unitName.length - 2);  // strip quotes
					}
					let unit;
					unit = theMMSession.unitSystem.unitNamed(unitName);
					if (unit) {
						this._resultOperator = new MMScalarWithUnitOperator(value, unit);
						return this._resultOperator;
					}
				}
			}

			// didn't seem to be value and unit - parse for equation
			let pattern = /"[\s\S]*?\"|[=*/+\-^:%()'@\{\}#\[\],]|[\w.\$]+/g;
			tokens = workingFormula.match(pattern);
			let nTokens = tokens.length;
			let startOp = new MMParenthesisOperator();
			operatorStack.push(startOp);
			parenCount = 1;
			let treatMinusAsUnary = true;
			for (let i = 0; i < nTokens; i++) {
				let token = tokens[i];
				if (token == '(') {
					addParenOp();
					treatMinusAsUnary = true;
				}
				else if (token == ')') {
					if (!processParenthesis()) {
						return null;
					}
					treatMinusAsUnary = false;
				}
				else if (token.startsWith('"')) {
					token = token.replace(/"/g, '');
					let op = new MMConstantOperator(MMStringValue.scalarValue(token));
					operandStack.push(op);
					treatMinusAsUnary = false;
				}
				else if (token == "'") {
					break; // start of comment
				}
				else if (token == ",") {
					if (!processParenthesis()) {
						return null;
					}
					addParenOp();
					treatMinusAsUnary = true;
				}
				else if (token == '[') {
					const indexOp = new MMIndexOperator(this);
					operatorStack.push(indexOp);
					treatMinusAsUnary = true;
					const op = new MMOperandMarker();
					operandStack.push(op);
					addParenOp();
				}
				else if (token == ']') {
					if (!processParenthesis()) {
						return nil;
					}
					if (!processIndex()) {
						return nil;
					}
					treatMinusAsUnary = false;
				}
				else if (token == '{') {
					if (++i < nTokens) {
						token = tokens[i];
						let f = mmFunctionDictionary[token];
						if (f) {
							let op = f(this);
							operatorStack.push(op);
							treatMinusAsUnary = true;
							op = new MMOperandMarker();
							operandStack.push(op);
							addParenOp();
						}
						else {
							this.syntaxError(this.t('mmcmd:formulaUnknownFunction', {
								f: token
							}));
							return null;
						}
					}
				}
				else if (token == '}') {
					if (!processParenthesis()) {
						return null;
					}
					if (!processFunction()) {
						return null;
					}
					treatMinusAsUnary = false;
				}
				else if (/^[$[a-zA-Z]/.test(token)) {
					// object reference
					let op = new MMToolReferenceOperator(token, this);
					operandStack.push(op);
					treatMinusAsUnary = false;
				}
				else {
					let op;
					if (treatMinusAsUnary && token == '-') {
						op = new MMUnaryMinusOperator();
					}
					else {
						let opFactory = MMFormulaOpDictionary[token];
						if (opFactory) {
							op = opFactory(this);
							let prevOp = operatorStack[operatorStack.length - 1];
							while (!(prevOp instanceof MMParenthesisOperator) &&
								!(prevOp instanceof MMFunctionOperator) &&
								prevOp.precedence() >= op.precedence())
							{
								if (!processTopOperator()) {
									return null;
								}
								prevOp = operatorStack[operatorStack.length - 1];
							}
						}
					}
					if (op) {
						operatorStack.push(op);
						treatMinusAsUnary = true;	
					}
					else {
						// should be a scalar constant
						// check for e minus - the minus will have been stripped as an operator
						token = token.toLowerCase();
						if (i < nTokens - 2 && token.endsWith('e')) {
							let nextToken1 = tokens[++i];
							let nextToken2 = tokens[++i];
							token = nextToken1 + nextToken2;
						}
						let scalarValue = filterFloat(token);
						if (isNaN(scalarValue)) {
							this.syntaxError(this.t('mmcmd:formulaInvalidNumber'));
							return null;
						}

						// see if last operator was unary minus
						if (operatorStack[operatorStack.length - 1] instanceof MMUnaryMinusOperator) {
							operatorStack.pop();
							scalarValue *= -1;
						}

						let op;
						let k = i + 1;
						if (k < nTokens) {
							let unitToken = tokens[k];
							if (unitToken.startsWith('"') && unitToken.length > 1) {
								unitToken = unitToken.substring(1, unitToken.length - 1);
							}
							else if (unitToken && !/[A-Za-z]/.test(unitToken.charAt(0))) {
								unitToken = null;
							}
							if (unitToken) {
								let unit = theMMSession.unitSystem.unitNamed(unitToken);
								if (!unit) {
									this.syntaxError(this.t('mmcmd:formulaBadUnit'));
									return null;
								}
								i++;  // consume the token
								op = new MMScalarWithUnitOperator(scalarValue, unit);
							}
						}

						if (!op) {	// unitless
							let num = MMNumberValue.scalarValue(scalarValue);
							op = new MMConstantOperator(num);
						}

						operandStack.push(op);
						treatMinusAsUnary = false;
						
						// check for previous unary minus (comes up in functions)
						let prevOp = operatorStack[operatorStack.length - 1];
						if (prevOp instanceof MMUnaryMinusOperator) {
							if (!processTopOperator()) {
								return null;
							}
						}
					}
				}
			}

			if (processParenthesis() && operandStack.length == 1) {
				this._resultOperator = operandStack.pop();
			}
			else {
				this.syntaxError();
			}	
		}

		if (parenCount != 0) {
			this.parenthesisMismatch();
			this._resultOperator = null;
		}
	

		//this.setError('mmcmd:unimplemented', {feature: 'parseFormula'});
		return this._resultOperator;
	}

	/**
	 * @method addInputSourcesToSet
	 * @param {Set} sources - contains tools referenced in this formula
	 */
	addInputSourcesToSet(sources) {
		if (this._resultOperator) {
			this._resultOperator.addInputSourcesToSet(sources);
		}
	}
}