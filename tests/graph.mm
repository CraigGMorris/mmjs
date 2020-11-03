{
	"Program": "Rtm",
	"Version": 3,
	"DetailWidth": 320,
	"DeviceWidth": 1024,
	"UserUnitSets": {},
	"UserUnits": [],
	"CaseName": "graph",
	"DefaultUnitSet": "SI",
	"SelectedObject": "linesGraph",
	"ModelPath": "/.root",
	"RootModel": {
		"name": "root",
		"Notes": "",
		"DiagramX": 0,
		"DiagramY": 0,
		"HideInfo": "n",
		"DiagramNotes": "n",
		"Type": "Model",
		"diagramScale": 1,
		"Objects": [
			{
				"name": "angles",
				"Notes": "",
				"DiagramX": 135,
				"DiagramY": 130,
				"HideInfo": "y",
				"DiagramNotes": "y",
				"Type": "Expression",
				"Formula": {
					"Formula": "(0:72) * 10 degree"
				}
			},
			{
				"name": "plot2d",
				"Notes": "A 2 dimension X-Y graph.\n\nIf Z values are not added, a Graph tool will plot one or more lines of y values against a common x array.\n\nThere can be multiple x arrays, with corresponding y lines.\n\nWhen you tap on the plot2d icon, both the definition view and the graph are pushed onto the display.\n\nTap the back button at the top left of the plot view to see the graph definition.",
				"DiagramX": 135,
				"DiagramY": 165,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Graph",
				"X1": {
					"v": "angles",
					"vmin": "",
					"vmax": "",
					"unit": "degree",
					"Y1": {
						"v": "3 ft * {sin angles} 'sin",
						"vmin": "-1 m",
						"vmax": "1 m",
						"lineType": 0
					},
					"Y2": {
						"v": "3 ft * {cos angles} 'cos",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					}
				}
			},
			{
				"name": "graph3D",
				"Notes": "When a Z value is added to a graph, a 3 dimensional plot is produced.\n\nIf the X, Y and Z arrays all have the same number of values, as in this case, a 3D line will be plotted.\n\nOnce a Z value has been added, only the “Add X” button will be enabled and adding an X value will automatically add a Y and Z value for it.\n\nEach X value can only have one Y and Z.\n\nIf there is more than one X, you will not be able to delete a Z value, but you can still delete an entire X set.",
				"DiagramX": 225,
				"DiagramY": 130,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Graph",
				"X1": {
					"v": "{sin angles}'sin",
					"vmin": "",
					"vmax": "",
					"Y1": {
						"v": "{cos angles}'cos",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					},
					"Z1": {
						"v": "0:({nrows $.x1}-1) * 1 m 'Height",
						"vmin": "0 m",
						"vmax": "100 m",
						"lineType": 0
					}
				},
				"X2": {
					"v": "$.x1'sin",
					"vmin": "",
					"vmax": "",
					"Y1": {
						"v": "$.y1'cos",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					},
					"Z1": {
						"v": "$.z1 + 20 m",
						"vmin": "",
						"vmax": "",
						"lineType": 1
					}
				}
			},
			{
				"name": "svg2d",
				"Notes": "",
				"DiagramX": 135,
				"DiagramY": 200,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "plot2d.svg"
				}
			},
			{
				"name": "svg3d",
				"Notes": "",
				"DiagramX": 225,
				"DiagramY": 165,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "graph3d.svg"
				}
			},
			{
				"name": "xy",
				"Notes": "      Angles for Surface3D\n",
				"DiagramX": 135,
				"DiagramY": 235,
				"HideInfo": "y",
				"DiagramNotes": "y",
				"Type": "Expression",
				"Formula": {
					"Formula": "(-18:18) * 10 degree"
				}
			},
			{
				"name": "Surface3D",
				"Notes": "When the number of elements in a Z value is equal to the number of X value elements times the number of Y value elements, a 3D mesh is plotted.\n\nIn this case Z is calculated from:\n\n{cos $.x1} * {sin {tr $.y1}} 'z\n\nwhere the “$.” refers to the graph itself.  Transposing the y value produces a row array and when the sin of that is multiplied by the column cos x array, a matrix is produced.\n\nA second x section draws a circle above the surface.",
				"DiagramX": 225,
				"DiagramY": 200,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Graph",
				"X1": {
					"v": "xy 'x",
					"vmin": "",
					"vmax": "",
					"unit": "degree",
					"Y1": {
						"v": "xy + 90 degree 'y",
						"vmin": "",
						"vmax": "",
						"unit": "degree",
						"lineType": 0
					},
					"Z1": {
						"v": "{cos $.x1} * {sin {tr $.y1}} 'z",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					}
				},
				"X2": {
					"v": "{cos xy}",
					"vmin": "",
					"vmax": "",
					"Y1": {
						"v": "{sin xy}",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					},
					"Z1": {
						"v": "{array {nrows xy}, 1.1} 'Const Z",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					}
				}
			},
			{
				"name": "surfaceSvg",
				"DiagramX": 220,
				"DiagramY": 240,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "surface3d.svg"
				}
			},
			{
				"name": "xlines",
				"DiagramX": 140,
				"DiagramY": 285,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Matrix",
				"CellInputs": {
					"0_0": "({row}-1)^(1 + {col}/10)"
				},
				"rowCount": "10",
				"columnCount": "5"
			},
			{
				"name": "ylines",
				"DiagramX": 140,
				"DiagramY": 310,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "xlines*{tr {cc .5, 2, 4, 5, 7}}"
				}
			},
			{
				"name": "zlines",
				"DiagramX": 140,
				"DiagramY": 335,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "xlines^2"
				}
			},
			{
				"name": "linesGraph",
				"DiagramX": 225,
				"DiagramY": 285,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Graph",
				"X1": {
					"v": "xlines",
					"vmin": "0",
					"vmax": "30",
					"Y1": {
						"v": "ylines",
						"vmin": "0",
						"vmax": "200",
						"lineType": 0
					},
					"Z1": {
						"v": "zlines",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					}
				}
			},
			{
				"name": "linesSvg",
				"Notes": "",
				"DiagramX": 225,
				"DiagramY": 315,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "linesGraph.svg"
				}
			}
		]
	}
}