'use strict';

/* global
	MMNumberValue:readonly
	MMTool:readonly
	MMMath:readonly
	MMValue:readonly
	MMToolValue:readonly
	MMStringValue:readonly
	MMTableValue:readonly
	MMTableValueColumn:readonly
	MMUnitSystem:readonly
	MMMatrix:readonly
	MMCommandObject:readonly
	MMCommandMessage:readonly
	theMMSession:readonly
	MMPropertyType:readonly
	MMDyadicUnitAction:readonly
*/

/**
 * Enum for how some functions are processed
 * @readonly
 * @enum {string}
 */
const MMFunctionResult = Object.freeze({
	all: 0,
	rows: 1,
	columns: 2
});

const MMFormulaFactory = (token, formula) => {
	// creates the operators and functions for MMFormula


	const factories = {
	// operators
		'+': () => {return new MMAddOperator()},
		'-': () => {return new MMSubtractOperator()},
		'*': () => {return new MMMultiplyOperator()},
		'/': () => {return new MMDivideOperator()},
		'%': () => {return new MMModOperator()},
		'^': () => {return new MMPowerOperator()},
		':': (f) => {return new MMRangeOperator(f)},

		// log functions
		'exp': (f) => {return new MMGenericSingleFunction(f, Math.exp)},
		'ln': (f) => {return new MMGenericSingleFunction(f, Math.log)},
		'log': (f) => {return new MMGenericSingleFunction(f, Math.log10)},

		// trig functions
		'sin': (f) => {return new MMGenericSingleFunction(f, Math.sin)},
		'cos': (f) => {return new MMGenericSingleFunction(f, Math.cos)},
		'tan': (f) => {return new MMGenericSingleFunction(f, Math.tan)},
		'asin': (f) => {return new MMGenericSingleFunction(f, Math.asin)},
		'acos': (f) => {return new MMGenericSingleFunction(f, Math.acos)},
		'atan': (f) => {return new MMGenericSingleFunction(f, Math.atan)},
		'pi': (f) => {return new MMPiFunction(f)},
		'polar': (f) => {return new MMPolarFunction(f)},
		'cart': (f) => {return new MMCartesianFunction(f)},

		// hyperbolic functions
		'sinh': (f) => {return new MMGenericSingleFunction(f, Math.sinh)},
		'cosh': (f) => {return new MMGenericSingleFunction(f, Math.cosh)},
		'tanh': (f) => {return new MMGenericSingleFunction(f, Math.tanh)},
		'asinh': (f) => {return new MMGenericSingleFunction(f, Math.asinh)},
		'acosh': (f) => {return new MMGenericSingleFunction(f, Math.acosh)},
		'atanh': (f) => {return new MMGenericSingleFunction(f, Math.atanh)},

		// complex number functions
		'complex': (f) => {return new MMDyadicComplexFunction(f, 'complex', MMDyadicUnitAction.equal, MMMath.complex)},
		'cmult': (f) => {return new MMDyadicComplexFunction(f, 'cmult', MMDyadicUnitAction.multiply, MMMath.cMultiply)},
		'cdiv': (f) => {return new MMDyadicComplexFunction(f, 'cdiv', MMDyadicUnitAction.divide, MMMath.cDivide)},
		'cpow': (f) => {return new MMDyadicComplexFunction(f, 'cpow', MMDyadicUnitAction.power, MMMath.cPower)},
		'cabs': (f) => {return new MMCabsFunction(f, MMMath.cAbsolute)},
		'cexp': (f) => {return new MMComplexSingleFunction(f, 'cexp', MMMath.cexp)},
		'cln': (f) => {return new MMComplexSingleFunction(f, 'cln', MMMath.cln)},
		'csin': (f) => {return new MMComplexSingleFunction(f, 'csin', MMMath.csin)},
		'ccos': (f) => {return new MMComplexSingleFunction(f, 'ccos', MMMath.ccos)},
		'ctan': (f) => {return new MMComplexSingleFunction(f, 'ctan', MMMath.ctan)},
		'casin': (f) => {return new MMComplexSingleFunction(f, 'casin', MMMath.casin)},
		'cacos': (f) => {return new MMComplexSingleFunction(f, 'cacos', MMMath.cacos)},
		'catan': (f) => {return new MMComplexSingleFunction(f, 'catan', MMMath.catan)},
		'csinh': (f) => {return new MMComplexSingleFunction(f, 'csinh', MMMath.csinh)},
		'ccosh': (f) => {return new MMComplexSingleFunction(f, 'ccosh', MMMath.ccosh)},
		'ctanh': (f) => {return new MMComplexSingleFunction(f, 'ctanh', MMMath.ctanh)},
		'casinh': (f) => {return new MMComplexSingleFunction(f, 'casinh', MMMath.casinh)},
		'cacosh': (f) => {return new MMComplexSingleFunction(f, 'cacosh', MMMath.cacosh)},
		'catanh': (f) => {return new MMComplexSingleFunction(f, 'catanh', MMMath.catanh)},

		// reduction functions
		'min': (f) => {return new MMMinimumFunction(f)},
		'minrows': (f) => {return new MMRowMinimumsFunction(f)},
		'mincols': (f) => {return new MMColumnMinimumsFunction(f)},
		'max': (f) => {return new MMMaximumFunction(f)},
		'maxrows': (f) => {return new MMRowMaximumsFunction(f)},
		'maxcols': (f) => {return new MMColumnMaximumsFunction(f)},
		'sum': (f) => {return new MMSumFunction(f)},
		'sumrows': (f) => {return new MMSumRowsFunction(f)},
		'sumcols': (f) => {return new MMSumColumnsFunction(f)},

		// comparison functions
		'if': (f) => {return new MMIfFunction(f)},
		'eq': (f) => {return new MMUnitlessComparisonFunction(f, (a, b) => {return a === b ? 1 : 0;})},
		'ne': (f) => {return new MMUnitlessComparisonFunction(f, (a, b) => {return a !== b ? 1 : 0;})},
		'lt': (f) => {return new MMComparisonFunction(f, (a, b) => {return a < b ? 1 : 0;})},
		'le': (f) => {return new MMComparisonFunction(f, (a, b) => {return a <= b ? 1 : 0;})},
		'gt': (f) => {return new MMComparisonFunction(f, (a, b) => {return a > b ? 1 : 0;})},
		'ge': (f) => {return new MMComparisonFunction(f, (a, b) => {return a >= b ? 1 : 0;})},
		'not': (f) => {return new MMGenericSingleFunction(f, (n) => { return n === 0 ? 1 : 0;})},
		'and': (f) => {return new MMUnitlessComparisonFunction(f, (a, b) => {return a !== 0 && b !== 0 ? 1 : 0;})},

		// matrix functions
		'append': (f) => {return new MMAppendFunction(f)},
		'array': (f) => {return new MMArrayFunction(f)},
		'cc': (f) => {return new MMConcatFunction(f)},
		'concat': (f) => {return new MMConcatFunction(f)},
		'cell': (f) => {return new MMMatrixCellFunction(f)},
		'col': (f) => {return new MMMatrixColumnFunction(f)},
		'cross': (f) => {return new MMCrossProductFunction(f)},
		'dot': (f) => {return new MMMatrixMultiplyFunction(f)},
		'eigval': (f) => {return new MMEigenValueFunction(f)},
		'eigvect': (f) => {return new MMEigenVectorFunction(f)},
		'invert': (f) => {return new MMInvertFunction(f)},
		'ncols': (f) => {return new MMColumnCountFunction(f)},
		'nrows': (f) => {return new MMRowCountFunction(f)},
		'row': (f) => {return new MMMatrixRowFunction(f)},
		'redim': (f) => {return new MMRedimFunction(f)},
		'tr': (f) => {return new MMTransposeFunction(f)},
		'transpose': (f) => {return new MMTransposeFunction(f)},

		// statistical functions
		'average': (f) => {return new MMAverageFunction(f)},
		'median': (f) => {return new MMMedianFunction(f)},
		'geomean': (f) => {return new MMGeoMeanFunction(f)},
		'harmmean': (f) => {return new MMHarmonicMeanFunction(f)},
		'var': (f) => {return new MMVarianceFunction(f)},
		'factorial': (f) => {return new MMFactorialFunction(f)},
		'lngamma': (f) => {return new MMGenericSingleFunction(f, MMMath.lnGamma)},
		'permut': (f) => {return new MMDyadicNumberFunction(f, 'permut', MMDyadicUnitAction.none, MMMath.permutation)},
		'combin': (f) => {return new MMDyadicNumberFunction(f, 'combin', MMDyadicUnitAction.none, MMMath.combination)},
		'normdist': (f) => {return new MMNormalDistFunction(f)},
		'norminv': (f) => {return new MMInverseNormalFunction(f)},
		'binomdist': (f) => {return new MMBinomialDistFunction(f)},
		'betadist': (f) => {return new MMBetaDistFunction(f)},
		'chidist': (f) => {return new MMDyadicNumberFunction(f, 'combin', MMDyadicUnitAction.none, (x2, df) => {
			return MMMath.gammaQ(df/2, x2/2);})
		},
		'chitest': (f) => {return new MMChiTestFunction(f)},

		// table functions
		'table': (f) => {return new MMTableFunction(f)},

		// lookup functions

		// string functions

		// time functions

		// 3d transform functions

		// miscellaneous functions
		'abs': (f) => {return new MMAbsFunction(f)},
		'numeric': (f) => {return new MMNumericFunction(f)},
		'int': (f) => {return new MMGenericSingleFunction(f, Math.trunc)},
		'rand': (f) => {return new MMRandFunction(f)},
	}

	let op;
	const factory = factories[token];
	if (factory) {
		op = factory(formula);
	}
	return op;
}

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
	// eslint-disable-next-line no-unused-vars
	addInputSourcesToSet(sources) {}
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
			if (v instanceof MMTableValue) {
				return this.operationOnTable(v);
			}
			if (v instanceof MMStringValue) {
				return this.operationOnString(v);
			}
		}
		return null;
	}

	/**
	 * @virtual operationOn
	 * @param {MMNumberValue} value
	 * @returns {MMValue}
	 */
	// eslint-disable-next-line no-unused-vars
	operationOn(value) {
		return null;
	}

	/**
	 * @method operationOnString
	 * @param {MMStringValue} value
	 * @returns {MMValue}
	 */
	// eslint-disable-next-line no-unused-vars
	operationOnString(value) {
		return null;
	}

	/**
	 * @method operationOnTable
	 * @param {MMTableValue} value
	 * @returns {MMValue}
	 */
	operationOnTable(tValue) {
		const columns = tValue.columns;
		const calcColumns = [];
		for (let column of columns) {
			const value = column.value;
			if (value instanceof MMNumberValue) {
				const calcValue = this.operationOn(value);
				if (!(calcValue instanceof MMNumberValue)) {
					return null;
				}
				let displayUnit;
				if (MMUnitSystem.areDimensionsEqual(value.unitDimensions, calcValue.unitDimensions)) {
					displayUnit = column.displayUnit ? column.displayUnit.name : null;
				}
				const calcColumn = new MMTableValueColumn({
					name: column.name,
					displayUnit: displayUnit,
					value: calcValue
				});
				calcColumns.push(calcColumn);
			}
			else if (value instanceof MMStringValue) {
				// just include original column if operation does not apply to it
				calcColumns.push(column);
			}
			else {
				return null;
			}
		}

		if (calcColumns.length) {
			return new MMTableValue({columns: calcColumns});
		}
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
		const numberOpTable = (vn, vt) => {
			// table operation number
			if (vn.columnCount !== 1) {
				// number value can only have a single column
				vn.exceptionWith('mmcmd:tableArithNonscalarColumnCount');
			}
			const columns = [];
			for (let column of vt.columns) {
				if (column.value instanceof MMStringValue) {
					// string columns aren't affected by operation
					columns.push(column);
				}
				else if (column.value instanceof MMNumberValue) {
					// perform the numeric operation between column value and second operand
					const newValue = this.operationOn(column.value, vn);
					let displayUnit;
					if (MMUnitSystem.areDimensionsEqual(column.value.unitDimensions, newValue.unitDimensions)) {
						displayUnit = column.displayUnit;
					}
					const newColumn = new MMTableValueColumn({
						name: column.name,
						displayUnit: displayUnit ? displayUnit.name : null,
						value: newValue
					});
					columns.push(newColumn);
				}
			}
			return new MMTableValue({columns: columns});
		}

		if (v1 instanceof MMNumberValue && v2 instanceof MMNumberValue) {
			return this.operationOn(v1, v2);
		}
		else if (v1 instanceof MMStringValue && v2 instanceof MMStringValue) {
			return this.operationOn(v1, v2);
		}
		else if (v1 instanceof MMTableValue) {
			if (v1.rowCount !== 1 && v2.rowCount !== 1 && v1.rowCount !== v2.rowCount) {
				// must have same row count or one must have only one row
				v1.exceptionWith('mmcmd:tableArithRowCount');
			}
			if (v2 instanceof MMNumberValue) {
				return numberOpTable(v2, v1);
			}
			else if (v2 instanceof MMTableValue) {
				// table operation table
				if (v1.columnCount !== v2.columnCount) {
					v1.exceptionWith('mmcmd:tableTableArithColumnCount')
				}
				const columns = [];
				for (let i = 0; i < v1.columnCount; i++) {
					const column1 = v1.columns[i];
					const column2 = v2.columns[i];
					const value1 = column1.value;
					const value2 = column2.value;
					if (Object.getPrototypeOf(value1) != Object.getPrototypeOf(value2)) {
						v1.exceptionWith('mmcmd:tableArithColumnMismatch');
					}
					if (value1 instanceof MMStringValue) {
						if (v1.rowCount < v2.rowCount) {
							columns.push(column2);
						}
						else {
							columns.push(column1);
						}
					}
					else if (value1 instanceof MMNumberValue) {
						const newValue = this.operationOn(value1, value2);
						let displayUnit = null;
						if (MMUnitSystem.areDimensionsEqual(value1.unitDimensions, newValue.unitDimensions)) {
							displayUnit = column1.displayUnit;
						}
						const newColumn = new MMTableValueColumn({
							name: column1.name,
							displayUnit: displayUnit.name,
							value: newValue
						})
						columns.push(newColumn);
					}
				}
				return new MMTableValue({columns: columns});
			}
		}
		else if (v2 instanceof MMTableValue && v1 instanceof MMNumberValue) {
			return numberOpTable(v1, v2);
		}

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
	// eslint-disable-next-line no-unused-vars
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
class MMUnaryMinusOperator extends MMMonadicOperator {
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

// operator functions

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
		return firstValue.divideBy(secondValue);
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
	// eslint-disable-next-line no-unused-vars
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
		this.needsNumericArgument = true;	// true if operation works on number values, false if on string values
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
	// eslint-disable-next-line no-unused-vars
	operationOn(value) {
		return null;
	}

	/**
	 * @method operationOnString
	 * @param {MMStringValue} value
	 * @returns {MMValue}
	 */
	// eslint-disable-next-line no-unused-vars
	operationOnString(value) {
		return null;
	}

	/**
	 * @method operationOnTable
	 * @param {MMTableValue} value
	 * @returns {MMValue}
	 */
	operationOnTable(tValue) {
		const columns = tValue.columns;
		const calcColumns = [];
		for (let column of columns) {
			const value = column.value;
			if (value instanceof MMNumberValue) {
				if (this.needsNumericArgument) {
					const calcValue = this.operationOn(value);
					if (!(calcValue instanceof MMNumberValue)) {
						return null;
					}
					let displayUnit;
					if (MMUnitSystem.areDimensionsEqual(value.unitDimensions, calcValue.unitDimensions)) {
						displayUnit = column.displayUnit ? column.displayUnit.name : null;
					}
					const calcColumn = new MMTableValueColumn({
						name: column.name,
						displayUnit: displayUnit,
						value: calcValue
					});
					calcColumns.push(calcColumn);
				}
				else {
					// just include original column if operation does not apply to it
					calcColumns.push(column);
				}				
			}
			else if (value instanceof MMStringValue) {
				if (!this.needsNumericArgument) {
					const calcValue = this.operationOnString(value);
					const calcColumn = new MMTableValueColumn({
						name: column.name,
						displayUnit: column.displayUnit,
						value: calcValue
					})
					calcColumns.push(calcColumn);
				}
				else if (!this.noStringColumns) {
					// just include original column if operation does not apply to it
					calcColumns.push(column);
				}				
			}
			else {
				return null;
			}
		}

		if (calcColumns.length) {
			return new MMTableValue({columns: calcColumns});
		}
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
	 * @param {Number} minArguments - minimum required arguments - optional
	 * @returns {boolean}
	 */
	processArguments(operandStack, minArguments) {
		if (operandStack.length < 1) {
			return false;
		}
		let arg = operandStack.pop();
		let foundMarker = arg instanceof MMOperandMarker;
		if (foundMarker) {
			return minArguments ? false : true;  // no arguments
		}

		while (!(arg instanceof MMOperandMarker)) {
			this.arguments.push(arg);
			if (!operandStack.length) {
				this.arguments = [];
				return false;
			}
			arg = operandStack.pop();
		}

		return minArguments && this.arguments.length < minArguments ? false : true;
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

class MMGenericSingleFunction extends MMSingleValueFunction {
	constructor(formula, func, canHaveUnits=false) {
		super(formula);
		this.func = func;
		this.canHaveUnits = canHaveUnits;
	}

	operationOn(value) {
		return value.genericMonadic(this.func, this.canHaveUnits);
	}
}

class MMComplexSingleFunction extends MMSingleValueFunction {
	constructor(formula, name, func) {
		super(formula);
		this.func = func;
		this.name = name;
	}

	createComplex(count) {
		const rOut = new MMNumberValue(count, 1);
		const iOut = new MMNumberValue(count, 1);
		const rColumn = new MMTableValueColumn({
			name: 'r',
			value: rOut
		})
		const iColumn = new MMTableValueColumn({
			name: 'i',
			value: iOut
		})
		return new MMTableValue({ columns: [rColumn, iColumn]});
	}

	operationOn(v) {
		if (v) {
			if (v.columnCount !== 2) {
				this.formula.functionError(this.name, 'mmcmd:formulaComplexColumnCount');
			}
			if (v.hasUnitDimensions()) {
				this.exceptionWith('mmcmd:formulaFunctionUnitsNone', {name: this.name});
			}
			const rowCount = v.rowCount;
			const rv = this.createComplex(rowCount);
			const rOut = rv.columns[0].value.values;
			const iOut = rv.columns[1].value.values;

			const f = this.func;
			for (let row = 0; row < rowCount; row++) {
				const cArg = [v.valueAtRowColumn(row + 1, 1), v.valueAtRowColumn(row + 1, 2)];
				const out = f(cArg);
				rOut[row] = out[0];
				iOut[row] = out[1];
			}
			return rv;
		}
		return null;
	}

	operationOnTable(v) {
		if (v) {
			if (v.columnCount !== 2) {
				this.formula.functionError('cabs', 'mmcmd:formulaComplexColumnCount');
			}
			const rowCount = v.rowCount;
			const re = v.columns[0].value;
			const img = v.columns[1].value;
			if (re.hasUnitDimensions() || img.hasUnitDimensions()) {
				this.exceptionWith('mmcmd:formulaFunctionUnitsNone', {name: name});
			}
			if (re instanceof MMNumberValue && img instanceof MMNumberValue) {
				const rv = this.createComplex(rowCount);
				const rOut = rv.columns[0].value.values;
				const iOut = rv.columns[1].value.values;
				const f = this.func;
	
				for (let row = 0; row < rowCount; row++) {
					const cArg = [re.values[row], img.values[row]];
					const out = f(cArg);
					rOut[row] = out[0];
					iOut[row] = out[1];
				}
				return rv;
			}
		}
		return null;
	}
}

class MMDyadicNumberFunction extends MMMultipleArgumentFunction {
	constructor(formula, name, unitAction, func) {
		super(formula);
		this.name = name;
		this.func = func;
		this.unitAction = unitAction;
	}

	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		let v1 = this.arguments[1].value();
		if (v1) {
			v1 = v1.numberValue();
			if (v1) {
				let v2 = this.arguments[0].value();
				if (v2) {
					v2 = v2.numberValue();
					if (v2) {
						return v1.processDyadic(v2, this.unitAction, this.func);
					}
				}
			}
		}
		return null;
	}
}

class MMDyadicComplexFunction extends MMMultipleArgumentFunction {
	constructor(formula, name, unitAction, func) {
		super(formula);
		this.name = name;
		this.func = func;
		this.unitAction = unitAction;
	}

	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		let v1 = this.arguments[1].value().numberValue();
		let v2 = this.arguments[0].value().numberValue();
		return v1.processComplexDyadic(name, v2, this.unitAction, this.func);
	}
}

// trig functions

class MMPiFunction extends MMFunctionOperator {
	processArguments(operandStack) {
		if (operandStack.length > 0 && operandStack[operandStack.length - 1] instanceof MMOperandMarker) {
			operandStack.pop()
			return true;
		}
		return false;
	}

	value() {
		return MMNumberValue.scalarValue(Math.PI);
	}
}

class MMPolarFunction extends MMMultipleArgumentFunction {
	// convert cartesian x, y into radius and angle

	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		const argCount = this.arguments.length;
		const arg1 = this.arguments[0].value();
		if (!arg1 || !arg1.valueCount) {
			return null;
		}

		if (argCount === 1 && arg1.columnCount !== 2) {
			this.formula.functionError('polar', 'mmcmd:formulaPolarSingleError');
			return null;
		}

		let v1 = null;
		let v2 = null;

		if (arg1 instanceof MMTableValue) {
			v2 = arg1.columns[0].value.numberValue();
			v1 = arg1.columns[1].value.numberValue();
		}
		else {
			v1 = arg1.numberValue();
			if (!v1) {
				return null;
			}

			if (argCount == 2) {
				const arg2 = this.arguments[1].value();
				if (arg2) {
					v2 = arg2.numberValue()
				}
				if (!v2) {
					return null;
				}
			}
			else {
				v2 = v1.valueForIndexRowColumn(MMNumberValue.scalarValue(0), MMNumberValue.scalarValue(1));
				v1 = v1.valueForIndexRowColumn(MMNumberValue.scalarValue(0), MMNumberValue.scalarValue(2));
			}
		}

		v1.checkUnitDimensionsAreEqualTo(v2.unitDimensions);
		const count = Math.max(v1.valueCount, v2.valueCount);
		const a = new MMNumberValue(count, 1);
		const r = new MMNumberValue(count, 1, v1.unitDimensions);

		const rV = r.values;
		const aV = a.values;
		const yV = v1.values;
		const xV = v2.values;
		const countY = v1.valueCount;
		const countX = v2.valueCount;

		for (let i = 0; i < count; i++) {
			const iX = i % countX;
			const iY = i % countY;
			const x = xV[iX];
			const y = yV[iY];
			rV[i] = Math.sqrt(x*x + y*y);
			aV[i] = Math.atan2(y, x);
		}

		const aColumn = new MMTableValueColumn({
			name: 'a',
			displayUnit: 'degree',
			value: a
		});
		const rColumn = new MMTableValueColumn({
			name: 'r',
			value: r
		});

		return new MMTableValue({ columns: [rColumn, aColumn]})
	}	
}

class MMCartesianFunction extends MMMultipleArgumentFunction {
	// convert polar radius and angle to cartesian x, y

	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		const argCount = this.arguments.length;
		const arg1 = this.arguments[0].value();
		if (!arg1 || !arg1.valueCount) {
			return null;
		}

		if (argCount === 1 && arg1.columnCount !== 2) {
			this.formula.functionError('cart', 'mmcmd:formulaPolarSingleError');
			return null;
		}

		let v1 = null;
		let v2 = null;

		if (arg1 instanceof MMTableValue) {
			v2 = arg1.columns[0].value.numberValue();
			v1 = arg1.columns[1].value.numberValue();
		}
		else {
			v1 = arg1.numberValue();
			if (!v1) {
				return null;
			}

			if (argCount == 2) {
				const arg2 = this.arguments[1].value();
				if (arg2) {
					v2 = arg2.numberValue()
				}
				if (!v2) {
					return null;
				}
			}
			else {
				v2 = v1.valueForIndexRowColumn(MMNumberValue.scalarValue(0), MMNumberValue.scalarValue(1));
				v1 = v1.valueForIndexRowColumn(MMNumberValue.scalarValue(0), MMNumberValue.scalarValue(2));
			}
		}

		if (!MMUnitSystem.areDimensionsEqual(v1.unitDimensions, null)) {
			this.formula.functionError('cart', 'mmcmd:formulaAngleNotDimensionless');
			return null;
		}
		const count = Math.max(v1.valueCount, v2.valueCount);
		const x = new MMNumberValue(count, 1, v2.unitDimensions);
		const y = new MMNumberValue(count, 1, v2.unitDimensions);

		const xV = x.values;
		const yV = y.values;
		const aV = v1.values;
		const rV = v2.values;
		const countA = v1.valueCount;
		const countR = v2.valueCount;

		for (let i = 0; i < count; i++) {
			const iA = i % countA;
			const iR = i % countR;
			xV[ i ] = rV[ iR ] * Math.cos( aV[ iA ]);
			yV[ i ] = rV[ iR ] * Math.sin( aV[ iA ]);
		}

		const xColumn = new MMTableValueColumn({
			name: 'x',
			value: x
		});
		const yColumn = new MMTableValueColumn({
			name: 'y',
			value: y
		});

		return new MMTableValue({ columns: [xColumn, yColumn]})
	}	
}

