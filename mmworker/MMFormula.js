/*
	This file is part of Math Minion, a javascript based calculation program
	Copyright 2021, Craig Morris

	Math Minion is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Math Minion is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with Math Minion.  If not, see <https://www.gnu.org/licenses/>.
*/
'use strict';

/* global
	MMNumberValue:readonly
	MMTool:readonly
	MMMath:readonly
	MMValue:readonly
	MMToolValue:readonly
	MMStringValue:readonly
	MMTableValue:readonly
	MMJsonValue: readonly
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
		'lt': (f) => {return new MMUnitlessComparisonFunction(f, (a, b) => {return a < b ? 1 : 0;})},
		'le': (f) => {return new MMUnitlessComparisonFunction(f, (a, b) => {return a <= b ? 1 : 0;})},
		'gt': (f) => {return new MMUnitlessComparisonFunction(f, (a, b) => {return a > b ? 1 : 0;})},
		'ge': (f) => {return new MMUnitlessComparisonFunction(f, (a, b) => {return a >= b ? 1 : 0;})},
		'not': (f) => {return new MMNotFunction(f)},
		'and': (f) => {return new MMAndFunction(f)},
		'or': (f) => {return new MMOrFunction(f)},
		'isnan': (f) => {return new MMIsNanFunction(f)},


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
		'ttest': (f) => {return new MMStudentTFunction(f)},
		'tptest': (f) => {return new MMPairedStudentTFunction(f)},

		// table functions
		'table': (f) => {return new MMTableFunction(f)},
		'colnames': (f) => {return new MMColumnNamesFunction(f)},
		'groupsum': (f) => {return new MMGroupTableFunction(f, 'sum')},
		'groupmin': (f) => {return new MMGroupTableFunction(f, 'min')},
		'groupmax': (f) => {return new MMGroupTableFunction(f, 'max')},

		// lookup functions
		'lookup': (f) => {return new MMLookupFunction(f)},
		'indexof': (f) => {return new MMIndexOfFunction(f)},
		'select': (f) => {return new MMSelectFunction(f)},

		// string functions
		'fmt': (f) => {return new MMFormatFunction(f)},
		'join': (f) => {return new MMJoinFunction(f)},
		'split': (f) => {return new MMSplitFunction(f)},
		'match': (f) => {return new MMMatchFunction(f)},
		'replace': (f) => {return new MMReplaceFunction(f)},
		'strfind': (f) => {return new MMStringFindFunction(f)},
		'strlen': (f) => {return new MMStringLengthFunction(f)},
		'substr': (f) => {return new MMSubstringFunction(f)},
		'lowercase': (f) => {return new MMLowerCaseFunction(f)},
		'uppercase': (f) => {return new MMUpperCaseFunction(f)},
		'utf8': (f) => {return new MMUtf8Function(f)},

		// json functions
		'jsonparse': (f) => {return new MMJsonParseFunction(f)},

		// time functions
		'mktime': (f) => {return new MMMktimeFunction(f)},
		'date': (f) => {return new MMDateFunction(f)},
		'now': (f) => {return new MMNowFunction(f)},
		'timezone': (f) => {return new MMTimezoneFunction(f)},

		// 3d transform functions
		'pitch': (f) => {return new MMPitchFunction(f)},
		'roll': (f) => {return new MMRollFunction(f)},
		'yaw': (f) => {return new MMYawFunction(f)},
		'scale': (f) => {return new MMScaleFunction(f)},
		'translate': (f) => {return new MMTranslateFunction(f)},
		'transform': (f) => {return new MMTransformFunction(f)},

		// miscellaneous functions
		'abs': (f) => {return new MMAbsFunction(f)},
		'alert': (f) => {return new MMAlertFunction(f)},
		'baseunit': (f) => {return new MMBaseUnitFunction(f)},
		'defunit': (f) => {return new MMDefaultUnitFunction(f)},
		'eval': (f) => {return new MMEvalFunction(f)},
		'evaljs': (f) => {return new MMEvalJSFunction(f)},
		'getbit': (f) => {return new MMGetBitFunction(f)},
		'html': (f) => {return new MMHtmlFunction(f)},
		'int': (f) => {return new MMGenericSingleFunction(f, Math.trunc)},
		'numeric': (f) => {return new MMNumericFunction(f)},
		'rand': (f) => {return new MMRandFunction(f)},
		'round': (f) => {return new MMGenericSingleFunction(f, (x) => {
			return Math.trunc(x + 0.5 * Math.sign(x))
		})},
		'sign': (f) => {return new MMGenericSingleFunction(f, Math.sign)},
		'isort': (f) => {return new MMISortFunction(f)},
		'sort': (f) => {return new MMSortFunction(f)},
		'wfetch': (f) => {return new MMWFetchFunction(f)},
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
		const numberOpTable = (v1, v2) => {
			let vn, vt;
			if (v1 instanceof MMNumberValue) {
				vn = v1;
				vt = v2;
			}
			else {
				vn = v2;
				vt = v1;
			}
			let columnNumber  = 0;
			const columns = [];
			for (let column of vt.columns) {
				if (column.value instanceof MMStringValue) {
					// string columns aren't affected by operation
					columns.push(column);
				}
				else if (column.value instanceof MMNumberValue) {
					// perform the numeric operation between column value and second operand
					let numberValue;
					if (vn.columnCount > 1) {
						// get the appropriate column from the number value
						numberValue = vn.valueForColumnNumber(columnNumber + 1);
						columnNumber = (columnNumber + 1) % vn.columnCount;
					}
					else {
						numberValue = vn;
					}

					const newValue = v1 === vn ?
						this.operationOn(numberValue, column.value)
						:
						this.operationOn(column.value, numberValue);
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
		else if (v1 instanceof MMStringValue && (v2 instanceof MMStringValue || v2 instanceof MMNumberValue)) {
			return this.operationOn(v1, v2);
		}
		else if (v1 instanceof MMTableValue) {
			if (v2 instanceof MMNumberValue) {
					return numberOpTable(v1, v2);
			}
			else if (v2 instanceof MMTableValue) {
				// table operation table
				if (v1.rowCount !== 1 && v2.rowCount !== 1 && v1.rowCount !== v2.rowCount) {
					// must have same row count or one must have only one row
					v1.exceptionWith('mmcmd:tableArithRowCount');
				}
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
							displayUnit: displayUnit ? displayUnit.name : null,
							value: newValue
						})
						columns.push(newColumn);
					}
				}
				return new MMTableValue({columns: columns});
			}
		}
		else if (v2 instanceof MMTableValue && v1 instanceof MMNumberValue) {
			// if (v1.columnCount === 1) {
				return numberOpTable(v1, v2);
			// }
			// else {
			// 	return this.operationOn(v1, v2.numberValue());
			// }
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
		this.recursionCount = 0;
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

		if (this.recursionCount > 2) {
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
			try {
				this.recursionCount++;
				returnValue = tool.valueDescribedBy(args, this.formula.parent);
			}
			finally {
				this.recursionCount--;
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
			let rowValue = this.rowArgument.value();
			if (rowValue instanceof MMNumberValue && rowValue.valueAtRowColumn(1,1) === 0) {
				// to handle x[n].name, which gets transformed into
				// x[n][0,"name"] in formulaParser
				rowValue = this.columnArgument.value();
			}
			if (rowValue instanceof MMStringValue) {
				if (rowValue.valueCount === 1 && sourceValue.valueCount === 1) {
					const tool = sourceValue.valueAtRowColumn(1, 1);
					const valueDescription = rowValue.valueAtRowColumn(1, 1);
					return tool.valueDescribedBy(valueDescription, this.formula.owner);
				}
				else {
					let rv;
					const firstTool = sourceValue.valueAtRowColumn(1, 1);
					const firstDescription = rowValue.valueAtRowColumn(1, 1);
					const firstValue = firstTool.valueDescribedBy(firstDescription, this.formula.owner);
					const rowCount = sourceValue.valueCount;
					const columnCount = rowValue.valueCount;
					if (firstValue instanceof MMNumberValue) {
						rv = new MMNumberValue(rowCount, columnCount, firstValue.unitDimensions);
					}
					else if (firstValue instanceof MMStringValue) {
						rv = new MMStringValue(rowCount, columnCount);
					}
					else if (firstValue instanceof MMToolValue) {
						rv = new MMToolValue(rowCount, columnCount);
					}
					else {
						return null;
					}
					for (let row = 0; row < sourceValue.valueCount; row++) {
						const tool = sourceValue.valueAtCount(row);
						if (!tool) {
							return null;
						}
						for (let col = 0; col < rowValue.valueCount; col++) {
							const description = rowValue.valueAtCount(col);
							const value = tool.valueDescribedBy(description, this.formula.owner);
							if (!value || Object.getPrototypeOf(value).constructor !== Object.getPrototypeOf(firstValue).constructor) {
								if (firstValue instanceof MMNumberValue) {
									rv.setValue(NaN, row + 1, col + 1);
								}
								else {
									rv.setValue('???', row + 1, col + 1);
								}
							}
							else {
								rv.setValue(value.valueAtCount(0), row + 1, col + 1);
							}
						}
					}
					return rv;
				}
			}
		}
		if (sourceValue instanceof MMValue) {
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
				const start = Math.round(v1.valueAtRowColumn(1, 1));
				const end = Math.round(v2.valueAtRowColumn(1, 1));
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
				if (!this.needsNumericArgument || this.noStringColumns) {
					const calcValue = this.operationOnString(value);
					const calcColumn = new MMTableValueColumn({
						name: column.name,
						displayUnit: column.displayUnit,
						value: calcValue
					})
					calcColumns.push(calcColumn);
				}
				else {
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

	operationOnString(v) {
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

	operationOnString(v) {
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

class MMSumRowsFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		const argCount = this.arguments.length;
		let v, name;
		if (argCount > 1) {
			v = this.arguments[1].value();
			name = this.arguments[0].value();
		}
		else {
			v = this.arguments[0].value();
		}
		if (name instanceof MMStringValue) {
			// return a table value
			if (v instanceof MMNumberValue) {
				const sum = v.sumRows();
				const column = new MMTableValueColumn({
					name: name.values[0],
					displayUnit: null,
					value: sum
				});
				return new MMTableValue({columns: [column]});
			}
			else if (v instanceof MMTableValue) {
				const rowSums = v.numberValue().sumRows();
				const columns = [];
				let displayUnit
				for (let column of v.columns) {
					if (column.value instanceof MMStringValue) {
						// string columns aren't affected by operation
						columns.push(column);
					}
					else if (column.displayUnit) {
						displayUnit = column.displayUnit
					}
				}
	
				const newColumn = new MMTableValueColumn({
					name: name.values[0],
					displayUnit: displayUnit ? displayUnit.name : null,
					value: rowSums
				});
				columns.push(newColumn);
				return new MMTableValue({columns: columns});	
			}
		} else {
			if (v instanceof MMNumberValue) {
				return v.sumRows();
			}
			else if (v instanceof MMTableValue) {
				return v.numberValue().sumRows();
			}
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

	operationOnString(v) {
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
		if (condition) {
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
		else if (v1 instanceof MMTableValue && v2 instanceof MMTableValue) {
			if (v1.columnCount === v2.columnCount && v1.rowCount === v2.rowCount) {
				const columns = [];
				for (let n = 0; n < v1.columnCount; n++) {
					const cv1 = v1.columns[n].value;
					const cv2 = v2.columns[n].value;
					let cResult;
					if (cv1 instanceof MMNumberValue && cv2 instanceof MMNumberValue) {
						cResult = cv1.processDyadic(cv2, MMDyadicUnitAction.equal, this.func);
						// cRultes will have the unitdimensions of cv1 - remove them
						cResult.subtractUnitDimensions(cv1.unitDimensions);
					}
					else if	(cv1 instanceof MMStringValue && cv2 instanceof MMStringValue) {
						cResult =  cv1.processStringDyadic(cv2, this.func, true);
					}
					else {
						return null;
					}

					columns.push(new MMTableValueColumn({
						name: v1.columns[n].name,
						value: cResult
					}));			
				}
				return new MMTableValue({ columns: columns});
			}
			return null;
		}
		else {
			return super.value();
		}
	}
}

class MMOrFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const count = this.arguments.length;
		const arg1 = this.arguments[count - 1];
		const first = arg1.value();
		if (first == null) {
			return null;
		}
		const valueCount = first.valueCount;
		
		if (valueCount == 1) {
			for (let i = count; i > 0; i--) {
				const arg = this.arguments[i - 1];
				const v = arg.value();
				if ( v === null ) {
					return null;
				}
				
				if (v instanceof MMNumberValue) {
					if (v.valueCount && v.values[0]) {
						return v;
					}
				}
				else if (v instanceof MMStringValue) {
					if (v.valueCount && v.values[0].length) {
						return v;
					}
				}
			}
			return MMNumberValue.scalarValue(0);
		}
		else {
			// check arguments are compatible
			const values = [];
			for (let i = count; i > 0; i--) {
				const arg = this.arguments[i - 1];
				const v = arg.value();
				if (v == null) {
					return null;
				}
				
				values.push(v);
				if (v.valueCount != valueCount && v.valueCount != 1) {
					this.formula.functionError('or','mmcmd:formulaOrSizeMismatch');
					return null;
				}
				
				if (!(v instanceof MMNumberValue) && !(v instanceof MMStringValue)) {
					this.formula.functionError('or','mmcmd:formulaOrArgTypeError');
					return null;					
				}
			}
			
			const rv = new MMNumberValue(first.rowCount, first.columnCount);
			const rvValues = rv.values;
			
			for (let j = 0; j < valueCount; j++) {
				// start with false;
				rvValues[j] = 0.0;
				for (const v of values ) {
					if (v instanceof MMNumberValue) {
						if (v.valueCount == 1) {
							if (v.values[0] != 0.0) {
								rvValues[j] = 1.0;
							}
						}
						else {
							if (v.values[j] != 0.0 ) {
								rvValues[j] = 1.0;
							}
						}
					} else {  // MMStringValue
						if (v.valueCount == 1) {
							if (v.values[0].length) {
								rvValues[j] = 1.0;
							}
						}
						else {
							if (v.values[j].length) {
								rvValues[j] = 1.0;
							}
						}
					}
				}
			}
			return rv;
		}
	}
}

class MMAndFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const count = this.arguments.length;
		const arg1 = this.arguments[count - 1];
		const first = arg1.value();
		if (first == null) {
			return null;
		}
		const valueCount = first.valueCount;
		
		if (valueCount === 1) {
			for (let i = count; i > 0; i--) {
				const arg = this.arguments[i - 1];
				const v = arg.value();
				if ( v === null ) {
					return null;
				}
				
				if (v instanceof MMNumberValue) {
					if (!v.valueCount || !v.values[0]) {
						return MMNumberValue.scalarValue(0);
					}
				}
				else if (v instanceof MMStringValue) {
					if (!v.valueCount || !v.values[0].length) {
						return MMNumberValue.scalarValue(0);
					}
				}
			}
			return MMNumberValue.scalarValue(1);
		}
		else {
			// check arguments are compatible
			const values = [];
			for (let i = count; i > 0; i--) {
				const arg = this.arguments[i - 1];
				const v = arg.value();
				if (v == null) {
					return null;
				}
				
				values.push(v);
				if (v.valueCount != valueCount && v.valueCount != 1) {
					this.formula.functionError('or','mmcmd:formulaAndSizeMismatch');
					return null;
				}
				
				if (!(v instanceof MMNumberValue) && !(v instanceof MMStringValue)) {
					this.formula.functionError('or','mmcmd:formulaAndArgTypeError');
					return null;					
				}
			}
			
			const rv = new MMNumberValue(first.rowCount, first.columnCount);
			const rvValues = rv.values;
			
			for (let j = 0; j < valueCount; j++) {
				// start with true;
				rvValues[j] = 1.0;
				for (const v of values ) {
					if (v instanceof MMNumberValue) {
						if (v.valueCount == 1) {
							if (v.values[0] == 0.0) {
								rvValues[j] = 0;
							}
						}
						else {
							if (v.values[j] == 0.0 ) {
								rvValues[j] = 0;
							}
						}
					} else {  // MMStringValue
						if (v.valueCount == 1) {
							if (v.values[0].length === 0) {
								rvValues[j] = 0;
							}
						}
						else {
							if (v.values[j].length === 0) {
								rvValues[j] = 0;
							}
						}
					}
				}
			}
			return rv;
		}
	}
}

class MMNotFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.genericMonadic((n) => {
				return n === 0 ? 1 : 0;
			});
		}
	}

	operationOnString(v) {
		if (v) {
			const rv = new MMNumberValue(v.rowCount, v.columnCount);
			rv._values = v._values.map((n) => {
				return n && n.length ? 0 : 1;
			});
			return rv;
		}
	}

	operationOnTable(v) {
		return MMNumberValue.scalarValue(v ? 0 : 1);
	}
}

class MMIsNanFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.genericMonadic((n) => {
				return isNaN(n) ? 1 : 0;
			});
		}
	}

	operationOnString(v) {
		if (v) {
			const rv = new MMNumberValue(v.rowCount, v.columnCount);
			rv._values = v._values.map(() => {
				return 0;
			});
			return rv;
		}
	}

	operationOnTable(v) {
		if (v) {
			return MMNumberValue.scalarValue(0);
		}
	}
}

class MMTransformFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		const trans = this.arguments[1].value();
		const coords = this.arguments[0].value();

		if (trans instanceof MMNumberValue && coords instanceof MMNumberValue) {
			return trans.transform(coords);
		}
		return null;
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
		let isTableResult = false;
		while (argCount-- > 0) {
			const obj = this.arguments[argCount].value();
			if (!obj) {
				return null;
			}
			if (!first) {
				first = obj;
			}
			if (first instanceof MMTableValue ||
				obj instanceof MMTableValue ||
				Object.getPrototypeOf(obj).constructor !== Object.getPrototypeOf(first).constructor
				) {
				isTableResult = true;
				break;
			}
		}

		argCount = this.arguments.length - 1;
		while (argCount-- > 0) {
			const obj = this.arguments[argCount].value();
		
			if (isTableResult) {
				if (first.rowCount !== obj.rowCount) {
					this.formula.functionError('append','mmcmd:appendTableRowMismatch');
					return null;
				}
			}
			else if (Object.getPrototypeOf(obj).constructor == Object.getPrototypeOf(first).constructor) {
				if (first instanceof MMNumberValue) {
					if (!MMUnitSystem.areDimensionsEqual(first.unitDimensions, obj.unitDimensions)) {
						isTableResult = true;
					}
				}
			}
			else {
				return null;
			}
			columnCount += obj.columnCount;
		}

		if (columnCount) {
			if (isTableResult) {
				argCount = this.arguments.length;
				let columns = [];
				while (argCount-- > 0) {
					const arg = this.arguments[argCount];
					let table = arg.value();
					if (table instanceof MMTableValue) {
						columns = columns.concat(table.columns);
					}
					else if (table instanceof MMNumberValue || table instanceof MMStringValue) {
						const tableName = arg instanceof MMToolReferenceOperator ? arg.referencePath.replace(/\./g,'_') : '';
						const nColumns = table.columnCount;
						for (let n = 1; n <= nColumns; n++) {
							const columnName = (tableName && n === 1) ? tableName : `${tableName}${columns.length + 1}`;
							const column = new MMTableValueColumn({
								name: columnName,
								displayUnit: table instanceof MMStringValue ? 'string' : null,
								value: table.valueForColumnNumber(n)
							});
							columns.push(column);
						}
					}
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
				this.formula.functionError('concat','mmcmd:concatTypeMismatch');
				return null;
			}
			valueCount += obj.valueCount;
		}

		if (valueCount) {
			if (first instanceof MMTableValue) {
				const columnCount =  first.columnCount;
				let a = [];
				for (let column of first.columns) {
					if (column.value) {
						a.push(column.value);
					}
				}
				argCount = this.arguments.length - 1;  // subtract 1 to skip first
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
							this.formula.functionError('concat','mmcmd:concatColumnTypeMismatch');
							return null;
						}
					}
				}

				for (let i = 0; i < columnCount; i++)  {
					const firstColumn = first.columns[i];
					a[i] = new MMTableValueColumn({
						name: firstColumn.name,
						displayUnit: firstColumn.displayUnit ? firstColumn.displayUnit.name : null,
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
		let matrix = this.arguments[1].value();
		if (matrix instanceof MMTableValue) { matrix = matrix.numberValue(); }
		if (matrix instanceof MMNumberValue) {
			let eigenValue = this.arguments[0].value();
			if (eigenValue instanceof MMTableValue) { eigenValue = eigenValue.numberValue(); }
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

	operationOnTable(v) {
		const copy = new MMTableValue({columns: v.columns});
		copy.isTransposed = !v.isTransposed;
		return copy;
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

class MMStudentTFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const argCount = this.arguments.length;
		let arg = this.arguments[argCount -  1].value()
		const a = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  2].value()
		const b = arg ? arg.numberValue() : null;

		if (a && b ) {
			return a.studentT(b);
		}
		
		return null;
	}
}

class MMPairedStudentTFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const argCount = this.arguments.length;
		let arg = this.arguments[argCount -  1].value()
		const a = arg ? arg.numberValue() : null;

		arg = this.arguments[argCount -  2].value()
		const b = arg ? arg.numberValue() : null;

		if (a && b ) {
			return a.pairedStudentT(b);
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
		let argIncrement = 1;
		if (nameParam instanceof MMStringValue) {
			nameCount = nameParam.valueCount;
			if (argCount === 1) {
				const csvValue = nameParam.values[0];
				if (nameCount === 1 && csvValue && csvValue.startsWith('table')) {
					return new MMTableValue({csv: csvValue, path: this.formula.parent.getPath()});
				}
				else {
					return null;
				}
			}
			if (nameCount === 1 && argCount > 2) {
				// alternating names and columns
				argIncrement = 2;
				nameCount = 0;
				for (let argNo = argCount - 1; argNo >= 0; argNo -= argIncrement) {
					const arg = this.arguments[argNo];
					const nameValue = arg.value();
					if (nameValue instanceof MMStringValue) {
						names.push(nameValue.valueAtCount(0));
						nameCount++;
					}
					else {
						this.formula.setError('mmcmd:tableNameNotString', {
							formula: this.formula.truncatedFormula(),
							path: this.formula.parent.getPath()
						});
						return null;
					}
				}
			}
			else {
				// column list followed by columns
				for (let  i = 0;  i < nameCount; i++) {
					names.push(nameParam.valueAtCount(i));
				}
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
		for (let argNo = argCount - 2; argNo >= 0; argNo -= argIncrement) {
			const arg = this.arguments[argNo];
			const v = arg.value();
			if (v instanceof MMValue) {
				// only take first column if using paired arguments
				const maxColumns = argIncrement === 2 ? 1 : v.columnCount;
				for (let i = 0; i < maxColumns && addColumnCount < nameCount; i++) {
					const cValue = v.valueForColumnNumber(i + 1);
					if (!(cValue instanceof  MMNumberValue) && !(cValue instanceof MMStringValue)) {
						return null;
					}
					const column = new MMTableValueColumn({
						name: names[addColumnCount],
						value: cValue
					});

					if (templateColumns && !column.isString) {
						const templateColumn = templateColumns[addColumnCount];
						if (MMUnitSystem.areDimensionsEqual(templateColumn.displayUnit.dimensions, cValue.unitDimensions)) {
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

class MMColumnNamesFunction extends MMSingleValueFunction {
	operationOnTable(v) {
		const nameCount = v.columnCount;
		const rv = new MMStringValue(nameCount, 1);
		let i = 0;
		for (let column of v.columns) {
			rv.setValueAtCount(column.name,i++);
		}
		
		return rv;	
	}
}

class MMGroupTableFunction extends MMMultipleArgumentFunction {
	constructor(f, action) {
		super(f);
		this.action = action;
	}
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const t = this.arguments[1].value();
		const s = this.arguments[0].value();
		if (!(t instanceof MMTableValue) || !(s instanceof MMStringValue)) {
			this.formula.setError('mmcmd:formulaGroupArgs', {
				path: this.formula.parent.getPath(),
				action: this.action,
				formula: this.formula.truncatedFormula()
			});
			return null;
		}

		const keyColumn = t.columnNamed(s.values[0]);
		if (!keyColumn) {
			return null;
		}
		const keyValues = keyColumn.value;
		let isStringKey = false;
		if (keyValues instanceof MMStringValue) {
			isStringKey = true;
		}
		const rowCount = t.rowCount;
		const columns = [];
		for (let column of t.columns) {
			if (column.value instanceof MMNumberValue && column !== keyColumn) {
				columns.push(column);
			}
		}
		const columnCount = columns.length;
		const sums = {};
		const sortedKeys = [];
		for (let row = 0; row < rowCount; row++) {
			const key = keyValues.valueAtCount(row);
			let sum = sums[key];
			if (!sum) {
				sum = new MMNumberValue(columnCount, 1);
				switch (this.action) {
					case 'min':
						for(let i = 0; i < columnCount; i++) {
							sum.values[i] = Number.MAX_VALUE;
						}
						break;
						case 'max':
							for(let i = 0; i < columnCount; i++) {
								sum.values[i] = -Number.MAX_VALUE;
							}
							break;
					}
				sums[key] = sum;
				sortedKeys.push(key);
			}
			let i = 0;
			for (let column of columns) {
				const v = column.value;
				switch (this.action) {
					case 'sum':
						sum.values[i++] += v.values[row];
						break;

					case 'min':
					sum.values[i] = Math.min(sum.values[i], v.values[row]);
					i++;
					break;
					
					case 'max':
					sum.values[i] = Math.max(sum.values[i], v.values[row]);
					i++;
					break;
					
					default:
						return null;
					}
			}
		}

		let keyValue = null;
		const sumsCount = Object.keys(sums).length;
		if (isStringKey) {
			keyValue = new MMStringValue(sumsCount, 1);
		}
		else {
			keyValue = new MMNumberValue(sumsCount, 1, keyValues.unitDimensions);
		}

		let row = 0;
		for (let key of sortedKeys) {
			keyValue.setValueAtCount(key, row++)
		}

		const newColumns = [
			new MMTableValueColumn({
				name: s.valueAtCount(0),
				value: keyValue
			})
		];

		for (let i = 0; i < columnCount; i++) {
			const oldColumn = columns[i];
			const oldValue = oldColumn.value;
			const v = new MMNumberValue(sumsCount, 1, oldValue.unitDimensions);
			for (let row = 0; row < sumsCount; row++) {
				const key = sortedKeys[row];
				const sumV = sums[key];
				v.values[row] = sumV.values[i];
			}

			const column = new MMTableValueColumn({
				name: oldColumn.name,
				displayUnit: oldColumn.displayUnit ? oldColumn.displayUnit.name : null,
				value: v
			});
			newColumns.push(column);
		}
		return new MMTableValue({
			columns: newColumns
		});
	}
}

// Lookup functions

class MMLookupFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 3);
	}

	value() {
		const lookup = this.arguments[2].value();
		const index = this.arguments[1].value();
		const values = this.arguments[0].value();

		if (lookup instanceof MMNumberValue &&
				index instanceof MMNumberValue &&
				values instanceof MMNumberValue
			) {
			return lookup.lookup(index, values);
		}
	}
}

class MMIndexOfFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const value = this.arguments[1].value();
		const array = this.arguments[0].value();
		if (array && value) {
			if (
				(array instanceof MMNumberValue || array instanceof MMStringValue) &&
				Object.getPrototypeOf(array) === Object.getPrototypeOf(value)
			) {
				return array.indexOf(value);
			}
			else {
				this.formula.setError('mmcmd:formulaIndexOfTypeError');
				return null;
			}
		}
	}
}

class MMSelectFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const v = this.arguments[1].value();
		const b = this.arguments[0].value();
		if ((v instanceof MMValue) && (b instanceof MMNumberValue || b instanceof MMStringValue)) {
			return v.select(b);
		}
		return null;
	}
}

// String functions

class MMFormatFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const argCount = this.arguments.length;
		let argNo = 0;
		let unit = null;
		if (argCount > 2) {
			const unitParam = this.arguments[argNo++].value();
			if (!(unitParam instanceof MMStringValue)) {
				this.formula.setError('mmcmd:formulaFmtUnitError');
				return null;
			}
			const unitName = unitParam.values[0];
			unit = theMMSession.unitSystem.unitNamed(unitName);
		}
		const value = this.arguments[argNo++].value();
		const format = this.arguments[argNo].value();
		if (format instanceof MMStringValue && value instanceof MMNumberValue) {
			return value.format(format, unit)
		}
		return null;
	}
}

class MMJoinFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const argCount = this.arguments.length;		
		if (argCount == 2) {
			const array = this.arguments[1].value();
			const join = this.arguments[0].value();
			if (array instanceof MMStringValue && join instanceof MMStringValue) {
				return array.join(join);
			}
		}
		else if (argCount === 3) {
			const array = this.arguments[2].value();
			const columnJoin = this.arguments[1].value();
			const rowJoin = this.arguments[0].value();
			if (
				array instanceof MMStringValue &&
				columnJoin instanceof MMStringValue &&
				rowJoin instanceof MMStringValue
			) {
				return array.join(columnJoin, rowJoin);
			}
		}	
	}	
}

class MMSplitFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		const argCount = this.arguments.length;	
		if (argCount === 1) {
			const s = this.arguments[0].value();
			if (s instanceof MMStringValue) {
				return s.split();
			}
		}	
		else if (argCount == 2) {
			const s = this.arguments[1].value();
			const separator = this.arguments[0].value();
			if (s instanceof MMStringValue && separator instanceof MMStringValue) {
				return s.split(separator);
			}
		}
		else if (argCount === 3) {
			const s = this.arguments[2].value();
			const columnSep = this.arguments[1].value();
			const rowSep = this.arguments[0].value();
			if (
				s instanceof MMStringValue &&
				columnSep instanceof MMStringValue &&
				rowSep instanceof MMStringValue
			) {
				return s.split(columnSep, rowSep);
			}
		}	
	}	
}

class MMMatchFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		let argNo = 0;
		const sValue = this.arguments[argNo++].value();
		const regex = this.arguments[argNo].value();
		if (regex instanceof MMStringValue && sValue instanceof MMStringValue) {
			return sValue.processStringDyadic(regex, (s, r) => {
				const m = s.match(r);
				if (m) {
					return m[0];
				}
				else {
					return '';
				}
			}, false);
		}
		return null;
	}
}

class MMReplaceFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 3);
	}

	value() {
		const argCount = this.arguments.length;	
		let argNo = 0;
		let options = 'g';
		if (argCount === 4) {
			const optionValue = this.arguments[argNo++].value();
			if (optionValue instanceof MMStringValue) {
				options = optionValue[0];
			}
		}
		const s = this.arguments[argNo++].value();
		const replace = this.arguments[argNo++].value();
		const match = this.arguments[argNo++].value();

		if (s instanceof MMStringValue &&
				replace instanceof MMStringValue &&
				match instanceof MMStringValue
			) {
			return s.replace(match, replace, options);
		}
	}
}

class MMStringFindFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const regex = this.arguments[0].value();
		const sValue = this.arguments[1].value();
		if (regex instanceof MMStringValue && sValue instanceof MMStringValue) {
			return sValue.find(regex);
		}
		return null;
	}
}

class MMStringLengthFunction extends MMSingleValueFunction {
	operationOnString(v) {
		let rv = new MMNumberValue(v.rowCount, v.columnCount);
		rv._values = v._values.map(s => s.length);
		return rv;
	}
}

class MMSubstringFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const argCount = this.arguments.length;
		let s, from, length;
		if (argCount > 2) {
			s = this.arguments[2].value()
			from = this.arguments[1].value();
			length = this.arguments[0].value();	
		}
		else {
			s = this.arguments[1].value()
			from = this.arguments[0].value();
		}
		if (s && from instanceof MMNumberValue && (!length || length instanceof MMNumberValue)) {
			return s.subString(from, length);
		}
		return null;
	}
}

class MMLowerCaseFunction extends MMSingleValueFunction {
	operationOnString(v) {
		const rv = new MMStringValue(v.rowCount, v.columnCount);
		rv._values = v._values.map(s => s.toLowerCase());
		return rv;
	}
}

class MMUpperCaseFunction extends MMSingleValueFunction {
	operationOnString(v) {
		const rv = new MMStringValue(v.rowCount, v.columnCount);
		rv._values = v._values.map(s => s.toUpperCase());
		return rv;
	}
}

class MMUtf8Function extends MMSingleValueFunction {
	operationOn(v) {
		if (v.valueCount) {
			const rv = new MMStringValue(1, 1);
			rv._values[0] = v._values.map(n => String.fromCharCode(n)).join('');
			return rv;
		}
		return null;
	}

	operationOnString(v) {
		if (v.valueCount) {
			const s = v._values[0];
			if (s.length) {
				const rv = new MMNumberValue(s.length, 1);
				rv._values = s.split('').map(c => c.charCodeAt(0));
				return rv;
			}
		}
		return null;
	}
}

class MMJsonParseFunction extends MMSingleValueFunction {
	operationOnString(v) {
		if (v.valueCount) {
			const s = v._values[0];
			if (s.length) {
				const rv = new MMJsonValue(s);
				return rv;
			}
		}
		return null;
	}
}


// Time functions

class MMMktimeFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.mktime();
		}
	}
}

class MMDateFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.date();
		}
	}
}

class MMNowFunction extends MMFunctionOperator {
	processArguments(operandStack) {
		if (operandStack.length > 0 && operandStack[operandStack.length - 1] instanceof MMOperandMarker) {
			operandStack.pop()
			return true;
		}
		return false;
	}

	value() {
		const d = new Date();
		return MMNumberValue.scalarValue(d.getTime() / 1000, [0,0,1,0,0,0,0]);
	}
}

class MMTimezoneFunction extends MMFunctionOperator {
	processArguments(operandStack) {
		if (operandStack.length > 0 && operandStack[operandStack.length - 1] instanceof MMOperandMarker) {
			operandStack.pop()
			return true;
		}
		return false;
	}

	value() {
		const n = (new Date()).getTimezoneOffset() * -60;
		return MMNumberValue.scalarValue(n, [0,0,1,0,0,0,0]);
	}
}

// 3D Transform functions

class MMRollFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.roll();
		}
	}
}

class MMPitchFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.pitch();
		}
	}
}

class MMYawFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.yaw();
		}
	}
}

class MMTranslateFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.translate();
		}
	}
}

class MMScaleFunction extends MMSingleValueFunction {
	operationOn(v) {
		if (v) {
			return v.scale();
		}
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

class MMAlertFunction extends MMSingleValueFunction {
	operationOnString(v) {
		if (v.valueCount > 0) {
			const msg = (v.valueCount > 1) ? v._values[0] + '\n\n' + v._values[1] : v._values[0];
			this.formula.setWarning('mmcmd:alertMessage', {msg: msg});
		}
		else {
			this.formula.setWarning('mmcmd:emptyAlert')
		}
	}
}

class MMBaseUnitFunction extends MMSingleValueFunction {
	operationOn(v) {
		return MMNumberValue.scalarValue(1, v.unitDimensions);
	}
}

class MMDefaultUnitFunction extends MMSingleValueFunction {
	operationOn(v) {
		const name = v.defaultUnit.name;
		return MMStringValue.scalarValue(name);
	}
}

class MMEvalFunction extends MMSingleValueFunction {
	constructor(f) {
		super(f);
		this.evalFormula = new MMFormula('evalFormula', this.formula.parent);
	}

	operationOnString(s) {
		if (s.valueCount > 1) {
			this.evalFormula.formula = s._values[0];
			this.evalFormula._nameSpace = theMMSession.currentModel;
			const first = this.evalFormula.value();
			let result;
			if (first instanceof MMNumberValue) {
				result = new MMNumberValue(s.rowCount, s.columnCount, first.unitDimensions);
			}
			else if (first instanceof MMStringValue) {
				result = new MMStringValue(s.rowCount, s.columnCount);
			}
			result.values[0] = first.values[0];
			for (let i = 1; i < s.valueCount; i++) {
				this.evalFormula.formula = s._values[i];
				const v = this.evalFormula.value();
				if (v) {
					if (Object.getPrototypeOf(v) != Object.getPrototypeOf(first)) {
						v.exceptionWith('mmcmd:evalTypeMismatch');
					}
					if (v instanceof MMNumberValue) {
							first.checkUnitDimensionsAreEqualTo(v.unitDimensions);
					}
					result.values[i] = v.values[0];
				}
				else {
					if (first instanceof MMStringValue) {
						result.values[i] = '???';
					}
					else {
						result.values[i] = NaN;
					}
				}
			}
			return result;
		}
		else if (s.valueCount) {
			this.evalFormula.formula = s._values[0];
			return this.evalFormula.value();
		}
	}

	operationOn(n) {
		return n;
	}
}

class MMEvalJSFunction extends MMMultipleArgumentFunction {
	constructor(f) {
		super(f);
		this.cachedCode = null;
		this.jsFunction = null;
	}

	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		// change disabled to false if you want to enable evaljs and understand the risks
		const disabled = true;
		if (disabled) {
			this.formula.setError('mmcmd:evaljsDisabled');
			return;
		}
		const makeValue = (element, rowCount, columnCount) => {
			const values = element.values;
			const unitName = element.unit;
			let unit = null;
			let isStringValue = false;
			if (typeof unitName === 'string') {
				if (unitName === 'string') {
					isStringValue = true;
				}
			}
			let rv;
			if (isStringValue) {
				rv = new MMStringValue(rowCount,columnCount);
			}
			else {
				unit = theMMSession.unitSystem.unitNamed(unitName);
				const unitDimensions = unit ? unit.dimensions : null;
				rv = new MMNumberValue(rowCount, columnCount, unitDimensions);
			}
			const rvValues = rv.values;
			const valueCount = rowCount * columnCount;
			for (let i = 0; i < valueCount; i++) {
				let v = values[i];
				if (isStringValue) {
					if (typeof v === 'string') {
						rvValues[i] = v;
					}
				}
				else if (typeof v === 'number') {
					if (unit) {
						v = unit.convertToBase(v);
					}
					rvValues[i] = v;
				}
			}
			return rv;
		}
		const argCount = this.arguments.length;
		const codeValue = this.arguments[argCount - 1].value();
		if (codeValue instanceof MMStringValue && codeValue.valueCount) {
			const code = codeValue.values[0];
			if (code.length) {
				const evalArgs = [];
				for (let argNo = argCount - 2; argNo >= 0; argNo--) {
					const argValue = this.arguments[argNo].value();
					if (argValue === null) {
						return null;
					}
					if (argValue instanceof MMStringValue) {
						evalArgs.push({unit: 'string', columns: argValue.columnCount, values: argValue.values});
					}
					else if (argValue instanceof MMNumberValue) {
						const baseUnit = theMMSession.unitSystem.baseUnitWithDimensions(argValue.unitDimensions);
						evalArgs.push({unit: baseUnit.name, columns: argValue.columnCount, values: argValue.values});
					}
					else if (argValue instanceof MMTableValue) {
						const columnCount = argValue.columnCount;
						const tableColumns = [];
						for (let columnNumber = 0; columnNumber < columnCount; columnNumber++) {
							const tableColumn = argValue.columns[columnNumber];
							const value = tableColumn.value;
							if (value instanceof MMStringValue) {
								tableColumns.push({name: tableColumn.name, unit: 'string', values: value._values});
							}
							else {
								let unitName = tableColumn.displayUnit.name;
								const unit = theMMSession.unitSystem.unitNamed(unitName);
								const valueCount = value.valueCount;
								const values = [];
								const baseValues = value.values;
								for (let i = 0; i < valueCount; i++) {
									values.push(unit.convertFromBase(baseValues[i]));
								}
								tableColumns.push({name: tableColumn.name, unit: unitName, values: values});
							}
						}
						evalArgs.push(tableColumns);
					}
					else {
						this.formula.setError('mmcmd:evaljsBadArg', {
							argNo: argCount - argNo,
							formula: this.formula.truncatedFormula(),
							path: this.formula.parent.getPath()
						});
						return null;
					}
				}

				if (!this.jsFunction || this.cachedCode !== code) {
					this.jsFunction = new Function('"use strict";const mm_args = arguments[0];' + code);
					this.cachedCode = code;
					// console.log('compiled: ' + code);
				}
				const jsReturn = this.jsFunction(evalArgs);
				if (!jsReturn) {
					return null;
				}
				if (typeof jsReturn === "string") {
					return MMStringValue.scalarValue(jsReturn);
				}
				else if (typeof jsReturn === 'number') {
					return MMNumberValue.scalarValue(jsReturn);
				}
				else if (jsReturn.buffer) {  // if it has buffer, assume float64array
					if (jsReturn.length) {
						return MMNumberValue.numberArrayValue(jsReturn);
					}
				}
				else if (Array.isArray(jsReturn)) {
					if (jsReturn.length) {
						if (typeof jsReturn[0] === 'number') {
							return MMNumberValue.numberArrayValue(jsReturn);
						}
						if (typeof jsReturn[0] === 'string') {
							return MMStringValue.stringArrayValue(jsReturn);
						}
						if (typeof jsReturn[0] === 'object') {
							const count = jsReturn.length;
							const columns = [];
							let rowCount = 0;	// will fill in from first column values
							for (let i = 0; i < count; i++) {
								const element = jsReturn[i];
								if (typeof element === 'object') {
									if (!(typeof element.name === 'string')) {
										this.formula.setError('mmcmd:evaljsNoColumnName', {
											colNo: i + 1,
											formula: this.formula.truncatedFormula(),
											path: this.formula.parent.getPath()
										});
										return null;
									}
									const name = element.name;
									if (!Array.isArray(element.values)) {
										this.formula.setError('mmcmd:evaljsNoValues', {
											colNo: i + 1,
											formula: this.formula.truncatedFormula(),
											path: this.formula.parent.getPath()
										});
										return null;
									}
									const values = element.values;
									if (i === 0) {
										rowCount = values.length;
									}
									else if (rowCount !== values.length) {
										this.formula.setError('mmcmd:evaljsUnequalRowCount', {
											formula: this.formula.truncatedFormula(),
											path: this.formula.parent.getPath()
										});
										return null;
									}
									const columnValue = makeValue(element, rowCount, 1);
									const tableColumn = new MMTableValueColumn({
										name: name,
										displayUnit: element.unit,
										value: columnValue
									});
									columns.push(tableColumn);
								}
							}
							return new MMTableValue({columns: columns});
						}
					}
				}
				else if (typeof jsReturn === 'object') {
					const values = jsReturn.values;
					if (!Array.isArray(values)) {
						this.formula.setError('mmcmd:evaljsNoObjValues', {
							formula: this.formula.truncatedFormula(),
							path: this.formula.parent.getPath()
						});
						return null;
					}
					let columnCount = (typeof jsReturn.columns === 'number') ? jsReturn.columns : 1;
					const valueCount = values.length;
					if (valueCount % columnCount) {
						this.formula.setError('mmcmd:evaljsBadColumnCount', {
							formula: this.formula.truncatedFormula(),
							columnCount: columnCount,
							valueCount: valueCount,
							path: this.formula.parent.getPath()
						});
						return null;
					}
					return makeValue(jsReturn, valueCount/columnCount, columnCount);
				}
			}
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

class MMGetBitFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const bitNumber = this.arguments[1].value();
		const array = this.arguments[0].value();
		if (array && bitNumber) {
			if (array instanceof MMNumberValue && bitNumber instanceof MMNumberValue) {
				return array.getbit(bitNumber);
			}
			else {
				this.formula.setError('mmcmd:formulaGetBitTypeError');
				return null;
			}
		}
	}
}

class MMHtmlFunction extends MMSingleValueFunction {
	/**
	 * @method value
	 * @override
	 * @returns {MMStringValue}
	 */
	value() {
		let v = this.argument ? this.argument.value() : null;
		if (v instanceof MMValue) {
			const html = v.htmlValue();
			if (html) {
				return MMStringValue.scalarValue(html);
			}
		}
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

class MMISortFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 1);
	}

	value() {
		const argCount = this.arguments.length;
		this.v = this.arguments[argCount > 1 ? 1 : 0].value();
		let columnNumber = 0;
		let reversed = false;
		if (argCount > 1 ) {
			const columnValue = this.arguments[0].value();
			if (columnValue instanceof MMNumberValue) {
				columnNumber = columnValue.values[0];
				if (columnNumber < 0) {
					columnNumber = -columnNumber;
					reversed = true;
				}
			}
			if (columnNumber < 1 || columnNumber > this.v.columnCount) {
				this.formula.setError('mmcmd:formulaSortBadColumn', {
					path: this.formula.parent.getPath(),
					formula: this.formula.truncatedFormula()
				});
				return null;
			}
			columnNumber--;
		}
		if (this.v instanceof MMNumberValue || this.v instanceof MMStringValue) {
			const indices = this.v.iSort();
			if (reversed) {
				indices._values = indices._values.reverse();
			}
			return indices
		}
		else if (this.v instanceof MMTableValue) {
			const column = this.v.columns[columnNumber];
			const indices = column.value.iSort();
			if (reversed) {
				indices._values = indices._values.reverse();
			}
			return indices
		}
	}
}

