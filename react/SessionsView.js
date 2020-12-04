'use strict';
import { writeClipboard } from "./Clipboard.js";

const e = React.createElement;

/**
 * @class SessionsView
 * view for managing sessions
 */
export class SessionsView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			menuPath: '',
			currentFolder: null
		};
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`/ listsessions`);
	}

	componentDidUpdate() {
		// when pushing a folder view, update commands needs to be set as componentDidMount isn't called
		if (this.props.viewInfo.updateCommands !== '/ listsessions') {
			this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
				`/ listsessions`);	
		}
	}

	render() {
		let t = this.props.t;
		let results = this.props.viewInfo.updateResults;
		let sessionPaths = [];
		let currentPath = '';
		if (results.length) {
			sessionPaths = results[0].results.paths;
			currentPath = results[0].results.currentPath;
		}
		let sessionList = [];
		let key = 0;
		let loadSession = async e => {
			await this.props.actions.doCommand(
				`/ load ${e.target.getAttribute('value')}`,
				() => {
					this.props.actions.resetInfoStack('root');
					this.props.updateDiagram(true);
				}
			);
		}

		let importFile = (event) => {
			//Retrieve the first (and only!) File from the FileList object
			var f = event.target.files[0]; 
	
			if (f) {
				let r = new FileReader();
				r.onload = (e) => { 
					let contents = e.target.result;
					contents = '__blob__/ import__blob__' + contents;
					this.props.actions.doCommand(contents, () => {
						this.props.actions.resetInfoStack('root');
						this.props.updateDiagram(true);
					});
				};
				r.readAsText(f);
			} else { 
				alert("Failed to load file");
			}
		}

		let copySession = async (oldName) => {
			let newName = prompt(t('react:sessionsDuplicatePrompt', {oldName: oldName}));
			if (newName) {
				if (sessionPaths.map(n => n.toLocaleLowerCase()).includes(newName.toLocaleLowerCase())) {
					if (!confirm(t('react:sessionsDuplicateOverwrite', {oldName: oldName, newName: newName}))) {
						return;
					}
				}
				await this.props.actions.doCommand(
					`/ copy "${oldName}" "${newName}"`,
					() => {
						this.props.actions.updateView(this.props.viewInfo.stackIndex);
						this.setState({menuPath: ''});
					}
				);
			}
		}
	
		let deleteSession = async path => {
			if (confirm(t('react:sessionsDeleteConfirm', {path: path}))) {
				await this.props.actions.doCommand(
					`/ delete ${path}`,
					() => {
						this.props.actions.updateView(this.props.viewInfo.stackIndex);
						if (path === currentPath) {
							alert(t('react:sessionsDeletedCurrentPath', {current: currentPath}));
						}
						this.setState({menuPath: ''});
					}
				);	
			}							
		}

		let renameSession = async (oldName) => {
			let newName = prompt(t('react:sessionsRenamePrompt', {oldName: oldName}), oldName);
			if (newName && newName !== oldName) {
				if (sessionPaths.map(n => n.toLocaleLowerCase()).includes(newName.toLocaleLowerCase())) {
					if (!confirm(t('react:sessionsRenameOverwrite', {oldName: oldName, newName: newName}))) {
						return;
					}
				}
				await this.props.actions.doCommand(
					`/ rename "${oldName}" "${newName}"`,
					() => {
						this.props.actions.updateView(this.props.viewInfo.stackIndex);
						this.setState({menuPath: ''});
						this.props.updateDiagram(true);
					}
				);
			}
		}

		let clipSession = async (path) => {
			await this.props.actions.doCommand(
				`/ getjson ${path}`,
				(results) => {
					writeClipboard(results[0].results);
					this.setState({menuPath: ''});
				}
			)
		}

		let exportSession = async path => {
			path = path.split('/').pop();
			await this.props.actions.doCommand(
				`/ getjson ${path}`,
				(results) => {
					if (results && results.length) {
						const json = results[0].results;
						const blob = new Blob([json], {type : "text/plain"});
						const link = document.createElement('a');
						link.download = path;
						link.href = URL.createObjectURL(blob);
						link.click();
						URL.revokeObjectURL(link.href);
					}
				}
			);
		}

		let sections = [];
		if (this.state.menuPath) {
			const isFolder = this.state.menuPath.endsWith('/');
			sections.push(e(
				'div', {
					id: 'sessions__menu-title',
					key: 'menu-title',
				},
				this.state.menuPath
			));

			sections.push(e(
				'button', {
					id: 'sessions__menu-cancel',
					key: 'menu-cancel',
					className: 'sessions__menu-button',
					onClick: () => {
						this.setState({menuPath: ''});
					},
				},
				t('react:cancel')
			));

			if (!isFolder) {
				// folder actions aren't implemented yet
				sections.push(e(
					'button', {
						id: 'sessions__menu-rename',
						key: 'menu-rename',
						className: 'sessions__menu-button',
						onClick: () => {
							renameSession(this.state.menuPath);
						},
					},
					t('react:sessionsRenameButton')
				));
				sections.push(e(
					'button', {
						id: 'sessions__menu-delete',
						key: 'menu-delete',
						className: 'sessions__menu-button',
						onClick: () => {
							deleteSession(this.state.menuPath);
						},
					},
					t('react:sessionsDeleteButton')
				));
					sections.push(e(
					'button', {
						id: 'sessions__menu-copy',
						key: 'menu-copy',
						className: 'sessions__menu-button',
						onClick: () => {
							copySession(this.state.menuPath);
						},
					},
					t('react:sessionsDuplicateButton')
				));
				sections.push(e(
					'button', {
						id: 'sessions__menu-clip',
						key: 'menu-clip',
						className: 'sessions__menu-button',
						onClick: () => {
							clipSession(this.state.menuPath);
						},
					},
					t('react:sessionsClipButton')
				));
				sections.push(e(
					'button', {
						id: 'sessions__menu-export',
						key: 'menu-export',
						className: 'sessions__menu-button',
						onClick: async () => {
							exportSession(this.state.menuPath);			
						},
					},
					t('react:sessionsExportButton'),
				));
			}

			return e(
				'div', {
					id: 'sessions__menu-wrapper',
				},
				sections
			);	
		}
		else {
			let header = e(
				'div', {
					id: 'sessions__header',
					key: 'header',
				},
				e(
					'button', {
						id: 'sessions__new-button',
						onClick: async () => {
							await this.props.actions.doCommand(
								`/ new`,
								() => {
									this.props.actions.resetInfoStack('root');
									this.props.updateDiagram(true);
								}
							);			
						},
					},
					t('react:sessionsNewButton')
				),
				e(
					'button', {
						id: 'sessions__save-button',
						onClick: async () => {
							let cmd = '/ save';
							if (currentPath === '(unnamed)') {
								let path = prompt(t('react:sessionsSaveNamePrompt'));
								if (path) {
									cmd += ' ' + path;
								}
								else {
									// no name given
									return;
								}
							}
							await this.props.actions.doCommand(
								cmd,
								() => {
									this.props.actions.popView();
								}
							);			
						},
					},
					t('react:sessionsSaveButton')
				),
				e(
					'label', {
						id: 'sessions__import-button',
						className: 'input-file-button',
					},
					t('react:sessionsImportButton'),
					e(
						'input', {
							id: 'sessions__import-input',
							type: 'file',
							onChange: e => {
								importFile(e);
							},
						}
					),	
				),
				e(
					'button', {
						id: 'sessions__export-button',
						onClick: async () => {
							let cmd = '/ getjson';
							await this.props.actions.doCommand(
								cmd,
								(results) => {
									if (results && results.length) {
										const json = results[0].results;
										const blob = new Blob([json], {type : "text/plain"});
										const link = document.createElement('a');
										link.download = currentPath.split('/').pop();
										link.href = URL.createObjectURL(blob);
										link.click();
										URL.revokeObjectURL(link.href);
									}
									// this.props.actions.popView();
								}
							);			
						},
					},
					t('react:sessionsExportButton'),
				),
			);

			if (!sessionPaths) {
				alert('sessionPaths undefined in SessionsView');
				sessionPaths = [];
			}
			if (sessionPaths.length === 0 && this.props.viewInfo.sessionPaths) {
				sessionPaths = this.props.viewInfo.sessionPaths;
			}

			const foundFolders = new Set();
			const rootFolder = this.props.viewInfo.rootFolder;
			const regex = new RegExp('^' + rootFolder + '.*?/');
			for (let path of sessionPaths) {
				let showPath = path.startsWith(rootFolder);
				if (path.startsWith('(')) {  // skip (autosave) and perhaps others
					showPath = false;
				}
				else {
					// check for folders
					const match = path.match(regex);
					if (match) {
						if (path.startsWith(rootFolder)) {
							path = match[0];
							// has folder already been found?
							let found = false;
							for (let folder of foundFolders) {
								if (path.startsWith(folder)) {
									found = true;
									break
								}
							}
							if (!found) {
								// add a folder entry
								foundFolders.add(path);
								// hide the normal entry and add a folder one
								showPath = false;
								let cmp = e(
									'div', {
										className: 'sessions__entry',
										key: key++,
									},
									e(
										'div', {
											className: 'sessions__folder-name',
											value: path,
											onClick: () => {
												this.props.actions.pushView('sessions', path, {
													rootFolder: path,
													sessionPaths: sessionPaths
												})
											},
										},
										path
									),
									// commented out menu button - haven't implemented the actions for a folder
									// each indivual file can be changed though
								// 	e(
								// 		'div', {
								// 			className: 'sessions__entry-menu',
								// 			value: path,
								// 			onClick: e => {
								// 				let path = e.target.getAttribute('value');
								// 				this.setState({menuPath: path});
								// 			}
								// 		},
								// 		'\u2699'
								// 	)
								)
								sessionList.push(cmp);
							}
							else {
								// hide other folder sessions
								showPath = false;
							}
						}
						else {
							showPath = false;
						}
					}
				}

				if (showPath) {
					let selectedClass = (path === currentPath) ? ' entry--selected' : '';
					let cmp = e(
						'div', {
							className: 'sessions__entry' + selectedClass,
							key: key++,
						},
						e(
							'div', {
								className: 'sessions__entry-name',
								value: path,
								onClick: loadSession,
							},
							path.substring(rootFolder.length)
						),
						e(
							'div', {
								className: 'sessions__entry-menu',
								value: path,
								onClick: e => {
									let path = e.target.getAttribute('value');
									this.setState({menuPath: path});
								}
							},
							'\u2699'
						)
					)
					sessionList.push(cmp);
				}
			}
			let listSection = e(
				'div', {
					id: 'sessions__list',
					key: 'list'
				},
				sessionList
			);

			sections = [header, listSection];
			return e(
				'div', {
					id: 'sessions__wrapper',
				},
				sections
			);
		}
	}
}