const assert = require('assert').strict;
const Ajv = require('ajv');
const rawUsers = require('../imports/users');
const userSchema = require('../imports/users.schema.json');

const print = s => JSON.stringify(s, null, 2);

const load = (users = rawUsers) => {
    const ajv = new Ajv({ allErrors: true });

    const validate = ajv.compile(userSchema);

    assert(
        validate(users),
        `Could not validate users. Errors: ${print(validate.errors)}.`,
    );

    assert(
        (new Set(users.map(user => user.username))).size === users.length,
        `Duplicate user username not allowed. Users: ${print(users)}`,
    );

    return users;
};

module.exports = { load };
