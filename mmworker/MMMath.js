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
}