'use strict';
// low level functions that operate on scalar values and that the
// language Math library does not supply

const MMMath = {

	// low level complex calculation functions
	// all argments and returns are 2 value arrays [re, img]
	// most of the complex code was shamelessly adapted from Complex.js
	// 		Copyright (c) 2016, Robert Eisele (robert@xarg.org)
	// 		Dual licensed under the MIT or GPL Version 2 licenses.

	// functions taking complex arguments or returning complex values represent them
	// as two value arrays [re, img]
	complex: (a, b) => {  // create a complex value (i.e. table representation)
		return [a[0], b[0]];
	},

	cMultiply: (a, b) => { // multiply two complex numbers
		// if just real
		if (a[1] === 0.0 && b[1] === 0.0) {
			return [a[0] * b[0], 0];
		}
		return [ a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0] ];
	},

	cDivide: (a, b) => { // divide (a/b) two complex numbers
		if (b[1] === 0.0) {
			// real denominator
			return [a[0]/b[0], a[1]/b[0]];
		}

		if (Math.abs(b[0]) < Math.abs(b[1])) {
			const x = b[0] / b[1];
			const t = b[0] * x + b[1];

			return [
				(a[0] * x + a[1]) / t,
				(a[1] * x - a[0]) / t
			];		
		}
		else {
			const x = b[1] / b[0];
			const t = b[1] * x + b[0];

			return [
				(a[0] + a[1] * x) / t,
				(a[1] - a[0] * x) / t
			];
		}
	},

	hypot: (x, y) => {

		var a = Math.abs(x);
		var b = Math.abs(y);

		if (a < 3000 && b < 3000) {
			return Math.sqrt(a * a + b * b);
		}

		if (a < b) {
			a = b;
			b = x / y;
		} else {
			b = y / x;
		}
		return a * Math.sqrt(1 + b * b);
	},

	logHypot: (a, b) => {
		// Calculates log(sqrt(a^2+b^2)) in a way to avoid overflows
		// utility function returning real scalar
		const absA = Math.abs(a);
		const absB = Math.abs(b);

		if (a === 0) {
			return Math.log(absB);
		}

		if (b === 0) {
			return Math.log(absA);
		}

		if (absA < 3000 && absB < 3000) {
			return Math.log(a * a + b * b) * 0.5;
		}
		return Math.log(a / Math.cos(Math.atan2(b, a)));
	},

	cPower: (a, b) => { // raise complex number a to the power of complex number b
		if (b[0] === 0 && b[1] === 0) {
			return [1, 0];
		}

		if (b[1] === 0) {
			// exponent is real
			if (a[1] === 0 && a[0] >= 0) {
				return [Math.pow(a[0], b[0])];
			}
			else if (a[0] === 0) {
				// base is completely imaginary
				// is the exponent a whole number
				switch ((b[0] % 4 + 4) % 4) {
					case 0:
						return [(Math.pow(a[1], b[0]), 0)];
					case 1:
						return [0, Math.pow(a[1], b[0])];
					case 2:
						return [-Math.pow(a[1], b[0]), 0];
					case 3:
						return [0, -Math.pow(a[1], b[0])];
				}
			}
		}

		if (a[0] === 0 && a[1] === 0 && b[0] > 0 && b[1] >= 0) {
			return [0,0];
		}

		const arg = Math.atan2(a[1], a[0]);
		var loh = MMMath.logHypot(a[0], a[1]);

		const r = Math.exp(b[0] * loh - b[1] * arg);
		const i = b[1] * loh + b[0] * arg;
		return [r * Math.cos(i), r * Math.sin(i)];					
	},

	cAbsolute: (a) => {
		return MMMath.hypot(a[0], a[1]);
	},

	cexp: (a) => {

		const tmp = Math.exp(a[0]);

		return [
			tmp * Math.cos(a[1]),
			tmp * Math.sin(a[1])
		];
	},
		
	cln: (a) => {
		const re = a[0];
		const img = a[1];

		return [
			MMMath.logHypot(re, img),
			Math.atan2(img, re)
		];
	},

	csin: (a) => {
		const r = a[0];
		const i = a[1];
		return [
			Math.sin(r) * Math.cosh(i),
			Math.cos(r) * Math.sinh(i)
		];
	},

	ccos: (a) => {
		const r = a[0];
		const i = a[1];
		return [
			Math.cos(r) * Math.cosh(i),
			-Math.sin(r) * Math.sinh(i)
		];
	},

	ctan: (a) => {
		const r = 2 * a[0];
		const i = 2 *a[1];
		const d = Math.cos(r) + Math.cosh(i);

		return [
			Math.sin(r) / d,
			Math.sinh(i) / d
		];
	},

	casin: (a) => {
		const r = a[0];
		const i = a[1];
		const t1 = MMMath.cPower([i * i - r * r + 1, -2.0 * r * i], [0.5, 0]);
		const t2 = MMMath.cln([t1[0] - i, t1[1] + r]);
		return [t2[1], -t2[0]];
	},

	cacos: (a) => {
		const r = a[0];
		const i = a[1];
		const t1 = MMMath.cPower([i * i - r * r + 1, -2.0 * r * i], [0.5, 0]);
		const t2 = MMMath.cln([t1[0] - i, t1[1] + r]);
		return [Math.PI / 2 - t2[1], t2[0]];
	},

	catan: (a) => {
		const r = a[0];
		const i = a[1];
		if (r === 0) {
			if (i === 1) {
				return [0.0, Infinity];
			}

			if (i === -1) {
				return [0.0, -Infinity];
			}
		}

		const d = r * r + (1.0 - i) * (1.0 - i);

		const t1 = MMMath.cln([
			(1 - i * i - r * r) / d,
			-2 * r / d
		]);

		return [-0.5 * t1[1], 0.5 * t1[0]];
	},

	csinh: (a) => {
		const r = a[0];
		const i = a[1];
		return [
			Math.sinh(r) * Math.cos(i),
			Math.cosh(r) * Math.sin(i)
		];
	},

	ccosh: (a) => {
		const r = a[0];
		const i = a[1];
		return [
			Math.cosh(r) * Math.cos(i),
			Math.sinh(r) * Math.sin(i)
		];
	},

	ctanh: (a) => {
		const r = 2 * a[0];
		const i = 2 * a[1];
		const d = Math.cosh(r) + Math.cos(i);

		return [
			Math.sinh(r) / d,
			Math.sin(i) / d
		];
	},

	casinh: (a) => {
		const r = a[0];
		const i = a[1];
		const res = MMMath.casin([i, -r]);
		return [-res[1], res[0]];
	},

	cacosh: (a) => {
		const res = MMMath.cacos(a);
		if (res[1] <= 0.0) {
			return [-res[1], res[0]];
		}
		else {
			return [res[1], -res[0]];
		}
	},

	catanh: (a) => {
		const r = a[0];
		const i = a[1];

		const noIM = r > 1 && i === 0;
		const oneMinus = 1 - r;
		const onePlus = 1 + r;
		const d = oneMinus * oneMinus + i * i;

		const x = (d !== 0)
			? [
				(onePlus * oneMinus - i * i) / d,
				(i * oneMinus + onePlus * i) / d
			]
			: [
				(r !== -1) ? (r / 0) : 0,
				(i !== 0) ? (i / 0) : 0
			];

		const v = [
			MMMath.logHypot(x[0], x[1]) / 2,
			Math.atan2(x[1], x[0]) / 2
		];

		if (noIM) {
			v[1] = -v[1];
		}
		
		return v;
	},

	// statistical functions

	lnGamma: (xx) => {
		// returns ln gamma xx for xx > 0.  Full accuracy is obtained for xx > 1.
		// NR claims for 0 < xx < 1 the reflection formula (NR 6.1.4) should be used first,
		// but in fact it seems to work fine for all xx > 0

		if (xx === 1.0 || xx === 2.0) {
			return 0.0;
		}
		const cof = [
			76.18009173,
			-86.50532033,
			24.01409822,
			-1.231739516,
			0.120858003e-2,
			-0.536382e-5
		];
		let x = xx - 1.0;
		let tmp = x + 5.5;
		tmp -= ( x + 0.5 )*Math.log( tmp );
		let ser = 1.0;
		for (let j = 0; j <= 5; j++) {
			x += 1.0;
			ser += cof[ j ] / x;
		}
		
		return -tmp + Math.log( 2.50662827465 * ser );
	},

	permutation: (n, chosen) => {
		return Math.exp(MMMath.lnGamma(n + 1) - MMMath.lnGamma(n - chosen + 1))
	},

	combination: (n, chosen) => {
		return Math.exp(MMMath.lnGamma(n + 1) -
			MMMath.lnGamma(n - chosen + 1) -
			MMMath.lnGamma(chosen + 1)
		);
	},

	// erf functions
	// Matti Kariluoma May 2012 
	// http://stackoverflow.com/questions/5971830/need-code-for-inverse-error-function
	erfc: (x) => {
		const z = Math.abs(x)
		const t = 1.0 / (0.5 * z + 1.0)
		const a1 = t * 0.17087277 + -0.82215223
		const a2 = t * a1 + 1.48851587
		const a3 = t * a2 + -1.13520398
		const a4 = t * a3 + 0.27886807
		const a5 = t * a4 + -0.18628806
		const a6 = t * a5 + 0.09678418
		const a7 = t * a6 + 0.37409196
		const a8 = t * a7 + 1.00002368
		const a9 = t * a8
		const a10 = -z * z - 1.26551223 + a9
		let a = t * Math.exp(a10)

		if (x < 0.0) {
			a = 2.0 - a;
		}

		return a;
	},

	erf: (x) => {
		return 1.0 - MMMath.erfc(x)
	},

	erfinv: (y) => {
		if (y < -1.0 ||y > 1.0) {
			alert("erfinv input out of range!");
			return 0;
		}

		let x;
		if (y == -1.0)
		{
			x = Number.POSITIVE_INFINITY
		}
		else if (y == 1.0)
		{
			x = Number.NEGATIVE_INFINITY
		}
		else if (y < -0.7)
		{
			const z1 = (1.0 + y) / 2.0
			const z2 = Math.Ln(z1)
			const z3 = Math.sqrt(-z2)
			const z = z3
			const x1 = 1.641345311 * z + 3.429567803
			const x2 = x1 * z + -1.624906493
			const x3 = x2 * z + -1.970840454
			const x4 = 1.637067800 * z +  3.543889200
			const x5 = x4 * z + 1.0
			const x6 = -x3 / x5 // note: negative
			x = x6
		}
		else if (y < 0.7)
		{
			const z = y * y
			const x1 = -0.140543331 * z + 0.914624893
			const x2 = x1 * z + -1.645349621
			const x3 = x2 * z + 0.886226899
			const x4 = 0.012229801 * z + -0.329097515
			const x5 = x4 * z + -0.329097515
			const x6 = x5 * z + 1.442710462
			const x7 = x6 * z + -2.118377725
			const x8 = x7 * z + 1.0
			const x9 = y * x3 / x8
			x = x9
		}
		else
		{
			const z1 = (1.0 + y) / 2.0
			const z2 = Math.Ln(z1)
			const z3 = Math.sqrt(-z2)
			const z = z3
			const x1 = 1.641345311 * z + 3.429567803
			const x2 = x1 * z + -1.624906493
			const x3 = x2 * z + -1.970840454
			const x4 = 1.637067800 * z +  3.543889200
			const x5 = x4 * z + 1.0
			const x6 = x3 / x5 // note: positive
			x = x6
		}

		x = x - (MMMath.erf(x) - y) / (2.0/Math.sqrt(Math.PI) * Math.exp(-x*x));
		x = x - (MMMath.erf(x) - y) / (2.0/Math.sqrt(Math.PI) * Math.exp(-x*x));

		return x
	},

	inverseNormal: (p) => {
		/*
		* The inverse standard normal distribution.
		*
		*   Author:      Peter John Acklam <pjacklam@online.no>
		*   URL:         http://home.online.no/~pjacklam
		
			implementation by V. Natarajan (Kanchipuram (near Madras), India)
		*/
	
		const A1 = -3.969683028665376e+01;
		const A2 = 2.209460984245205e+02;
		const A3 = -2.759285104469687e+02;
		const A4 = 1.383577518672690e+02;
		const A5 = -3.066479806614716e+01;
		const A6 = 2.506628277459239e+00;
		
		const B1 = -5.447609879822406e+01;
		const B2 = 1.615858368580409e+02;
		const B3 = -1.556989798598866e+02;
		const B4 = 6.680131188771972e+01;
		const B5 = -1.328068155288572e+01;
		
		const C1 = -7.784894002430293e-03;
		const C2 = -3.223964580411365e-01;
		const C3 = -2.400758277161838e+00;
		const C4 = -2.549732539343734e+00;
		const C5 = 4.374664141464968e+00;
		const C6 = 2.938163982698783e+00;
		
		const D1 = 7.784695709041462e-03;
		const D2 = 3.224671290700398e-01;
		const D3 = 2.445134137142996e+00;
		const D4 = 3.754408661907416e+00;
		
		const P_LOW = 0.02425;
		const P_HIGH = 1.0 - P_LOW; // 0.97575
		
		let x = 0;
		let q, r, u, e;
		if ((0 < p ) && (p < P_LOW)){
			q = Math.sqrt(-2*Math.log(p));
			x = (((((C1*q+C2)*q+C3)*q+C4)*q+C5)*q+C6) / ((((D1*q+D2)*q+D3)*q+D4)*q+1);
		}
		else{
			if ((P_LOW <= p) && (p <= P_HIGH)){
				q = p - 0.5;
				r = q*q;
				x = (((((A1*r+A2)*r+A3)*r+A4)*r+A5)*r+A6)*q /(((((B1*r+B2)*r+B3)*r+B4)*r+B5)*r+1);
			}
			else{
				if ((P_HIGH < p)&&(p < 1)){
					q = Math.sqrt(-2*Math.log(1-p));
					x = -(((((C1*q+C2)*q+C3)*q+C4)*q+C5)*q+C6) / ((((D1*q+D2)*q+D3)*q+D4)*q+1);
				}
			}
		}
		
		if(( 0 < p)&&(p < 1)){
			e = 0.5 * MMMath.erfc(-x/Math.sqrt(2)) - p;
			u = e * Math.sqrt(2*Math.PI) * Math.exp(x*x/2);
			x = x - u/(1 + x*u/2);
		}
		
		return x;
	},

	cumulativeNormal: (x) => {
		// from paper at https://lyle.smu.edu/~aleskovs/emis/sqc2/accuratecumnorm.pdf
		// which implements Hart 1968 method
		const xAbs = Math.abs(x);
		let rv;
		if (xAbs > 37) {
			rv = 0.0;
		}
		else {
			const expo = Math.exp(-Math.pow(xAbs, 2.0) / 2.0);
			let build;
			if (xAbs < 7.07106781186547) {
				build = 3.52624965998911E-02 * xAbs + 0.700383064443688;
				build = build * xAbs + 6.37396220353165;
				build = build * xAbs + 33.912866078383;
				build = build * xAbs + 112.079291497871;
				build = build * xAbs + 221.213596169931;
				build = build * xAbs + 220.206867912376;
				rv = expo * build;
				build = 8.83883476483184E-02 * xAbs + 1.75566716318264;
				build = build * xAbs + 16.064177579207;
				build = build * xAbs + 86.7807322029461;
				build = build * xAbs + 296.564248779674;
				build = build * xAbs + 637.333633378831;
				build = build * xAbs + 793.826512519948;
				build = build * xAbs + 440.413735824752;
				rv /= build;
			}
			else {
				build = xAbs + 0.65;
				build = xAbs + 4 / build;
				build = xAbs + 3 / build;
				build = xAbs + 2 / build;
				build = xAbs + 1 / build;
				rv = expo / build / 2.506628274631;
			}
		}
		
		if (x > 0) {
			rv = 1 - rv;
		}
		
		return rv;
	},

	betacf: (a, b, x) => {
		let bm = 1.0;
		let az = 1.0;
		let am = 1.0;
		
		const qab = a + b;
		const qap = a + 1.0;
		const qam = a - 1.0;
		let bz = 1.0 - qab * x / qap;
		
		for (let m = 1; m <= 100; m++ ) {
			const tem = m + m;
			let d = m * (b - m) * x / ((qam + tem) * (a + tem));
			const ap = az + d * am;
			const bp = bz + d * bm;
			d = -(a + m) * (qab + m) * x / ((qap + tem) * (a + tem));
			const app = ap + d * az;
			const bpp = bp + d * bz;
			const aold = az;
			am = ap / bpp;
			bm = bp / bpp;
			az = app / bpp;
			bz = 1.0;
			if ( Math.abs(az - aold) < Math.abs(az) * 1.0e-8 ) {
				return az;
			}
		}
		return Math.Infinity;
	},

	betai: (a, b, x ) => {
		if (x < 0.0 || x > 1.0 ) {
			return Math.Infinity;
		}
		
		let bt;
		if (x == 0.0 || x == 1.0)
			bt = 0.0;
		else
			bt = Math.exp(MMMath.lnGamma(a + b) - MMMath.lnGamma(a) - MMMath.lnGamma(b) + a*Math.log(x) + b*Math.log(1.0 - x));
		
		if (x < (a + 1.0) / (a + b + 2.0)) {
			return bt*MMMath.betacf(a, b, x )/a;
		}
		else {
			return 1.0 - bt*MMMath.betacf(b, a, 1.0 - x)/b;
		}
	},

	gammaSer: (a, x) => {
		// returns the incomplete gamma function P(a, x) evaluated by its series representation.
		const gln = MMMath.lnGamma(a);
		if (x < 0.0 || a <= 0.0) {
			return Math.Infinity;
		}
		
		let ap = a;
		let sum = 1.0 / a;
		let del = sum;
		for (let n = 1; n <= 100; n++) {
			ap += 1.0;
			del *= x / ap;
			sum += del;
			if (Math.abs( del ) < Math.abs(sum) * 1.0e-8 ) {
				return sum * Math.exp( -x + a*Math.log(x) - gln );
			}
		}
		return Math.Infinity;
	},

	gammaCf: (a, x) => {
		// returns the incomplete gamma function Q(a, x) evaluated by
		// its confinued fraction representation
		if (x < 0.0 || a <= 0.0) {
			return Math.Infinity;
		}
		
		let gold = 0.0;
		let fac = 1.0;
		let a0 = 1.0;
		let a1 = x;
		let b1 = 1.0;
		let b0 = 0.0;
		
		const gln = MMMath.lnGamma(a);
		for (let n = 1; n < 100; n++) {
			const ana = n - a;
			a0 = (a1 + a0*ana) * fac;
			b0 = (b1 + b0*ana) * fac;
			const anf = n * fac;
			a1 = x * a0 + anf * a1;
			b1 = x * b0 + anf * b1;
			if (a1) {
				fac = 1.0 / a1;
				const g = b1 * fac;
				if (Math.abs(g - gold) / g < 1.0e-8) {
					return Math.exp(-x + a * Math.log(x) - gln) * g;
				}
				gold = g;
			}
		}
		
		return Math.Infinity;
	},

	gammaQ: (a, x) => {
		if (x < 0.0 || a <= 0.0)
			return Math.Infinity;
		
		if (x < ( a + 1.0)) {  // use series representation
			return 1.0 - MMMath.gammaSer(a, x);
		}
		else {  // use continued fraction representation
			return MMMath.gammaCf(a, x);
		}
	},

	avevar: (data, n) => {
		let ave = 0.0;
		let svar = 0.0;
		for (let j = 0; j < n; j++ )
			ave += data[ j ];
		ave /= n;
		
		for (let j = 0; j < n; j++ ) {
			const s = data[j] - ave;
			svar += s*s;
		}
		svar /= (n-1);

		return [ave, svar];
	},

	ttest: (data1, n1, data2, n2) => {
		let ave1, var1, ave2, var2;
		[ave1, var1] = MMMath.avevar( data1, n1);
		[ave2, var2] = MMMath.avevar( data2, n2);
		const df = n1 + n2 - 2;
		const svar = ((n1-1) * var1 + (n2-1) * var2) / df;
		const t = (ave1-ave2) / Math.sqrt( svar*(1.0/n1 + 1.0/n2));
		return MMMath.betai( 0.5 * df, 0.5, df/(df + t*t));
	},

	tptest: (data1, data2, n) => {
		let ave1, var1, ave2, var2;
		[ave1, var1] = MMMath.avevar( data1, n);
		[ave2, var2] = MMMath.avevar( data2, n);

		let cov = 0;
		for (let j = 0; j < n; j++ ) {
			cov += (data1[j] - ave1) * (data2[j] - ave2);
		}
		const df = n - 1;
		cov /= df;
		const sd = Math.sqrt((var1 + var2 - 2.0*cov) / n);
		const t = (ave1 - ave2) / sd;
		return MMMath.betai(0.5*df, 0.5, df/(df + t * t));
	},

	// equation solvers

		/**
	 * @method luDecomposition
	 * @param {Number} count - size of square matrix represented by values parameter
	 * @param {Float64Array} values - matrix values stored in row * count + column order
	 * @return {Object} contains pivot:, a Int32Array that records the row permutations effected
	 * by partial pivoting and isEven: which is true if the number of row interchanges was even
	 * and false if odd
	 * based on Numerical Recipe in C
	 */
	luDecomposition: (count, values) => {
		let isEven = true;
		let imax = 0;
		const vv = new Float64Array(count);
		const pivot = new Int32Array(count);

		for (let i = 0; i < count; i++ ) {  // loop over rows to get implicit scaling information
			let big = 0.0;
			for (let j = 0; j < count; j++ ) {
				const temp = Math.abs(values[count * i  + j]);
				if (temp > big)
					big = temp;
			}
			if (big === 0.0) {
				return {error: 'mmcmd:matrixLudecompSingular'};
			}
			
			vv[i] = 1.0 / big;  // save the scaling
		}
		
		for (let j = 0; j < count; j++ ) {     // this loop is over columns of Crout.s method
			for (let i = 0; i < j; i++) {
				let sum = values[count * i + j];
				for (let k = 0; k < i; k++) {
					sum -= values[count * i + k] * values[count * k + j];
				}
				values[count * i + j] = sum;
			}
			
			let big = 0.0;   // initialize the search for the largest pivot
			for (let i = j; i < count; i++) {
				let sum = values[count * i + j];
				for (let k = 0; k < j; k++ ) {
					sum -= values[count * i + k] * values[count * k + j];
				}
				
				values[count * i + j] = sum;
				
				const dum = vv[i] * Math.abs(sum);
				if ( dum >= big ) {
					big = dum;  // is the figure of merit for the pivot better than the best so far
					imax = i;
				}
			}
			
			if (j != imax) {       // do we need to interchange rows?
				for (let k = 0; k < count; k++ ) { // yes - do so
					const dum = values[count * imax + k];
					values[count * imax + k] = values[count * j + k];
					values[count * j + k] = dum;
				}
				isEven = !isEven;		// ...and change the parity of isEven
				vv[imax] = vv[j];	// and interchange the scale factor
			}
			
			pivot[j] = imax;
			if (values[count * j + j] === 0.0) {  // if the pivot element is zero, then the matrix is singular.  For some applications on singular
				values[count * j + j] = 1e-20;   // matricies, it is desirable to substitute a tiny number for zero
			}
			if (j !== count - 1 ) {   // Now, finally, divide by the pivot element
				const dum = 1.0 / values[count * j + j];
				for (let i = j + 1; i < count; i++) {
					values[count * i + j] *= dum;
				}
			}
		}
		return {pivot: pivot, isEven: isEven}
	},

		/**
	 * @method luBackSubstitute
	 * @param {Number} count - size of square matrix represented by values parameter
	 * @param {Float64Array} values - matrix values stored in row * count + column order
	 * @param {Float64Array} b 
	 * @param {Int32Array} pivot 
	 * values in b are replaced with x in solving equation A*x = b
	 * this matrix is A having undergone luDecomposition producing pivot
	 */
	luBackSubstitute: (count, values, b, pivot) => {
		let ii = -1;
		for (let i = 0; i < count; i++) {	// when ii is a positive value it will become the index of the first
			let ip = pivot[i];			// nonvanishing element of b. We now do the forward substitution.
			let sum = b[ip];
			b[ip] = b[i];
			if (ii >= 0) {
				for (let j = ii; j < i; j++) {
					sum -= values[count * i + j] * b[j];
				}
			}
			else if (sum !== 0.0) {
				ii = i;		 // a nonzero element was encountered, so from now on we will have to do the sums in the loop above
			}
			b[i] = sum;
		}
		
		for (let i = count - 1; i >= 0; i--) {	// now we do the backsubstitution
			let sum = b[i];
			for (let j = i + 1; j < count; j++) {
				sum -= values[count * i + j] * b[j];
			}
			b[i] = sum /values[count * i + i];
		}
	},

	/**
	 * @method brentSolve
	 * @param {Object} required
	 * required must have:
	 *  fx(x) function returning the function evaluation of x
	 *  setError(s) function for setting an error message;
	 * 	setStatus(s) function for setting status message
	 * @param {Object} options
	 * 	options can have options (see code below for defaults):
	 *  maxIterations
	 *  relTolerance - relative tolerance
	 *  absTolerance - absolute tolerance
	 *  xLower
	 *  xUpper
	 * @return {[Number, Number]} - array containg x and fx - null if failed
	 */

	// brentSolve
	brentSolve: (required, options={}) => {
		// required
		const functionValue = required.fx;
		const setErrorDescription = required.setError;
		const setStatus = required.setStatus;

		// optional in options
		const maxIterations = options.maxIterations || 200;
		const eps = options.relTolerance || 1.0e-10;
		const fTolerance = options.absTolerance || 1e-5;
		let a = options.xLower !== undefined ? options.xLower : -1;
		let b = options.xUpper !== undefined ? options.xUpper : 1;

		let c = b;
		let d = 0.0;
		let e = 0.0;	
		
		// function is calculated for bounds
		let fa = functionValue(a);
		let fb = functionValue(b);
		
		if (( fa > 0.0 && fb > 0.0 ) || ( fa < 0.0 && fb < 0.0 )) {
			setErrorDescription('mmcmd:mathBrentNoBracket')
			return;
		}
		
		let fc = fb;
		let tStart = new Date().getTime();
		let iter;
		for (iter = 1; iter <= maxIterations; iter++ ) {
			if (( fb > 0.0 && fc > 0.0 ) || ( fb < 0.0 && fc < 0.0 )) {
				c = a;    // rename a, b, c and adjust bounding interval d
				fc = fa;
				d = b - a;
				e = d;
			}
			
			if ( Math.abs( fc ) < Math.abs( fb ) ) {
				a = b;
				b = c;
				c = a;
				fa = fb;
				fb = fc;
				fc = fa;
			}
			
			let tol1 = 2.0 * eps * Math.abs( b ) + 0.5 * fTolerance;
			let xm = 0.5 * (  c - b );
			if ( Math.abs( xm ) <= tol1 || fb == 0.0 ) {
				// [ delegate setErrorDescription: nil ];
				return [xm, fb];
			}
			
			if ( Math.abs( e ) >= tol1 && Math.abs( fa ) > Math.abs( fb ) ) {
				let s = fb/fa;    // Attempt inverse quadratic interpolation
				let p, q, r;
				if ( a == c ) {
					p = 2.0 * xm * s;
					q = 1.0 - s;
				}
				else {
					q = fa/fc;
					r = fb/fc;
					p = s * ( 2.0*xm*q*(q - r) - (b-a)*(r-1.0));
					q = (q-1.0)*(r-1.0)*(s-1.0);
				}
				
				if ( p > 0.0 )   // check whether in bounds
					q = -q;
				
				p = Math.abs(p);
				const min1 = 3.0*xm*q - Math.abs(tol1*q);
				const min2 = Math.abs( e*q );
				
				if ( 2.0*p < Math.min( min1, min2 ) ) {
					e = d;    // Accept interpolation
					d = p/q;
				}
				else {
					d = xm;   // Interpolation failed, use bisection
					e = d;
				}
			}
			else {      // bounds decreasing too slowly, use bisection
				d = xm;
				e = d;
			}
			
			a = b;    // Move last best guess to a
			fa = fb;
			if ( Math.abs( d ) > tol1 )   // Evaluate new trial root
				b += d;
			else
				b += Math.abs( tol1 ) * (( xm < 0.0) ? -1.0 : 1.0 );
			
			fb = functionValue(b);
			if (fb == null) {
				return;
			}
			const tNow = new Date().getTime();
			if (tNow - tStart > 1000) {
				setStatus('mmcmd:mathBrentIterating', {iter: iter, error: fb});
				tStart = tNow;
			}
		}
		
		setErrorDescription('mmcmd:mathBrentIterExceeded', {iter: iter});
		return;
	},

	qrDecomp: (n, a, c, d) => {
		// n is Number, a c d are Float64arrays
		// Constructs the QR decomposition of a.  The upper triangle matrix R is returned in the upper triangle of a,
		// except for the diagonal elements of R, which are returned in d.  The function return value is true if singularity is
		// encountered during the decomposition, but the decomposition is completed in this case;  otherwise it returns false
		
		let singular = false;
		
		for (let k = 0; k < n - 1; k++) {
			let scale = 0.0;
			for (let i = k; i < n; i++) {
				scale = Math.max( scale, Math.abs( a[i*n+k] ));
			}
			
			if (scale == 0.0) {
				singular = true;   // singular case
				c[k] = 0.0;
				d[k] = 0.0;
			}
			else {      // form Qk and Qk * A
				for (let i = k; i < n; i++ ) {
					a[i*n+k] /= scale;
				}
				
				let sum = 0.0;
				for (let i = k; i < n; i++ ) {
					sum += a[i*n+k] * a[i*n+k];
				}
				let sigma = Math.sqrt(sum) * Math.sign(a[k*n+k] );
				if ( sigma == 0 ) {
					sigma = 1e-30;  // just to avoid division by zero and resulting nans
				}
				a[k*n+k] += sigma;
				c[k] = sigma * a[k*n+k];
				d[k] = -scale * sigma;
				for (let j = k + 1; j < n; j++) {
					let sum = 0.0;
					for (let i = k; i < n; i++ ) {
						sum += a[i*n+k] * a[i*n+j];
					}
					const tau = sum / c[k];
					for (let i = k; i < n; i++ ) {
						a[i*n+j] -= tau * a[i*n+k];
					}
				}
			}
		}
		d[n - 1] = a[(n - 1)*n + n-1];
		if ( d[n - 1] == 0.0 )
			singular = true;
		
		return singular;
	},
	
	qrRotate: (n, i, a, b, r, qt) => {
		// n, i, a and b are integers, r and qt are Float64Arrays
		// Given matrices r and qt, carry out a Jacobi rotation on rows i and i + 1 of each matrix.
		// a and b are the parameters of the rotation: cos theta = a /sqrt( a^2 + b^2 ),
		// sin theta = b / sqrt( a^2 + b^2 )
		
		let c, s, fact;
		if (a === 0.0) {   // Avoid unnecessary over or underflow
			c = 0.0;
			s = (b >= 0.0) ? 1.0 : -1.0;
		}
		else if (Math.abs(a) > Math.abs(b)) {
			fact = b / a;
			c = (1.0 / Math.sqrt( 1.0 + (fact*fact))) * Math.sign(a);
			s = fact * c;
		}
		else {
			fact = a/b;
			s =  (1.0 / Math.sqrt( 1.0 + (fact*fact) )) * Math.sign(b);
			c = fact * s;
		}
		
		for (let j = i; j < n; j++) {   // Premultiply r by Jacobi rotation
			const y = r[i*n+j];
			const w = r[(i+1)*n + j];
			r[i*n+j] = c*y - s*w;
			r[(i+1)*n + j] = s*y + c*w;
		}
		
		for (let j = 0; j < n; j++) {   // Premultiply qt by Jacobi rotation
			const y = qt[i*n+j];
			const w = qt[(i+1)*n + j];
			qt[i*n+j] = c*y - s*w;
			qt[(i+1)*n + j] = s*y + c*w;
		}
	},

	qrUpdate: (n, r, qt, u, v) => {
		// n is number, the rest are Float64Array
		// Given the QR decomposition of some n x n matrix, calculates the QR decomposition of the
		// matrix Q * (R + u cross v). Note that Q transpose is input and returned in qt
		
		let k
		for (k = n - 1; k >= 0; k--) {
			if (u[k] != 0.0) { // find largest k such that u(k) <> 0
				break;
			}
		}
		if ( k < 0 ) {
			k = 0;
		}
		
		for (let i = k - 1; i >= 0; i--) {   // Transform R + u cross v to upper Hessenberg
			MMMath.qrRotate(n, i, u[i], -u[i+1], r, qt);
			if (u[i] == 0.0) {
				u[i] = Math.abs( u[i+1] );
			}
			else if (Math.abs(u[i]) > Math.abs(u[i+1]) ) {
				const temp = u[i+1] / u[i];
				u[i] = Math.abs(u[i]) * Math.sqrt(1.0 + temp*temp);
			}
			else {
				const temp = u[i]/u[i+1];
				u[i] = Math.abs( u[i+1] ) * Math.sqrt(1.0 + temp*temp);
			}
		}
		
		for (let j = 0; j < n; j++)
			r[n+j] += u[0] * v[j];
		
		for (let i = 0; i < k; i++)
			MMMath.qrRotate(n, i, r[i*n+i], -r[(i+1)*n + i], r, qt);  // transform upper Hessenberg to upper triangular
	},
	
	rSolve: (n, a, d, b) => {
		// n is a Number, a, d, b are Float64Arrays
		// solves the set of n linear equations R*x = b where R is an upper triangle matrix stored in a and d, which are input as
		// the output of qrDecomp and are not modified.  b is input as the right hand side vector and is overwritten
		// with the solution vector
				
		b[n - 1] /= d[n - 1];
		for (let i = n - 2; i >= 0; i--) {
			let sum = 0.0;
			for (let j = i + 1; j < n; j++ )
				sum += a[i*n+j] * b[j];
			b[i] = ( b[i] - sum ) / d[i];
		}
	},
	
	lineSearch: (n, xold, fold, g, p, x, fx, stepMax, dxTolerance, delegate) => {
		// delegate must contain functions
		// calcFx(n, x, fx) and
		// setError(errorMessageKey)

		const calcFx = delegate.calcFx;	
		const alf = 1.0e-4;
		let f2 = 0.0;
		let alam2 = 0.0;
		let sum = 0.0;

		for (let i = 0; i < n; i++) {
			sum += p[i] * p[i];
		}

		sum = Math.sqrt( sum );
		
		if (sum > stepMax) {
			for (let i = 0; i < n; i++) {
				p[i] *= stepMax / sum;   // scale if attempted step was too big
			}
		}
		
		let slope = 0.0;
		for (let i = 0; i < n; i++) {
			slope += g[i] * p[i];
		}
		
		if ( slope >= 0.0 ) {
			delegate.setError('mmcmd:mathLineSearchRoundOff')
			return [false, 0];
		}
		
		let test = 0.0;  // Compute lambda min
		for (let i = 0; i < n; i++) {
			const temp = Math.abs( p[i]) / Math.max(Math.abs(xold[i]), 1.0);
			if (temp > test) {
				test = temp;
			}
		}
		
		const alamin = dxTolerance / test;
		let alam = 1.0;     // Always try full Newton step first
		for(;;) {
			let tmplam;
			for (let i = 0; i < n; i++) {
				x[i] = xold[i] + alam * p[i];
			}

			calcFx(n, x, fx);   // perform whatever calculation there is
			
			let f = 0.0;
			for (let i = 0; i < n; i++) {
				f += fx[i] * fx[i];
			}
			f *= 0.5;
			
			if (alam < alamin) {  // convergence on delta x. For zero finding caller should verify convergence
				return [true, f];
			}
			else if (f <= fold + alf * alam * slope) {
				return [false, 0];   // insufficient function decrease
			}
			else {             // back track
				if (alam == 1.0) {
					tmplam = -slope / ( 2.0 * (f - fold - slope) );   // first time
				}
				else {       // subsequent back tracks
					const rhs1 = f - fold - alam * slope;
					const rhs2 = f2 - fold - alam2 * slope;
					const a = (rhs1/(alam*alam) - rhs2/(alam2*alam2)) / (alam - alam2);
					const b = ( -alam2*rhs1 / (alam*alam) + alam*rhs2 / (alam2*alam2) ) / ( alam - alam2 );
					if ( a == 0.0 ) {
						tmplam = -slope / (2.0 * b);
					}
					else {
						const disc = b*b - 3.0*a*slope;
						if (disc < 0.0) {
							tmplam = 0.5 * alam;
						}
						else if (b <= 0.0) {
							tmplam = (-b + Math.sqrt(disc)) / (3.0*a);
						}
						else {
							tmplam = -slope / (b + Math.sqrt(disc));
						}
					}
					
					if (tmplam > 0.5*alam) {
						tmplam = 0.5*alam;           // lambda <= 0.5lambda1
					}
				}
			}
			
			alam2 = alam;
			f2 = f;
			alam = Math.max(tmplam, 0.1 * alam);   // lambda >= 0.1lambda1
		}
	},
	
	forwardDifference: (n, x, fx, dummyF, df, eps, calcFx) => {
		const rootEps = Math.sqrt(eps);
		for (let j = 0; j < n; j++) {
			const temp = x[j];
			let h = rootEps * Math.abs( temp );
			if (h == 0.0) {
				h = rootEps;
			}
			x[j] = temp + h;     // trick to reduce finite precision error
			h = x[j] - temp;
			calcFx(n, x, dummyF);
			x[j] = temp;
			for (let i = 0; i < n; i++) {
				df[i*n+j] = ( dummyF[i] - fx[i]) / h;
			}
		}
	},

	/**
	 * @method broydenSolve
	 * @param {Number} n - number of equations
	 * @param {Float64Arrat} x - starts as initial x
	 * @param {Object} required
	 * required must have:
	 *  calcFx(n, x, fx) function calculating the function evaluation of x
	 *     returned in fx
	 *  setError(s) function for setting an error message;
	 * 	setStatus(s) function for setting status message
	 * @param {Object} options
	 * 	options can have options (see code below for defaults):
	 *  maxIterations
	 *  maxJacobians
	 *  eps
	 *  fTolerance
	 *  maxStepLength
	 *  minTolerance
	 *  startWithIdentity
	 */
	broydenSolve: (n, x, required, options) => {
		// required
		const calcFx = required.calcFx;
		const setError = required.setError;
		const setStatus = required.setStatus;
		
		// get any available parameters or set defaults
		const maxIterations = options.maxIterations || 200;
		const maxJacobians = options.maxJacobians || 5;
		const eps = options.eps || 1e-10
		const fTolerance = options.fTolerance || 1e-5;
		const dxTolerance = options.dxTolerance || eps;
		const maxStepLength = options.maxStepLength || 100;
		const minTolerance = options.minTolerance || 1e-6;
		const startWithIdentity = options.startWithIdentity || false;

		// function is calculated for that x
		const fx = new Float64Array(n);
		calcFx(n, x, fx);

		let f = 0.0;
		let test = 0.0;
		for (let i = 0; i < n; i++) {
			f += fx[i] * fx[i];
			test = Math.max( test, Math.abs( fx[i]));
		}
		f *= 0.5;
		
		if (test < 0.01 * fTolerance) {
			return;
		}
		
		const c = new Float64Array(n);
		const d = new Float64Array(n);
		const g = new Float64Array(n);
		const p = new Float64Array(n);
		const s = new Float64Array(n);
		const t = new Float64Array(n);
		const w = new Float64Array(n);
		const xold = new Float64Array(n);
		const fvold = new Float64Array(n);
		const qt = new Float64Array(n*n);
		const r = new Float64Array(n*n);
		
		// Calculate stpmax for line searches
		let sum = 0.0;
		for (let i = 0; i < n; i++ ) {
			sum += x[i]*x[i];
		}
		
		const stepMax = maxStepLength * Math.max(Math.sqrt(sum), n );		
		let tStart = new Date().getTime();

		let restrt = true;    // Ensure initial Jacobian gets computed
		let iter;
		for (let jacobTry = 1; jacobTry <= maxJacobians; jacobTry++) {
			for (iter = 1; iter <= maxIterations; iter++) {   // start interation loop
				if (restrt) {
					setStatus('mmcmd:mathJacobianCalc');
					if (startWithIdentity && iter == 1) {  // use identity matrix as initial jacobian
						r.fill(0.0);
						for (let i = 0; i < n; i++) {
							r[i*n+i] = 1.0;
						}
					}
					else {
						MMMath.forwardDifference(n, x, fx, fvold, r, eps, calcFx);   // initialize or reinitialize Jacobian in r
						if (MMMath.qrDecomp(n, r, c, d) ) {   // QR decomposition of Jacobian
							setError('mmcmd:mathJacobianSingular');
							return;
						}
					}
					qt.fill(0);
					for (let i = 0; i < n; i++) {
						qt[i*n+i] = 1.0;
					}
					for (let k = 0; k < n; k++) {
						if (c[k] != 0.0) {
							for (let j = 0; j < n; j++) {
								let sum = 0.0;
								for (let i = k; i < n; i++) {
									sum += r[i*n+k] * qt[i*n+j];
								}
								sum /= c[k];
								for (let i = k; i < n; i++) {
									qt[i*n+j] -= sum * r[i*n+k];
								}
							}
						}
					}
					for (let i = 0; i < n; i++) {   // form R explicitly
						r[i*n+i] = d[i];
						for (let j = 0; j < i; j++) {
							r[i*n+j] = 0.0;
						}
					}
				}
				else {         // carry out Broyden update
					for (let i = 0; i < n; i++) {
						s[i] = x[i] - xold[i];     // s = dx
					}
					
					for(let i = 0; i < n; i++) {     // t = R * s
						let sum = 0.0;
						for (let  j = 0; j < n; j++) {
							sum += r[i*n+j] * s[j];
						}
						t[i] = sum;
					}
					
					let skip = true;
					for (let i = 0; i < n; i++) {     // w = dF - B*s
						let sum = 0.0;
						for (let j = 0; j < n; j++) {
							sum += qt[j*n+i] * t[j];
						}
						
						w[i] = fx[i] - fvold[i] - sum;
						if (Math.abs(w[i]) > eps * Math.abs(fx[i]) + Math.abs(fvold[i])) {   // don't update with noisy components of w
							skip = false;
						}
						else {
							w[i] = 0.0;
						}
					}
					
					if (!skip) {
						for (let i = 0; i < n; i++) {      // t = Q transpose * w
							let sum = 0.0;
							for (let j = 0; j < n; j++ ) {
								sum += qt[i*n+j] * w[j];
							}
							t[i] = sum;
						}
						
						let den = 0.0;
						for (let i = 0; i < n; i++) {
							den += s[i] * s[i];
						}
						for (let i = 0; i < n; i++) {
							s[i] /= den;    // store s/(s*s) in s
						}
						
						MMMath.qrUpdate(n, r, qt, t, s);  // update R and Q transpose
						for (let i = 0; i < n; i++) {
							if ( r[i*n+i] == 0.0) {
								setError('mmcmd:mathJacobianSingular');
								return;
							}
							d[i] = r[i*n+i];   // diagonal of R stored in d
						}
					}
				}
				
				for (let i = 0; i < n; i++) {   // right hand side for linear equations is Q transpose * F
					let sum = 0.0;
					for (let j = 0; j < n; j++) {
						sum += qt[i*n+j] * fx[j];
					}
					p[i] = -sum;
				}
				
				for (let i = n - 1; i >= 0; i--) {     // compute grad f approx = (Q*R) tranpose * F for the line search
					let sum = 0.0;
					for(let j = 0; j <= i; j++) {
						sum -= r[j*n+i] * p[j];
					}
					g[i] = sum;
				}
				
				for (let i = 0; i < n; i++) {     // Store x and F
					xold[i] = x[i];
					fvold[i] = fx[i];
				}
				
				MMMath.rSolve(n, r, d, p);    // Solve linear equations
				let check;
				[check, f] = MMMath.lineSearch(n, xold, f, g, p, x, fx, stepMax, dxTolerance, required);  // returns new x, f and fx
				
				let test = 0.0;  // test for convergence on function values
				for (let i = 0; i < n; i++) {
					test = Math.max(test, Math.abs(fx[i]));
				}

				const tNow = new Date().getTime();
				if (tNow - tStart > 1000) {
					setStatus('mmcmd:mathBroydenIterating', {iter: iter, error: test});
					tStart = tNow;
				}
	
				if (test < fTolerance) {
					return;
				}
				if (check) {   // true if line search failed to find a new x
					if (restrt) {
						setError('mmcmd:mathLineSearchFailed');
						return
					}
					else {
						let test = 0.0;  // check for gradient of f zero, ie spurious convergence
						let den = Math.max(f, 0.5 * n);
						for (let i = 0; i < n; i++) {
							let temp = Math.abs(g[i]) * Math.max(Math.abs(x[i]), 1.0) / den;
							if (temp > test) {
								test = temp;
							}
						}
						if (test < minTolerance) {
							setError('mmcmd:mathBroydenSpurious');
							return;
						}
						else {
							restrt = true;    // try reinitializing the Jacobian
						}
					}
				}
				else {       // successful step;  will use Broyden update for next test
					restrt = false;
					let test = 0.0;    // test for convergence of dx
					for (let i = 0; i < n; i++) {
						let temp = (Math.abs(x[i] - xold[i])) / Math.max(Math.abs(x[i] ), 1.0);
						if (temp > test) {
							test = temp;
						}
					}				
					if (test < dxTolerance)  {
						return   // success
					}
				}
			}
			restrt = true;
		}
		
		setError('mmcmd:mathBroydenIterExceeded', {iter: iter});
	}
}