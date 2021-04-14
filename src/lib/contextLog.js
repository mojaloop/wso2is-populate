const util = require('util');

// eslint-disable-next-line no-console
module.exports = (msg, data) => console.log(
    `[${(new Date()).toISOString()}] ${msg}`,
    util.inspect(data, { depth: Infinity }),
);
