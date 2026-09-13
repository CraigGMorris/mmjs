// @ts-check
/*
	This file is part of Math Minion, a javascript based calculation program
	Copyright 2026, Craig Morris

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

import { ToolView } from './ToolView.js';
import { FormulaField, FormulaEditor } from './FormulaView.js';
import { TableView } from './TableView.js';
import { UnitPicker } from './UnitsView.js';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;

/*
	Enum for column display modes.
	@readonly
	@enum {number}
*/
const ColumnDisplay = Object.freeze({
	main: 0,
	formulaEditor: 1,
	unitPicker: 2
});

/**
 * ColumnView component
 * React UI view for distillation and fractionation column tools
 * @param {import('./MMApp.js').ViewProps} props
 */
export function ColumnView(props) {

	const [display, setDisplay] = useState(/** @type {number} */ (ColumnDisplay.main));
	const updateResults = props.viewInfo.updateResults;
	const initialRes = (updateResults && updateResults.length) ? updateResults[0].results : null;
	const [activeTab, setActiveTab] = useState(() => {
		return (initialRes && (!initialRes.thermoFormula || !initialRes.thermoFormula.trim())) ? 'setup' : 'profiles';
	});
	const initialTabSetRef = useRef(Boolean(initialRes));
	const [formulaName, setFormulaName] = useState('');
	const [editOptions, setEditOptions] = useState({});
	const [selectedCell, setSelectedCell] = useState([0, 0]);

	// Add item draft states
	const [newFeedStage, setNewFeedStage] = useState('5');
	const [newFeedFormula, setNewFeedFormula] = useState('');
	const [newDrawStage, setNewDrawStage] = useState('1');
	const [newDrawPhase, setNewDrawPhase] = useState('l');
	const [newDrawName, setNewDrawName] = useState('');
	const [newDrawEst, setNewDrawEst] = useState('');
	const [newSpecName, setNewSpecName] = useState('');
	const [newSpecFormula, setNewSpecFormula] = useState('');
	const [newSpecScale, setNewSpecScale] = useState('1.0');

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!initialTabSetRef.current && updateResults && updateResults.length) {
			initialTabSetRef.current = true;
			const res = updateResults[0].results;
			if (res && (!res.thermoFormula || !res.thermoFormula.trim())) {
				setActiveTab('setup');
			}
		}
	}, [updateResults]);

	const t = props.t;
	if (updateResults.error) {
		props.actions.doCommand('', () => {
			props.actions.popView();
		});
		return null;
	}
	const results = updateResults.length ? updateResults[0].results : {};

	const applyChanges = (/** @type {string} */ name) => {
		const path = `${results.path}.${name}`;
		return (/** @type {string} */ formula) => {
			props.actions.doCommand(`${path} set formula ${formula}`, () => {
				props.actions.updateView(props.viewInfo.stackIndex);
				setDisplay(ColumnDisplay.main);
			});
		};
	};

	let unitType = '';
	let valueUnit = '';
	if (results.displayTable && selectedCell[1] > 0 && selectedCell[1] <= results.displayTable.nc) {
		const col = results.displayTable.v[selectedCell[1] - 1];
		if (col && col.v) {
			unitType = col.v.unitType || '';
			valueUnit = col.v.unit || col.dUnit || '';
		}
	}

	if (display === ColumnDisplay.formulaEditor) {
		return e(
			ToolView, {
				id: 'tool-view',
				displayComponent: e(
					FormulaEditor, {
						id: 'column-formula-editor',
						key: 'editor',
						t: t,
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						infoHeight: props.infoHeight,
						actions: props.actions,
						editOptions: editOptions,
						cancelAction: () => {
							setDisplay(ColumnDisplay.main);
						},
						applyChanges: applyChanges(formulaName)
					}
				),
				...props
			}
		);
	}

	if (display === ColumnDisplay.unitPicker) {
		return e(
			ToolView, {
				id: 'tool-view',
				displayComponent: e(
					UnitPicker, {
						key: 'unit',
						t: t,
						actions: props.actions,
						unitType: unitType,
						unitName: valueUnit,
						cancel: () => {
							setDisplay(ColumnDisplay.main);
						},
						apply: (/** @type {string} */ unit) => {
							const colIdx = selectedCell[1];
							const cmd = `${results.path} setcolumnunit ${colIdx} ${unit}`;
							props.actions.doCommand(cmd, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
								setDisplay(ColumnDisplay.main);
							});
						}
					}
				),
				...props
			}
		);
	}

	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height')) || 30;
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding')) || 4;
	const availWidth = (props.infoWidth || 400) - 2 * nInfoViewPadding;
	const availHeight = (props.infoHeight || 500) - 95;

	// Status badge
	let statusText = '○ Not Solved';
	let statusColor = 'gray';
	let fullErrorText = '';
	if (results.isInError) {
		const errDetail = results.lastErrorKey ? t(results.lastErrorKey, results.lastErrorArgs) : '';
		fullErrorText = errDetail || '';
		const firstLine = errDetail ? errDetail.split('\n')[0].trim() : '';
		statusText = firstLine ? `● Error: ${firstLine}` : '● Error';
		statusColor = '#ff6b6b';
	}
	else if (results.isSolved) {
		statusText = '● Solved';
		statusColor = '#51cf66';
	}

	// Tab header buttons
	const tabs = [
		{ id: 'profiles', label: t('thermo:columnProfilesLabel') || 'Profiles' },
		{ id: 'setup', label: t('thermo:columnSetupLabel') || 'Setup' },
		{ id: 'feedsDraws', label: `${t('thermo:columnFeedsLabel') || 'Feeds'}/${t('thermo:columnDrawsLabel') || 'Draws'}` },
		{ id: 'specs', label: t('thermo:columnSpecsLabel') || 'Specs' }
	];

	const tabButtons = e(
		'div', {
			id: 'column__tabs',
			key: 'tabs',
			style: {
				display: 'flex',
				gap: '4px',
				marginBottom: '6px',
				borderBottom: '1px solid var(--border--color)',
				overflowX: 'auto',
				flexShrink: 0,
				scrollbarWidth: 'none'
			}
		},
		tabs.map(tab => e(
			'button', {
				key: tab.id,
				className: activeTab === tab.id ? 'column__tab-btn active' : 'column__tab-btn',
				style: {
					padding: '4px 10px',
					cursor: 'pointer',
					fontWeight: activeTab === tab.id ? 'bold' : 'normal',
					borderBottom: activeTab === tab.id ? '2px solid var(--bold--color)' : 'none',
					backgroundColor: 'transparent',
					color: 'inherit',
					borderTop: 'none',
					borderLeft: 'none',
					borderRight: 'none'
				},
				onClick: () => {
					initialTabSetRef.current = true;
					setActiveTab(tab.id);
				}
			},
			tab.label
		))
	);

	// Action Bar: Status, Solve, Reset
	const actionBar = e(
		'div', {
			id: 'column__action-bar',
			key: 'actions',
			style: {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginBottom: '8px',
				padding: '2px 4px'
			}
		},
		e(
			'div', {
				style: { color: statusColor, fontWeight: 'bold', fontSize: '11pt', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: `${availWidth - 160}px` },
				title: fullErrorText || undefined
			},
			statusText
		),
		e(
			'div', {
				style: { display: 'flex', gap: '8px' }
			},
			e(
				'button', {
					style: { padding: '4px 12px', cursor: 'pointer', fontWeight: 'bold' },
					onClick: () => {
						props.actions.doCommand(`${results.path} solve`, () => {
							props.actions.updateView(props.viewInfo.stackIndex);
						});
					}
				},
				t('thermo:columnSolveButton') || 'Solve'
			),
			e(
				'button', {
					style: { padding: '4px 8px', cursor: 'pointer' },
					onClick: () => {
						props.actions.doCommand(`${results.path} reset`, () => {
							props.actions.updateView(props.viewInfo.stackIndex);
						});
					}
				},
				t('thermo:columnResetButton') || 'Reset'
			)
		)
	);

	let contentComponent;

	// Tab 1: Profiles
	if (activeTab === 'profiles') {
		const displayedUnit = (unitType && valueUnit) ? `${unitType}: ${valueUnit}` : '';
		const unitBar = e(
			'div', {
				id: 'column__units-bar',
				key: 'units-bar',
				style: {
					display: 'flex',
					alignItems: 'center',
					minHeight: '22px',
					marginBottom: '4px',
					padding: '0 4px',
					color: 'var(--link--color)',
					cursor: unitType ? 'pointer' : 'default'
				},
				onClick: () => {
					if (unitType) {
						setDisplay(ColumnDisplay.unitPicker);
					}
				}
			},
			displayedUnit ? e(
				'span', {
					id: 'column__units',
					style: {
						textDecoration: 'underline'
					}
				},
				displayedUnit
			) : null
		);

		contentComponent = results.displayTable ? e(
			'div', {
				key: 'profiles-container',
				style: {
					display: 'flex',
					flexDirection: 'column',
					flex: 1
				}
			},
			unitBar,
			e(
				TableView, {
					id: 'column__display-table',
					key: 'table',
					value: results.displayTable,
					actions: props.actions,
					viewInfo: props.viewInfo,
					viewBox: [0, 0, availWidth, Math.max(180, availHeight - 26)],
					currentCell: (selectedCell[0] === 0 && selectedCell[1] === 0) ? null : selectedCell,
					cellClick: (row, column) => {
						if (row === 0 && column === 0) {
							setSelectedCell([0, 0]);
							return;
						}
						const displayTable = results.displayTable;
						if (displayTable && column >= 1 && column <= displayTable.nc) {
							setSelectedCell([row, column]);
						}
						else {
							setSelectedCell([0, 0]);
						}
					}
				}
			)
		) : e('div', { key: 'empty' }, 'No table available');
	}
	// Tab 2: Column Setup
	else if (activeTab === 'setup') {
		const setupRow = (/** @type {string} */ key, /** @type {string} */ labelText, /** @type {any} */ field) => e(
			'div', {
				key: key,
				style: {
					display: 'grid',
					gridTemplateColumns: '88px minmax(0, 1fr)',
					alignItems: 'center',
					gap: '4px',
					marginBottom: '6px'
				}
			},
			e('span', null, labelText),
			field
		);

		contentComponent = e(
			'div', {
				id: 'column__setup',
				key: 'setup',
				style: {
					overflowY: 'auto',
					overflowX: 'hidden',
					maxHeight: `${availHeight}px`
				}
			},
			// Thermo
			setupRow('thermo', t('thermo:columnThermoLabel') || 'Thermo:', e(FormulaField, {
				id: 'column__thermo',
				t: t,
				actions: props.actions,
				path: `${results.path}.thermo`,
				formula: results.thermoFormula,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				editAction: (opt) => {
					setEditOptions(opt);
					setFormulaName('thermo');
					setDisplay(ColumnDisplay.formulaEditor);
				},
				applyChanges: applyChanges('thermo')
			})),
			// Stages
			setupRow('nstages', t('thermo:columnStagesLabel') || 'Stages:', e(FormulaField, {
				id: 'column__nstages',
				t: t,
				actions: props.actions,
				path: `${results.path}.nstages`,
				formula: results.stageCountFormula,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				editAction: (opt) => {
					setEditOptions(opt);
					setFormulaName('nstages');
					setDisplay(ColumnDisplay.formulaEditor);
				},
				applyChanges: applyChanges('nstages')
			})),
			// Top Pressure
			setupRow('ptop', t('thermo:columnPTopLabel') || 'Top P:', e(FormulaField, {
				id: 'column__ptop',
				t: t,
				actions: props.actions,
				path: `${results.path}.ptop`,
				formula: results.pTopFormula,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				editAction: (opt) => {
					setEditOptions(opt);
					setFormulaName('ptop');
					setDisplay(ColumnDisplay.formulaEditor);
				},
				applyChanges: applyChanges('ptop')
			})),
			// Bottom Pressure
			setupRow('pbottom', t('thermo:columnPBottomLabel') || 'Bottom P:', e(FormulaField, {
				id: 'column__pbottom',
				t: t,
				actions: props.actions,
				path: `${results.path}.pbottom`,
				formula: results.pBottomFormula,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				editAction: (opt) => {
					setEditOptions(opt);
					setFormulaName('pbottom');
					setDisplay(ColumnDisplay.formulaEditor);
				},
				applyChanges: applyChanges('pbottom')
			})),
			// Top Temperature Estimate
			setupRow('ttopest', t('thermo:columnTTopEstLabel') || 'Top T Est:', e(FormulaField, {
				id: 'column__ttopest',
				t: t,
				actions: props.actions,
				path: `${results.path}.ttopest`,
				formula: results.tTopEstFormula,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				editAction: (opt) => {
					setEditOptions(opt);
					setFormulaName('ttopest');
					setDisplay(ColumnDisplay.formulaEditor);
				},
				applyChanges: applyChanges('ttopest')
			})),
			// Bottom Temperature Estimate
			setupRow('tbotest', t('thermo:columnTBotEstLabel') || 'Bottom T Est:', e(FormulaField, {
				id: 'column__tbotest',
				t: t,
				actions: props.actions,
				path: `${results.path}.tbotest`,
				formula: results.tBotEstFormula,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				editAction: (opt) => {
					setEditOptions(opt);
					setFormulaName('tbotest');
					setDisplay(ColumnDisplay.formulaEditor);
				},
				applyChanges: applyChanges('tbotest')
			})),
			// Total Condenser Toggle
			e(
				'div', {
					key: 'tc',
					style: {
						display: 'grid',
						gridTemplateColumns: '110px minmax(0, 1fr)',
						alignItems: 'center',
						gap: '4px',
						marginBottom: '6px'
					}
				},
				e('span', null, t('thermo:columnTotalCondenserLabel') || 'Total Condenser:'),
				e(
					'div', null,
					e('input', {
						type: 'checkbox',
						checked: Boolean(results.totalCondenser),
						onChange: (ev) => {
							props.actions.doCommand(`${results.path} settotalcondenser ${ev.target.checked}`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							});
						}
					})
				)
			),
			// Reboiler Toggle
			e(
				'div', {
					key: 'reb',
					style: {
						display: 'grid',
						gridTemplateColumns: '110px minmax(0, 1fr)',
						alignItems: 'center',
						gap: '4px',
						marginBottom: '6px'
					}
				},
				e('span', null, t('thermo:columnReboilerLabel') || 'Reboiler:'),
				e(
					'div', null,
					e('input', {
						type: 'checkbox',
						checked: results.reboiler !== false,
						onChange: (ev) => {
							props.actions.doCommand(`${results.path} setreboiler ${ev.target.checked}`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							});
						}
					})
				)
			)
		);
	}
	// Tab 3: Feeds and Draws
	else if (activeTab === 'feedsDraws') {
		const feedRows = (results.feeds || []).map((f) => e(
			'div', {
				key: f.name,
				style: {
					display: 'grid',
					gridTemplateColumns: '68px 1fr 24px',
					alignItems: 'center',
					gap: '4px',
					marginBottom: '4px'
				}
			},
			e('div', { style: { display: 'flex', alignItems: 'center', gap: '2px' } },
				e('span', { style: { fontSize: '9pt', color: 'var(--subtext--color)' } }, 'Stg'),
				e('input', {
					type: 'number',
					min: 1,
					max: results.nStages || 100,
					defaultValue: f.stage,
					key: `${f.name}_stg_${f.stage}`,
					style: { width: '40px', height: '22px', fontSize: '9pt', textAlign: 'center' },
					onBlur: (ev) => {
						const val = parseInt(ev.target.value);
						if (!isNaN(val) && val !== f.stage) {
							props.actions.doCommand(`${results.path} setfeedstage ${f.index} ${val}`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							});
						}
					},
					onKeyDown: (ev) => {
						if (ev.key === 'Enter') {
							ev.target.blur();
						}
					}
				})
			),
			e(FormulaField, {
				id: `column__feed_${f.name}`,
				t: t,
				actions: props.actions,
				path: `${results.path}.${f.name}`,
				formula: f.formula,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				editAction: (opt) => {
					setEditOptions(opt);
					setFormulaName(f.name);
					setDisplay(ColumnDisplay.formulaEditor);
				},
				applyChanges: applyChanges(f.name)
			}),
			e('button', {
				style: { color: 'red', cursor: 'pointer', border: 'none', background: 'transparent' },
				onClick: () => {
					props.actions.doCommand(`${results.path} removefeed ${f.index}`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
					});
				}
			}, '✕')
		));

		const isTotalCond = Boolean(results.totalCondenser);
		const drawRows = (results.draws || [])
			.filter((d) => !(isTotalCond && d.stage === 1 && d.phase === 'v' && d.isBasis))
			.map((d) => {
				const isBasisLike = d.isBasis || (isTotalCond && d.stage === 1 && d.phase === 'l');
				return e(
					'div', {
						key: d.name,
						style: {
							display: 'grid',
							gridTemplateColumns: '68px 32px 70px 1fr 24px',
							alignItems: 'center',
							gap: '4px',
							marginBottom: '4px'
						}
					},
					e('div', { style: { display: 'flex', alignItems: 'center', gap: '2px' } },
						e('span', { style: { fontSize: '9pt', color: 'var(--subtext--color)' } }, 'Stg'),
						e('input', {
							type: 'number',
							min: 1,
							max: results.nStages || 100,
							defaultValue: d.stage,
							key: `${d.name}_stg_${d.stage}`,
							style: { width: '40px', height: '22px', fontSize: '9pt', textAlign: 'center' },
							onBlur: (ev) => {
								const val = parseInt(ev.target.value);
								if (!isNaN(val) && val !== d.stage) {
									props.actions.doCommand(`${results.path} setdrawstage ${d.index} ${val}`, () => {
										props.actions.updateView(props.viewInfo.stackIndex);
									});
								}
							},
							onKeyDown: (ev) => {
								if (ev.key === 'Enter') {
									ev.target.blur();
								}
							}
						})
					),
					e('span', { style: { fontWeight: 'bold' } }, d.phase.toUpperCase()),
					e('span', null, `${d.name}${isBasisLike ? ' (B)' : ''}`),
					e(FormulaField, {
						id: `column__draw_est_${d.name}`,
						t: t,
						actions: props.actions,
						path: `${results.path}.${d.flowEstName}`,
						formula: d.flowEstFormula,
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						editAction: (opt) => {
							setEditOptions(opt);
							setFormulaName(d.flowEstName);
							setDisplay(ColumnDisplay.formulaEditor);
						},
						applyChanges: applyChanges(d.flowEstName)
					}),
					!isBasisLike ? e('button', {
						style: { color: 'red', cursor: 'pointer', border: 'none', background: 'transparent' },
						onClick: () => {
							props.actions.doCommand(`${results.path} removedraw ${d.index}`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							});
						}
					}, '✕') : e('span')
				);
			});

		contentComponent = e(
			'div', {
				id: 'column__feeds-draws',
				key: 'feeds-draws',
				style: { overflowY: 'auto', maxHeight: `${availHeight}px` }
			},
			// Feeds Section
			e('h4', { style: { margin: '6px 0 4px 0' } }, t('thermo:columnFeedsLabel') || 'Feeds'),
			feedRows.length ? feedRows : e('div', { style: { fontStyle: 'italic', marginBottom: '6px' } }, 'No feeds'),
			// Add Feed row
			e(
				'div', {
					style: { display: 'flex', gap: '4px', marginTop: '6px', marginBottom: '14px', alignItems: 'center' }
				},
				e('input', {
					type: 'number',
					placeholder: 'Stage',
					style: { width: '55px', height: '24px' },
					value: newFeedStage,
					onChange: (ev) => setNewFeedStage(ev.target.value)
				}),
				e('input', {
					type: 'text',
					placeholder: 'Feed Formula / Stream',
					style: { flex: 1, height: '24px' },
					value: newFeedFormula,
					onChange: (ev) => setNewFeedFormula(ev.target.value)
				}),
				e('button', {
					style: { padding: '3px 8px', cursor: 'pointer' },
					onClick: () => {
						if (newFeedFormula) {
							props.actions.doCommand(`${results.path} addfeed ${newFeedStage} ${newFeedFormula}`, () => {
								setNewFeedFormula('');
								props.actions.updateView(props.viewInfo.stackIndex);
							});
						}
					}
				}, `+ ${t('thermo:columnAddFeed') || 'Feed'}`)
			),

			// Draws Section
			e('h4', { style: { margin: '6px 0 4px 0' } }, t('thermo:columnDrawsLabel') || 'Draws'),
			drawRows.length ? e(
				'div', null,
				e('div', {
					style: {
						display: 'grid',
						gridTemplateColumns: '68px 32px 70px 1fr 24px',
						gap: '4px',
						fontSize: '8pt',
						color: 'var(--subtext--color)',
						marginBottom: '2px'
					}
				},
				e('span', null, 'Stage'),
				e('span', null, 'Phase'),
				e('span', null, 'Name'),
				e('span', null, 'Flow Est (opt)'),
				e('span')
				),
				drawRows
			) : e('div', { style: { fontStyle: 'italic', marginBottom: '6px' } }, 'No draws'),
			// Add Draw row
			e(
				'div', {
					style: { display: 'flex', gap: '4px', marginTop: '6px', alignItems: 'center' }
				},
				e('input', {
					type: 'number',
					placeholder: 'Stage',
					style: { width: '50px', height: '24px' },
					value: newDrawStage,
					onChange: (ev) => setNewDrawStage(ev.target.value)
				}),
				e(
					'select', {
						style: { height: '24px' },
						value: newDrawPhase,
						onChange: (ev) => setNewDrawPhase(ev.target.value)
					},
					e('option', { value: 'l' }, 'Liq'),
					e('option', { value: 'v' }, 'Vap')
				),
				e('input', {
					type: 'text',
					placeholder: 'Draw Name',
					style: { width: '80px', height: '24px' },
					value: newDrawName,
					onChange: (ev) => setNewDrawName(ev.target.value)
				}),
				e('input', {
					type: 'text',
					placeholder: 'Flow Est (opt)',
					style: { flex: 1, height: '24px' },
					value: newDrawEst,
					onChange: (ev) => setNewDrawEst(ev.target.value)
				}),
				e('button', {
					style: { padding: '3px 8px', cursor: 'pointer' },
					onClick: () => {
						if (newDrawName) {
							const cmdStr = newDrawEst ?
								`${results.path} adddraw ${newDrawStage} ${newDrawPhase} ${newDrawName} ${newDrawEst}` :
								`${results.path} adddraw ${newDrawStage} ${newDrawPhase} ${newDrawName}`;
							props.actions.doCommand(cmdStr, () => {
								setNewDrawName('');
								setNewDrawEst('');
								props.actions.updateView(props.viewInfo.stackIndex);
							});
						}
					}
				}, `+ ${t('thermo:columnAddDraw') || 'Draw'}`)
			)
		);
	}
	// Tab 4: Specifications
	else if (activeTab === 'specs') {
		const specRows = (results.specs || []).map((s) => e(
			'div', {
				key: s.name,
				style: {
					display: 'grid',
					gridTemplateColumns: '70px 1fr 62px 24px',
					alignItems: 'center',
					gap: '4px',
					marginBottom: '6px'
				}
			},
			e('span', { style: { fontWeight: 'bold' } }, s.name),
			e(FormulaField, {
				id: `column__spec_${s.name}`,
				t: t,
				actions: props.actions,
				path: `${results.path}.${s.name}`,
				formula: s.formula,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				editAction: (opt) => {
					setEditOptions(opt);
					setFormulaName(s.name);
					setDisplay(ColumnDisplay.formulaEditor);
				},
				applyChanges: applyChanges(s.name)
			}),
			e('div', { style: { display: 'flex', alignItems: 'center', gap: '2px' } },
				e('span', { style: { fontSize: '10pt', color: 'var(--subtext--color)' } }, '/'),
				e('input', {
					type: 'number',
					defaultValue: s.scale,
					key: `${s.name}_scale_${s.scale}`,
					style: { width: '48px', height: '22px', fontSize: '10pt', textAlign: 'center' },
					onBlur: (ev) => {
						const val = parseFloat(ev.target.value);
						if (!isNaN(val) && val > 0 && val !== s.scale) {
							props.actions.doCommand(`${results.path} setspecscale ${s.index} ${val}`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							});
						}
					},
					onKeyDown: (ev) => {
						if (ev.key === 'Enter') {
							ev.target.blur();
						}
					}
				})
			),
			(results.specs.length > (results.requiredSpecs !== undefined ? results.requiredSpecs : 1)) ? e('button', {
				style: { color: 'red', cursor: 'pointer', border: 'none', background: 'transparent' },
				onClick: () => {
					props.actions.doCommand(`${results.path} removespec ${s.index}`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
					});
				}
			}, '✕') : e('span')
		));

		contentComponent = e(
			'div', {
				id: 'column__specs',
				key: 'specs',
				style: { overflowY: 'auto', maxHeight: `${availHeight}px` }
			},
			e('h4', { style: { margin: '6px 0 6px 0' } }, `${t('thermo:columnSpecsLabel') || 'Specifications'}${results.requiredSpecs !== undefined ? ` (${results.requiredSpecs} ${t('thermo:columnRequired') || 'required'})` : ''}`),
			specRows.length ? specRows : e('div', { style: { fontStyle: 'italic' } }, 'No specs'),
			// Add Spec row
			e(
				'div', {
					style: { display: 'flex', gap: '4px', marginTop: '10px', alignItems: 'center' }
				},
				e('input', {
					type: 'text',
					placeholder: 'Name',
					style: { width: '65px', height: '24px' },
					value: newSpecName,
					onChange: (ev) => setNewSpecName(ev.target.value)
				}),
				e('input', {
					type: 'text',
					placeholder: 'Spec Formula (drives to 0)',
					style: { flex: 1, height: '24px' },
					value: newSpecFormula,
					onChange: (ev) => setNewSpecFormula(ev.target.value)
				}),
				e('input', {
					type: 'number',
					placeholder: 'Scale',
					style: { width: '50px', height: '24px' },
					value: newSpecScale,
					onChange: (ev) => setNewSpecScale(ev.target.value)
				}),
				e('button', {
					style: { padding: '3px 8px', cursor: 'pointer' },
					onClick: () => {
						if (newSpecName && newSpecFormula) {
							props.actions.doCommand(`${results.path} addspec ${newSpecName} ${newSpecFormula} ${newSpecScale || 1.0}`, () => {
								setNewSpecName('');
								setNewSpecFormula('');
								props.actions.updateView(props.viewInfo.stackIndex);
							});
						}
					}
				}, `+ ${t('thermo:columnAddSpec') || 'Spec'}`)
			)
		);
	}

	const mainComponent = e(
		'div', {
			id: 'column',
			key: 'column',
			style: {
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				boxSizing: 'border-box',
				padding: '2px 4px',
				width: '100%',
				maxWidth: '100%',
				overflowX: 'hidden'
			}
		},
		tabButtons,
		actionBar,
		contentComponent
	);

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: mainComponent,
			...props
		}
	);
}
