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
MMStringValue:readonly
MMNumberValue:readonly
MMTableValue:readonly
*/

/**
* report functions
* value is MMValue
* options is dictionary of options
* tool is MMTool
*/
var MMReport = {
	separator: (options) => {
		if (options.sep) {
			return options.sep;
		}
		if (options.isCSV || options.isTableCopy) {
			return ',';
		}
		else {
			return ' ';
		}
	},
	
	float: (number, options) => {
		let string;
		if (options.isTableCopy) {
			string = number.toFixed(10).padStart(16);
		}
		else if (options.isCSV || options.isTableCopy) {
			string = number.toFixed(10).padStart(20);    // forced to use fixed as Numbers for iPad current reads scientific as text
		}
		else {
			let precision;
			if (number != 0.0 && number > 1e7 && number < 1e8) {
				precision = 5; // particularly for date values
			}
			else if (number != 0.0 && (Math.abs(number) > 10000000.0 || Math.abs(number) < 0.01)) {
				precision = 6;
			}
			else {
				precision = 5
			}
			string = number.toFixed(precision).padStart(14);
		}
		return string;
	},
	
	headerInteger: (number, options) => {
		let string;
		if (options.isCSV || options.isTableCopy) {
			string = number.toFixed(0);
		}
		else {
			string = number.toFixed(0).padStart(14);          
		}
		return string;
	},
	
	string: (string, options) => {
		if (string) {
			if (options.isCSV || options.isTableCopy) {
				string = string.replace(/"/g,"'");
				if (!options.isTableCopy) {
					string = string.replace(/\n/g, ' ');
				}
				string = '"' + string + '"';
			}
		}
		else
		string = '';
		
		return string;   
	},
	
	headerString: (string, options) => {
		if (options.isCSV || options.isTableCopy) {
			return MMReport.string(string, options);
		}
		else {
			if (!string) {
				string = ' ';
			}
			string = '"' + string.substring(0,14).padStart(14) + '"';
		}
		return string;
	},
	
	forToolValue: (tool, value, displayUnit, options = {}) => {
		if (value) {
			const lines = [];
			const sep = MMReport.separator(options);
			if (value instanceof MMStringValue) {
				if (options.isTableCopy) {
					lines.push('table,en');
					let fields = [];				
					for (let j = 1; j <= value.columnCount; j++) {
						fields.push(MMReport.string(j.toFixed(0), options));
					}
					lines.push(fields.join(sep));
					fields = [];
					for (let j = 0; j < value.columnCount; j++) {
						fields.push(MMReport.string('string', options));
					}
					lines.push(fields.join(sep));    
				}
				const includeindices = !options.isTableCopy && (value.valueCount !== 1);
				for (let i = 0; i <= value.rowCount; i++) {
					const fields = [];
					if (includeindices) {
						if (i !== 0) {
							fields.push(MMReport.string(i.toFixed(0).padStart(5)), options);
						}
					}
					else if ( i === 0 ) {
						continue;
					}
					
					for (let j = 1; j <= value.columnCount; j++) {
						if (i === 0) {
							fields.push(MMReport.headerInteger(j, options));
						}
						else {
							fields.push(MMReport.string(value.stringForRowColumnUnit(i, j, displayUnit), options));
						}
					}
					lines.push(fields.join(sep));
				}    
			}
			else if (value instanceof MMNumberValue) {
				if (options.isTableCopy) {
					lines.push('table,en');
					let fields = [];				
					for (let j = 1; j <= value.columnCount; j++) {
						fields.push(MMReport.string(j.toFixed(0), options));
					}
					lines.push(fields.join(sep));
					fields = [];
					for (let j = 1; j <= value.columnCount; j++) {
						if (displayUnit) {
							fields.push(MMReport.string(displayUnit.name), options);
						}
						else {
							fields.push('""')
						}
					}
					lines.push(fields.join(sep));
				}
				let startLine = options.isTableCopy ? 1 : 0;
				for (let i = startLine; i <= value.rowCount; i++) {
					const fields = [];
					if (i !== 0) {
						fields.push(MMReport.string(i.toFixed(0).padStart(5), options));
					}
					const columnCount = value.columnCount;
					for (let j = 1; j <= columnCount; j++) {
						if (i === 0) {
							fields.push(MMReport.headerInteger(j, options));
						}
						else {
							let cellValue = value.values[i*columnCount + j];
							if (displayUnit)
								cellValue = displayUnit.convertFromBase(cellValue);
							let field = MMReport.float(cellValue, options);
							if (options.isCSV || options.isTableCopy) {
								field = field.trim();
							}
							fields.push(field);
						}
					}
					lines.push(fields.join(sep));
				}
			}
			else if (value instanceof MMTableValue) {
				if (options.isTableCopy) {
					lines.push('table,en');
				}
				const headers = [];				
				for (let j = 0; j < value.columnCount; j++) {
					const column = value.columns[j];
					headers.push(MMReport.headerString(column.name, options));
				}
				lines.push(headers.join(sep));

				const units = [];
				for (let j = 0; j < value.columnCount; j++) {
					const column = value.columns[j];
					if (column.isString) {
						units.push(MMReport.headerString('string', options));
					}
					else {
						let displayUnit = (tool && tool.tableUnits) ? tool.tableUnits[j+1] : null;
						if (!displayUnit) {
							displayUnit = column.displayUnit;
						}
						if (!displayUnit) {
							displayUnit = column.value.defaultUnit;
						}
						const unitName = displayUnit ? displayUnit.name : '';
						units.push(MMReport.headerString(unitName, options));
					}
				}
				lines.push(units.join(sep));

				for (let i = 0; i < value.rowCount; i++) {
					const fields = [];
					if (!options.isTableCopy) {
						fields.push(MMReport.string(i.toFixed(0).padStart(5), options));
					}
					for (let j = 0; j < value.columnCount; j++) {
						const column = value.columns[j];
						const columnValue = column.value;
						let columnUnit = (tool && tool.tableUnits) ? tool.tableUnits[j+1] : null;
						if (!columnUnit) {
							columnUnit = column.displayUnit;
						}
						if (!columnUnit) {
							columnUnit = columnValue ? columnValue.defaultUnit : null;
						}
						let field = '';
						if (columnValue instanceof MMNumberValue) {
							let cellValue = columnValue.values[i];
							if (columnUnit) {
								cellValue = columnUnit.convertFromBase(cellValue);
							}
							field = MMReport.float(cellValue, options);
							if (options.isCSV | options.isTableCopy) {
								field = field.trim();
							}
						}
						else {
							field = MMReport.string(columnValue.values[i], options);
						}
						fields.push(field);
					}
					lines.push(fields.join(sep));	
				}
			}
			return lines.join('\n');
		}
		else {
			return '';
		}
	}
}