// complex number functions

class MMCabsFunction extends MMSingleValueFunction {
	constructor(formula, cAbsolute) {
		super(formula);
		this.cAbsolute = cAbsolute;
	}

	operationOn(v) {
		if (v) {
			if (v.columnCount !== 2) {
				this.formula.functionError('cabs', 'mmcmd:formulaComplexColumnCount');
			}
			const rowCount = v.rowCount;
			const rv = new MMNumberValue(rowCount, 1, v.unitDimensions);
			const cabs = this.cAbsolute;
			for (let row = 1; row <= rowCount; row++) {
				const cArg = [v.valueAtRowColumn(row, 1), v.valueAtRowColumn(row, 2)];
				rv.setValue(cabs(cArg),row, 1);
			}
			return rv;
		}
		return null;
	}

	operationOnTable(v) {
		if (v) {
			if (v.columnCount !== 2) {
				this.formula.functionError('cabs', 'mmcmd:formulaComplexColumnCount');
			}
			const rowCount = v.rowCount;
			const rv = new MMNumberValue(rowCount, 1, v.unitDimensions);
			const cabs = this.cAbsolute;
			const re = v.columns[0].value;
			const img = v.columns[1].value;

			if (re instanceof MMNumberValue && img instanceof MMNumberValue) {
				if (!MMUnitSystem.areDimensionsEqual(re.unitDimensions, img.unitDimensions)) {
					this.formula.functionError('cabs', 'mmcmd:formulaFunctionUnitsEqual');
				}
				for (let row = 0; row < rowCount; row++) {
					const cArg = [re.values[row], img.values[row]];
					rv.values[row] = cabs(cArg);
				}
				return rv;
			}
		}
		return null;
	}
}

