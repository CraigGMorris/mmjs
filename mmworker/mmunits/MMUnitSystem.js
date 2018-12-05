/**
 * @enum {number} MMDimensionType
 */
const MMUnitDimensionType = Object.freeze({
	LENGTH: 0,
	MASS: 1,
	TIME: 2,
	CURRENT: 3,
	TEMPERATURE: 4,
	MOLE: 5,
	LUMINOUS: 6,
	NUMDIMS: 7
});

/**
 * @enum {number} MMUnitCalcType
 * How the unit is calculated
 */
const MMUnitCalcType = Object.freeze({
	COMPOUND: 0,	// the scale factor is calculated from the base units making up the unit.
								// all other types are base units and cannot have the /-^ characters in the name
	SCALE: 		1,	// dimensions and scale must be supplied.
	OFFSET: 	2,	// Conversion consists of a scale plus an offset - for instance degF or gauge pressure.
	INVERSE: 	3,	// conversion is scale/(value + offset) - for example API gravity
	DATETIME: 4		// seconds since beginning of 1970 into yyyymmdd.hhmmss form
});

/**
 * @class MMUnitSystem
 * This class implements a physical unit conversion system based
 * on every unit having defined exponents of the seven fundemental properties

 * (Length (m), Mass (kg), Time (s), Electric Current (A), Temperature (K)
 * Amount of substance (mol), Luminous intensity (cd)
 * 
 * Unit types can be defined in terms of these dimensions, with more than one type
 * having the same dimensions such as Volume and Large_Volume.  Sets (SI, Field for
 * for example) are defined which associate a compatible unit with each defined type.

 * Compound units are created from basic units with the operators /-^
 * There should only be on / dividing the unit into numerator and denominator
 * The - seporates terms in the numerator and denominator (effectively times)
 * The ^ is used to raise a basic unit to an integer or real power (i.e. m^3)
 */
class MMUnitSystem extends MMCommandParent {
	/**
	 * @constructor
	 * @param {Object} session - MMSession - parent session
	 */
	constructor(session) {
		super('unitsystem',  session, 'MMUnitSystem');
		new MMUnitsContainer(this);
	}
}

/**
 * @class MMUnit
 * Unit in unit system
 * Key attributes:
 * @member {string} name
 * 		for basic units this must be an alphanumeric with no spaces
 * 		compound units are created from basic units with the operators /-^
 * 		There should only be one / dividing the unit into numerator and denominator
 * 		The - seporates terms in the numerator and denominator (effectively times)
 * 		The ^ is used to raise a basic unit to an integer or real power (i.e. m^3)
 * 
 * @member {number[]} dimensions
 * 		Represents SI base entities powers with a double array in order
 * 		(Length (m), Mass (kg), Time (s), Electric Current (A), Temperature (K)
 * 		Amount of substance (mol), Luminous intensity (cd)
 * 		The enum MMUnitDimensionType provides the index of a property in the array
 * 
 * 		each number represents the power of that entity in the unit.  Thus velocity would be
 * 		(1, 0, -1, 0, 0, 0, 0) and density  would be (-3, 1, 0, 0, 0, 0, 0)
 * 		Note that force is (1, 1, -2, 0, 0, 0, 0)
 * 		and thus pressure is (-1, 1, -2, 0, 0, 0, 0)
 * 		Energy is (2, 1, -2, 0, 0, 0, 0)
 * 
 * @member {MMUnitCalcType} calcType
 * 		integer (enum MMUnitCalcType) indicating how the conversion is calculated
 * 		COMPOUND (0) or SCALE (1) - simple scaling.
 * 			If COMPOUND, then the scale factor is calculated from the base
 * 			units making up the unit.
 * 			If SCALE, then it is a base unit and the scale must be supplied.
 * 			Base units cannot have the /-^ characters in the name
 * 			Only base units (i.e. SCALE (1)) can make up compound units (COMPOUND (0))
 * 		OFFSET (2) - Conversion consists of a scale plus an offset - for instance degF or gauge pressure.
 * 		INVERSE (3_ - conversion is scale/(value + offset) - for example API gravity
 * 		DATETIME (4) - datetime conversion seconds since beginning of 1970 into yyyymmdd.hhmmss form
 * 
 * @member {number} scale - scale factor
 * @member {number} offset - double offset factor
 * @member {string} notes - any text comment on origin of unit etc.
 * @member {boolean} isMaster - boolean designating that the unit is part of the set distributed with the program
 * 		non master units are user units that will not be disturbed when the program is updated
 */
