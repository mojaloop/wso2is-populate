const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../.env'),
});

module.exports = {
    http: {
        host: process.env.HTTP_HOST || 'https://127.0.0.1',
        port: process.env.HTTP_PORT || 9443,
        endpoint: process.env.HTTP_ENDPOINT || 'scim2',
        timeout: process.env.HTTP_TIMEOUT || 60000,
    },
    authentication: {
        type: process.env.AUTHENTICATION_TYPE || 'basic',
        credentials: process.env.AUTHENTICATION_CREDENTIALS || {
            username: process.env.AUTHENTICATION_CREDENTIALS_USERNAME || 'admin',
            password: process.env.AUTHENTICATION_CREDENTIALS_PASSWORD || 'admin',
        },
    },
    application: {
        name: process.env.APPLICATION_NAME || 'mfpserviceprovider',
        clientKey: process.env.CLIENT_KEY,
        clientSecret: process.env.CLIENT_SECRET,
    },
};