// reduction functions

class MMMinimumFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		let min = null;
		for (let arg of this.arguments) {
			let vMin = arg.value();
			if (vMin instanceof MMTableValue) {
				vMin = vMin.numberValue();
			}
			if (vMin instanceof MMNumberValue) {
				vMin = vMin.min();
				if (min === null) {
					min = vMin;
				}
				else {
					if (MMUnitSystem.areDimensionsEqual(min.unitDimensions, vMin.unitDimensions)) {
						if (vMin.values[0] < min.values[0]) {
							min = vMin;
						}
					}
					else {
						this.formula.functionError('min', 'mmcmd:unitTypeMismatch');
					}
				}
			}
			else {
				return null;
			}
		}
		return min;
	}
}

class MMRowMinimumsFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.minRows();
		}
	}

	operationOnTable(v) {
		if (v) {
			return v.numberValue().minRows();
		}
	}
}

class MMColumnMinimumsFunction extends MMSingleValueFunction {
	constructor(f) {
		super(f);
		this.noStringColumns = true;
	}

	operationOn(v) {
		if (v) {
			return v.minColumns();
		}
	}
}

class MMMaximumFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		let max = null;
		for (let arg of this.arguments) {
			let vMax = arg.value();
			if (vMax instanceof MMTableValue) {
				vMax = vMax.numberValue();
			}

			if (vMax instanceof MMNumberValue) {
				vMax = vMax.max();
				if (max === null) {
					max = vMax;
				}
				else {
					if (MMUnitSystem.areDimensionsEqual(max.unitDimensions, vMax.unitDimensions)) {
						if (vMax.values[0] > max.values[0]) {
							max = vMax;
						}
					}
					else {
						this.formula.functionError('max', 'mmcmd:unitTypeMismatch');
					}
				}
			}
			else {
				return null;
			}
		}
		return max;
	}
}

class MMRowMaximumsFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.maxRows();
		}
	}

	operationOnTable(v) {
		if (v) {
			return v.numberValue().maxRows();
		}
	}
}

class MMColumnMaximumsFunction extends MMSingleValueFunction {
	constructor(f) {
		super(f);
		this.noStringColumns = true;
	}

	operationOn(v) {
		if (v) {
			return v.maxColumns();
		}
	}
}

class MMSumFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.sum();
		}
	}

	operationOnTable(v) {
		if (v) {
			return v.numberValue().sum();
		}
	}
}

class MMSumRowsFunction extends MMSingleValueFunction {	
	operationOn(v) {
		if (v) {
			return v.sumRows();
		}
	}

	operationOnTable(v) {
		if (v) {
			return v.numberValue().sumRows();
		}
	}
}

class MMSumColumnsFunction extends MMSingleValueFunction {
	constructor(f) {
		super(f);
		this.noStringColumns = true;
	}

	operationOn(v) {
		if (v) {
			return v.sumColumns();
		}
	}
}

// comparison functions

class MMIfFunction extends MMFunctionOperator {
	processArguments(operandStack) {
		if (operandStack.length < 4) {
			return false; // needs three arguments plus operand marker
		}
		this.negativeArgument = operandStack.pop();
		this.positiveArgument = operandStack.pop();
		this.conditionArgument = operandStack.pop();
		const opMarker = operandStack.pop();
		return opMarker instanceof MMOperandMarker;
	}

