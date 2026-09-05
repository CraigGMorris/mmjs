/**
 * Ambient type definitions for Math Minion Worker environment.
 * These declarations reflect the globals populated on self by aggregator.js.
 */

declare global {
	var theMMSession: import("./MMSession.js").MMSession & { unitSystem: import("./mmunits/MMUnitSystem.js").MMUnitSystem };
	var MMCommandProcessor: typeof import("./MMCommandProcessor.js").MMCommandProcessor;
	var MMCommand: typeof import("./MMCommandProcessor.js").MMCommand;
	var MMCommandMessage: typeof import("./MMCommandProcessor.js").MMCommandMessage;
	var MMPropertyType: typeof import("./MMCommandProcessor.js").MMPropertyType;
	var MMObject: typeof import("./MMCommandProcessor.js").MMObject;
	var MMParent: typeof import("./MMCommandProcessor.js").MMParent;

	var MMSession: typeof import("./MMSession.js").MMSession;
	var MMPoint: typeof import("./MMSession.js").MMPoint;
	var MMIndexedDBStorage: typeof import("./MMSession.js").MMIndexedDBStorage;
	var MMToolTypes: typeof import("./MMSession.js").MMToolTypes;
	var pes: any;

	var MMReport: typeof import("./MMReport.js").MMReport;

	var MMUnitSystem: typeof import("./mmunits/MMUnitSystem.js").MMUnitSystem;
	var MMUnitDimensionType: typeof import("./mmunits/MMUnitSystem.js").MMUnitDimensionType;
	var MMUnit: typeof import("./mmunits/MMUnitSystem.js").MMUnit;
	var MMUnitSet: typeof import("./mmunits/MMUnitSystem.js").MMUnitSet;
	var MMUnitsContainer: typeof import("./mmunits/MMUnitSystem.js").MMUnitsContainer;
	var MMUnitSetsContainer: typeof import("./mmunits/MMUnitSystem.js").MMUnitSetsContainer;

	var MMMath: typeof import("./MMMath.js").MMMath;

	var MMValue: typeof import("./MMValue.js").MMValue;
	var MMNumberValue: typeof import("./MMNumberValue.js").MMNumberValue;
	var MMDyadicUnitAction: typeof import("./MMNumberValue.js").MMDyadicUnitAction;
	var MMStringValue: typeof import("./MMStringValue.js").MMStringValue;
	var MMTableValue: typeof import("./MMTableValue.js").MMTableValue;
	var MMTableValueColumn: typeof import("./MMTableValue.js").MMTableValueColumn;
	var MMToolValue: typeof import("./MMToolValue.js").MMToolValue;
	var MMJsonValue: typeof import("./MMJsonValue.js").MMJsonValue;

	var MMTool: typeof import("./MMTool.js").MMTool;
	var MMMatrix: typeof import("./MMMatrix.js").MMMatrix;
	var MMModel: typeof import("./MMModel.js").MMModel;
	var MMDataTable: typeof import("./MMDataTable.js").MMDataTable;

	var MMExpression: typeof import("./MMExpression.js").MMExpression;
	var MMFormula: typeof import("./MMFormula.js").MMFormula;
	var MMFunctionResult: typeof import("./MMFormula.js").MMFunctionResult;
	var MMDivideOperator: typeof import("./MMFormula.js").MMDivideOperator;
	var MMMultiplyOperator: typeof import("./MMFormula.js").MMMultiplyOperator;

	var MMSolver: typeof import("./MMSolver.js").MMSolver;
	var MMOde: typeof import("./MMOde.js").MMOde;
	var MMIterator: typeof import("./MMIterator.js").MMIterator;
	var MMOptimizer: typeof import("./MMOptimizer.js").MMOptimizer;

	var MMGraph: typeof import("./MMGraph.js").MMGraph;
	var MMHtmlPage: typeof import("./MMHtmlPage.js").MMHtmlPage;
	var MMHtmlPageProcessor: typeof import("./MMHtmlPage.js").MMHtmlPageProcessor;
	var MMButton: typeof import("./MMButton.js").MMButton;
	var MMMenu: typeof import("./MMMenu.js").MMMenu;

	var thermo: typeof import("./thermo/index.js");
	var MMFlash: typeof import("./MMFlash.js").MMFlash;
	var MMFlashPhaseValue: typeof import("./MMFlash.js").MMFlashPhaseValue;
	var parseThermoDefinition: typeof import("./MMFlash.js").parseThermoDefinition;

	/**
	 * Worker communication message types
	 */
	interface MMWorkerProgressData {
		progress: number;
		currentModule: string;
		loadedModules: number;
		totalModules: number;
	}

	interface MMWorkerReadyMessage {
		verb: "ready";
		results: string;
	}

	interface MMWorkerProgressMessage {
		verb: "progress";
		results: MMWorkerProgressData;
	}

	interface MMWorkerStatusMessage {
		verb: "status";
		results: string;
	}

	interface MMWorkerErrorMessage {
		verb: "error";
		results: any;
	}

	interface MMWorkerResponseMessage {
		verb?: string;
		results?: any;
		error?: any;
	}

	type MMWorkerOutgoingMessage =
		| MMWorkerReadyMessage
		| MMWorkerProgressMessage
		| MMWorkerStatusMessage
		| MMWorkerErrorMessage
		| MMWorkerResponseMessage;

	interface Math {
		Infinity: number;
		Ln: (x: number) => number;
	}
}

export {};
