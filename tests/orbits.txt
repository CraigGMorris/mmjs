{
	"Program": "Rtm",
	"Version": 3,
	"DetailWidth": 320,
	"DeviceWidth": 1024,
	"UserUnitSets": {},
	"UserUnits": [
		"AU = 149597870.7 km",
		"ME = 5.9722e24 kg"
	],
	"CaseName": "orbits",
	"DefaultUnitSet": "SI",
	"SelectedObject": "",
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
				"name": "N",
				"Notes": "Number of planets",
				"DiagramX": 350,
				"DiagramY": 220,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "3"
				}
			},
			{
				"name": "InitialX",
				"Notes": "The initial X coordinates of the planets.",
				"DiagramX": 160,
				"DiagramY": 280,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "(1:N) * 0.05 AU + 1 AU "
				}
			},
			{
				"name": "G",
				"Notes": "Gravitational constant",
				"DiagramX": 160,
				"DiagramY": 330,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": " 6.67428E-11 \"n-m^2/kg^2\""
				}
			},
			{
				"name": "SunMass",
				"Notes": "Sun's mass - assumed to be >> than the planets",
				"DiagramX": 160,
				"DiagramY": 350,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "330000 ME"
				}
			},
			{
				"name": "PlanetMass",
				"Notes": "Mass of the planets. For simplicity they are all assumed equal here.",
				"DiagramX": 160,
				"DiagramY": 370,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "(1000 \"ME\")"
				}
			},
			{
				"name": "Z_Coord",
				"Notes": "The z coordinate for the recorded integration times.",
				"DiagramX": 165,
				"DiagramY": 515,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "ode.r3"
				}
			},
			{
				"name": "graphMinMax",
				"DiagramX": 165,
				"DiagramY": 615,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "2 au"
				}
			},
			{
				"name": "Y_Coord",
				"Notes": "The y coordinate for the recorded integration times.",
				"DiagramX": 175,
				"DiagramY": 495,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "ode.r2"
				}
			},
			{
				"name": "X_Coord",
				"Notes": "The x coordinate for the recorded integration times.",
				"DiagramX": 185,
				"DiagramY": 475,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "ode.r1"
				}
			},
			{
				"name": "InitialVx",
				"Notes": "The initial x velocity of the planets. The initial y and Vy are 0, so we can calculate the circular orbital velocity as:\n\n(G*SunMass/InitialX)^0.5\n\nThe 1.0*{concat 1.2, 1} term just provides some variation on this.  Change the first 1.0 to 1.1 to get an interaction where one of the planets gets thrown out.",
				"DiagramX": 245,
				"DiagramY": 320,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "1.0*{concat 1.0, 1} *(G*SunMass/InitialX)^0.5"
				}
			},
			{
				"name": "a_xyz",
				"Notes": "Calculates the accelerations of the planets due to gravitational interactions.",
				"DiagramX": 250,
				"DiagramY": 355,
				"HideInfo": "n",
				"DiagramNotes": "n",
				"Type": "Model",
				"diagramScale": 1,
				"Objects": [
					{
						"name": "R2_i0",
						"Notes": "Distance of planet i to the central mass (sun) squared",
						"DiagramX": 100,
						"DiagramY": -10,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "CoordinateX*CoordinateX\n+CoordinateY*CoordinateY\n+CoordinateZ*CoordinateZ"
						}
					},
					{
						"name": "R2_ij",
						"Notes": "The distances, squared, between the planets",
						"DiagramX": 100,
						"DiagramY": 75,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "X*X+Y*Y+Z*Z"
						}
					},
					{
						"name": "N",
						"Notes": "Number of planets",
						"DiagramX": -25,
						"DiagramY": 0,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "{nrows R2_i0}"
						}
					},
					{
						"name": "PlanetMass",
						"Notes": "Mass of the planets. For simplicity they are all assumed equal here.",
						"DiagramX": -25,
						"DiagramY": 90,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "PlanetMass"
						},
						"isInput": "y"
					},
					{
						"name": "G",
						"Notes": "Gravitational constant",
						"DiagramX": -25,
						"DiagramY": 60,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "G"
						},
						"isInput": "y"
					},
					{
						"name": "SunMass",
						"Notes": "Sun's mass - assumed to be >> than the planets",
						"DiagramX": -25,
						"DiagramY": 30,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "SunMass"
						},
						"isInput": "y"
					},
					{
						"name": "ar_i0",
						"Notes": "The attraction between two bodies is:\n\nF = G*m1*m2/r^2 = ma\n\nThus the acceleration of object 2 is\n\nG*m1/r^2\n\nThe law of cosines let's us get ax by multiplying this by x/r.\n\nHere we just multiply by 1/r and apply the x (y or z) terms in the ax_I etc. expressions.",
						"DiagramX": 175,
						"DiagramY": 30,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "G*SunMass/(R2_i0)^1.5"
						}
					},
					{
						"name": "ar_ij",
						"Notes": "This is essentially the same calculation as in ar_io, but for the accelerations between the planets.",
						"DiagramX": 175,
						"DiagramY": 50,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Matrix",
						"unit": "1/s^2",
						"CellInputs": {
							"0_0": "{if {eq {row}, {col}},\n 0 \"1/s^2\",\n G*PlanetMass/(R2_ij[{row},{col}])^1.5\n}"
						},
						"rowCount": "N",
						"columnCount": "N"
					},
					{
						"name": "ax_i",
						"Notes": "The total acceleration in the x direction.",
						"DiagramX": 275,
						"DiagramY": 90,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "{sumrows X*ar_ij}-CoordinateX*ar_i0"
						},
						"isOutput": "y"
					},
					{
						"name": "X",
						"DiagramX": -25,
						"DiagramY": 135,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "xyz.x"
						},
						"isInput": "y"
					},
					{
						"name": "ay_i",
						"Notes": "The total acceleration in the y direction.",
						"DiagramX": 275,
						"DiagramY": 110,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "({sumrows Y*ar_ij}-CoordinateY*ar_i0)"
						},
						"isOutput": "y"
					},
					{
						"name": "Y",
						"DiagramX": -25,
						"DiagramY": 155,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "xyz.y"
						},
						"isInput": "y"
					},
					{
						"name": "az_i",
						"Notes": "The total acceleration in the z direction.",
						"DiagramX": 275,
						"DiagramY": 130,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "({sumrows Z*ar_ij}-CoordinateZ*ar_i0)"
						},
						"isOutput": "y"
					},
					{
						"name": "Z",
						"DiagramX": -25,
						"DiagramY": 175,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "xyz.z"
						},
						"isInput": "y"
					},
					{
						"name": "coordinateX",
						"Notes": "",
						"DiagramX": -25,
						"DiagramY": 205,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "xyz.coordinateX"
						},
						"isInput": "y"
					},
					{
						"name": "coordinateY",
						"Notes": "",
						"DiagramX": -25,
						"DiagramY": 230,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "xyz.coordinateY"
						},
						"isInput": "y"
					},
					{
						"name": "coordinateZ",
						"Notes": "",
						"DiagramX": -25,
						"DiagramY": 255,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "xyz.coordinateZ"
						},
						"isInput": "y"
					}
				]
			},
			{
				"name": "XCenter",
				"Notes": "The average of the planet 1 and 2 x coordinates",
				"DiagramX": 260,
				"DiagramY": 560,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "({transpose X_Coord}[1] +\n{transpose X_Coord}[2])/2\n"
				}
			},
			{
				"name": "YCenter",
				"Notes": "The average of the planet 1 and 2 y coordinates",
				"DiagramX": 260,
				"DiagramY": 580,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "({transpose Y_Coord}[1] +\n{transpose Y_Coord}[2])/2"
				}
			},
			{
				"name": "plot3d",
				"DiagramX": 265,
				"DiagramY": 635,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Graph",
				"X1": {
					"v": "x_Coord[0,1]",
					"vmin": "-graphMinMax",
					"vmax": "graphMinMax",
					"Y1": {
						"v": "y_coord[0,1]",
						"vmin": "-graphMinMax",
						"vmax": "graphMinMax",
						"lineType": 0
					},
					"Z1": {
						"v": "z_Coord[0,1]",
						"vmin": "-graphMinMax",
						"vmax": "graphMinMax",
						"lineType": 0
					}
				},
				"X2": {
					"v": "x_coord[0,2]",
					"vmin": "-graphMinMax",
					"vmax": "graphMinMax",
					"Y1": {
						"v": "y_coord[0,2]",
						"vmin": "-graphMinMax",
						"vmax": "graphMinMax",
						"lineType": 0
					},
					"Z1": {
						"v": "z_coord[0,2]",
						"vmin": "-graphMinMax",
						"vmax": "graphMinMax",
						"lineType": 0
					}
				},
				"X3": {
					"v": "x_coord[0,3]",
					"vmin": "",
					"vmax": "",
					"Y1": {
						"v": "y_coord[0,3]",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					},
					"Z1": {
						"v": "z_coord[0,3]",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					}
				}
			},
			{
				"name": "v_xyz",
				"Notes": "The velocities for each coordinate, normalized by the initial X coordinate.",
				"DiagramX": 170,
				"DiagramY": 220,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "ode.Y[(1+3*N):(6*N)]*InitialVx/InitialX"
				}
			},
			{
				"name": "dYdt",
				"Notes": "The first 3N elements are the coordinate velocities normalized by the initial x coordinate.  The will be integrated to yield the new coordinates.\n\nThe second 3N elements are the coordinate accelerations normalized by the initial x velocities.  The will be integrated to yield the new coordinate velocities.",
				"DiagramX": 350,
				"DiagramY": 250,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "{concat v_xyz, \n a_xyz.ax_i/InitialVx,\n a_xyz.ay_i/InitialVx,\n a_xyz.az_i/InitialVx}"
				}
			},
			{
				"name": "Y0",
				"Notes": "as multiple of InitialX and InitialVx, with some small random values thrown in for Z.",
				"DiagramX": 350,
				"DiagramY": 280,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Matrix",
				"unit": "Fraction",
				"CellInputs": {
					"0_0": "{if {le {row}, N}, 1,\n{if {le {row}, 2*N}, 0,\n{if {le {row}, 3*N}, .5 *-1.05^{row},\n{if {le {row}, 4*N}, 0,\n{if {le {row}, 5*N}, 1,\n0\n}}}}}"
				},
				"rowCount": "6*N",
				"columnCount": "1"
			},
			{
				"name": "X_model",
				"Notes": "A template for the xyz model array.  It denormalizes a single coordinate array.",
				"DiagramX": 455,
				"DiagramY": 315,
				"HideInfo": "n",
				"DiagramNotes": "n",
				"Type": "Model",
				"diagramScale": 1,
				"Objects": [
					{
						"name": "N",
						"Notes": "Number of bodies",
						"DiagramX": 70,
						"DiagramY": 45,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "{nrows Coordinate}"
						}
					},
					{
						"name": "X_ij",
						"DiagramX": 125,
						"DiagramY": 105,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Matrix",
						"unit": "m",
						"CellInputs": {
							"0_0": "Coordinate[{col},1]-Coordinate[{row},1]"
						},
						"rowCount": "N",
						"columnCount": "N"
					},
					{
						"name": "Coordinate",
						"DiagramX": 15,
						"DiagramY": 105,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "ode.Y[1:N]*InitialX"
						},
						"isInput": "y",
						"isOutput": "y"
					},
					{
						"name": "ij",
						"DiagramX": 225,
						"DiagramY": 105,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "X_ij"
						},
						"isOutput": "y"
					}
				]
			},
			{
				"name": "X_1",
				"Notes": "This extracts the recorded x coordinates for planet 1.  The x-y plot could have been plotted by just using the X_Coord and Y_Coord values, however this would have all the planets plotted in the same colour, so here the coordinates are extracted so a separate x-y plot, in a different colour, can be added to the graph.",
				"DiagramX": 345,
				"DiagramY": 395,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "{transpose {transpose X_Coord}[1]}"
				}
			},
			{
				"name": "X_2",
				"Notes": "See the X_1 notes.",
				"DiagramX": 345,
				"DiagramY": 415,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "{transpose {transpose X_Coord}[2]}"
				}
			},
			{
				"name": "Y_1",
				"Notes": "See the X_1 notes.",
				"DiagramX": 345,
				"DiagramY": 435,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "{transpose {transpose Y_Coord}[1]}"
				}
			},
			{
				"name": "Y_2",
				"Notes": "See the X_1 notes.",
				"DiagramX": 345,
				"DiagramY": 455,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "{transpose {transpose Y_Coord}[2]}"
				}
			},
			{
				"name": "X1Local",
				"Notes": "The x coordinate of planet 1 relative to the center point for the planet 1 and 2 system.",
				"DiagramX": 355,
				"DiagramY": 520,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "{transpose\n{transpose X_Coord}[1] -\n XCenter\n}"
				}
			},
			{
				"name": "Y1Local",
				"Notes": "The y coordinate of planet 1 relative to the center point for the planet 1 and 2 system.",
				"DiagramX": 355,
				"DiagramY": 540,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "{transpose{transpose Y_Coord}[1] - YCenter}"
				}
			},
			{
				"name": "X2Local",
				"Notes": "The x coordinate of planet 2 relative to the center point for the planet 1 and 2 system.",
				"DiagramX": 355,
				"DiagramY": 560,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "{transpose\n{transpose X_Coord}[2] -\n XCenter\n}"
				}
			},
			{
				"name": "Y2Local",
				"Notes": "The y coordinate of planet 2 relative to the center point for the planet 1 and 2 system.",
				"DiagramX": 355,
				"DiagramY": 580,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "{transpose{transpose Y_Coord}[2] - YCenter}"
				}
			},
			{
				"name": "ode",
				"DiagramX": 350,
				"DiagramY": 350,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "ODE Solver",
				"y0Formula": {
					"Formula": "Y0"
				},
				"dyFormula": {
					"Formula": "dYdt"
				},
				"nextTFormula": {
					"Formula": "$.t + 2\"d\""
				},
				"endTFormula": {
					"Formula": "14\"year\""
				},
				"relTolFormula": {
					"Formula": "1.0e-5"
				},
				"absTolFormula": {
					"Formula": "1.0e-5"
				},
				"recFormulas": [
					{
						"Formula": "xyz.CoordinateX"
					},
					{
						"Formula": "xyz.CoordinateY"
					},
					{
						"Formula": "xyz.CoordinateZ"
					},
					{
						"Formula": "$.t"
					}
				],
				"AutoRun": "y"
			},
			{
				"name": "Plot_xy",
				"Notes": "Plots the motion of planet 1 and 2 in the x/y plane.  The dot represents the position of the sun.",
				"DiagramX": 440,
				"DiagramY": 455,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Graph",
				"X1": {
					"v": "X_1",
					"vmin": "{min Y_1,Y_2,X_1,X_2}",
					"vmax": "{max Y_1,Y_2,X_1,X_2}",
					"Y1": {
						"v": "Y_1",
						"vmin": "{min Y_1,Y_2,X_1,X_2}",
						"vmax": "{max Y_1,Y_2,X_1,X_2}",
						"lineType": 0
					}
				},
				"X2": {
					"v": "X_2",
					"vmin": "{min Y_1,Y_2,X_1,X_2}",
					"vmax": "{max Y_1,Y_2,X_1,X_2}",
					"Y1": {
						"v": "Y_2",
						"vmin": "{min Y_1,Y_2,X_1,X_2}",
						"vmax": "{max Y_1,Y_2,X_1,X_2}",
						"lineType": 0
					}
				},
				"X3": {
					"v": "0 AU ' Sun",
					"vmin": "{min Y_1,Y_2,X_1,X_2}",
					"vmax": "{max Y_1,Y_2,X_1,X_2}",
					"Y1": {
						"v": "0 AU ' Sun",
						"vmin": "{min Y_1,Y_2,X_1,X_2}",
						"vmax": "{max Y_1,Y_2,X_1,X_2}",
						"lineType": 1
					}
				}
			},
			{
				"name": "Plot_xz",
				"Notes": "Plots the motion of wll the planets in the x/z plane.",
				"DiagramX": 440,
				"DiagramY": 475,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Graph",
				"X1": {
					"v": "Y_Coord",
					"vmin": "",
					"vmax": "",
					"Y1": {
						"v": "Z_Coord",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					}
				}
			},
			{
				"name": "Plot_yz",
				"Notes": "Plots the motion of wll the planets in the y/z plane.",
				"DiagramX": 440,
				"DiagramY": 495,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Graph",
				"X1": {
					"v": "Y_Coord",
					"vmin": "",
					"vmax": "",
					"Y1": {
						"v": "Z_Coord",
						"vmin": "",
						"vmax": "",
						"lineType": 0
					}
				}
			},
			{
				"name": "Plot_xy_Local",
				"Notes": "Plots the motion of planet 1 and 2 in the x/y plane, relative to their common center point.",
				"DiagramX": 440,
				"DiagramY": 550,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Graph",
				"X1": {
					"v": "X1Local",
					"vmin": "{min X1Local, X2Local, \nY1Local, Y2Local}",
					"vmax": "{max X1Local, X2Local, Y1Local, Y2Local}",
					"Y1": {
						"v": "Y1Local",
						"vmin": "{min X1Local, X2Local, Y1Local, Y2Local}",
						"vmax": "{max X1Local, X2Local, Y1Local, Y2Local}",
						"lineType": 0
					}
				},
				"X2": {
					"v": "X2Local",
					"vmin": "{min X1Local, X2Local, Y1Local, Y2Local}",
					"vmax": "{max X1Local, X2Local, Y1Local, Y2Local}",
					"Y1": {
						"v": "Y2Local",
						"vmin": "{min X1Local, X2Local, Y1Local, Y2Local}",
						"vmax": "{max X1Local, X2Local, Y1Local, Y2Local}",
						"lineType": 0
					}
				}
			},
			{
				"name": "x1",
				"Notes": "",
				"DiagramX": 360,
				"DiagramY": 635,
				"HideInfo": "y",
				"DiagramNotes": "n",
				"Type": "Expression",
				"Formula": {
					"Formula": "plot3d.svg"
				}
			},
			{
				"name": "xyz",
				"Notes": "A model that retrieves and denormalizes the planet coordinates.",
				"DiagramX": 455,
				"DiagramY": 260,
				"HideInfo": "n",
				"DiagramNotes": "n",
				"Type": "Model",
				"diagramScale": 1,
				"Objects": [
					{
						"name": "CoordinateX",
						"DiagramX": 195,
						"DiagramY": 180,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "ode.Y[1:N]*InitialX"
						},
						"isInput": "y",
						"isOutput": "y"
					},
					{
						"name": "CoordinateY",
						"DiagramX": 195,
						"DiagramY": 230,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "ode.Y[(N+1):(2*N)]*InitialX"
						},
						"isInput": "y",
						"isOutput": "y"
					},
					{
						"name": "CoordinateZ",
						"DiagramX": 195,
						"DiagramY": 280,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "ode.Y[(2*N+1):(3*N)]*InitialX"
						},
						"isInput": "y",
						"isOutput": "y"
					},
					{
						"name": "X_ij",
						"DiagramX": 295,
						"DiagramY": 180,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Matrix",
						"unit": "AU",
						"CellInputs": {
							"0_0": "CoordinateX[{col},1]-CoordinateX[{row},1]"
						},
						"rowCount": "N",
						"columnCount": "N"
					},
					{
						"name": "Y_ij",
						"DiagramX": 290,
						"DiagramY": 230,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Matrix",
						"unit": "m",
						"CellInputs": {
							"0_0": "CoordinateY[{col},1]-CoordinateY[{row},1]"
						},
						"rowCount": "N",
						"columnCount": "N"
					},
					{
						"name": "Z_ij",
						"DiagramX": 290,
						"DiagramY": 280,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Matrix",
						"unit": "m",
						"CellInputs": {
							"0_0": "CoordinateZ[{col},1]-CoordinateZ[{row},1]"
						},
						"rowCount": "N",
						"columnCount": "N"
					},
					{
						"name": "N",
						"Notes": "",
						"DiagramX": 195,
						"DiagramY": 150,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "N"
						},
						"isInput": "y"
					},
					{
						"name": "X",
						"DiagramX": 375,
						"DiagramY": 180,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "X_ij"
						},
						"isOutput": "y",
						"displayUnit": "AU"
					},
					{
						"name": "Y",
						"DiagramX": 375,
						"DiagramY": 230,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "Y_ij"
						},
						"isOutput": "y",
						"displayUnit": "AU"
					},
					{
						"name": "Z",
						"DiagramX": 375,
						"DiagramY": 280,
						"HideInfo": "y",
						"DiagramNotes": "n",
						"Type": "Expression",
						"Formula": {
							"Formula": "z_ij"
						},
						"isOutput": "y",
						"displayUnit": "AU"
					}
				]
			}
		]
	}
}