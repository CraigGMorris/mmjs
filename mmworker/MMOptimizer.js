'use strict';
/* global
	MMTool:readonly
	MMFormula:readonly
	MMPropertyType:readonly
	MMNumberValue:readonly
*/

/**
 * @class MMOptimizer
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMOptimizer extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Optimizer');
		this.fxFormula = new MMFormula('optFormula', this);
		this.countFormula = new MMFormula('countFormula', this);
		this._numberOfOutputs = 0;
		this.outputs = null;
		this.commonP1 = null;
		this.commonXi = null;
		this.isOptimized = false;
		this._isEnabled = false;
		this.isRunning = false;
		this.isInError = false;

		this.maxIterations = 100;
		this.maxBrentIterations = 100;
		this.brentTolerance = 2.0e-4;
		this.fTolerance = 1e-6;
		this.zEps = 1e-8;
		this.cGold = 0.3819660;
		this.gOld = 1.618034;
		this.gLimit = 100.;
		this.isLoadingCase = false;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		try {
			this.isLoadingCase = true;
			super.initFromSaved(saved);
			this.fxFormula.formula = saved.optFormula.Formula;
			this.countFormula.formula = saved.countFormula.Formula;

			const a = saved.outputs;
			if (a) {
				this.numberOfOutputs = a.length;
				this.outputs = Float64Array.from(a);
			}
			if (saved.Enabled) {
				this.isEnabled = true;
			}
		}
		finally {
			this.isLoadingCase = false;
		}
	}

		/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = super.saveObject();
		o['Type'] = 'Optimizer';

		o['optFormula'] = {Formula: this.fxFormula.formula};
		o['countFormula'] = {Formula: this.countFormula.formula};
		if (this.outputs) {
			o['outputs'] = Array.from(this.outputs);
		}
		if (this.isEnabled) {
			o['Enabled'] = true;
		}
		return o;
	}

	/** @override */
	get properties() {
		let d = super.properties;
		d['isEnabled'] = {type: MMPropertyType.boolean, readOnly: false};
		return d;
	}

	get isEnabled() {
		return this._isEnabled;
	}

	set isEnabled(newValue) {
		const newState = newValue ? true : false
		if (this._isEnabled != newState) {
			this._isEnabled = newState;
			this.forgetCalculated();
			if (newState && !this.isOptimized ) {
				this.isInError = false;
				this.optimize();
			}
		}
	}

	get numberOfOutputs() {
		const v = this.countFormula.value();
		if (v && v instanceof MMNumberValue) {
			const n = Math.floor(v.values[0] + 0.1);
			this.numberOfOutputs = n;
			return n;
		}
		return 0;
	}

	set numberOfOutputs(n) {
		if (n !== this._numberOfOutputs) {
			this._numberOfOutputs = n;
			this.resetOutputs()
		}
	}

	resetOutputs() {
		const n = this.numberOfOutputs;
		if (n) {
			this.outputs = new Float64Array(n);
			this.commonP1 = new Float64Array(n);
			this.commonXi = new Float64Array(n);
		}
		this.isOptimized = false;
		this.isEnabled = false;
		if (this.isLoadingCase) {
			this.forgetCalculated();
		}
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['reset'] = this.resetCommand;
		return verbs;
	}
	
	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			reset: 'mmcmd:?optReset'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}
	
	/**
	 * @method resetCommand
	 * @param {MMCommand} command
	 */
	resetCommand(command) {
		this.resetOutputs();
		command.results = 'reset done';
	}

	forgetCalculated() {
		if (!this.forgetRecursionBlockIsOn) {
			try {
				this.forgetRecursionBlockIsOn = true;
				for (let requestor of this.valueRequestors) {
					requestor.forgetCalculated();
				}
				this.valueRequestors.clear();
				super.forgetCalculated();
				this.isOptimized = false;
			}
			finally {
				this.forgetRecursionBlockIsOn = false;
			}
		}

		if (this.isInError && this.isEnabled ) {
			this.isInError = false;
			this.resetOutputs();
			this.isEnabled = true;
		}
		else {
			this.isInError = false;
		}
	}

	/**
	 * @override valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		if (!description || description.length === 0) {
			return super.valueDescribedBy(description, requestor);
		}

		const lcDescription = description.toLowerCase();

		if (lcDescription === 'solved') {
			if (this.isOptimized) {
				this.addRequestor(requestor);
				return MMNumberValue.scalarValue(1);
			}
			else {
				return null;
			}
		}

		if (this.isEnabled && !this.isOptimized && !this.isRunning && !this.isInError) {
			this.optimize();
		}

		// convenience function to add requestor is return value is known
		const returnValue = (v) => {
			if (v) {
				this.addRequestor(requestor);
				return v;
			}
		};

		if (lcDescription === 'fx') {
			return returnValue(this.fxFormula.numberValue());
		}

		if ( !lcDescription.length || !this._numberOfOutputs ) {
			return super.valueDescribedBy(description, requestor);
		}

		if(lcDescription === 'x') {
				const n = this._numberOfOutputs;
				const v = new MMNumberValue(n, 1);
				for (let i = 0; i < n; i++) {
					v.values[i] = this.outputs[i];
				}
				return returnValue(v);
			}

		const outputNumber = parseInt(lcDescription);
		if (!isNaN(outputNumber) && outputNumber > 0 && outputNumber <= this._numberOfOutputs) {
			const v = MMNumberValue.scalarValue(this.outputs[outputNumber - 1]);
			return returnValue(v);
		}
	}

	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	toolViewInfo(command) {
		super.toolViewInfo(command);
		const results = command.results;
		results['formulas'] = {
			'optFormula': this.fxFormula.formula,
			'countFormula': this.countFormula.formula,
		}

		const fx = this.fxFormula.value();
		results['fx'] = fx ? fx.stringWithUnit() : '---';
		const n = this.numberOfOutputs;
		for (let i = 0; i < n; i++) {
			results['outputs'] = Array.from(this.outputs);
		}

		results['isEnabled'] = this.isEnabled;
		results['isOptimized'] = this.isOptimized;
		results['isInError'] = this.isInError;

		return results;
	}

	/**
	 * @method evaluateFunction - evaluates the optimize formula with the current outputs
	 * @returns {Number} the result of the evaluation or null if failed
	 */
	evaluateFunction() {
		this.forgetCalculated();
		const v = this.fxFormula.value();
		if (v instanceof MMNumberValue) {
			return v.values[0];
		}
		else {
			this.setError('mmcmd:optEvalFailed', {path: this.getPath()});
			return null;
		}
	}

	/**
	 * @method fInOneDimension
	 * @param {Number} x
	 */
	fInOneDimension(x) {
		const n = this._numberOfOutputs;
		const p1 = this.commonP1;
		const xi = this.commonXi;
		for (let i = 0; i < n; i++) {
			this.outputs[i] = p1[i] + x * xi[i];
		}
		return this.evaluateFunction();
	}

	/**
	 * @method brent
	 * Given a function f and a bracketing triplet of ax, bx, cx, such that bx is between ax and cx
	 * and f(bx) is less than both f(ax) and f(cx), this routine isolates the minimum to a
	 * fractional precision of about tol using Brent's method.
	 * 
	 * @param {Number} ax 
	 * @param {Number} bx 
	 * @param {Number} cx 
	 * @param {Number} tol 
	 * @returns {[Number, Number]} if successful returns a two value array containing 
	 * the abscissa of the minimum and the minimum function value 
	 * If unsuccessful, returns null
	 */
	brent(ax, bx, cx, tol) {
		let e = 0.0;  // this will be the distance moved on the step before last
		
		let a = Math.min(ax, cx);  // a and b must be in ascending order, but the input abscissas need not be
		let b = Math.max (ax, cx );
		let v = bx;   // initializations
		let w = bx;
		let x = bx;
		
		let fx = this.fInOneDimension(x);
		let fv = fx;
		let d = 0.0;  // init to get rid of analyzer warning
		let fw = 0.0;
		let u
		
		for (let iter = 1; iter <= this.maxBrentIterations; iter++) {
			const xm = 0.5 * ( a + b );
			const tol1 = tol * Math.abs( x ) + this.zEps;
			const tol2 = 2.0 * tol1;
			if (Math.abs(x - xm ) <= (tol2 - 0.5 * (b - a))) {  // test for done here
				return [x, fx];
			}
			
			if (Math.abs(a) > tol1) {
				let r = (x-w) * (fx-fv);
				let q = (x-v) * (fx-fw);
				let p = (x-v) * q - (x-w) * r;
				q = 2.0 * (q-r);
				if (q > 0.0) {
					p = -p;
				}
				q = Math.abs( q );
				let etemp = e;
				e = d;
				if (Math.abs( p ) >= Math.abs(0.5 * q * etemp) || p <= q * (a-x) || p >= q * (b-x)) {
					if (x >= xm) {
						e = a - x;
					}
					else {
						e = b - x;
					}
							
					d = this.cGold * e;  // take golden step into larger of the two segments
				}
				else
				{
					d = p / q;   // take parabolic step
					u = x + d;
					if (u - a < tol2 ||  b - u < tol2) {
						d = Math.abs(tol1) * Math.sign(xm - x);
					}
				}
			}
			else
			{
				if (x >= xm) {
					e = a - x;
				}
				else {
					e = b - x;
				}
				
				d = this.cGold * e;
			}
			
			if (Math.abs(d) >= tol1) {
				u = x + d;
			}
			else {
				u = x + Math.abs( tol1 ) * Math.sign( d );
			}
			
			const fu = this.fInOneDimension(u);   // one function evaluation per iteration
			
			if (fu <= fx) {   // Now decide what to do with our function evaluation
				if (u >= x) {
					a = x;
				}
				else {
					b = x;
				}
				
				v = w;
				w = x;
				x = u;
				fv = fw;
				fw = fx;
				fx = fu;
			}
			else
			{
				if (u < x) {
					a = u;
				}
				else {
					b = u;
				}
				
				if (fu <= fw || w == x) {
					v = w;
					w = u;
					fv = fw;
					fw = fu;
				}
				else if (fu <= fw || v == x || v == w) {
					v = u;
					fv = fu;
				}
			}
			iter++;   // Done with housekeeping. Back for another iteration
		}
		this.setError('mmcmd:optBrentIter', {path: this.getPath()});
		return null;
	}

	/**
	 * given an n-dimensional point and a n-dimensional direction, moves and resets point to
	 * where fInOneDimension takes on a minimum along direction from point, and replaces direction by
	 * the actual vector displacement that point was moved.  Also returns the function value of
	 * fInOneDimension at the returned location point.
	 * @param {Float64Array} point 
	 * @param {Float64Array} direction
	 * @returns {Number} function value at solution, null if fails
	 */
	minimizeLine(point, direction) {
		const n = this._numberOfOutputs;
		const p1 = this.commonP1;
		const xi = this.commonXi;
		for (let i = 0; i < n; i++) {
			p1[i] = point[i];
			xi[i] = direction[i];
		}

		let ax = 0.0;   // initial guess for brackets
		let bx = 1.0;
		
		// give distinct initial poitns ax and bx, searches in he downhill direction and determine
		// new points ax, bx, cx that bracket a minimum of the function.  Also determine the function values
		// at the three points fa, fb, fc

		let fa = this.fInOneDimension(ax);
		let fb = this.fInOneDimension(bx);
		if ( fb > fa ) {  // switch roles of a and b so we can go downhill in the direction from a to b
			let dum = ax;
			ax = bx;
			bx = dum;
			dum = fb;
			fb = fa;
			fa = dum;
		}
				
		let cx = bx + this.gOld * (bx - ax);
		let fc = this.fInOneDimension(cx);
		while (fb > fc) {	// keep looping until we bracket
			let fu;
			let r = (bx - ax) * (fb - fc);				// Compute u by parabolic extrapolation from a,b,c.
			let q = (bx - cx) * (fb - fa);
			let u = bx - ((bx - cx) * q - (bx - ax) * r) /
				(2.0 * Math.max(Math.abs(q-r), 1e-20) * Math.sign(q-r));	// tiny value is used to avoid division by 0
			let ulim = bx + this.gLimit * (cx - bx);   // we won't go any farther than this - try various possibilities
			if ((bx - u) * (u - cx) > 0.0 ) {   // parabolic u is between b and c; try it
				fu = this.fInOneDimension(u);
				if (fu < fc) {   // got a minimum between b and c
					ax = bx;
					bx = u;
					fa = fb;
					fb = fu;
					break;
				}
				else if (fu > fb ) {   // got a minimum between a and u
					cx = u;
					fc = fu;
					break;
				}
				u = cx + this.gOld * (cx - bx);   // parabolic fit was of no use.  Use default magnification
				fu = this.fInOneDimension(u);
			}
			else if ((cx - u) * (u-ulim) > 0.0) { // parabolic fit between c and its allowed limit
				fu = this.fInOneDimension(u);

				if (fu < fc) {
					bx = cx;
					cx = u;
					u = cx + this.gOld * (cx - bx);
					fb = fc;
					fc = fu;
					fu = this.fInOneDimension(u);
				}
			}
			else if ((u - ulim) * (ulim - cx) >= 0.0) { // limit parabolic u to maximum allowed value
				u = ulim;
				fu = this.fInOneDimension(u);
			}
			else {   // reject parabolic u, use default magnification
				u = cx + this.gOd * (cx - bx);
				fu = this.fInOneDimension(u);
			}
							
			ax = bx;    // eliminate the oldest point and continue
			bx = cx;
			cx = u;
			fa = fb;
			fb = fc;
			fc = fu;
		}

		const brentReturn = this.brent(ax, bx, cx, this.brentTolerance);

		if (!brentReturn) {
			return null;
		}
		const xmin = brentReturn[0];
		const fReturn = brentReturn[1];
		
		for(let i = 0; i < n; i++ ) {   // construct the vector results to return
			direction[i] *= xmin;
			point[i] += direction[i];
		}
		return fReturn;
	}

	/**
	 * @method powell
	 * powell optimization from point this.outputs
	 * uses identity matrix as initial directions (xi)
	 */
	powell() {
		const n = this._numberOfOutputs;
		const ptt = new Float64Array(n);
		const xit = new Float64Array(n);
		const xi = new Float64Array(n*n);
		for (let i = 0; i < n; i++) {
			xi[i*n + i] = 1; // set diagonal for identity
		}		

		const pt = Float64Array.from(this.outputs);
		const p = Float64Array.from(this.outputs);

		let fReturn = this.evaluateFunction();
		let lastStatusTime = Date.now();
		for (let iter = 1; iter <= this.maxIterations; iter++) {
			const now = Date.now();
			if (now - lastStatusTime > 1000) {
				this.processor.statusCallBack(this.t('mmcmd:optStatus', {iter: iter, error: fReturn}));
				lastStatusTime = now;
			}

			const fp = fReturn;
			let ibig = 0;
			let del = 0.0;  // will be the biggest function decrease
			// let statusCount = 10;
			for (let i = 0; i < n; i++) {  // in each iteration loop over all directions in the set
				// if (i % statusCount === 0) {
				// 	this.processor.statusCallBack(this.t('mmcmd:optStatus2', {i: i, n: n}));
				// }
				for (let j = 0; j < n; j++) {  // Copy the direction
					xit[j] = xi[j*n + i];
				}
				const fptt = fReturn;
				fReturn = this.minimizeLine(p, xit);	// minimize along it
				if (fReturn === null) {
					return;
				}
				if ((fptt - fReturn) > del) {    // and record it if it is the largert decrease so far
					del = fptt - fReturn;
					ibig = i;
				}
			}
			
			if (2.0 * Math.abs(fp - fReturn) <= this.fTolerance * (Math.abs( fp ) + Math.abs(fReturn)) + 1e-20 ) {
				this.isOptimized = true;
				return iter;  // termination criteria
			}
			
			if (iter < this.maxIterations ) {
				for (let j = 0; j < n; j++) {   // construct the extrapolated point and the average direction moved
					ptt[j] = 2.0 * p[j] - pt[j];  // and save the old starting point
					xit[j] = p[j] - pt[j];
					pt[j] = p[j];
					this.outputs[j] = ptt[j];
				}
				
				const fptt = this.evaluateFunction();   // function evaluation at the extrapolated point
				if (fptt < fp) {
					let sqrTerm = fp - fReturn - del;
					sqrTerm *= sqrTerm;
					let sqrTerm2 = fp - fptt;
					sqrTerm2 *= sqrTerm2;
					const t = 2.0 * (fp - 2.0 * fReturn + fptt ) * sqrTerm - del * sqrTerm2;
					if (t < 0.0) {
						fReturn = this.minimizeLine(p, xit);	// move to the minimum of the new direction and save the new direction
						if (fReturn === null) {return;}
						for (let j = 0; j < n; j++) {
							xi[j*n + ibig] = xi[j*n + n - 1];
							xi[j*n + n - 1] = xit[j];
						}
					}
				}
			}
		}
		this.setError('mmcmd:optPowellIterError', {path: this.getPath()});
	}

	/**
	 * @method optimize
	 */
	optimize() {
		if (this.isRunning || this.isLoadingCase) {
			return;
		}
		this.isOptimized = false;
		this.isRunning = true;
		try {
			if (!(this.fxFormula.value() instanceof MMNumberValue)) {
				return;
			}

			this.powell();
		}
		catch(e) {
			this.setError('mmcmd:optException', {path: this.getPath(), msg: e.message});
			this.isOptimized = false;
			this.isInError = true;
		}
		finally {
			this.isRunning = false;
		}
	}
}