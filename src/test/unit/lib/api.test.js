const got = require('got');
const { createOAuth2Application, createOAuth2Users } = require('../../../lib/api');
const { populate } = require('../../../index');
const config = require('../../../config/client');
const defaultUsers = require('../../../imports/users');

jest.mock('../../../lib/Client');
jest.mock('got');

describe('createOAuth2Application', () => {
    const applicationArgs = {
        ...config.application,
        host: config.host,
        ...config.credentials,
    };

    describe('asserts valid', () => {
        it('application name', async () => {
            await expect(createOAuth2Application({ ...applicationArgs, name: undefined }))
                .rejects.toThrow(/name parameter is required/);
        });

        it('client secret', async () => {
            await expect(createOAuth2Application({ ...applicationArgs, clientSecret: undefined }))
                .rejects.toThrow(/clientSecret parameter is required/);
        });

        it('client key', async () => {
            await expect(createOAuth2Application({ ...applicationArgs, clientKey: 'invalid' }))
                .rejects.toThrow(/clientKey invalid/);
        });
    });

    it('succeeds with valid config', async () => {
        // This test tests the interface between the application being run, and the
        // createOAuth2Application function. Because createOAuth2Application asserts missing
        // arguments, an error will be thrown here if the function is not called with the correct
        // arguments.
        got.mockResolvedValue({
            response: {
                status: 'whatever',
                body: 'anything',
            },
        });
        // Just expect this not to throw
        await createOAuth2Application(applicationArgs);
    });

    it('correctly handles an application create when the application already exists', async () => {
        got.mockRejectedValue({
            response: {
                body: {
                    error_description: 'Application with the name mfpserviceprovider already exist in the system',
                },
            },
        });
        // Just expect this not to throw
        await createOAuth2Application(applicationArgs);
    });

    it('fails on an error that is not "application already exists"', async () => {
        const result = {
            response: {
                body: {
                    error_description: 'blah',
                },
            },
        };
        got.mockRejectedValue(result);
        // Just expect this not to throw
        await expect(createOAuth2Application(applicationArgs)).rejects.toEqual(result);
    });
});

describe('createOAuth2Users', () => {
    const usersArgs = {
        users: defaultUsers,
        oauth2ApplicationName: 'whocares',
    };

    describe('asserts valid', () => {
        it('users', async () => {
            await expect(createOAuth2Users({ ...usersArgs, users: 'blah' }))
                .rejects.toThrow(/users.*required.*array/);
        });

        it('application name', async () => {
            await expect(createOAuth2Users({ ...usersArgs, oauth2ApplicationName: undefined }))
                .rejects.toThrow(/oauth2ApplicationName.*required.*parameter/);
        });
    });

    it('succeeds with valid config', async () => {
        got.mockResolvedValue({
            response: {
                status: 'whatever',
                body: 'anything',
            },
        });
        await createOAuth2Users(usersArgs);
    });

    it('correctly handles user creation when a user already exists', async () => {
        got.mockRejectedValue({
            response: {
                body: {
                    Fault: {
                        faultstring: 'UserAlreadyExisting:Username already exists in the system. Please pick another username.',
                    },
                },
            },
        });
        await createOAuth2Users(usersArgs);
    });

    it('correctly propagates unhandled error', async () => {
        const result = {
            response: {
                body: {
                    Fault: {
                        faultstring: 'whatever',
                    },
                },
            },
        };
        got.mockRejectedValue(result);
        await expect(createOAuth2Users(usersArgs)).rejects.toEqual(result);
    });
});
