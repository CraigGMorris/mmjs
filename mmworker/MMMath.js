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
		}
	}