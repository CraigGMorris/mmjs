/ new expr
addtool Expression x 80 20
.x.formula set formula 1:1000000 * 1 ft + 3 in
.x value
addtool Expression y 90 60
.y.formula set formula x[3:7]
.y set displayUnitName in
.y value
' test that formula json values work
addtool Expression s 140 90
.s.formula set formula {array 2, 3, "hello"}
.s value
addtool Expression cc
.cc.formula set formula {table {cc "Numbers", "Strings"}, {cc 1, 2}, {cc "one", "two"}}