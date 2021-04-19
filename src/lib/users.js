const assert = require('assert').strict;
const Ajv = require('ajv');
const rawUsers = require('../imports/users');

const print = s => JSON.stringify(s, null, 2);

const load = (users = rawUsers) => {
    const ajv = new Ajv({ allErrors: true });
    const userSchema = {
        type: 'array',
        uniqueItems: true,
        items: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                },
                password: {
                    type: 'string',
                },
                roles: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
            },
            required: ['name', 'password', 'roles'],
        },
    };

    const validate = ajv.compile(userSchema);

    assert(
        validate(users),
        `Could not validate users. Errors: ${print(validate.errors)}.`,
    );

    assert(
        (new Set(users.map(user => user.name))).size === users.length,
        `Duplicate user name not allowed. Users: ${print(users)}`,
    );

    return users;
};

module.exports = { load };
