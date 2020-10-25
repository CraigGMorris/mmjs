{
	"Program": "Rtm",
	"Version": 3,
	"DetailWidth": 320,
	"DeviceWidth": 1024,
	"UserUnitSets": {},
	"UserUnits": [],
	"CaseName": "graph",
	"DefaultUnitSet": "SI",
	"SelectedObject": "graph3D",
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
				"DiagramX": 140,
				"DiagramY": 165,
				"HideInfo": "y",
				"DiagramNotes": "y",
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
				"DiagramY": 165,
				"HideInfo": "y",
				"DiagramNotes": "y",
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
			}
		]
	}
}