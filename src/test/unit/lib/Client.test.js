const rewire = require('rewire');
const DEFAULT_CONFIG = require('../../../config/client');

const Client = rewire('../../../lib/Client');

describe('Client', () => {
    let validConfig;

    beforeEach(() => {
        validConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    });

    describe('Constructor:', () => {
        describe('Failures:', () => {
            let invalidConfig;
            let client;

            beforeEach(() => {
                invalidConfig = JSON.parse(JSON.stringify(validConfig));
                client = null;
            });

            afterEach(() => {
                expect(client).toBe(null);
            });

            describe('Throws an error if:', () => {
                it('no arguments are provided.', () => {
                    expect(() => {
                        client = new Client();
                    }).toThrow();
                });

                describe('first argument is:', () => {
                    it('null.', () => {
                        expect(() => {
                            client = new Client(null);
                        });
                    });

                    it('number.', () => {
                        expect(() => {
                            client = new Client(33);
                        }).toThrow();
                    });

                    it('string.', () => {
                        expect(() => {
                            client = new Client('foo');
                        }).toThrow();
                    });

                    it('function.', () => {
                        expect(() => {
                            client = new Client(() => {});
                        }).toThrow();
                    });

                    describe('object but:', () => {
                        it('empty.', () => {
                            expect(() => {
                                client = new Client({});
                            }).toThrow();
                        });

                        describe('property `host` is:', () => {
                            it('missing.', () => {
                                expect(() => {
                                    delete invalidConfig.host;

                                    client = new Client(invalidConfig);
                                }).toThrow();
                            });

                            it('null.', () => {
                                expect(() => {
                                    invalidConfig.host = null;

                                    client = new Client(invalidConfig);
                                }).toThrow();
                            });

                            it('number.', () => {
                                expect(() => {
                                    invalidConfig.host = 33;

                                    client = new Client(invalidConfig);
                                }).toThrow();
                            });

                            it('function.', () => {
                                expect(() => {
                                    invalidConfig.host = () => {};

                                    client = new Client(invalidConfig);
                                }).toThrow();
                            });

                            it('object.', () => {
                                expect(() => {
                                    invalidConfig.host = {};

                                    client = new Client(invalidConfig);
                                }).toThrow();
                            });
                        });

                        describe('property `credentials` is:', () => {
                            it('missing.', () => {
                                expect(() => {
                                    delete invalidConfig.credentials;

                                    client = new Client(invalidConfig);
                                }).toThrow();
                            });

                            it('null.', () => {
                                expect(() => {
                                    invalidConfig.credentials = null;

                                    client = new Client(invalidConfig);
                                }).toThrow();
                            });

                            it('number.', () => {
                                expect(() => {
                                    invalidConfig.credentials = 33;

                                    client = new Client(invalidConfig);
                                }).toThrow();
                            });

                            it('string.', () => {
                                expect(() => {
                                    invalidConfig.credentials = 'foo';

                                    client = new Client(invalidConfig);
                                }).toThrow();
                            });

                            it('function.', () => {
                                expect(() => {
                                    invalidConfig.credentials = () => {};

                                    client = new Client(invalidConfig);
                                }).toThrow();
                            });

                            describe('object but:', () => {
                                it('property `username` is missing', () => {
                                    expect(() => {
                                        delete invalidConfig.credentials.username;

                                        client = new Client(invalidConfig);
                                    }).toThrow();
                                });
                                it('property `password` is missing', () => {
                                    expect(() => {
                                        delete invalidConfig.credentials.password;

                                        client = new Client(invalidConfig);
                                    }).toThrow();
                                });
                            });
                        });
                    });
                });
            });
        });

        describe('Success:', () => {
            let client;

            beforeEach(() => {
                client = null;
            });

            afterEach(() => {
                expect(client).not.toBe(null);
                expect(client).toBeInstanceOf(Client);
            });

            it('does not throw an error if the parameters are valid.', () => {
                expect(() => {
                    client = new Client(validConfig);
                }).not.toThrow();
            });
        });
    });

    describe('Public methods:', () => {
        let client;
        let axiosStub;
        let makeRequestStub;
        let restoreMakeRequest;

        beforeEach(() => {
            validConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
            client = new Client(validConfig);

            axiosStub = {};
            client.client = axiosStub;

            makeRequestStub = jest.fn();
            /* eslint-disable-next-line no-underscore-dangle */
            restoreMakeRequest = Client.__set__('makeRequest', makeRequestStub);
        });

        afterEach(() => {
            client = null;

            restoreMakeRequest();
        });

        describe('getUsers:', () => {
            describe('Success:', () => {
                it('calls `makeRequest` with the expected arguments.', async () => {
                    await client.getUsers();

                    expect(makeRequestStub).toHaveBeenCalledTimes(1);
                    expect(makeRequestStub).toHaveBeenCalledWith(axiosStub, 'get', 'Users');
                });
            });
        });

        describe('getUser:', () => {
            describe('Success:', () => {
                it('calls `makeRequest` with the expected arguments.', async () => {
                    const mockId = 'foo';

                    await client.getUser(mockId);

                    expect(makeRequestStub).toHaveBeenCalledTimes(1);
                    expect(makeRequestStub).toHaveBeenCalledWith(axiosStub, 'get', `Users/${mockId}`);
                });
            });
        });

        describe('addUser:', () => {
            describe('Success:', () => {
                it('calls `makeRequest` with the expected arguments.', async () => {
                    const mockUserData = {
                        userName: 'foo',
                    };

                    await client.addUser(mockUserData);

                    expect(makeRequestStub).toHaveBeenCalledTimes(1);
                    expect(makeRequestStub).toHaveBeenCalledWith(axiosStub, 'post', 'Users', mockUserData);
                });
            });
        });

        describe('addUsers:', () => {
            describe('Success:', () => {
                it('calls `addUser` for every object inside the passed array.', async () => {
                    const mockUserData1 = {
                        userName: 'foo1',
                    };
                    const mockUserData2 = {
                        userName: 'foo2',
                    };
                    const mockUsersData = [mockUserData1, mockUserData2];

                    client.addUser = jest.fn(() => false);

                    await client.addUsers(mockUsersData);

                    expect(client.addUser).toHaveBeenCalledTimes(2);
                    expect(client.addUser.mock.calls[0][0]).toBe(mockUsersData[0]);
                    expect(client.addUser.mock.calls[1][0]).toBe(mockUsersData[1]);

                    client.addUser.mockReset();
                });
            });
        });

        describe('getRoles:', () => {
            describe('Success:', () => {
                it('calls `makeRequest` with the expected arguments.', async () => {
                    await client.getRoles();

                    expect(makeRequestStub).toHaveBeenCalledTimes(1);
                    expect(makeRequestStub).toHaveBeenCalledWith(axiosStub, 'get', 'Groups');
                });
            });
        });

        describe('getRole:', () => {
            describe('Success:', () => {
                it('calls `makeRequest` with the expected arguments.', async () => {
                    const mockId = 'foo';

                    await client.getRole(mockId);

                    expect(makeRequestStub).toHaveBeenCalledTimes(1);
                    expect(makeRequestStub).toHaveBeenCalledWith(axiosStub, 'get', `Groups/${mockId}`);
                });
            });
        });

        describe('addRole:', () => {
            describe('Success:', () => {
                it('calls `makeRequest` with the expected arguments.', async () => {
                    const mockRoleData = {
                        displayName: 'foo',
                    };

                    await client.addRole(mockRoleData);

                    expect(makeRequestStub).toHaveBeenCalledTimes(1);
                    expect(makeRequestStub).toHaveBeenCalledWith(axiosStub, 'post', 'Groups', mockRoleData);
                });
            });
        });

        describe('addRoles:', () => {
            describe('Success:', () => {
                it('calls `addRole` for every object inside the passed array and passes back the inserted.', async () => {
                    const mockRoleData1 = {
                        displayName: 'foo1',
                    };
                    const mockRoleData2 = {
                        displayName: 'foo2',
                    };
                    const mockRolesData = [mockRoleData1, mockRoleData2];

                    client.addRole = jest.fn(() => false);

                    await client.addRoles(mockRolesData);

                    expect(client.addRole).toHaveBeenCalledTimes(2);
                    expect(client.addRole.mock.calls[0][0]).toBe(mockRolesData[0]);
                    expect(client.addRole.mock.calls[1][0]).toBe(mockRolesData[1]);

                    client.addRole.mockReset();
                });
            });
        });

        describe('attachUserIdsToRoles:', () => {
            describe('Success:', () => {
                it('attaches the IDs to the corresponding users in case they do not have one defined yet', () => {
                    const addedUsers = [{
                        userName: 'user2',
                        id: 'id2',
                    }];
                    const roles = [{
                        displayName: 'role1',
                        members: [
                            {
                                display: 'user1',
                                value: 'id1',
                            },
                            {
                                display: 'user2',
                            },
                        ],
                    }];
                    const expectedRoles = JSON.parse(JSON.stringify(roles));
                    expectedRoles[0].members[1].value = addedUsers[0].id;

                    const result = Client.attachUserIdsToRoles(addedUsers, roles);
                    expect(result).toMatchObject(expectedRoles);
                });
            });
        });
    });

    describe('Private functions:', () => {
        describe('makeRequest:', () => {

            describe('Failures:', () => {
                it('throws an error if the external request fails with a status code other than 409.', async () => {
                    const mockError = {
                        response: {
                            statusCode: 500,
                        },
                    };

                    clientStub = jest.fn(async () => {
                        throw new Error(mockError);
                    });

                    /* eslint-disable-next-line no-underscore-dangle */
                    await expect(Client.__get__('makeRequest')(clientStub, 'get', 'Users')).rejects.toThrow();
                    expect(clientStub).toHaveBeenCalledTimes(1);
                });

                it('throws an error if the external request fails with any error.', async () => {
                    clientStub = jest.fn(async () => {
                        throw new Error('Fake error');
                    });

                    /* eslint-disable-next-line no-underscore-dangle */
                    await expect(Client.__get__('makeRequest')(clientStub, 'get', 'Users')).rejects.toThrow();
                    expect(clientStub).toHaveBeenCalledTimes(1);
                });
            });

            describe('Success:', () => {
                it('does not throw an error if the external request fails with status code 409.', async () => {
                    const mockError = {
                        response: {
                            statusCode: 409,
                        },
                    };

                    clientStub = jest.fn(async () => {
                        throw mockError;
                    });

                    /* eslint-disable-next-line no-underscore-dangle */
                    const response = await Client.__get__('makeRequest')(clientStub, 'get', 'Users');

                    expect(response).toBe(null);
                    expect(clientStub).toHaveBeenCalledTimes(1);
                });

                it('returns the result of the external request if it succeeds', async () => {
                    const mockResponse = {
                        body: {
                            foo: 'bar',
                        },
                    };
                    const clientStub = jest.fn(async () => mockResponse);
                    /* eslint-disable-next-line no-underscore-dangle */
                    const response = await Client.__get__('makeRequest')(clientStub, 'get', 'Users');

                    expect(response).toBe(mockResponse.body);
                    expect(clientStub).toHaveBeenCalledTimes(1);
                });
            });
        });
    });
});