class MMUnit extends MMCommandObject {
	/** @static compoundRegex
	 * compound unit operators
	 */
	get compoundRegex() {return /[/\\-\\^]/};

	/** @static stringFromDimensions
	 * creates dimensions string from Number array
	 * @param {number[]} dimensions
	 */
	static stringFromDimensions(dimensions) {
		return dimensions.map(n => String(n)).join(' ');
	}

	/** @constructor
	 * @param {string} name
	 * @param {MMUnitsContainer} parent
	 * result will need to have one of the init methods called on it
	*/
	constructor(name, parent) {
		super(name, parent, 'MMUnit');
	}

	/** @method initWithDescription
	 * @param {boolean} isMaster - false for user added
	 * @param {string} description - either a compound unit or string of space separated numbers
	 * consisting of the calculation type, followed by the seven dimension powers and
	 * optionally scale and offset.
	 * if scale and offset aren't suppled they will default to 1 and 0
	 */
	initWithDescription(isMaster, description) {
		this.isMaster = isMaster;
		try {
			this.scale = 1.0;		// default values
			this.offset = 0.0;
			let parts = description.split(' ');
			self.calcType = parseInt(parts[0]);
			if (this.calcType == MMUnitCalcType.COMPOUND) {	// construct from base units
				this.initCompoundWithDescription(description);
			}
			else {  // base unit - name should not contain operators
				if (this.compoundRegex.test(self.name)) {
					throw(this.t('mmcmd:operatorInBase', {name: this.name}));
				}
				
				// convert the dimension string to numbers
				this.dimensions = [];
				for (let i = 1; i <+ MMUnitDimensionType.NUMDIMS; i++) {
					this.dimensions.push(parseInt(parts[i]));
				}

				let i = MMUnitDimensionType.NUMDIMS + 1;
				if (parts.length > i) {
					this.scale = Number(parts[i]);
					i++;
					if (parts.length > i) {
						this.offset = Number(parts[i]);
					}
				}
			}
		}
		catch(e) {
			if (e instanceof MMCommandMessage) {
				throw(e);
			}
			else {
				throw(this.t('mmcmd:operatorInBase', {name: this.name, description: description}));
			}
		}
		return this;
	}

	/** @method dimensionString - returns string version of dimensions */
	dimensionString() {
		return MMUnit.stringFromDimensions(this.dimensions);
	}
}

/**
 * @class MMUnitsContainer
 * Serves as container for units
 * @member {Object} dimensionsDictionary
 * key is dimensionString, value is array of units with those dimesions
 */
class MMUnitsContainer extends MMCommandParent {
	/**
	 * @constructor
	 * @param {Object} unitSystem - MMUnitSystem - parent
	 */
	constructor(unitSystem) {
		super('units',  unitSystem, 'MMUnitsContainer');
		this.dimensionsDictionary = {};
		this.loadMasterUnits();
	}

	/** @method registerDimensionsOfUnit
	 * adds the unit to the dimensionDictionary array keyed by dimensionString 
	 * @param {MMUnit}
	 */
	registerDimensionsOfUnit(unit) {
		let dimensionString = unit.dimensionString();
		let unitArray = this.dimensionsDictionary[dimensionString];
		if (!unitArray) {
			unitArray = [];
			this.dimensionsDictionary[dimensionString] = unitArray;
		}	
		unitArray.push(unit);
	}

	/** @method addUnit
	 * creates a unit based on the name and description
	 * @param {string} name
	 * @param {string} description - description string - unit powers
	 * @param {boolean} isMaster - false if user added
	 * @returns {MMUnit} returns unit created
	 */
	addUnit(name, description, isMaster) {
		let lowerCaseName = name.toLowerCase();
		if (this.children[lowerCaseName]) {
			throw(this.t('mmcmd:duplicateUnit', {name: name}));
		}
		let newUnit = new MMUnit(name, this).initWithDescription(isMaster, description);
		this.addChild(name, newUnit);
		this.registerDimensionsOfUnit(newUnit);
		return newUnit;
	}

