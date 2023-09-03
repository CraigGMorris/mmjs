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

/**
 * @method functionPickerData
 * @param {*} language - for possible future use
 * textual data for function picker
 */
	// eslint-disable-next-line no-unused-vars
	export function functionPickerData(language) {
	const comparisonBoilerPlate = `
	<p>
		If <b>a</b> does not have the same number of elements as <b>b</b>, then the
		smaller number must be divisible into the larger without a remainder and those
		values will be duplicated appropriately to match with the larger number of values.
	</p>
	<p>
		If <b>a</b> and <b>b</b> are tables, they must have the same number of rows and columns
		and have the same column types.  A table of results will be returned using <b>a's</b>
		column names.
	</p>`;
	const selectorDesc = {
		f: "{select from, selector}",
		desc: `<p>
			Rows will be selected from the "from" argument, which can be a string, number or table value.
			</p><p>
			The "selector" can be either a numeric or string value. If it is a numeric value, it should have a
			single column and the same number of rows as the "from" value.
			The returned value will consist of all the rows of "from" for which the corresponding row value of "selector"
			is nonzero.
			</p><p>
				Alternatively if the "selector" value is a string value, then each row should consist of a query of the form
			</p>
			<p class="formula">"column op value"</p>
			<p>
				where column is the name of the column if "from" is a table or the number of the column if it is a numeric or string
				value. The "op" term is one of ("=", "!=", "&lt;", "&lt;=", "&gt;", "&gt;=", "?"). The "value" term is some value that will be
				matched against each row of the column using the given operation.  The value isn't a formula, but can have a unit if
				it is numeric. String comparisons are case insensitive and if the value is omitted it will match an
				empty or blank filled string. The "?" operator means contains and only works with string values.
			</p>
			<p>
				If the selector has more than one row, or multiple terms separated by a new line or comma,
				each result while be "ANDed" with the previous result, unless the "column" term is
				preceded by a "|" character. In that case an OR operation is performed with the previous
				result. An "&" character can optionally be used for AND operations to make the formula
				more descriptive.
			</p>
			<p>
				Selector xamples might be:
			</p>
			<ul>
				<li>"name = fred"</li>
				<li>{cc "dept = sales", "age >= 30"}</li>
				<li>{cc "dept = sales", "| dept = support", "&amp; age >= 30"}</li>
			</ul>
			`
	}
	const sumRowsDesc = {
		f: "{sumrows x}",
		desc: `<p>
			Returns a column array with the summations of the values in each row of <b>x</b>.  If <b>x</b> is a
			table value, then all the numeric columns must have the same unit dimensions, but string
				columns are simply ignored.
			</p>
			<p>
				However if a second argument is given as a string, then that string is used as a column
				name for the sums and a table value is returned. Also in this case if <b>x</b> is a table value,
				any string columns are copied into the result as well.
			</p>
			`
	}

	const appendDesc = {
		f: "{append a, b}",
		desc: `<p>
				Creates a new object which contains all the columns of all the arguments.  All arguments must have
				the same number of rows.
			</p>
			<p>
				If all of the columns aren't the same type (numeric, string or table) or if numeric and
				they have different unit dimensions, then a table value will be returned.
			</p>`,
	}

	const transposeDesc = {
		f: "{tr a}",
		desc: `Returns the transposition of <b>a</b> (i.e. the rows and columns are reversed).
			Short form of <b>transpose</b>.
			<p>
				If <b>a</b> is a table value, then a table value will be returned that is displayed
				with the columns being rows and rows being columns. This just for display and does not
				affect how the value is referenced or how functions and operations act upon it.
			</p>`
	}
	
	const data = {
		title: 'Formula Functions',
		instructions: `
			<p>
				Tap on a section title to toggle the display of its functions.  Tap on a function to toggle
				its description.  Hit the insert button with a description open to insert the formula template
				into your formula.
			</p>
			<p>
				<b>Note:</b> all functions operate on the underlying SI values, not the display values.
			</p>`,
		sections: [
			{
				header: "Log functions",
				functions: [
					{
						f: "{log x}",
						desc: "Returns the base 10 logarithm of the value(s) in <b>x</b>",
					},
					{
						f: "{ln x}",
						desc: "Returns the natural logarithm of the value(s) in <b>x</b>",
					},
					{
						f: "{exp x}",
						desc: "Returns e to the value(s) in <b>x</b>, or in other words the natural anti-logarithm.",
					},
				]
			},
			{
				header: "Trigonometric math functions",
				functions: [
					{
						f: "{sin x}",
						desc: "Returns the sine of the value(s) in <b>x</b>, where <b>x</b> is in radians.",
					},
					{
						f: "{cos x}",
						desc: "Returns the cosine of the value(s) in <b>x</b>, where <b>x</b> is in radians.",
					},
					{
						f: "{tan x}",
						desc: "Returns the tangent of the value(s) in <b>x</b>, where <b>x</b> is in radians.",
					},
					{
						f: "{asin x}",
						desc: "Returns the arcsine of the value(s) in <b>x</b>. The returned values are in radians.",
					},
					{
						f: "{acos x}",
						desc: "Returns the arccosine of the value(s) in <b>x</b>. The returned values are in radians.",
					},
					{
						f: "{atan x}",
						desc: "Returns the arctangent of the value(s) in <b>x</b>. The returned values are in radians.",
					},
					{
						f: "{pi}",
						desc: "Just returns the value of pi.",
					},
					{
						f: "{polar x, y}",
						desc: `<p>
								Returns a table value with the first column <b>r</b> being the radius and the second <b>a</b> being the angle of <b>x</b> and <b>y</b> converted to polar coordinates.</p>
							<p>
								If only a single argument is given, its must have two columns and the first will be assumed to be <b>x</b> and the second <b>y</b>.
							</p>`,
					},
					{
						f: "{cart r, a}",
						desc: `<p>
								Returns a table value with the first column being the <b>x</b> value and the second being the <b>y</b> of the radius <b>r</b> and angle <b>a</b> converted to cartesian coordinates.</p>
							<p>
								If only a single argument is given, its must have two columns and the first will be assumed to be <b>r</b> and the second <b>a</b>.
							</p>`,
					},
				]
			},
			{
				header: "Hyperbolic functions",
				functions: [
					{
						f: "{sinh x}",
						desc: "Returns the hyperbolic sine of the value(s) in <b>x</b>.",
					},
					{
						f: "{cosh x}",
						desc: "Returns the hyperbolic cosine of the value(s) in <b>x</b>.",
					},
					{
						f: "{tanh x}",
						desc: "Returns the hyperbolic tangent of the value(s) in <b>x</b>.",
					},
					{
						f: "{asinh x}",
						desc: "Returns the principle value of the inverse hyperbolic sine of the value(s) in <b>x</b>.",
					},
					{
						f: "{acosh x}",
						desc: "Returns the principle value of the inverse hyperbolic cosine of the value(s) in <b>x</b>.",
					},
					{
						f: "{atanh x}",
						desc: "Returns the principle value of the inverse hyperbolic tangent of the value(s) in <b>x</b>.",
					},
				]
			},
			{
				header: "Complex Number functions",
				comment: `<i>Please see the <a href="./help/complex.html" target="_blank">Complex Number</a> help page for more information on complex
					number handling in Math Minion.</i>`,
				functions: [
					{
						f: "{complex r, i}",
						desc: "Returns a table value with columns <b>r</b> and <b>i</b> representing a complex number.  However any two column numeric value can be used as a complex argument.",
					},
					{
						f: "{cmult w, z}",
						desc: "Returns the complex product of multiplying the two complex value arguments.",
					},
					{
						f: "{cdiv w, z}",
						desc: "Returns the complex result of dividing the <b>w</b> by <b>z</b> where both are complex values.",
					},
					{
						f: "{cpow w, z}",
						desc: "Returns the complex result of raising <b>w</b> to the power <b>z</b> where both are complex values.",
					},
					{
						f: "{cabs z}",
						desc: "Returns the absolute value of the complex value <b>z</b>.  The result is a real number.",
					},
					{
						f: "{cln z}",
						desc: "Returns the complex natural logarithm of the complex value <b>z</b>.",
					},
					{
						f: "{cexp z}",
						desc: "Returns the complex value result of raising e to the complex value <b>z</b>, or in other words the natural anti-logarithm.",
					},
					{
						f: "{csin z}",
						desc: "Returns the sine of the complex value <b>z</b>.",
					},
					{
						f: "{ccos z}",
						desc: "Returns the cosine of the complex value <b>z</b>.",
					},
					{
						f: "{ctan z}",
						desc: "Returns the tangent of the complex value <b>z</b>.",
					},
					{
						f: "{casin z}",
						desc: "Returns the arcsine of the complex value <b>z</b>.",
					},
					{
						f: "{cacos z}",
						desc: "Returns the arccosine of the complex value <b>z</b>.",
					},
					{
						f: "{catan z}",
						desc: "Returns the arctangent of the complex value <b>z</b>.",
					},
					{
						f: "{csinh z}",
						desc: "Returns the hyperbolic sine of the complex value <b>z</b>.",
					},
					{
						f: "{ccosh z}",
						desc: "Returns the hyperbolic cosine of the complex value <b>z</b>.",
					},
					{
						f: "{ctanh z}",
						desc: "Returns the hyperbolic tangent of the complex value <b>z</b>.",
					},
					{
						f: "{casinh z}",
						desc: "Returns the inverse hyperbolic sine of the complex value <b>z</b>.",
					},
					{
						f: "{cacosh z}",
						desc: "Returns theinverse hyperbolic cosine of the complex value <b>z</b>.",
					},
					{
						f: "{catanh z}",
						desc: "Returns the inverse hyperbolic tangent of the complex value <b>z</b>.",
					},
				]
			},
			{
				header: "Reduction Functions",
				functions: [
					{
						f: "{max x}",
						desc: "Returns the maximum of the values in <b>x</b>.  If additional arguments are supplied, the maximum value of all their elements is returned.",
					},
					{
						f: "{min x}",
						desc: "Returns the minimum of the values in <b>x</b>. If additional arguments are supplied, the minimum value of all their elements is returned.",
					},
					{
						f: "{maxrows x}",
						desc: "Returns a column array with the maximums of the values in each row of <b>x</b>.  If <b>x</b> is a table value, then all the numeric columns must have the same unit dimensions, but string columns are simply ignored.",
					},
					{
						f: "{maxcols x}",
						desc: "Returns a row array with the maximums of the values in each column of <b>x</b>.  String columns in table values are ignored.",
					},
					{
						f: "{minrows x}",
						desc: "Returns a column array with the minimums of the values in each row of <b>x</b>.  If <b>x</b> is a table value, then all the numeric columns must have the same unit dimensions, but string columns are simply ignored.",
					},
					{
						f: "{mincols x}",
						desc: "Returns a row array with the minimums of the values in each column of <b>x</b>.  String columns in table values are ignored.",
					},
					{
						f: "{sum x}",
						desc: "Returns the summation of the values in <b>x</b>. If <b>x</b> is a table value, then all numeric columns must have the same dimensions.  String columns are ignored.",
					},
					sumRowsDesc,
					{
						f: "{sumcols x}",
						desc: "Returns a row array with the summations of the values in each column of <b>x</b>.  String columns in table values are ignored.",
					},
				]
			},
			{
				header: "Comparison functions",
				functions: [
					{
						f: "{eq a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the
						corresponding elements in the return value being <b>1</b> if the <b>a</b> value
						is equal to the <b>b</b> value or <b>0</b> if it is not.
						` + comparisonBoilerPlate,
					},
					{
						f: "{ne a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the
						corresponding elements in the return value being <b>1</b> if the <b>a</b> value
						is not equal to the <b>b</b> value or <b>0</b> if it is.
						` + comparisonBoilerPlate,
					},
					{
						f: "{le a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the
						corresponding elements in the return value being <b>1</b> if the <b>a</b> value
						is less than or equal to the <b>b</b> value or <b>0</b> if it is not.
						` + comparisonBoilerPlate,
					},
					{
						f: "{lt a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the
						corresponding elements in the return value being <b>1</b> if the <b>a</b> value
						is less than the <b>b</b> value or <b>0</b> if it is not.
						` + comparisonBoilerPlate,
					},
					{
						f: "{ge a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the
						corresponding elements in the return value being <b>1</b> if the <b>a</b> value
						is greater than or equal to the <b>b</b> value or <b>0</b> if it is not.
						` + comparisonBoilerPlate,
					},
					{
						f: "{gt a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the
						corresponding elements in the return value being <b>1</b> if the <b>a</b> value
						is greater than the <b>b</b> value or <b>0</b> if it is not.
						` + comparisonBoilerPlate,
					},
					{
						f: "{and a, b}",
						desc: `<p>
								If the first argument is a <b>scalar</b> then:
							</p>
							<p>
								Returns true (the value 1) if the first value (index 1,1) of every argument
								is non-zero.  If any element is unknown, then the result is unknown as well.
								If a zero value is encountered, then the values for the remaining arguments
								(left to right) will not be evaluated.
							</p>
							<p>
								If the first argument is <b>not a scalar</b> then:
							</p>
							<p>
								All the arguments are evaluated and they must all have either the same number
								of elements as the first argument or be scalars.  The result will be a numeric
								value of the same size as the first argument, with each value set to 0.0
								unless the comparable elements of all the arguments are nonzero. Scalar
								arguments will use their single value to compare with all element positions.
							</p>`,
					},
					{
						f: "{or a, b}",
						desc: `<p>
								If the first argument is a <b>scalar</b> then:
							</p>
							<p>
								Returns the value of the first argument whose first element (index 1,1) is
								non-zero.  If an element is encountered with an unknown value, then the
								result is unknown as well. In either case the remaining arguments are not
								evaluated.
							</p>
							<p>
								If the first argument is <b>not a scalar</b> then:
							</p>
							<p>
								All the arguments are evaluated and they must all have either the same number
								of elements as the first argument or be scalars.  The result will be a numeric
								value of the same size as the first argument, with each value set to 1.0 unless
								the comparable elements of all the arguments are zero. Scalar arguments will
								use their single value to compare with all element positions.
							</p>`,
					},
					{
						f: "{not a}",
						desc: `Each element of the return value is <b>1</b> if the corresponding element
						of <b>a</b> is <b>0</b> otherwise it will be <b>1</b>.`,
					},
					{
						f: "{isnan a}",
						desc: `Each element of the return value is <b>1</b> if the corresponding element
						of <b>a</b> is a NaN (not a number - usually an arithmetic error).`,
					},
					{
						f: "{if a, b, c}",
						desc: `If the value of <b>a</b> is unknown or a <b>scalar</b>:
							<ul>
								<li>If the value of of <b>a</b> is known and not zero, the value of <b>b</b> is returned.</li>
								<li>If the value of <b>a</b> is zero, the value of <b>c</b> is returned.</li>
								<li>If the value of <b>a</b> is unknown, no value is returned</li>
							</ul>
							If the value of <b>a</b> is known and has more than one element, then:
							<ul>
								<li><b>b</b> and <b>c</b> must have the same number of elements.</li>
								<li><b>b</b> and <b>c</b> must have the same unit dimensions</li>
								<li>Each element of the returned value will be taken from the corresponding element of <b>b</b> if
								the corresponding element of <b>a</b> is not zero, or from <b>c</b> if it is zero.</li>
								<li>If <b>a</b> does not have the same number of elements as <b>b</b> and <b>c</b>, then the smaller
								number must be divisible into the larger without a remainder and those values will be duplicated appropriately
								to match with the larger number of values.</li>
							</ul>
							If <b>a</b> is a string object, then elements that are zero length will be considered as having a zero value.
							In all cases if <b>b</b> is numeric, <b>c</b> must also be numeric and likewise if <b>b</b> is a string object,
							<b>c</b> must also be a string object.`,
					},
				]
			},
			{
				header: "Matrix functions",
				functions: [
					appendDesc,
					{
						f: "{array r, c, i}",
						desc: `<p>
								Returns a string or numeric matrix with <b>r</b> rows and <b>c</b> columns with all elements
								initialized to the value of <b>i</b>.  If only two arguments are supplied, they are assumed to be
								<b>r</b> and <b>i</b> with the number of columns being 1.
							</p>`,
					},
					{
						f: "{cell roffset, coffset}",
						desc: `This function is only valid when used by a formula in the matrix object. It returns the value of a
							matrix cell, which is offset from the current cell by roffset and coffset.
							<p>
								Thus {cell -3, 1} when evaluated for a cell at row 10 and column 4, would return the value of the cell at row 7 and column 5.
							</p>`,
					},
					{
						f: "{col}",
						desc: `This function is only valid when used by a formula in the matrix object. Returns the column number for
							the cell that is evaluating the function.`,
					},
					{
						f: "{cc a, b}",
						desc: `<p>
								Returns a column array with all of the values of the arguments concatenated together.  Matrices are first converted to arrays on a row by row basis.
								See the redim function if you wish to convert the result back into a matrix.
							</p>
							<p>
								When the arguments to concat are table values, all arguments must have the same number and type of columns.  In the resulting table each column will be the concatenation of the respective columns of the arguments.  The name and display unit for each column will be taken from the first argument.
							</p>
							<p>
								Short form of  <b>concat</b>.
							</p>`,
					},
					{
						f: "{cross a, b}",
						desc: `Calculates the cross product between two vectors.  The number of elements in each argument must be divisible by 3.
						If the number of elements in either argument exceeds 3, then the cross product will be calculated for every three elements
						and returned in a matrix with 3 columns and each row containing the cross product.  If one argument has fewer elements than
						the other, its values will be reused in order as necessary.`,
					},
					{
						f: "{det a}",
						desc: "Calculates the determinant of matrix a.",
					},
					{
						f: "{dot a, b}",
						desc: "Performs a matrix multiplication of values <b>a</b> and <b>b</b> and returns the result",
					},
					{
						f: "{eigval a}",
						desc: "Returns the eigenvalues for a square matrix a as a table with real and complex columns.",
					},
					{
						f: "{eigvect a, v}",
						desc: `<p>Attempts to return the eigenvector(s) for square matrix a, corresponding to the eigenvalue(s)
								in v.  If there is more than one eigenvalue, the result will be a matrix with each column containing the
								corresponding eigenvector.  If a vector cannot be found, that column will be zero filled.
							</p>
							<p>
							<p>Eigenvectors cannot be calculated for eigenvalues with nonzero imaginary components.</p>`,
					},
					{
						f: "{invert a}",
						desc: "Performs a matrix inversion of <b>a</b> and returns the result.",
					},
					{
						f: "{ncols x}",
						desc: "Returns the number of columns in <b>x</b>",
					},
					{
						f: "{nrows x}",
						desc: "Returns the number of rows in <b>x</b>",
					},
					{
						f: "{redim a, ncols}",
						desc: `Returns a value with the same number of elements as a, but arranged with ncols.  Values are
						arranged on a row by row basis.  The ncols value must divide evenly into the total number elements in a.`,
					},
					{
						f: "{row}",
						desc: `This function is only valid when used by a formula in the matrix object. Returns the row number for
						the cell that is evaluating the function.`,
					},
					transposeDesc,
				]
			},
			{
				header: "Statistical functions",
				functions: [
					{
						f: "{average x, by}",
						desc: `Returns the average of the values of <b>x</b>.
								<p>If the second parameter is 0 or missing, this will be the
								scalar average of all the values of <b>x</b>.  If it is 1, then the result is a column vector whose values will be
								the averages of each row of <b>x</b>.  If it is 2, then it will be a row vector of averages of the columns of <b>x</b>.
							</p>`,
					},
					{
						f: "{median x, t}",
						desc: `<p>
								Returns the median of the values of <b>x</b>.  If the second parameter is 0 or missing, this will be the
								scalar median of all the values of <b>x</b>.  If it is 1, then the result is a column vector whose values will be
								the medians of each row of <b>x</b>.  If it is 2, then it will be a row vector of medians of the columns of <b>x</b>.
							</p>`,
					},
					{
						f: "{geomean x, t}",
						desc: `<p>
								Returns the geometric mean of the values of <b>x</b>.  If the second parameter is 0 or missing, this will
								be the scalar geometric mean of all the values of <b>x</b>.  If it is 1, then the result is a column vector whos
								values will be the geometric means of each row of <b>x</b>.  If it is 2, then it will be a row vector of geometric
								means of the columns of <b>x</b>.
							</p>`,
					},
					{
						f: "{harmmean x, t}",
						desc: `<p>
								Returns the harmonic mean of the values of <b>x</b>.  If the second parameter is 0 or missing, this will be
								the scalar harmonic mean of all the values of <b>x</b>.  If it is 1, then the result is a column vector whose values
								will be the harmonic means of each row of <b>x</b>.  If it is 2, then it will be a row vector of harmonic means of
								the columns of <b>x</b>.
							</p>`,
					},
					{
						f: "{var x, t}",
						desc: `<p>
								Returns the calculated variance for the sample <b>x</b>. Note that the unit type for this will be the square
								of the unit type of <b>x</b>.  The square root of this is the standard deviation.
							</p>
							<p>
								If the second parameter is 0 or missing, this will be the scalar variance of all the values of <b>x</b>.  If it is 1,
								then the result is a column vector whose values will be the variance of each row of <b>x</b>.  If it is 2, then it
								will be a row vector of variance of the columns of <b>x</b>.
							</p>`,
					},
					{
						f: "{factorial x}",
						desc: `Returns a unitless matrix the same size as <b>x</b>, but with each element replaced the factorial of its value.  If
						the value is not an integer, it will be rounded to the nearest integer and if the value is negative, it will be
						replaced with 1.  Note that values greater than 170 will result in an "inf" value since the result would be greater
						than the largest floating point value for the device.`,
					},
					{
						f: "{lngamma x}",
						desc: `<p>
								Returns the natural logarithm of the gamma function for <b>x</b>, where x > 0.  Note that where <b>x</b> is an integer,
								then gamma <b>x</b> is equal to (x - 1)!.  Thus for calculations that involve division of large factorials that
								might overflow, subtracting the ln gamma values might be a better alternative.
							</p>`,
					},
					{
						f: "{permut n, k}",
						desc: `<p>
								Returns the number of permutations of <b>k</b> objects that can be selected from a population of <b>n</b>
								objects, where the order of selection is significant.
							</p>`,
					},
					{
						f: "{combin n, k}",
						desc: `<p>
								Returns the number of combinations of <b>k</b> objects that can be selected from a population of <b>n</b>
								objects, where the order of selection is not significant.
							</p>`,
					},
					{
						f: "{normdist x, u, s, c}",
						desc: `<p>
								Returns the normal distribution for <b>x</b>, given a mean <b>u</b> and standard deviation <b>s</b>, where
								all three have the same unit type.  If argument c is missing or is equal to 0, then a cumulative distribution
								is returned. If it is present and non-zero, then the probability mass function is returned.
							</p>`,
					},
					{
						f: "{norminv p, u, s}",
						desc: `<p>
								Returns the inverse of the normal distribution function for probability <b>p</b>, given a mean <b>u</b>
								and standard deviation <b>s</b>, where the mean and standard deviation must have the same unit type.
							</p>`,
					},
					{
						f: "{binomdist n, s, p }",
						desc: `<p>
								Returns the binomial distribution probability for <b>n</b> trials with <b>s</b> successes <b>p</b>
								probability of success on each trial.
							</p>
							<p>
								The result will have the maximum rows and columns of any of the parameters, with smaller parameters
								having their values reused as necessary.
							</p>`,
					},
					{
						f: "{betadist x, a, b }",
						desc: `<p>
								Returns the cumulative beta probability density function for <b>x</b> (which must be 0 <= x <= 1) and
								the <b>a</b> (alpha) and <b>b</b> (beta) parameters.
							</p>
							<p>
								The result will have the maximum rows and columns of any of the parameters, with smaller parameters
								having their values reused as necessary.
							</p>`,
					},
					{
						f: "{chidist x2, df}",
						desc: `<p>
								Returns the one tailed probability of the chi-squared distribution.  The <b>x2</b> value should be
								the chi squared value and df should be the degrees of freedom.  See also the chitest function.
							</p>`,
					},
					{
						f: "{chitest a, e}",
						desc: `<p>
								Calculates the chi squared value and degrees of freedom from the actual and expected values in matrix
								values <b>a</b> and <b>e</b> respectively.  These are then used with the chidist function to calculate
								the probability that the accepted values could match the expected values.  Normally the <b>a</b> and
								<b>e</b> values should have the same number of rows and columns, but if they don't, the <b>a</b> sizes
								are used with values being reused as necessary.
							</p>`,
					},
					{
						f: "{ttest a, b}",
						desc: `<p>
								Uses the Student T test to determine the probability that two populations with an assumed equal variance
								have the same mean.  Returns the two tailed distribution value.
							</p>`,
					},
					{
						f: "{tptest a, b}",
						desc: `<p>
								Uses the paired Student T test to determine the probability that two populations with an equal number
								of elements and variance paired by sample have the same mean.  Returns the two tailed distribution value.
							</p>`,
					},
				]
			},
			{
				header: "Table functions",
				comment: `<i>Functions that work with tables (Many other single parameter functions also work)</i>`,
				functions: [
					{
						f: "{table n, c}",
						desc: `Creates a table value whose column names are the elements of <b>n</b> and values are taken from the
							columns of c and additional parameters. If <b>n</b> is a table value, then its column names are used
							<p>Alternatively pairs of names and values can be used as in</p>
							<p>{table "First", x1, "Second", x2}</p>
							<p>and so forth.</p>
							<p> In either case, the value arguments should all have the same number of rows.
							If there are fewer names than values or vice versa,
							the lessor number is used and the extras are ignored.
							</p>
							<p>Finally if there is only a single string argument starting with the
							word "table", then the argument is assumed to be CSV data of the
							form described in the Data Table help and a table value is constructed
							from it.
							</p>`,
					},
					{
						f: "{nrows x}",
						desc: "Returns the number of rows in <b>x</b>",
					},
					{
						f: "{ncols x}",
						desc: "Returns the number of columns in <b>x</b>",
					},
					{
						f: "{colnames x}",
						desc: "Returns an array consisting of the column names of table <b>x</b>",
					},
					{
						f: "{maxrows x}",
						desc: `Returns a column array with the maximums of the values in each row of <b>x</b>.  If <b>x</b> is a table value,
						then all the numeric columns must have the same unit dimensions, but string columns are simply copied.`,
					},
					{
						f: "{maxcols x}",
						desc: "Returns a row array with the maximums of the values in each column of <b>x</b>.  String columns in table values are ignored.",
					},
					{
						f: "{minrows x}",
						desc: `Returns a column array with the minimums of the values in each row of <b>x</b>.  If <b>x</b> is a table value, then
						all the numeric columns must have the same unit dimensions, but string columns are simply copied.`,
					},
					{
						f: "{mincols x}",
						desc: "Returns a row array with the minimums of the values in each column of <b>x</b>.  String columns in table values are ignored.",
					},
					{
						f: "{sum x}",
						desc: `Returns the summation of the values in <b>x</b>. If <b>x</b> is a table value, then all numeric columns must have the
						same dimensions.  String columns are ignored.`,
					},
					sumRowsDesc,
					{
						f: "{sumcols x}",
						desc: "Returns a row array with the summations of the values in each column of <b>x</b>.  String columns in table values are ignored.",
					},
					{
						f: "{concat a, b}",
						desc: `<p>
								(concat can be abbreviated to just cc)
							</p>
							<p>
								Returns a column array with all of the values of the arguments concatenated together.  Matrices are first
								converted to arrays on a row by row basis. See the redim function if you wish to convert the result back into a matrix.
							</p>
							<p>
								When the arguments to concat are table values, all arguments must have the same number and type of
								columns.  In the resulting table each column will be the concatenation of the respective columns of
								the arguments.  The name and display unit for each column will be taken from the first argument.
							</p>`,
					},
					appendDesc,
					{
						f: "{groupsum t, c}",
						desc: `<p>
								The <b>t</b> argument must be a table value and the <b>c</b> argument a string value with the name of
								a column in that table.  The result is a table where the first column will contain all the unique values
								of that designated column.  The other columns will be the sums of the rows that share that unique value.
								String columns are ignored.
							</p>`,
					},
					{
						f: "{groupmax t, c}",
						desc: `<p>
								The <b>t</b> argument must be a table value and the <b>c</b> argument a string value with the name
								of a column in that table.  The result is a table where the first column will contain all the unique
								values of that designated column.  The other columns will be the maximums of the rows that share that
								unique value.  String columns are ignored.
							</p>`,
					},
					{
						f: "{groupmin t, c}",
						desc: `<p>
								The <b>t</b> argument must be a table value and the <b>c</b> argument a string value with the name
								of a column in that table.  The result is a table where the first column will contain all the unique
								names of that designated column.  The other columns will be the minimums of the rows that share that
								unique value.  String columns are ignored.
							</p>`,
					},
					selectorDesc,
					transposeDesc,
				]
			},
			{
				header: "Lookup functions",
				functions: [
					{
						f: "{lookup i, in, v}",
						desc: `Looks up the value(s) of <b>i</b> in the array <b>in</b> and interpolates (or extrapolates) the
							corresponding value in <b>v</b>.  The <b>in</b> and <b>v</b> arrays must have the same number of elements
							(at least 2). The returned value will be the same size as <b>l</b> with the conversion unit type of <b>v</b>.<br><br>
							<p><b>Note</b> - this function assumes the values to be in increasing order</p>`,
					},
					{
						f: "{indexof x, in}",
						desc: `<p>
								Returns a row array with two columns.  The first column holds the row numbers of the first cell found
								in <b>in</b>, which has the same value as the first value of <b>x</b>.  The second column holds the
								column number of that cell.
							</p>
							<p>
								The cells are scanned row by row, with the first match being returned.  If none of the cells match,
								then a zeroes are returned.
							</p>
							<p>
								If <b>x</b> is not a scalar, then the process is repeated for each value of <b>x</b>, with the result being
								in the corresponding row of the returned value.
							</p>`,
					},
					selectorDesc,
				]
			},
			{
				header: "String functions",
				functions: [
					{
						f: "{fmt f, x, u}",
						desc: `<p>
							Formats a number <b>x</b>, using the format string <b>f</b>, optionally using a
							display unit.
							</p>	
							<p>
							The <b>x</b> value can be a numeric scalar, array or matrix.
							</p>
							<p>
							The <b>f</b> parameteris a  format string is styled on
							C format string and typically is of the form:
							</p>
							<p><b>%12.4f</b></p>
							<p>
							which says the field should be 12 characters wide with 4 characters after the
							decimal point in normal floating point format.
							</p>
							<p>If <b>c</b> is used instead of <b>f</b>,
							the numbers will have commas added (e.g. 1,234,567.89).
							</p>
							<p>
							An <b>e</b> can be used instead of the <b>f</b> for exponential format (e.g. 1.23457e+6).
							</p>
							<p>You can even show numbers with an arbitrary
							base between 2 and 36.  For instance a value could be represented in hex with
							<b>%14.16x</b>.
							</p>
							<p>
							Note it is also permissable to omit the size number, i.e.
							<b>%.2f</b> would be fine and the number would just be right justified.
							</p>
							<p>
							If the third parameter, u, is used, it must be the name of a unit compatible
							with the unit type of <b>x</b>.
							<br><br>
							Thus function <br><b>{fmt "%12.2f", 12.1234}</b><br>would return
							<br><b>12.12</b><br>,
							while <br><b>{fmt "%12.2f", 12.1234, "%"}</b><br> would return<br><b>1212.34)</b>.
						</p>`,
					},
					{
						f: "{html v}",
						desc: `<p>
								Returns a string value containing <b>HTML</b> that can be used to display the value
								of <b>v</b>.
							</p>`,
					},
					{
						f: "{join s, sep}",
						desc: `<p>Joins the elements of string array <b>s</b> into a single string, with the elements separated by the
								scalar string <b>sep</b>. If <b>s</b> has more than one column and more than one row, the result will be a
								column array with each row of <b>s</b> joined.
								<br><br>
								Also when <b>s</b> is a matrix, an optional third paramater can be supplied, in which case the second
								parameter is used to join the columns and the third parameter is used to join the rows, resulting in a
								scalar string.
							</p>`,
					},
					{
						f: "{jsonparse s}",
						desc: `<p>
								The <b>s</b> parameter must be a string consisting of legal JSON code.
								The result is a
								<a href="./help/minionvalue.html#json" target="_blank">Math Minion JsonValue</a>.
							</p>`,
					},
					{
						f: "{split s, sep}",
						desc: `<p>Splits the elements of string <b>s</b> into an array string, using the scalar string <b>sep</b>
								as the separator. If <b>s</b> isn't a scalar, the result will one row per value of s, with each value split
								into columns.  The number of columns will be determined by the number of splits of the first element.
								<br><br>
								Also an optional third paramater can be supplied, in which case the second parameter is used to separate
								the columns and the third parameter is used to separate the rows, resulting in a  string matrix.  In this
								case, only the first value of s is used.
								<br><br>
								If no separator is supplied, then the first element of s will be split into a single array of individual characters.
							</p>`,
					},
					{
						f: "{match rx, s}",
						desc: `<p>A regular expression search is performed on the elements of <b>s</b> using the regular expression
							<b>rx</b>, with the matched portions of the strings being returned.  If a match is not found, then an empty
							string <b>""</b> is returned for that element.
								<br><br> 
								The <b>rx</b> value does not need to be a scalar and the normal row order repeating is used for mismatched sizes.
							</p>`,
					},
					{
						f: "{replace rm, rr, s}",
						desc: `<p>
								A regular expression replacement is performed on the elements of <b>s</b> using the regular expression
								<b>rm</b> to match and <b>rr</b> to replace.  The transformed result is returned (s is not modified).
								If a match is not found, then an empty string <b>""</b> is returned for that element.
								<br><br>
								The <b>rm</b> and <b>rr</b> values must have the same number of elements, but do not have to be scalars
								or the same size as <b>s</b>.
							</p>`,
					},
					{
						f: "{substr s, b, l}",
						desc: `<p>
								Returns a string matrix of the same size as s, but consisting of sub-strings of the elements of <b>s</b>.
								The number <b>b</b> is the position of the first character of the substring in <b>s</b> and <b>l</b> is
								the length of the substring.  If <b>l</b> is not supplied or is greater than the number of characters
								available, the substring will consist of all the characters after position <b>b</b>.  If <b>b</b> and
								<b>l</b> are not the same size as <b>s</b>, their values will be reused as necessary until all the elements
								of <b>s</b> are processed.
								<br><br>
								If the b value is negative it will be the position from the end of the string.  That is -1 would be the last
								character in the string.
							</p>`,
					},
					{
						f: "{strfind s, f}",
						desc: `<p>
								Finds the first occurrence of the regular expression <b>f</b> in the elements of string <b>s</b>.
								The result is a matrix with a number of rows equal to the total number of elements in <b>s</b> and
								two columns.  The first column will contain the position in the <b>s</b> element of the beginning of
								<b>f</b> and the second column will contain the length of the found string.  If <b>f</b> is not the
								same size as <b>s</b>, its values will be reused as necessary until all the elements of <b>s</b> are processed.
							</p>
							<p class="funcdesc">
								If the string is not found in a given element, the position for that element will be 0.
							</p>`,
					},
					{
						f: "{strlen s}",
						desc: `<p>
								Returns a numeric matrix of the same size as s, but with each element having the length of the corresponding
								element of <b>s</b>.
							</p>`,
					},
					{
						f: "{lowercase s}",
						desc: `<p>
								A string is returned where all the uppercase characters of s have been replaced with their lowercase equivalents.
							</p>`,
					},
					{
						f: "{uppercase s}",
						desc: `<p>
								A string is returned where all the lowercase characters of s have been replaced with their uppercase equivalents.
							</p>`,
					},
					{
						f: "{utf8 a}",
						desc: `<p>
								If <b>a</b> is a string, then the first element is converted to UTF8 bytes, which are returned as a
								numeric array with one byte value per element.
							</p>
							<p>
								If <b>a</b> is a numeric value, then all the elements are assumed to be UTF8 byte values an a single
								element string value is constructed from them. 
							</p>`,
					},
				]
			},
			{
				header: "Time functions",
				functions: [
					{
						f: "{mktime d}",
						desc: `Converts a date represented by a unitless number in the form yyyymmdd.hhmmss into the number of
								seconds since 1970-01-01 00:00:00 (the unix time base).  The inverse function is date.`,
					},
					{
						f: "{date s}",
						desc: `Converts value representing the number of seconds since 1970-01-01 00:00:00 (the unix time base),
						into a unitless number in the form yyyymmdd.hhmmss.  It is the inverse function of mktime.`,
					},
					{
						f: "{now}",
						desc: `Returns the number of seconds since 1970-01-01 00:00:00 GMT (the unix time base).  It will
						return the current time value every time it is evaluated.`,
					},
					{
						f: "{timezone}",
						desc: `Returns the number of seconds difference between the current device time zone and GMT.`,
					},
				]
			},
			{
				header: "3D Transform functions",
				comment: `<i>These functions implement 3D graphical transformations, based on 4x4 transformation matrices.
					All assume the <b>y</b> axis is vertical, the <b>x</b> horizontal and <b>z</b> positive out of the screen.</i>`,
				functions: [
					{
						f: "{translate xyz}",
						desc: `Creates a 4x4 transformation matrix corresponding to an x, y, z translation using the three
						coordinates of the parameter array.`,
					},
					{
						f: "{scale xyz}",
						desc: `Creates a 4x4 transformation matrix corresponding to scaling the x, y and z values  using the
						three scaling factors of the parameter array.`,
					},
					{
						f: "{roll angle}",
						desc: `Creates a 4x4 transformation matrix for rotations of angle radians around the <b>z</b> axis.`,
					},
					{
						f: "{pitch angle}",
						desc: `	Creates a 4x4 transformation matrix for rotation of angle radians around the <b>x</b> axis.`,
					},
					{
						f: "{yaw angle}",
						desc: `Creates a 4x4 transformation matrix for rotation of angle radians around the <b>y</b> axis.`,
					},
					{
						f: "{transform trans, coords}",
						desc: `<p>
								Applies the 4x4 transformation matrix in the first parameter to the x, y and z coordinates in the second parameter.  The number of elements in the coordinates parameter must be a multiple of 3 and typically coords is a matrix with one or more rows, with x, y and z columns.
							</p>
							<p>
								The result is a matrix the same size as coords, with the transformation applied to each group of 3 elements.
							</p>`,
					},
				]
			},
			{
				header: "Miscellaneous functions",
				functions: [
					{
						f: "{abs x}",
						desc: "Returns the absolute value(s) of <b>x</b>",
					},
					{
						f: "{alert m}",
						desc: "Shows an alert box with message <b>m</b>. If <b>m</b> is an array with more than one value, the first is used as the title and the second as the message.",
					},
					{
						f: "{defunit x}",
						desc: "Returns a string value containing the default conversion unit name for <b>x</b>.",
					},
					{
						f: "{baseunit x}",
						desc: `<p>Returns a unit value with the default base conversion unit <b>x</b>.</p>
							<p>For instance {baseunit 60 mph} would return a value of 1 m/s.</p>`,
					},
					{
						f: "{eval s}",
						desc: `Evaluates the argument <b>s</b>, which must be a string value, as a formula.  If <b>s</b> has
						more than one element, only the first is evaluated.`,
					},
					{
						f: "{evaljs c, a}",
						desc: `<p>This function is <b>disabled</b> by default for security reasons.  It can be enabled
							in code on a private server.
							</p>
							<p>Executes the first argument <b>c</b>, which must be a string value, as Javascript code.  If
								<b>c</b> has more than one element, only the first is evaluated.  Additional arguments are optional
								and are converted to Javascript objects that the code can access.
							<p>
								The last calculated object is converted into an appropriate <a href="minionvalue.html">Math Minion value</a>.
							</p>
							<ul class="funcdesc">
								<li>A string will become a single value Minion string value.</li>
								<li>A number will become a single value Minion numeric value with a unit of fraction (i.e. unitless).</li>
								<li>For arrays, the type of the first element will determine the type of Minion value created.</li>
								<li>String and numeric arrays will have a single column and a number of rows corresponding to the returned array length.  Numeric arrays will be unitless.</li>
								<li>If the calculated array contains objects (dictionaries), then it will be assumed a table value is being returned with each column represented by an object in the array.  Each object must have a "name" value and a "values" value.  The "values" value must be an array corresponding to the row values of the column. All columns must have the same number of values.</br></br> The object can also have a "unit" value, which should be a string corresponding to a unit that Math Minion can understand (e.g. ft/s).  If the column contains strings, then a unit of "string" must be provided.</li>
								<li>If an object (dictionary) is returned, then it is assumed to define a Minion value in the same manner as a table column above, except a "name" value is not needed and will be ignored and a "columns" value can be supplied to partition the values into rows and columns.  The length of the "values" must be evenly divisible by the "columns" value if it is supplied.<br><br>As with table columns, a unit of "string" is required to create a Minion string value.  If no "unit" value is supplied, a unitless numeric value will be created.</li> 
							</ul>
							<p class="funcdesc">
								If other arguments in addition to the code value are supplied, they are converted into Javascript objects and made available to the code in an array named "mm_args".  String and numeric values will be converted into objects with "unit", "columns" and "values" elements as described above, while table values will be converted to arrays as also described above.
							</p>
							<p class="funcdesc">
								Note that for anything other than the simplest expressions, it is probably best to create the Javascript code in a separate expression using a beginning single quote to designate everything following as a string.  This simplifies dealing with single and double quotes in the code.
							</p>`,
					},
					{
						f: "{getbit n, x}",
						desc: `Returns the bit at bit position <b>n</b> of a numeric value <b>x</b>, where a <b>n</b> of 1 would be
							the least significant bit. The bit number does not have to be a scalar and the returned
							value will have one column for each bit number value and a row for each value of <b>x</b>`
					},
					{
						f: "{int x}",
						desc: "Returns integer portion of <b>x</b>",
					},
					{
						f: "{numeric x}",
						desc: `<p>
								Returns a numeric matrix value of <b>x</b>.  If <b>x</b> is already numeric it is simply returned.
							</p>
							<p>
								If <b>x</b> is string value, then an attempt is made to interpret its values as numbers and if that isn't
								possible, a zero is used in its place.
							</p>
							<p>
								If <b>x</b> is a table value, then all of the columns must be of the same unit dimensions.  String columns are ignored.
							</p>`,
					},
					{
						f: "{rand nr, nc}",
						desc: `<p>
								Creates a matrix with <b>nr</b> rows and <b>nc</b> columns and with all elements set to random
								numbers between 0 and 1.
							</p>
							<p>
								If the column argument is omitted, it is assumed to be 1 and if both arguments are omitted,
								they are both assumed to be 1.
							</p>`,
					},
					{
						f: '{round x}',
						desc: `returns the nearest whole number of <b>x</b>. Thus an <b>x</b> value of
						{cc -3.49, -3.5, 3.49, 3.5} would return -3, -4, -4, 3, 4, 4. The <b>x</b> value must have a
						dimensionless unit type`
					},
					{
						f: "{sign x}",
						desc: `Returns a unitless matrix the same size as <b>x</b>, but with each element replaced with 1 if the x
						element is greater or equal to 0 and -1 if the element is negative.`,
					},
					{
						f: "{sort x, n}",
						desc: `Returns a sorted copy of <b>x</b>.
						<p>If <b>x</b> is a table value it will be sorted on column number <b>n</b>.</p>
						<p>If <b>n</b> is omitted, the first column is used. If <b>n</b> is negative, the sort is reversed</p>`,
					},
					{
						f: "{isort x, n}",
						desc: `Creates a column array of indexes, such that if they are used with
						the index operator for <b>x</b>, the result would be a sorted copy of <b>x</b> 
						<p>If <b>x</b> is a table value the sort will be on its column number <b>n</b>.</p>
						<p>If <b>n</b> is omitted, the first column is used.  If <b>n</b> is negative, the sort is reversed</p>`,
					},
					{
						f: "{wfetch method, url, headers}",
						desc: `<p>
							This uses XMLHttpRequest to perform net requests, but note that Cross Origin Resource Sharing
							(CORS) policies will probably prevent its use with servers you don't control.
							</p>
							<p>
								The method and url arguments are what is passed to the request's open method.
								The headers argument, if supplied, should be a string matrix with the first column
								containing any header names and the second header values. A string array will also
								work with names and values alternating.  This is passed to the request's
								setRequestHeader method.
							</p>
							<p>
								The return value is the request responseText.
							</p>`,
					},
				]
			}
		]
	};

	return data;
}