	value() {
		const condition = this.conditionArgument.value();
		// if (condition instanceof MMNumberValue) {
			if (condition.valueCount === 1) {
				if (condition.values[0]) {
					return this.positiveArgument.value();
				}
				else {
					return this.negativeArgument.value();
				}
			}
			// value by value comparison
			const thenValue = this.positiveArgument.value();
			if (thenValue instanceof MMNumberValue) {
				const elseValue = this.negativeArgument.value();
				if (elseValue instanceof MMNumberValue) {
					return condition.ifThenElse(thenValue, elseValue);
				}
			}
			else if (thenValue instanceof MMStringValue) {
				const elseValue = this.negativeArgument.value();
				if (elseValue instanceof MMStringValue) {
					return condition.ifStringThenElse(thenValue, elseValue);
				}
			}
	}

	/**
	 * @virtual addInputSourcesToSet
	 * @param {Set} sources
	 */
	addInputSourcesToSet(sources) {
		this.conditionArgument.addInputSourcesToSet(sources);
		this.positiveArgument.addInputSourcesToSet(sources);
		this.negativeArgument.addInputSourcesToSet(sources);
	}

}

class MMComparisonFunction extends MMMultipleArgumentFunction {
	constructor(formula, func) {
		super(formula);
		this.func = func;
	}

	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const v1 = this.arguments[1].value();
		const v2 = this.arguments[0].value();

