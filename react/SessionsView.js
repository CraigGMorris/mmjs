'use strict';

const e = React.createElement;

/**
 * @class SessionsView
 * view for managing sessions
 */
export class SessionsView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {menuPath: ''};
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`/ listsessions`);
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
			let newName = prompt(t('react:sessionsCopyPrompt', {oldName: oldName}));
			if (newName) {
				if (sessionPaths.map(n => n.toLocaleLowerCase()).includes(newName.toLocaleLowerCase())) {
					if (!confirm(t('react:sessionsCopyOverwrite', {oldName: oldName, newName: newName}))) {
						return;
					}
				}
				await this.props.actions.doCommand(
					`/ copy ${oldName} ${newName}`,
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
			let newName = prompt(t('react:sessionsRenamePrompt', {oldName: oldName}));
			if (newName) {
				if (sessionPaths.map(n => n.toLocaleLowerCase()).includes(newName.toLocaleLowerCase())) {
					if (!confirm(t('react:sessionsRenameOverwrite', {oldName: oldName, newName: newName}))) {
						return;
					}
				}
				await this.props.actions.doCommand(
					`/ rename ${oldName} ${newName}`,
					() => {
						this.props.actions.updateView(this.props.viewInfo.stackIndex);
						this.setState({menuPath: ''});
						this.props.updateDiagram(true);
					}
				);
			}
		}

		let sections = [];
		if (this.state.menuPath) {
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
			sections.push(e(
				'button', {
					id: 'sessions__menu-copy',
					key: 'menu-copy',
					className: 'sessions__menu-button',
					onClick: () => {
						copySession(this.state.menuPath);
					},
				},
				t('react:sessionsCopyButton')
			));
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
							if (currentPath === '_unnamed') {
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
						id: 'sessions__download-button',
						onClick: async () => {
							let cmd = '/ getjson';
							await this.props.actions.doCommand(
								cmd,
								(results) => {
									if (results && results.length) {
										const json = results[0].results;
										const blob = new Blob([json], {type : "text/plain"});
										const link = document.createElement('a');
										link.download = currentPath;
										link.href = URL.createObjectURL(blob);
										link.click();
										URL.revokeObjectURL(link.href);
									}
									// this.props.actions.popView();
								}
							);			
						},
					},
					t('react:sessionsDownloadButton'),
				),
			);

			if (!sessionPaths) {
				alert('sessionPaths undefined in SessionsView');
				sessionPaths = [];
			}
			for (let path of sessionPaths) {
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
						path
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
/* 
const fileDownloadButton = document.getElementById('save');
function localStorageToFile() {
    const csv = JSON.stringify(localStorage['autosave']);
    const csvAsBlob = new Blob([csv], {type: 'text/plain'});
    const fileNameToSaveAs = 'local-storage.txt';
    const downloadLink = document.getElementById('save');
    downloadLink.download = fileNameToSaveAs;
    if (window.URL !== null) {
        // Chrome allows the link to be clicked without actually adding it to the DOM
        downloadLink.href = window.URL.createObjectURL(csvAsBlob);
        downloadLink.target = `_blank`;
    } else {
        downloadLink.href = window.URL.createObjectURL(csvAsBlob);
        downloadLink.target = `_blank`;
        downloadLink.style.display = 'none';
        // add .download so works in Firefox desktop.
        document.body.appendChild(downloadLink.download);
    }
    downloadLink.click();
}
// file download button event listener
fileDownloadButton.addEventListener('click', localStorageToFile);       */