const axios = require('axios');
const { createOAuth2Application, createOAuth2Users } = require('../../../lib/api');
const { populate } = require('../../../index');
const config = require('../../../config/client');

const createArg = {
    ...config.application,
    host: config.host,
    ...config.credentials,
};

jest.mock('../../../lib/Client');
jest.mock('axios');

describe('createOAuth2Application', () => {
    it('is called with correct config', async () => {
        // This test tests the interface between the application being run, and the
        // createOAuth2Application function. Because createOAuth2Application asserts missing
        // arguments, an error will be thrown here if the function is not called with the correct
        // arguments.
        axios.mockResolvedValue({
            response: {
                status: 'whatever',
                data: 'anything',
            },
        });
        await populate(config);
    });

    it('correctly handles an application create when the application already exists', async () => {
        axios.mockRejectedValue({
            response: {
                data: {
                    error_description: 'Application with the name mfpserviceprovider already exist in the system',
                },
            },
        });
        await createOAuth2Application(createArg);
    });
});