class MMSortFunction extends MMISortFunction {
	value() {
		const indices = super.value();
		if (indices) {
			return this.v.valueForIndexRowColumn(indices)
		}
	}
}

class MMWFetchFunction extends MMMultipleArgumentFunction {
	processArguments(operandStack) {
		return super.processArguments(operandStack, 2);
	}

	value() {
		const argCount = this.arguments.length;
		const methodArg = this.arguments[argCount - 1].value();
		const urlArg = this.arguments[argCount - 2].value();
		const request = new XMLHttpRequest();
		request.open(methodArg.values[0], urlArg.values[0], false);
		request.withCredentials = true;
		if (argCount > 2) {
			const headerArg = this.arguments[argCount - 3].value();
			if (headerArg instanceof MMStringValue) {
				for (let i = 0; i + 1 < headerArg.valueCount; i += 2) {
					request.setRequestHeader(headerArg.values[i], headerArg.values[i+1]);
				}
			}
		}
		const data = argCount > 3 ? this.arguments[0].value().values[0] : null;
		try {
			request.send(data);
		}
		catch(e) {
			return MMStringValue.scalarValue(e.message);
		}
		return MMStringValue.scalarValue(request.responseText);
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
		if (typeof newFormula === 'number') {
			newFormula = `${newFormula}`;
		}
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
			this.parseFormula();
			if (needToPop) {
				theMMSession.popModel();
				needToPop = false;
			}
			this.parent.changedFormula(this);
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
			value: 'mmcmd:_formulaValue',
			refresh: 'mmcmd:_formulaRefresh',
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
		this.parseFormula();
		command.results = 'forgotten';
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
			const parts = value.toLowerCase().split('e');
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

		if (!this._formula || this.isInError) {
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
						unitName = unitName.substring(1,unitName.length - 1);  // strip quotes
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
			// but first look for a ) ] or } follow by a dot and replace with index
			const dotRegex = /([)}\]])\.(\w+)/;
			while (workingFormula.match(dotRegex)) {
				workingFormula = workingFormula.replace(dotRegex, '$1[0,"$2"]');
			}

			let pattern = /"[\s\S]*?"|`[\s\S]*?`|[=*/+\-^:%()'@{}#[\],]|[\w.$]+|[\s]+/g;
			tokens = workingFormula.match(pattern);
			let nTokens = tokens.length;
			let startOp = new MMParenthesisOperator();
			operatorStack.push(startOp);
			parenCount = 1;
			let treatMinusAsUnary = true;
			const spaceRegex = /^\s+$/;
			const unitRegex = /^[\w^/-]+$/;
			for (let i = 0; i < nTokens; i++) {
				let token = tokens[i];
				if (spaceRegex.test(token)) {
					continue;
				} 
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
				else if (token.startsWith('`')) {
					token = token.replace(/`/g, '');
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
						let op = MMFormulaFactory(token.toLowerCase(), this);
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
						op = MMFormulaFactory(token.toLowerCase(), this);
						if (op) {
							let prevOp = operatorStack[operatorStack.length - 1];
							if (!prevOp) {
								this.syntaxError(this.t('mmcmd:formulaSyntaxError'));
								return null;
							}
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
							let foundRadix = false;
							if (token.length > 3 && token[2] === 'r') {
								const radix = parseInt(token.substring(0,2));
								if (radix >= 2 && radix <= 36 ) {
									scalarValue = parseInt(token.substring(3), radix);
									foundRadix = true;
								}
							}
							if (!foundRadix) {
								this.syntaxError(this.t('mmcmd:formulaInvalidNumber'));
								return null;
							}
						}

						// see if last operator was unary minus
						if (operatorStack[operatorStack.length - 1] instanceof MMUnaryMinusOperator) {
							operatorStack.pop();
							scalarValue *= -1;
						}

						let op;
						let k = i + 1;
						if (k < nTokens && spaceRegex.test(tokens[k])) {
							k++; i++;
						}
						if (k < nTokens) {
							let unitToken = tokens[k];
							let quoted = false;
							if (unitToken.startsWith('"') && unitToken.length > 1) {
								// quoted unit
								unitToken = unitToken.substring(1, unitToken.length - 1);
								quoted = true;
							}
							else if (unitToken && !/[A-Za-z]/.test(unitToken.charAt(0))) {
								// unit must start with a character or 1/
								if (unitToken != '1' || k+1 >= nTokens || tokens[k+1] !== '/' ) {
									unitToken = null;
								}
							}
							if (unitToken && !quoted) {
								// assemble unit from valid trailing parts
								const unitParts = [unitToken];
								while (++k < nTokens && unitRegex.test(tokens[k])) {
									unitParts.push(tokens[k]);
									i++
								}
								unitToken = unitParts.join('');
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