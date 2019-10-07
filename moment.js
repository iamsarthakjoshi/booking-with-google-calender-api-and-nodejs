const moment = require('moment');

var a = moment("2019-10-01T09:00:00Z");

console.log(`${a} // PST`)

a.utc();

console.log(`
${a} // UTC
${a.toISOString()} // ISO
`)

