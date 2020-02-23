'use strict';

/**
 * @method functionPickerData
 * @param {*} language - for possible future use
 * textual data for function picker
 */
export function functionPickerData(language) {
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
						desc: "Returns the base 10 logarithm of the value(s) in x",
					},
					{
						f: "{ln x}",
						desc: "Returns the natural logarithm of the value(s) in x",
					},
					{
						f: "{exp x}",
						desc: "Returns e to the value(s) in x, or in other words the natural anti-logarithm.",
					},
				]
			},
			{
				header: "Trigonometric math functions",
				functions: [
					{
						f: "{sin x}",
						desc: "Returns the sine of the value(s) in x, where x is in radians.",
					},
					{
						f: "{cos x}",
						desc: "Returns the cosine of the value(s) in x, where x is in radians.",
					},
					{
						f: "{tan x}",
						desc: "Returns the tangent of the value(s) in x, where x is in radians.",
					},
					{
						f: "{asin x}",
						desc: "Returns the arcsine of the value(s) in x. The returned values are in radians.",
					},
					{
						f: "{acos x}",
						desc: "Returns the arccosine of the value(s) in x. The returned values are in radians.",
					},
					{
						f: "{atan x}",
						desc: "Returns the arctangent of the value(s) in x. The returned values are in radians.",
					},
					{
						f: "{pi}",
						desc: "Just returns the value of pi.",
					},
					{
						f: "{polar x, y}",
						desc: `<p>
								Returns a table value with the first column <b>r</b> being the radius and the second <b>a</b> being the angle of x and y converted to polar coordinates.</p>
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
						desc: "Returns the hyperbolic sine of the value(s) in x.",
					},
					{
						f: "{cosh x}",
						desc: "Returns the hyperbolic cosine of the value(s) in x.",
					},
					{
						f: "{tanh x}",
						desc: "Returns the hyperbolic tangent of the value(s) in x.",
					},
					{
						f: "{asinh x}",
						desc: "Returns the principle value of the inverse hyperbolic sine of the value(s) in x.",
					},
					{
						f: "{acosh x}",
						desc: "Returns the principle value of the inverse hyperbolic cosine of the value(s) in x.",
					},
					{
						f: "{atanh x}",
						desc: "Returns the principle value of the inverse hyperbolic tangent of the value(s) in x.",
					},
				]
			},
			{
				header: "Complex Number functions",
				comment: `<i>Please see the <a href="complex.html">Complex Number</a> help page for more information on complex
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
						desc: "Returns the absolute value of the complex value z.  The result is a real number.",
					},
					{
						f: "{cln z}",
						desc: "Returns the complex natural logarithm of the complex value z.",
					},
					{
						f: "{cexp z}",
						desc: "Returns the complex value result of raising e to the complex value z, or in other words the natural anti-logarithm.",
					},
					{
						f: "{csin z}",
						desc: "Returns the sine of the complex value z.",
					},
					{
						f: "{ccos z}",
						desc: "Returns the cosine of the complex value z.",
					},
					{
						f: "{ctan z}",
						desc: "Returns the tangent of the complex value z.",
					},
					{
						f: "{casin z}",
						desc: "Returns the arcsine of the complex value z.",
					},
					{
						f: "{cacos z}",
						desc: "Returns the arccosine of the complex value z.",
					},
					{
						f: "{catan z}",
						desc: "Returns the arctangent of the complex value z.",
					},
					{
						f: "{csinh z}",
						desc: "Returns the hyperbolic sine of the complex value z.",
					},
					{
						f: "{ccosh z}",
						desc: "Returns the hyperbolic cosine of the complex value z.",
					},
					{
						f: "{ctanh z}",
						desc: "Returns the hyperbolic tangent of the complex value z.",
					},
					{
						f: "{casinh z}",
						desc: "Returns the inverse hyperbolic sine of the complex value z.",
					},
					{
						f: "{cacosh z}",
						desc: "Returns theinverse hyperbolic cosine of the complex value z.",
					},
					{
						f: "{catanh z}",
						desc: "Returns the inverse hyperbolic tangent of the complex value z.",
					},
				]
			},
			{
				header: "Reduction Functions",
				functions: [
					{
						f: "{max x}",
						desc: "Returns the maximum of the values in x.  If additional arguments are supplied, the maximum value of all their elements is returned.",
					},
					{
						f: "{min x}",
						desc: "Returns the minimum of the values in x. If additional arguments are supplied, the minimum value of all their elements is returned.",
					},
					{
						f: "{maxrows x}",
						desc: "Returns a column array with the maximums of the values in each row of x.  If x is a table value, then all the numeric columns must have the same unit dimensions, but string columns are simply ignored.",
					},
					{
						f: "{maxcols x}",
						desc: "Returns a row array with the maximums of the values in each column of x.  String columns in table values are ignored.",
					},
					{
						f: "{minrows x}",
						desc: "Returns a column array with the minimums of the values in each row of x.  If x is a table value, then all the numeric columns must have the same unit dimensions, but string columns are simply ignored.",
					},
					{
						f: "{mincols x}",
						desc: "Returns a row array with the minimums of the values in each column of x.  String columns in table values are ignored.",
					},
					{
						f: "{sum x}",
						desc: "Returns the summation of the values in x. If x is a table value, then all numeric columns must have the same dimensions.  String columns are ignored.",
					},
					{
						f: "{sumrows x}",
						desc: "Returns a column array with the summations of the values in each row of x.  If x is a table value, then all the numeric columns must have the same unit dimensions, but string columns are simply ignored.",
					},
					{
						f: "{sumcols x}",
						desc: "Returns a row array with the summations of the values in each column of x.  String columns in table values are ignored.",
					},
				]
			},
			{
				header: "Comparison functions",
				functions: [
					{
						f: "{eq a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the corresponding elements in the return value being <b>1</b> if the <b>a</b> value is equal to the <b>b</b> value or <b>0</b> if it is not.
							<p>
								If <b>a</b> does not have the same number of elements as <b>b</b>, then the smaller number must be divisible into the larger without a remainder and those values will be duplicated appropriately to match with the larger number of values.
							</p>`,
					},
					{
						f: "{ne a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the corresponding elements in the return value being <b>1</b> if the <b>a</b> value is not equal to the <b>b</b> value or <b>0</b> if it is.
							<p>
								If <b>a</b> does not have the same number of elements as <b>b</b>, then the smaller number must be divisible into the larger without a remainder and those values will be duplicated appropriately to match with the larger number of values.
							</p>`,
					},
					{
						f: "{le a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the corresponding elements in the return value being <b>1</b> if the <b>a</b> value is less than or equal to the <b>b</b> value or <b>0</b> if it is not.
							<p>
								If <b>a</b> does not have the same number of elements as <b>b</b>, then the smaller number must be divisible into the larger without a remainder and those values will be duplicated appropriately to match with the larger number of values.
							</p>`,
					},
					{
						f: "{lt a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the corresponding elements in the return value being <b>1</b> if the <b>a</b> value is less than the <b>b</b> value or <b>0</b> if it is not.
							<p>
								If <b>a</b> does not have the same number of elements as <b>b</b>, then the smaller number must be divisible into the larger without a remainder and those values will be duplicated appropriately to match with the larger number of values.
							</p>`,
					},
					{
						f: "{ge a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the corresponding elements in the return value being <b>1</b> if the <b>a</b> value is greater than or equal to the <b>b</b> value or <b>0</b> if it is not.
							<p>
								If <b>a</b> does not have the same number of elements as <b>b</b>, then the smaller number must be divisible into the larger without a remainder and those values will be duplicated appropriately to match with the larger number of values.
							</p>`,
					},
					{
						f: "{gt a, b}",
						desc: `Returns an element wise comparison of <b>a</b> and <b>b</b> with the corresponding elements in the return value being <b>1</b> if the <b>a</b> value is greater than the <b>b</b> value or <b>0</b> if it is not.
							<p>
								If <b>a</b> does not have the same number of elements as <b>b</b>, then the smaller number must be divisible into the larger without a remainder and those values will be duplicated appropriately to match with the larger number of values.
							</p>`,
					},
					{
						f: "{and a, b}",
						desc: `<p>
								If the first argument is a <b>scalar</b> then:
							</p>
							<p>
								Returns true (the value 1) if the first value (index 1,1) of every argument is non-zero.  If any element is unknown, then the result is unknown as well.
								If a zero value is encountered, then the values for the remaining arguments (left to right) will not be evaluated.
							</p>
							<p>
								If the first argument is <b>not a scalar</b> then:
							</p>
							<p>
								All the arguments are evaluated and they must all have either the same number of elements as the first argument or be scalars.  The result will be a numeric value of the same size as the first argument, with each value set to 0.0 unless the comparable elements of all the arguments are nonzero. Scalar arguments will use their single value to compare with all element positions.
							</p>`,
					},
					{
						f: "{or a, b}",
						desc: `<p>
								If the first argument is a <b>scalar</b> then:
							</p>
							<p>
								Returns the value of the first argument whose first element (index 1,1) is non-zero.  If an element is encountered with an unknown value, then the result is unknown as well. In either case the remaining arguments are not evaluated.
							</p>
							<p>
								If the first argument is <b>not a scalar</b> then:
							</p>
							<p>
								All the arguments are evaluated and they must all have either the same number of elements as the first argument or be scalars.  The result will be a numeric value of the same size as the first argument, with each value set to 1.0 unless the comparable elements of all the arguments are zero. Scalar arguments will use their single value to compare with all element positions.
							</p>`,
					},
					{
						f: "{not a}",
						desc: `Each element of the return value is <b>1</b> if the corresponding element of <b>a</b> is <b>0</b> otherwise it will be <b>1</b>.`,
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
					{
						f: "{append a, b}",
						desc: `<p>
								Creates a new object which contains all the columns of all the arguments.  All arguments must have
								the same number of rows and be of the same type (numeric, string or table).  If they are numeric,
								they must all have the same unit dimensions.
							</p>`,
					},
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
						f: "{concat a, b}",
						desc: `<p>
								Returns a column array with all of the values of the arguments concatenated together.  Matrices are first converted to arrays on a row by row basis.
								See the redim function if you wish to convert the result back into a matrix.
							</p>
							<p>
								When the arguments to concat are table values, all arguments must have the same number and type of columns.  In the resulting table each column will be the concatenation of the respective columns of the arguments.  The name and display unit for each column will be taken from the first argument.
							</p>
							<p>
								Can be abbreviated to just <b>cc</b>.
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
						desc: "Returns the number of columns in x",
					},
					{
						f: "{nrows x}",
						desc: "Returns the number of rows in x",
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
					{
						f: "{transpose a}",
						desc: "Returns the transposition of <b>a</b> (i.e. the rows and columns are reversed).  Can be abbreviated to just <b>tr</b>.",
					},
				]
			},
			{
				header: "Statistical functions",
				functions: [
					{
						f: "{average x, t}",
						desc: `<p>
								Returns the median of the averages of <b>x</b>.  If the second parameter is 0 or missing, this will be the
								scalar average of all the values of x.  If it is 1, then the result is a column vector whose values will be
								the averages of each row of x.  If it is 2, then it will be a row vector of averages of the columns of x.
							</p>`,
					},
					{
						f: "{median x, t}",
						desc: `<p>
								Returns the median of the values of <b>x</b>.  If the second parameter is 0 or missing, this will be the
								scalar median of all the values of x.  If it is 1, then the result is a column vector whose values will be
								the medians of each row of x.  If it is 2, then it will be a row vector of medians of the columns of x.
							</p>`,
					},
					{
						f: "{geomean x, t}",
						desc: `<p>
								Returns the geometric mean of the values of <b>x</b>.  If the second parameter is 0 or missing, this will
								be the scalar geometric mean of all the values of x.  If it is 1, then the result is a column vector whos
								values will be the geometric means of each row of x.  If it is 2, then it will be a row vector of geometric
								means of the columns of x.
							</p>`,
					},
					{
						f: "{harmmean x, t}",
						desc: `<p>
								Returns the harmonic mean of the values of <b>x</b>.  If the second parameter is 0 or missing, this will be
								the scalar harmonic mean of all the values of x.  If it is 1, then the result is a column vector whose values
								will be the harmonic means of each row of x.  If it is 2, then it will be a row vector of harmonic means of
								the columns of x.
							</p>`,
					},
					{
						f: "{var x, t}",
						desc: `<p>
								Returns the calculated variance for the sample <b>x</b>. Note that the unit type for this will be the square
								of the unit type of <b>x</b>.  The square root of this is the standard deviation.
							</p>
							<p>
								If the second parameter is 0 or missing, this will be the scalar variance of all the values of x.  If it is 1,
								then the result is a column vector whose values will be the variance of each row of x.  If it is 2, then it
								will be a row vector of variance of the columns of x.
							</p>`,
					},
					{
						f: "{factorial x}",
						desc: `Returns a unitless matrix the same size as x, but with each element replaced the factorial of its value.  If
						the value is not an integer, it will be rounded to the nearest integer and if the value is negative, it will be
						replaced with 1.  Note that values greater than 170 will result in an "inf" value since the result would be greater
						than the largest floating point value for the device.`,
					},
					{
						f: "{lngamma x}",
						desc: `<p>
								Returns the natural logarithm of the gamma function for x, where x > 0.  Note that where x is an integer,
								then gamma x is equal to (x - 1)!.  Thus for calculations that involve division of large factorials that
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
								are used with <b> values being reused as necessary.
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
						desc: `<p>Creates a table value whose column names are the elements of n and values are taken from the
								columns of c and additional parameters.  These value arguments must all have the same number of rows.  If
								n is a table value, then its column names are used.  If there are fewer names than values or vice versa,
								the lessor number is used and the extras are ignored.
							</p>
							<p>
								If the function is only supplied with one argument, it must be a string containing comma separated
								values in the format generated by the Copy as Table context menu command, that is starting with the
								table, names and units lines.
							</p>`,
					},
					{
						f: "{nrows x}",
						desc: "Returns the number of rows in x",
					},
					{
						f: "{ncols x}",
						desc: "Returns the number of columns in x",
					},
					{
						f: "{colnames x}",
						desc: "Returns an array consisting of the column names of table x",
					},
					{
						f: "{maxrows x}",
						desc: `Returns a column array with the maximums of the values in each row of x.  If x is a table value,
						then all the numeric columns must have the same unit dimensions, but string columns are simply copied.`,
					},
					{
						f: "{maxcols x}",
						desc: "Returns a row array with the maximums of the values in each column of x.  String columns in table values are ignored.",
					},
					{
						f: "{minrows x}",
						desc: `Returns a column array with the minimums of the values in each row of x.  If x is a table value, then
						all the numeric columns must have the same unit dimensions, but string columns are simply copied.`,
					},
					{
						f: "{mincols x}",
						desc: "Returns a row array with the minimums of the values in each column of x.  String columns in table values are ignored.",
					},
					{
						f: "{sum x}",
						desc: `Returns the summation of the values in x. If x is a table value, then all numeric columns must have the
						same dimensions.  String columns are ignored.`,
					},
					{
						f: "{sumrows x}",
						desc: `Returns a column array with the summations of the values in each row of x.  If x is a table value, then
						all the numeric columns must have the same unit dimensions, but string columns are simply copied.`,
					},
					{
						f: "{sumcols x}",
						desc: "Returns a row array with the summations of the values in each column of x.  String columns in table values are ignored.",
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
					{
						f: "{append a, b}",
						desc: `<p>
								Creates a new object which contains all the columns of all the arguments.  All arguments must have the
								same number of rows and be of the same type (numeric, string or table).  If they are numeric, they must
								all have the same unit dimensions.
							</p>`,
					},
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
					{
						f: "{select from, bool}",
						desc: `Rows will be selected from the "from" argument, which can be a string, number or table value.  The
							"bool" value must be numeric and have a single column and the same number of rows as the "from" value.  The
							returned value will consist of all the rows of "from" for which the corresponding row value of "bool" is nonzero.`,
					},
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
								If <b>x</b> is not a scalar, then the process is repeated for each value of x, with the result being
								in the corresponding row of the returned value.
							</p>`,
					},
					{
						f: "{select from, bool}",
						desc: `Rows will be selected from the "from" argument, which can be a string, number or table value.  The "bool"
							value must be numeric and have a single column and the same number of rows as the "from" value.  The returned
							value will consist of all the rows of "from" for which the corresponding row value of "bool" is nonzero.`,
					},
				]
			},
			{
				header: "String functions",
				functions: [
					{
						f: "{fmt f, x, u}",
						desc: `Formats a number <b>x</b>, using the format string <b>f</b>, optionally using a display unit <b>u</b>.
							<br><br>
							The <b>x</b> value can be a numeric scalar, array or matrix and the <b>f</b> parameter must be a C style
							format string.  This will typically be something like <b>"%12.2f"</b>, which would produce a number field 12
							characters wide, with two decimal places.  Although the format string must only have one number format, it is
							permissible to have other characters.  For example: <b>"(%15.5e)"</b>
							would return a number in exponential format, surrounded by parenthesis.
							<br><br>
							If the third parameter, u, is used, it must be the name of a unit compatible with the unit type of x.
							<br><br>
							Thus function {fmt "(%12.2f)", 12.1234}would return<br>
							<span class="fixedwidth">
							(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;12.12)</span>,<br>
							while {fmt "(%12.2f)", 12.1234, "%"} would return<br>
							<span class="fixedwidth">
							(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1212.34)</span>.
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
					All assume the y axis is vertical, the x horizontal and z positive out of the screen.</i>`,
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
						fdesc: `Creates a 4x4 transformation matrix for rotations of angle radians around the z axis.`,
					},
					{
						f: "{pitch angle}",
						desc: `	Creates a 4x4 transformation matrix for rotation of angle radians around the x axis.`,
					},
					{
						f: "{yaw angle}",
						desc: `Creates a 4x4 transformation matrix for rotation of angle radians around the y axis.`,
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
						desc: "Returns the absolute value(s) of x",
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
						desc: `Executes the first argument <b>c</b>, which must be a string value, as Javascript code.  If
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
						f: "{int x}",
						desc: "Returns integer portion of x",
					},
					{
						f: "{numeric x}",
						desc: `<p>
								Returns a numeric matrix value of x.  If x is already numeric it is simply returned.
							</p>
							<p>
								If x is string value, then an attempt is made to interpret its values as numbers and if that isn't
								possible, a zero is used in its place.
							</p>
							<p>
								If x is a table value, then all of the columns must be of the same unit dimensions.  String columns are ignored.
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
						f: "{sign x}",
						desc: `Returns a unitless matrix the same size as x, but with each element replaced with 1 if the x
						element is greater or equal to 0 and -1 if the element is negative.`,
					},
					{
						f: "{sort x}",
						desc: "Returns x sorted on its first column.",
					},
					{
						f: "{isort x}",
						desc: `Creates a column array of indexes, such that if they are used with the index operator for x, the
							result would be x sorted on its first column.`,
					},
					{
						f: "{pedometer s, f}",
						desc: `On devices which support it, this function returns a table of historical fitness data from the
								start time, <b>s</b> to the finish time <b>f</b>.  The columns of the table are <b>steps</b>, <b>distance</b>,
								<b>upflights</b> and <b>downflights</b>. The device only keeps records for a limited number of days and requests
								outside that range will return 0.  Also zero values are returned on devices that don't support the data for the column.
							<p>
								If the start and finish times are arrays, then one row will be produced in the array for each value.
							</p`,
					},
					{
						f: "{steps s, f}",
						desc: `With the introduction of the pedometer function in version 3, this function is deprecated.
							Internally it simply returns the steps column from the table returned by the pedometer function`,
					},
					{
						f: "{wget url}",
						desc: `<p>
								Attempts to read the contents of the url, usually a web address, and returns them as a string.
							</p>
							<p>
								If url is an array, then each address in the array will be retrieved and returned in the corresponding
								cell of an array.
							</p>`,
					},
					{
						f: "{wget2 url, headers}",
						desc: `<p>
								This is a more elaborate version of the wget command that operates on a single url, usually a web
								address.  The headers parameter should be a string matrix with the first column containing any header
								names and the second header values.  If headers is a single empty string, then no headers are passed.
							</p>
							<p class="funcdesc">
								A string matrix is returned with the first row containing the string "data" in the first column and the returned data in the second column.  Additional rows contain any returned headers with the name in the first column and the values in the second column.
							</p>
							<p>
								If url is an array only the first address in the array will be retrieved.
							</p>`,
					},
					{
						f: "{wpost url, headers, data}",
						desc: `Posts data to a url (similar to a web form).  The headers parameter should be a string matrix with
								the first column containing any header names and the second header values.  The data parameter should be
								a string containing the data to be sent, typically in JSON form.
							<p>
								A string matrix is returned with the first row containing the string "data" in the first column and the
								returned data in the second column.  Additional rows contain any returned headers with the name in the
								first column and the values in the second column.
							</p>`,
					},
					{
						f: "{wputt url, headers, data}",
						desc: `Puts" data to a url using the PUT method.  The headers parameter should be a string matrix with
								the first column containing any header names and the second header values.  The data parameter should
								be a string containing the data to be sent, typically in JSON form.
							<p>
								A string matrix is returned with the first row containing the string "data" in the first column and
								the returned data in the second column.  Additional rows contain any returned headers with the name
								in the first column and the values in the second column.
							</p>`,
					}
				]
			}
		]
	};

	return data;
}