		if (v1 instanceof MMNumberValue && v2 instanceof MMNumberValue) {
			return v1.processDyadic(v2, MMDyadicUnitAction.equal, this.func);
		}
		else if	(v1 instanceof MMStringValue && v2 instanceof MMStringValue) {
			return v1.processStringDyadic(v2, this.func, true);
		}
		return null;
	}
}

class MMUnitlessComparisonFunction extends MMComparisonFunction {
	value() {
		const v1 = this.arguments[1].value();
		const v2 = this.arguments[0].value();
		if (v1 instanceof MMNumberValue && v2 instanceof MMNumberValue) {
			const rv = v1.processDyadic(v2, MMDyadicUnitAction.equal, this.func);
			// rv will have the unitdimensions of v1 - remove them
			rv.subtractUnitDimensions(v1.unitDimensions);
			return rv
		}
		else {
			return super.value();
		}
	}
}

// matrix functions

class MMAppendFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		let columnCount = 0;
		let first;
		let argCount = this.arguments.length;
		while (argCount-- > 0) {
			const obj = this.arguments[argCount].value();
		
			if (!first) {
				first = obj;
			}
			else if (Object.getPrototypeOf(obj).constructor == Object.getPrototypeOf(first).constructor) {
				if (first instanceof MMNumberValue) {
					first.checkUnitDimensionsAreEqualTo(obj.unitDimensions);
				}
				else if (first instanceof MMTableValue) {
					if (first.rowCount !== obj.rowCount) {
						this.formula.functionError('append','mmcmd:appendTableRowMismatch');
						return null;
					}
				}
			}
			else {
				return null;
			}
			columnCount += obj.columnCount;
		}

		if (columnCount) {
			if (first instanceof MMTableValue) {
				argCount = this.arguments.length;
				let columns = [];
				while (argCount-- > 0) {
					const table = this.arguments[argCount].value();
					if (!(table instanceof MMTableValue)) {
						return null;
					}
					columns = columns.concat(table.columns);
				}
				return new MMTableValue({columns: columns});
			}
			else {
				argCount = this.arguments.length - 1;  // minus one to skip first
				while (argCount-- > 0) {
					const add = this.arguments[argCount].value();
					first = first.append(add);
				}
				return first;
			}
		}
	}
}

