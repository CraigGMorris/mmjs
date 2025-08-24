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
  // Total number of modules to load
  const totalModules = 26;
  let loadedModules = 0;
  
  // Function to add artificial delay for testing (set to 0 for normal speed)
  const TEST_DELAY_MS = 0; // delay between modules for testing
  
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Function to update progress
  const updateProgress = async (moduleName) => {
    loadedModules++;
    const progress = Math.round((loadedModules / totalModules) * 100);
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

  // Follow the exact same order as the original importScripts
  
  // MMCommandProcessor.js
  const [
    { MMCommandProcessor, MMCommand, MMCommandMessage, MMPropertyType, MMObject, MMParent }
  ] = await Promise.all([
    import('./MMCommandProcessor.js')
  ]);

  // Attach command processor classes to global scope
  self.MMCommandProcessor = MMCommandProcessor;
  self.MMCommand = MMCommand;
  self.MMCommandMessage = MMCommandMessage;
  self.MMPropertyType = MMPropertyType;
  self.MMObject = MMObject;
  self.MMParent = MMParent;
  await updateProgress('Command Processor');

  // MMSession.js
  const [
    { MMSession, MMPoint, MMIndexedDBStorage, MMToolTypes }
  ] = await Promise.all([
    import('./MMSession.js')
  ]);

  // Attach session classes to global scope
  self.MMSession = MMSession;
  self.MMPoint = MMPoint;
  self.MMIndexedDBStorage = MMIndexedDBStorage;
  self.MMToolTypes = MMToolTypes;
  await updateProgress('Session Manager');

  // MMReport.js
  const [
    { MMReport }
  ] = await Promise.all([
    import('./MMReport.js')
  ]);

  // Attach report to global scope
  self.MMReport = MMReport;
  await updateProgress('Report System');

  // mmunits/MMUnitSystem.js
  const [
    { MMUnitSystem, MMUnitDimensionType, MMUnit, MMUnitSet, MMUnitsContainer, MMUnitSetsContainer }
  ] = await Promise.all([
    import('./mmunits/MMUnitSystem.js')
  ]);

  // Attach unit system to global scope
  self.MMUnitSystem = MMUnitSystem;
  self.MMUnitDimensionType = MMUnitDimensionType;
  self.MMUnit = MMUnit;
  self.MMUnitSet = MMUnitSet;
  self.MMUnitsContainer = MMUnitsContainer;
  self.MMUnitSetsContainer = MMUnitSetsContainer;
  await updateProgress('Unit System');

  // MMMath.js
  const [
    { MMMath }
  ] = await Promise.all([
    import('./MMMath.js')
  ]);

  // Attach math to global scope
  self.MMMath = MMMath;
  await updateProgress('Math Engine');

  // MMValue.js
  const [
    { MMValue }
  ] = await Promise.all([
    import('./MMValue.js')
  ]);

  // Attach MMValue to global scope
  self.MMValue = MMValue;
  await updateProgress('Value System');

  // MMNumberValue.js
  const [
    { MMNumberValue, MMDyadicUnitAction }
  ] = await Promise.all([
    import('./MMNumberValue.js')
  ]);

  // Attach number value to global scope
  self.MMNumberValue = MMNumberValue;
  self.MMDyadicUnitAction = MMDyadicUnitAction;
  await updateProgress('Number Values');

  // MMStringValue.js
  const [
    { MMStringValue }
  ] = await Promise.all([
    import('./MMStringValue.js')
  ]);

  // Attach string value to global scope
  self.MMStringValue = MMStringValue;
  await updateProgress('String Values');

  // MMTableValue.js
  const [
    { MMTableValue, MMTableValueColumn }
  ] = await Promise.all([
    import('./MMTableValue.js')
  ]);

  // Attach table value to global scope
  self.MMTableValue = MMTableValue;
  self.MMTableValueColumn = MMTableValueColumn;
  await updateProgress('Table Values');

  // MMToolValue.js
  const [
    { MMToolValue }
  ] = await Promise.all([
    import('./MMToolValue.js')
  ]);

  // Attach tool value to global scope
  self.MMToolValue = MMToolValue;
  await updateProgress('Tool Values');

  // MMTool.js
  const [
    { MMTool }
  ] = await Promise.all([
    import('./MMTool.js')
  ]);

  // Attach tool to global scope
  self.MMTool = MMTool;
  await updateProgress('Tool System');

  // MMMatrix.js
  const [
    { MMMatrix }
  ] = await Promise.all([
    import('./MMMatrix.js')
  ]);

  // Attach matrix to global scope
  self.MMMatrix = MMMatrix;
  await updateProgress('Matrix System');

  // MMModel.js
  const [
    { MMModel }
  ] = await Promise.all([
    import('./MMModel.js')
  ]);

  // Attach model to global scope
  self.MMModel = MMModel;
  await updateProgress('Model System');

  // MMExpression.js
  const [
    { MMExpression }
  ] = await Promise.all([
    import('./MMExpression.js')
  ]);

  // Attach expression to global scope
  self.MMExpression = MMExpression;
  await updateProgress('Expression Engine');

  // MMFormula.js
  const [
    { MMFormula, MMFunctionResult, MMDivideOperator, MMMultiplyOperator }
  ] = await Promise.all([
    import('./MMFormula.js')
  ]);

  // Attach formula to global scope
  self.MMFormula = MMFormula;
  self.MMFunctionResult = MMFunctionResult;
  self.MMDivideOperator = MMDivideOperator;
  self.MMMultiplyOperator = MMMultiplyOperator;
  await updateProgress('Formula Engine');

  // MMDataTable.js
  const [
    { MMDataTable }
  ] = await Promise.all([
    import('./MMDataTable.js')
  ]);

  // Attach data table to global scope
  self.MMDataTable = MMDataTable;
  await updateProgress('Data Tables');

  // MMSolver.js
  const [
    { MMSolver }
  ] = await Promise.all([
    import('./MMSolver.js')
  ]);

  // Attach solver to global scope
  self.MMSolver = MMSolver;
  await updateProgress('Solver System');

  // MMOde.js
  const [
    { MMOde }
  ] = await Promise.all([
    import('./MMOde.js')
  ]);

  // Attach ODE to global scope
  self.MMOde = MMOde;
  await updateProgress('ODE Solver');

  // MMIterator.js
  const [
    { MMIterator }
  ] = await Promise.all([
    import('./MMIterator.js')
  ]);

  // Attach iterator to global scope
  self.MMIterator = MMIterator;
  await updateProgress('Iterator System');

  // MMOptimizer.js
  const [
    { MMOptimizer }
  ] = await Promise.all([
    import('./MMOptimizer.js')
  ]);

  // Attach optimizer to global scope
  self.MMOptimizer = MMOptimizer;
  await updateProgress('Optimizer');

  // MMGraph.js
  const [
    { MMGraph }
  ] = await Promise.all([
    import('./MMGraph.js')
  ]);

  // Attach graph to global scope
  self.MMGraph = MMGraph;
  await updateProgress('Graphing System');

  // MMHtmlPage.js
  const [
    { MMHtmlPage, MMHtmlPageProcessor }
  ] = await Promise.all([
    import('./MMHtmlPage.js')
  ]);

  // Attach HTML page to global scope
  self.MMHtmlPage = MMHtmlPage;
  self.MMHtmlPageProcessor = MMHtmlPageProcessor;
  await updateProgress('HTML Page Processor');

  // MMButton.js
  const [
    { MMButton }
  ] = await Promise.all([
    import('./MMButton.js')
  ]);

  // Attach button to global scope
  self.MMButton = MMButton;
  await updateProgress('Button System');

  // MMMenu.js
  const [
    { MMMenu }
  ] = await Promise.all([
    import('./MMMenu.js')
  ]);

  // Attach menu to global scope
  self.MMMenu = MMMenu;
  await updateProgress('Menu System');

  // MMJsonValue.js
  const [
    { MMJsonValue }
  ] = await Promise.all([
    import('./MMJsonValue.js')
  ]);

  // Attach JSON value to global scope
  self.MMJsonValue = MMJsonValue;
  await updateProgress('JSON Value System');
  await updateProgress('__All_modules_loaded__');
  console.log('All modules loaded and attached to global scope');
} 