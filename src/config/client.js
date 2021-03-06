const assert = require('assert').strict;
const Ajv = require('ajv');
const path = require('path');

const ajv = new Ajv({ allErrors: true });

require('dotenv').config({
    path: path.resolve(__dirname, '../../.env'),
});

const envSchema = {
    type: 'object',
    properties: {
        WSO2_HOST: {
            type: 'string',
            format: 'uri',
            pattern: '^https://',
        },
        AUTH_SERVER_CLIENTKEY: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_]{15,30}$',
        },
    },
    additionalProperties: true,
};
const validateEnv = ajv.compile(envSchema);

const defaultChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
const randomString = ({ fromChars = defaultChars, length = 30 } = {}) => Array
    .from({ length })
    .map(() => fromChars.charAt(Math.floor(Math.random(fromChars.length) * fromChars.length)))
    .join('');

const conf = {
    host: process.env.WSO2_HOST || 'https://localhost:9443',
    credentials: {
        username: process.env.AUTHENTICATION_CREDENTIALS_USERNAME || 'admin',
        password: process.env.AUTHENTICATION_CREDENTIALS_PASSWORD || 'admin',
    },
    application: {
        name: process.env.APPLICATION_NAME || 'portaloauth',
        clientKey: process.env.AUTH_SERVER_CLIENTKEY || randomString({ length: 30 }),
        clientSecret: process.env.AUTH_SERVER_CLIENTSECRET || randomString({ length: 30 }),
    },
};

assert(
    validateEnv(process.env),
    `Process environment not valid. Errors:\n${validateEnv?.errors?.map(err => JSON.stringify(err, null, 2))}`,
);

module.exports = conf;
