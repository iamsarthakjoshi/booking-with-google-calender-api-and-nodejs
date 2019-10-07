const moment = require('moment');
//2019-10-16T09:00:00Z
//2019-10-16T09:00:00.00Z

var a1 = moment("2019-10-16T09:00:00Z");
var a2 = moment("2019-10-16T09:00:00.00Z");

if(moment("2019-10-16T09:00:00Z").isSame("2019-91-16T09:00:00.00Z")){
  console.log("True")
} else {
  console.log("False")
}

console.log(`${a1}  ${a2}// PST`)

a1.utc();
a2.utc();

console.log(`
${a1} // UTC
${a1.toISOString()} // ISO

${a2} // UTC
${a2.toISOString()} // ISO

`)

if(moment(a1.toISOString()).isSame(a2.toISOString())){
  console.log("True")
} else {
  console.log("False")
}