class MMArrayFunction extends MMMultipleArgumentFunction {

	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

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

class MMColumnCountFunction extends MMSingleValueFunction {
	operationOn(v) {
		return MMNumberValue.scalarValue(v.columnCount);
	}

	operationOnString(v) {
		return this.operationOn(v);
	}

	operationOnTable(v) {
		return this.operationOn(v);
	}
}

class MMConcatFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		let valueCount = 0;
		let first;
		let argCount = this.arguments.length;
		while (argCount-- > 0) {
			const obj = this.arguments[argCount].value();
			if (!obj) {
				return null;
			}
		
			if (!first) {
				first = obj;
			}
			else if (Object.getPrototypeOf(obj).constructor == Object.getPrototypeOf(first).constructor) {
				if (first instanceof MMNumberValue) {
					first.checkUnitDimensionsAreEqualTo(obj.unitDimensions);
				}
				else if (first instanceof MMTableValue) {
					if (first.columnCount !== obj.columnCount) {
						this.formula.functionError('concat','mmcmd:concatTableColumnMismatch');
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

class MMCrossProductFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const v1 = this.arguments[1].value();
		const v2 = this.arguments[0].value();
		if (v1 instanceof MMNumberValue && v2 instanceof MMNumberValue) {
			return v1.cross(v2);
		}
		return null;
	}

}

class MMEigenValueFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.eigenValue();
		}
	}

	operationOnTable() {return null}
}

class MMEigenVectorFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack), 1;
	}

	value() {
		const matrix = this.arguments[1].value();
		if (matrix instanceof MMNumberValue) {
			const eigenValue = this.arguments[0].value();
			if (eigenValue instanceof MMNumberValue) {
				return matrix.eigenVectorForLamba(eigenValue);
			}
		}
		
		return null;	
	}
}

class MMInvertFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.invert();
		}
	}
}

class MMMatrixCellFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		if ((this.formula.owner instanceof MMMatrix)) {
			return false;
		}
		return super.processArguments(operandStack, 1);
	}

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

class MMMatrixColumnFunction extends MMFunctionOperator {
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

	value() {
		const matrix = this.formula.parent;
		return MMNumberValue.scalarValue(matrix.currentColumn, null);
	}
}

class MMMatrixMultiplyFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const v1 = this.arguments[1].value();
		const v2 = this.arguments[0].value();
		if (v1 instanceof MMNumberValue && v2 instanceof MMNumberValue) {
			return v1.matrixMultiply(v2);
		}
		return null;
	}
}

class MMMatrixRowFunction extends MMFunctionOperator {
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

	value() {
		const matrix = this.formula.parent;
		return MMNumberValue.scalarValue(matrix.currentRow, null);
	}
}

class MMRedimFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const matrix = this.arguments[1].value();
		if (matrix instanceof MMNumberValue || matrix instanceof MMStringValue) {
			return matrix.redimension(this.arguments[0].value());
		}
		return null;
	}
}

class MMRowCountFunction extends MMSingleValueFunction {
	operationOn(v) {
		return MMNumberValue.scalarValue(v.rowCount);
	}

	operationOnString(v) {
		return this.operationOn(v);
	}

	operationOnTable(v) {
		return this.operationOn(v);
	}
}

class MMTransposeFunction extends MMSingleValueFunction {
	operationOn(v) {
		return v.transpose();
	}

	operationOnString(v) {
		return this.operationOn(v);
	}
}

// statistical functions

class MMGenericAverageFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		const argCount = this.arguments.length;
		const value = this.arguments[argCount -  1].value();
		let rv = null;
		if (value instanceof MMNumberValue || value instanceof MMTableValue) {
			let resultType = MMFunctionResult.all;
			if (argCount > 1) {
				let typeValue = this.arguments[argCount -  2].value();
				typeValue = typeValue ? typeValue.numberValue() : null;
				if (typeValue) {
					const nType = typeValue.values[0];
					if (nType === 1.0) {
						resultType = MMFunctionResult.rows;
					}
					else if (nType > 1.0) {
						resultType = MMFunctionResult.columns;
					}
				}
			}
			rv = this.calculate(value, resultType);
		}
		return rv;
	}

	/** @method calculate
	 * @override - defines actual calculate by derived classes
	 * @param {MMValue} value - value operation will be performed on
	 * @param {MMFunctionResult} resultType - perform on just rows, or columns. or all
	 */
	// eslint-disable-next-line no-unused-vars
	calculate(value, resultType) {
		return null;
	}
}

class MMAverageFunction extends MMGenericAverageFunction {
	calculate(value, resultType) {
		return value.averageOf(resultType);
	}
}

class MMMedianFunction extends MMGenericAverageFunction {
	calculate(value, resultType) {
		return value.medianOf(resultType);
	}
}

class MMGeoMeanFunction extends MMGenericAverageFunction {
	calculate(value, resultType) {
		return value.geoMeanOf(resultType);
	}
}

class MMHarmonicMeanFunction extends MMGenericAverageFunction {
	calculate(value, resultType) {
		return value.harmonicMeanOf(resultType);
	}
}

class MMVarianceFunction extends MMGenericAverageFunction {
	calculate(value, resultType) {
		return value.varianceOf(resultType);
	}
}

class MMFactorialFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.factorial();
		}
	}
}

class MMNormalDistFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 3);
	}

	value() {
		const argCount = this.arguments.length;
		let arg = this.arguments[argCount -  1].value()
		const x = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  2].value()
		const u = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  3].value()
		const s = arg ? arg.numberValue() : null;
			
		if (x && u && s ) {
			let isCumulative = true;
			if ( argCount > 3 ) {
				let cumulative = this.arguments[argCount -  4].value();
				cumulative = cumulative ? cumulative.numberValue() : null;
				if (cumulative) {
					isCumulative = cumulative.values[0] === 0;
				}
			}
			
			return x.normalDistribution(u, s, isCumulative);
		}
		
		return null;
	}
}

class MMInverseNormalFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 3);
	}

	value() {
		const argCount = this.arguments.length;
		let arg = this.arguments[argCount -  1].value()
		const p = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  2].value()
		const u = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  3].value()
		const s = arg ? arg.numberValue() : null;
			
		if (p && u && s ) {
			return p.inverseNormalProbability(u, s);
		}
		
		return null;
	}
}

class MMBinomialDistFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 3);
	}

	value() {
		const argCount = this.arguments.length;
		let arg = this.arguments[argCount -  1].value()
		const n = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  2].value()
		const s = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  3].value()
		const p = arg ? arg.numberValue() : null;
			
		if (n && s && p ) {
			return n.binomialDistribution(s, p);
		}
		
		return null;
	}
}

class MMBetaDistFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 3);
	}

	value() {
		const argCount = this.arguments.length;
		let arg = this.arguments[argCount -  1].value()
		const x = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  2].value()
		const a = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  3].value()
		const b = arg ? arg.numberValue() : null;
			
		if (x && a && b ) {
			return x.betaDistribution(a, b);
		}
		
		return null;
	}
}

class MMChiTestFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const argCount = this.arguments.length;
		let arg = this.arguments[argCount -  1].value()
		const actual = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  2].value()
		const expected = arg ? arg.numberValue() : null;

		if (actual && expected ) {
			return actual.chiTest(expected);
		}
		
		return null;
	}
}

// table functions

class MMTableFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

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

// Miscellaneous functions

class MMAbsFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.abs();
		}
	}
}

class MMNumericFunction extends MMSingleValueFunction {
	/**
	 * @method value
	 * @override
	 * @returns {MMValue}
	 */
	value() {
		const v = this.argument ? this.argument.value() : null;
		if (v) {
			return v.numberValue();
		}
		return null;
	}
}

class MMRandFunction extends MMMultipleArgumentFunction {
	value() {
		const argCount = this.arguments.length;

		let columnCount = 1, rowCount = 1, rowArg = 0;
		if (argCount > 1) {
			const v = this.arguments[0].value();
			if (!v || !v.valueCount) {
				return null;
			}
			columnCount = Math.floor(v._values[0] + 0.0001);
			rowArg = 1;
		}

		if (argCount > 0) {
			let v = this.arguments[rowArg].value();
			v = v && v.numberValue();
			if (!v.valueCount) {
				return null;
			}
			rowCount = Math.floor(v._values[0] + 0.0001);
		}

		let rv = null;
		rv = new MMNumberValue(rowCount, columnCount);
		const valueCount = rv.valueCount;
		const vRv = rv._values;
		for (let i = 0; i < valueCount; i++) {
			vRv[i] = Math.random();
		}
		return rv;
	}
}

/**
 * @class MMFormula
 * @extends MMCommandObject
 * @member {string} formula
 * @member {MMModel} nameSpace
 * @member {boolean} isInError
 */
// eslint-disable-next-line no-unused-vars
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
		d['formula'] = {type: MMPropertyType.string, readOnly: false};
		return d;
	}

	get formula() {
		return this._formula;
	}

	set formula(newFormula) {
		if (newFormula && newFormula.length == 0) {
			newFormula = null;
		}

		if (newFormula == this._formula) {
			return;
		}

		if (this.parent) {
			this.parent.isHidingInfo = true;
		}

		// is this a bare numeric constant
		let re = /^-{0,1}\d+(\.\d+){0,1}([eE]-{0,1}\d+){0,1}$/;
		if(newFormula && re.test(newFormula)) {
			// is valid numeric
			let unit = this.parent.defaultFormulaUnit(this.name);
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
				theMMSession.popModel();
			}
		}
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['value'] = this.valueCommand;
		verbs['refresh'] = this.refreshCommand;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			value: 'mmcmd:?formulaValue',
			refresh: 'mmcmd:?formulaRefresh',
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
	 * @method refreshCommand
	 * command.results = value
	 */
	refreshCommand(command) {
		this.parent.forgetCalculated();
		const value = this.value();
		if (value) {
			command.results = value.jsonValue();
		}
		else {
			command.results = 'unknown';
		}
	}

	/**
	 * @method valueCommand
	 * command.results = json
	 */
	valueCommand(command) {
		const value = this.value();
		if (value) {
			command.results = value.jsonValue();
		}
		else {
			command.results = 'unknown';
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
			if (/^(-|\+)?([0-9]*(\.[0-9]*)?|Infinity)$/.test(parts[0])) {
				if (parts.length === 1) {
					return Number(value);
				}
				if (parts.length === 2 && /^(-|\+)?([0-9]+$)/.test(parts[1])) {
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
			for(;;) {
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
			for(;;) {
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
			for(;;) {
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
			let pattern = /"[\s\S]*?"|[=*/+\-^:%()'@{}#[\],]|[\w.$]+/g;
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
						return null;
					}
					if (!processIndex()) {
						return null;
					}
					treatMinusAsUnary = false;
				}
				else if (token == '{') {
					if (++i < nTokens) {
						token = tokens[i];
						// let f = MMFunctionDictionary[token];
						// if (f) {
						// 	let op = f(this);
						let op = MMFormulaFactory(token, this);
						if (op) {
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
						op = MMFormulaFactory(token, this);
						// let opFactory = MMFormulaOpDictionary[token];
						// if (opFactory) {
							// op = opFactory(this);
						if (op) {
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
							token += nextToken1 + nextToken2;
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