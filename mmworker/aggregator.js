// @ts-check
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
	* Setup all imports and attach classes to global scope
	* This function loads modules in the exact same order as the original importScripts
	*/
export async function setupImports() {
	/** @type {Record<string, any>} */
	const globalScope = self;

	// Total number of modules to load
	const totalModules = 29;
	let loadedModules = 0;
	
	// Function to add artificial delay for testing (set to 0 for normal speed)
	const TEST_DELAY_MS = 0; // delay between modules for testing
	
	/** @param {number} ms */
	const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
	
	// Function to update progress
	/** @param {string} moduleName */
	const updateProgress = async (moduleName) => {
		const progress = Math.round((loadedModules / totalModules) * 100);
		loadedModules++;
		postMessage({
			verb: 'progress',
			results: {
				progress: progress,
				currentModule: moduleName,
				loadedModules: loadedModules,
				totalModules: totalModules
			}
		});
		
		// Add artificial delay for testing if enabled
		if (TEST_DELAY_MS > 0) {
			await delay(TEST_DELAY_MS);
		}
	};
	
	// MMCommandProcessor.js
	await updateProgress('Command Processor');
	const [
		{ MMCommandProcessor, MMCommand, MMCommandMessage, MMPropertyType, MMObject, MMParent }
	] = await Promise.all([
		import('./MMCommandProcessor.js')
	]);

	// Attach command processor classes to global scope
	globalScope.MMCommandProcessor = MMCommandProcessor;
	globalScope.MMCommand = MMCommand;
	globalScope.MMCommandMessage = MMCommandMessage;
	globalScope.MMPropertyType = MMPropertyType;
	globalScope.MMObject = MMObject;
	globalScope.MMParent = MMParent;

	// MMSession.js
	await updateProgress('Session Manager');
	const [
		{ MMSession, MMPoint, MMIndexedDBStorage, MMToolTypes }
	] = await Promise.all([
		import('./MMSession.js')
	]);

	// Attach session classes to global scope
	globalScope.MMSession = MMSession;
	globalScope.MMPoint = MMPoint;
	globalScope.MMIndexedDBStorage = MMIndexedDBStorage;
	globalScope.MMToolTypes = MMToolTypes;

	// MMReport.js
	await updateProgress('Report System');
	const [
		{ MMReport }
	] = await Promise.all([
		import('./MMReport.js')
	]);

	// Attach report to global scope
	globalScope.MMReport = MMReport;

	// mmunits/MMUnitSystem.js
	await updateProgress('Unit System');
	const [
		{ MMUnitSystem, MMUnitDimensionType, MMUnit, MMUnitSet, MMUnitsContainer, MMUnitSetsContainer }
	] = await Promise.all([
		import('./mmunits/MMUnitSystem.js')
	]);

	// Attach unit system to global scope
	globalScope.MMUnitSystem = MMUnitSystem;
	globalScope.MMUnitDimensionType = MMUnitDimensionType;
	globalScope.MMUnit = MMUnit;
	globalScope.MMUnitSet = MMUnitSet;
	globalScope.MMUnitsContainer = MMUnitsContainer;
	globalScope.MMUnitSetsContainer = MMUnitSetsContainer;

	// MMMath.js
	await updateProgress('Math Engine');
	const [
		{ MMMath }
	] = await Promise.all([
		import('./MMMath.js')
	]);

	// Attach math to global scope
	globalScope.MMMath = MMMath;

	// MMValue.js
	await updateProgress('Value System');
	const [
		{ MMValue }
	] = await Promise.all([
		import('./MMValue.js')
	]);

	// Attach MMValue to global scope
	globalScope.MMValue = MMValue;

	// MMNumberValue.js
	await updateProgress('Number Values');
	const [
		{ MMNumberValue, MMDyadicUnitAction }
	] = await Promise.all([
		import('./MMNumberValue.js')
	]);

	// Attach number value to global scope
	globalScope.MMNumberValue = MMNumberValue;
	globalScope.MMDyadicUnitAction = MMDyadicUnitAction;

	// MMStringValue.js
	await updateProgress('String Values');
	const [
		{ MMStringValue }
	] = await Promise.all([
		import('./MMStringValue.js')
	]);

	// Attach string value to global scope
	globalScope.MMStringValue = MMStringValue;

	// MMTableValue.js
	await updateProgress('Table Values');
	const [
		{ MMTableValue, MMTableValueColumn }
	] = await Promise.all([
		import('./MMTableValue.js')
	]);

	// Attach table value to global scope
	globalScope.MMTableValue = MMTableValue;
	globalScope.MMTableValueColumn = MMTableValueColumn;

	// MMToolValue.js
	await updateProgress('Tool Values');
	const [
		{ MMToolValue }
	] = await Promise.all([
		import('./MMToolValue.js')
	]);

	// Attach tool value to global scope
	globalScope.MMToolValue = MMToolValue;

	// MMTool.js
	await updateProgress('Tool System');
	const [
		{ MMTool }
	] = await Promise.all([
		import('./MMTool.js')
	]);

	// Attach tool to global scope
	globalScope.MMTool = MMTool;

	// MMMatrix.js
	await updateProgress('Matrix System');
	const [
		{ MMMatrix }
	] = await Promise.all([
		import('./MMMatrix.js')
	]);

	// Attach matrix to global scope
	globalScope.MMMatrix = MMMatrix;

	// MMModel.js
	await updateProgress('Model System');
	const [
		{ MMModel }
	] = await Promise.all([
		import('./MMModel.js')
	]);

	// Attach model to global scope
	globalScope.MMModel = MMModel;

	// MMExpression.js
	await updateProgress('Expression Engine');
	const [
		{ MMExpression }
	] = await Promise.all([
		import('./MMExpression.js')
	]);

	// Attach expression to global scope
	globalScope.MMExpression = MMExpression;

	// MMFormula.js
	await updateProgress('Formula Engine');
	const [
		{ MMFormula, MMFunctionResult, MMDivideOperator, MMMultiplyOperator }
	] = await Promise.all([
		import('./MMFormula.js')
	]);

	// Attach formula to global scope
	globalScope.MMFormula = MMFormula;
	globalScope.MMFunctionResult = MMFunctionResult;
	globalScope.MMDivideOperator = MMDivideOperator;
	globalScope.MMMultiplyOperator = MMMultiplyOperator;

	// MMDataTable.js
	await updateProgress('Data Tables');
	const [
		{ MMDataTable }
	] = await Promise.all([
		import('./MMDataTable.js')
	]);

	// Attach data table to global scope
	globalScope.MMDataTable = MMDataTable;

	// MMSolver.js
	await updateProgress('Solver System');
	const [
		{ MMSolver }
	] = await Promise.all([
		import('./MMSolver.js')
	]);

	// Attach solver to global scope
	globalScope.MMSolver = MMSolver;

	// MMOde.js
	await updateProgress('ODE Solver');
	const [
		{ MMOde }
	] = await Promise.all([
		import('./MMOde.js')
	]);

	// Attach ODE to global scope
	globalScope.MMOde = MMOde;

	// MMIterator.js
	await updateProgress('Iterator System');
	const [
		{ MMIterator }
	] = await Promise.all([
		import('./MMIterator.js')
	]);

	// Attach iterator to global scope
	globalScope.MMIterator = MMIterator;

	// MMOptimizer.js
	await updateProgress('Optimizer');
	const [
		{ MMOptimizer }
	] = await Promise.all([
		import('./MMOptimizer.js')
	]);

	// Attach optimizer to global scope
	globalScope.MMOptimizer = MMOptimizer;

	// MMGraph.js
	await updateProgress('Graphing System');
	const [
		{ MMGraph }
	] = await Promise.all([
		import('./MMGraph.js')
	]);

	// Attach graph to global scope
	globalScope.MMGraph = MMGraph;

	// MMHtmlPage.js
	await updateProgress('HTML Page Processor');
	const [
		{ MMHtmlPage, MMHtmlPageProcessor }
	] = await Promise.all([
		import('./MMHtmlPage.js')
	]);

	// Attach HTML page to global scope
	globalScope.MMHtmlPage = MMHtmlPage;
	globalScope.MMHtmlPageProcessor = MMHtmlPageProcessor;

	// MMButton.js
	await updateProgress('Button System');
	const [
		{ MMButton }
	] = await Promise.all([
		import('./MMButton.js')
	]);

	// Attach button to global scope
	globalScope.MMButton = MMButton;

	// MMMenu.js
	await updateProgress('Menu System');
	const [
		{ MMMenu }
	] = await Promise.all([
		import('./MMMenu.js')
	]);

	// Attach menu to global scope
	globalScope.MMMenu = MMMenu;

	// MMJsonValue.js
	await updateProgress('JSON Value System');
	const [
		{ MMJsonValue }
	] = await Promise.all([
		import('./MMJsonValue.js')
	]);

	// Attach JSON value to global scope
	globalScope.MMJsonValue = MMJsonValue;

	// thermo package
	await updateProgress('Thermodynamics Package');
	const [
		thermo
	] = await Promise.all([
		import('./thermo/index.js')
	]);

	// Attach thermo package to global scope
	globalScope.thermo = thermo;

	await updateProgress('Flash Tool');
	// MMFlash.js - must be loaded after Module is available
	const [
		{ MMFlash, MMFlashPhaseValue, parseThermoDefinition }
	] = await Promise.all([
		import('./MMFlash.js')
	]);

	// Attach flash to global scope
	globalScope.MMFlash = MMFlash;
	globalScope.MMFlashPhaseValue = MMFlashPhaseValue;
	globalScope.parseThermoDefinition = parseThermoDefinition;
	await updateProgress('__All_modules_loaded__');

	console.log('All modules loaded and attached to global scope');
} 