	/** @method loadMasterUnits
	 * creates the builtin master units
	 */
	loadMasterUnits() {
		 this.addUnit("Fraction","1 0 0 0 0 0 0 0 1.000000e+00",true);
		 this.addUnit("ppm","1 0 0 0 0 0 0 0 1.000000e-06",true);
		 this.addUnit("%","1 0 0 0 0 0 0 0 1.000000e-02",true);
		 this.addUnit("radian","1 0 0 0 0 0 0 0 1.000000e+00",true);
		 this.addUnit("degree","1 0 0 0 0 0 0 0 0.017453292519943295",true);
		 this.addUnit("arcmin","1 0 0 0 0 0 0 0 0.00029088820866572158",true);
		 this.addUnit("arcsec","1 0 0 0 0 0 0 0 4.8481368110953598e-06",true);
		
		 this.addUnit("m","1 1 0 0 0 0 0 0 1.000000e+00",true);
		 this.addUnit("angstrom","1 1 0 0 0 0 0 0 1.000000e-10",true);
		 this.addUnit("yard","1 1 0 0 0 0 0 0 9.144000e-01",true);
		 this.addUnit("micron","1 1 0 0 0 0 0 0 1.000000e-06",true);
		 this.addUnit("fathom","1 1 0 0 0 0 0 0 1.828800e+00",true);
		 this.addUnit("ft","1 1 0 0 0 0 0 0 3.048000e-01",true);
		 this.addUnit("mm","1 1 0 0 0 0 0 0 1.000000e-03",true);
		 this.addUnit("km","1 1 0 0 0 0 0 0 1.000000e+03",true);
		 this.addUnit("in","1 1 0 0 0 0 0 0 2.540000e-02",true);
		 this.addUnit("Mile","1 1 0 0 0 0 0 0 1.609344e+03",true);
		 this.addUnit("cm","1 1 0 0 0 0 0 0 1.000000e-02",true);
		 this.addUnit("ly","1 1 0 0 0 0 0 0 9.4607304725808e15",true);
		
		 this.addUnit("kg","1 0 1 0 0 0 0 0 1.000000e+00",true);
		 this.addUnit("tonne","1 0 1 0 0 0 0 0 1.000000e+03",true);
		 this.addUnit("longton","1 0 1 0 0 0 0 0 1.01604691e+03",true);
		 this.addUnit("lb","1 0 1 0 0 0 0 0 4.535924e-01",true);
		 this.addUnit("g","1 0 1 0 0 0 0 0 1.000000e-03",true);
		 this.addUnit("mg","1 0 1 0 0 0 0 0 1.000000e-06",true);
		 this.addUnit("ug","1 0 1 0 0 0 0 0 1.000000e-09",true);
		 this.addUnit("grain","1 0 1 0 0 0 0 0 6.479891e-05",true);
		 this.addUnit("troyOz","1 0 1 0 0 0 0 0 3.11034768e-02",true);
		 this.addUnit("ton","1 0 1 0 0 0 0 0 9.0718474e+02",true);
		 this.addUnit("slug","1 0 1 0 0 0 0 0 1.459390e+01",true);
		 this.addUnit("ounce","1 0 1 0 0 0 0 0 2.83495231e-02",true);
		 this.addUnit("gm","1 0 1 0 0 0 0 0 1.000000e-03",true);
		
		 this.addUnit("s","1 0 0 1 0 0 0 0 1.000000e+00",true);
		 this.addUnit("d","1 0 0 1 0 0 0 0 8.640000e+04",true);
		 this.addUnit("h","1 0 0 1 0 0 0 0 3.600000e+03",true);
		 this.addUnit("min","1 0 0 1 0 0 0 0 6.000000e+01",true);
		 this.addUnit("year","1 0 0 1 0 0 0 0 31557600.0",true);
		 this.addUnit("date","4 0 0 1 0 0 0 0 0.0",true);
		 this.addUnit("dated","4 0 0 1 0 0 0 0 1.0",true);
		 this.addUnit("datem","4 0 0 1 0 0 0 0 2.0",true);
		
		 this.addUnit("A","1 0 0 0 1 0 0 0 1.000000e+00",true);
		
		 this.addUnit("K","1 0 0 0 0 1 0 0 1.000000e+00",true);
		 this.addUnit("degC","2 0 0 0 0 1 0 0 1.000000e+00 2.731500e+02",true);
		 this.addUnit("degF","2 0 0 0 0 1 0 0 5.555556e-01 2.553722e+02",true);
		 this.addUnit("degR","1 0 0 0 0 1 0 0 5.555556e-01",true);
		 this.addUnit("deltaC","1 0 0 0 0 1 0 0 1.000000e+00",true);
		 this.addUnit("deltaF","1 0 0 0 0 1 0 0 5.555556e-01",true);
		
		 this.addUnit("mol","1 0 0 0 0 0 1 0 1.000000e+00",true);
		 this.addUnit("gmol","1 0 0 0 0 0 1 0 1.000000e+00",true);
		 this.addUnit("kmol","1 0 0 0 0 0 1 0 1.000000e+03",true);
		 this.addUnit("lbmol","1 0 0 0 0 0 1 0 4.535924e+02",true);
		 this.addUnit("SCF","1 0 0 0 0 0 1 0 1.195253e+00",true);
		 this.addUnit("MSCM","1 0 0 0 0 0 1 0 4.461378e+04",true);
		 this.addUnit("MMSCM","1 0 0 0 0 0 1 0 4.461378e+07",true);
		 this.addUnit("SCM","1 0 0 0 0 0 1 0 4.461378e+01",true);
		 this.addUnit("MSCF","1 0 0 0 0 0 1 0 1.195253e+03",true);
		 this.addUnit("MMSCF","1 0 0 0 0 0 1 0 1.195253e+06",true);
		
		 this.addUnit("cd","1 0 0 0 0 0 0 1 1.000000e+00",true);
		
		 this.addUnit("N","1 1 1 -2 0 0 0 0 1.000000e+00",true);
		 this.addUnit("kgf","1 1 1 -2 0 0 0 0 9.806650e+00",true);
		 this.addUnit("lbf","1 1 1 -2 0 0 0 0 4.448222e+00",true);
		 this.addUnit("dyne","1 1 1 -2 0 0 0 0 1.000000e-05",true);
		 this.addUnit("poundal","1 1 1 -2 0 0 0 0 1.382550e-01",true);
		
		 this.addUnit("acre","1 2 0 0 0 0 0 0 4.04685642e+03",true);
		 this.addUnit("darcy","1 2 0 0 0 0 0 0 9.869233e-13",true);
		 this.addUnit("hectre","1 2 0 0 0 0 0 0 1.000000e+04",true);
		
		 this.addUnit("debye","1 1 0 1 1 0 0 0 3.335640e-30",true);
		
		 this.addUnit("centistoke","1 2 0 -1 0 0 0 0 1.000000e-06",true);
		 this.addUnit("St","1 2 0 -1 0 0 0 0 1.000000e-04",true);
		
		 this.addUnit("liter","1 3 0 0 0 0 0 0 1.0e-03",true);
		 this.addUnit("litre","1 3 0 0 0 0 0 0 1.0e-03",true);
		 this.addUnit("milliliter","1 3 0 0 0 0 0 0 1.0e-06",true);
		 this.addUnit("mL","1 3 0 0 0 0 0 0 1.0e-06",true);
		 this.addUnit("L","1 3 0 0 0 0 0 0 1.0e-03",true);
		 this.addUnit("quart","1 3 0 0 0 0 0 0 0.946352946e-03",true);
		 this.addUnit("fluidoz","1 3 0 0 0 0 0 0 0.2957352956e-04",true);
		 this.addUnit("impquart","1 3 0 0 0 0 0 0 1.1365225e-03",true);
		 this.addUnit("usgal","1 3 0 0 0 0 0 0 3.785411784e-03",true);
		 this.addUnit("gal","1 3 0 0 0 0 0 0 3.785411784e-03",true);
		 this.addUnit("impgal","1 3 0 0 0 0 0 0 4.54609e-03",true);
		 this.addUnit("bbl","1 3 0 0 0 0 0 0 1.589873e-01",true);
		
		 this.addUnit("kph","1 1 0 -1 0 0 0 0 0.277778",true);
		 this.addUnit("mph","1 1 0 -1 0 0 0 0 0.44704",true);
		 this.addUnit("knot","1 1 0 -1 0 0 0 0 0.514444",true);
		 this.addUnit("lightC","1 1 0 -1 0 0 0 0 299792458.0",true);
		
		 this.addUnit("C","1 0 0 1 1 0 0 0 1.000000e+00",true);
		
		 this.addUnit("kJ","1 2 1 -2 0 0 0 0 1.000000e+03",true);
		 this.addUnit("btu","1 2 1 -2 0 0 0 0 1.05505585e+03",true);
		 this.addUnit("mmbtu","1 2 1 -2 0 0 0 0 1.05505585e+09",true);
		 this.addUnit("J","1 2 1 -2 0 0 0 0 1.000000e+00",true);
		 this.addUnit("erg","1 2 1 -2 0 0 0 0 1.000000e-07",true);
		 this.addUnit("cal","1 2 1 -2 0 0 0 0 4.184000e+00",true);
		 this.addUnit("kcal","1 2 1 -2 0 0 0 0 4.184000e+03",true);
		 this.addUnit("megatontnt","1 2 1 -2 0 0 0 0 4.184000e+15",true);
		
		 this.addUnit("cp","1 -1 1 -1 0 0 0 0 1.000000e-03",true);
		 this.addUnit("poise","1 -1 1 -1 0 0 0 0 1.000000e-01",true);
		 this.addUnit("micropoise","1 -1 1 -1 0 0 0 0 1.000000e-07",true);
		
		 this.addUnit("Pa","1 -1 1 -2 0 0 0 0 1.000000e+00",true);
		 this.addUnit("kPa","1 -1 1 -2 0 0 0 0 1.000000e+03",true);
		 this.addUnit("MPa","1 -1 1 -2 0 0 0 0 1.000000e+06",true);
		 this.addUnit("bar","1 -1 1 -2 0 0 0 0 1.000000e+05",true);
		 this.addUnit("psi","1 -1 1 -2 0 0 0 0 6.89475729e+03",true);
		 this.addUnit("psia","1 -1 1 -2 0 0 0 0 6.89475729e+03",true);
		 this.addUnit("atm","1 -1 1 -2 0 0 0 0 1.013250e+05",true);
		 this.addUnit("barg","2 -1 1 -2 0 0 0 0 1.000000e+05 1.013250e+05",true);
		 this.addUnit("mmHg0C","1 -1 1 -2 0 0 0 0 1.333220e+02",true);
		 this.addUnit("cmHg0C","1 -1 1 -2 0 0 0 0 1.333220e+00",true);
		 this.addUnit("inHg32F","1 -1 1 -2 0 0 0 0 3.386383e+03",true);
		 this.addUnit("feetH2O4C","1 -1 1 -2 0 0 0 0 2.988980e+00",true);
		 this.addUnit("psig","2 -1 1 -2 0 0 0 0 6.894757e+03 1.013250e+05",true);
		 this.addUnit("kPag","2 -1 1 -2 0 0 0 0 1.000000e+03 1.013250e+05",true);
		
		 this.addUnit("W","1 2 1 -3 0 0 0 0 1.000000e+00",true);
		 this.addUnit("kW","1 2 1 -3 0 0 0 0 1.000000e+03",true);
		 this.addUnit("mW","1 2 1 -3 0 0 0 0 1.000000e+06",true);
		 this.addUnit("gW","1 2 1 -3 0 0 0 0 1.000000e+09",true);
		 this.addUnit("horsepower","1 2 1 -3 0 0 0 0 7.45699872e+02",true);
		 this.addUnit("hp","1 2 1 -3 0 0 0 0 7.45699872e+02",true);
		 this.addUnit("metrichp","1 2 1 -3 0 0 0 0 7.3549875e+02",true);
		
		 this.addUnit("volt","1 2 1 -3 -1 0 0 0 1.0",true);
		 this.addUnit("V","1 2 1 -3 -1 0 0 0 1.0",true);
		
		 this.addUnit("Ohm","1 2 1 -3 -2 0 0 0 1.0",true);

		 this.addUnit("F","1 -2 -1 4 2 0 0 0 1.0",true);
		 this.addUnit("uF","1 -2 -1 4 2 0 0 0 1.0e-6",true);
		 this.addUnit("nF","1 -2 -1 4 2 0 0 0 1.0e-9",true);
		 this.addUnit("pF","1 -2 -1 4 2 0 0 0 1.0e-12",true);
		
		 this.addUnit("Wb","1 2 1 -2 -1 0 0 0 1.0",true);
		 this.addUnit("Mx","1 2 1 -2 -1 0 0 0 1.0e-8",true);
		
		 this.addUnit("Henry","1 2 1 -2 -2 0 0 0 1.0",true);
		
		 this.addUnit("Hz","1 0 0 -1 0 0 0 0 1.0",true);
		 this.addUnit("rpm","1 0 0 -1 0 0 0 0 0.104719755",true);
		
		 this.addUnit("SG[60]","1 -3 1 0 0 0 0 0 9.990220e+02",true);
		 this.addUnit("API60","3 -3 1 0 0 0 0 0 1.413616e+05 1.315000e+02",true);
	}
}





