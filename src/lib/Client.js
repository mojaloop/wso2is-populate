const axios = require('axios');
const check = require('check-types');
const https = require('https');

const REQUEST_METHODS = {
    GET: 'get',
    POST: 'post',
};

function validateConfiguration(config) {
    return check.assert.nonEmptyObject(config, 'Invalid configuration.')
        && check.nonEmptyString(config.host, 'Invalid host.')
        && check.nonEmptyObject(config.credentials, 'Invalid credentials.');
}

async function makeRequest(client, type, route, data) {
    try {
        const response = await client[type](route, data);
        return (response && response.data) || null;
    } catch (error) {
        // 409 means that the target entry already exists in WSO2IS.
        if (error.response == null || error.response.status !== 409) {
            console.log(`${type.toUpperCase()} ${route} failed with error: ${error}`);
            console.log(error && error.response && error.response.data);

            throw error;
        }

        return null;
    }
}

/**
 * A wrapper module that communicates with a WSO2 Identity Server's REST API.
 *
 * @class Client
 */
class Client {
    /**
     * @constructor
     * @param {Object} config The configuration object. If not provided or malformed,
     * an error will be thrown.
     * @throws An exception if the provided parameters are invalid.
     */
    constructor(config) {
        validateConfiguration(config);

        this.url = `${config.host}/scim2`;

        this.client = axios;
        this.client.defaults.baseURL = this.url;
        this.client.defaults.headers['Content-Type'] = 'application/json';
        this.client.defaults.headers.Accept = 'application/json';
        this.client.defaults.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        this.client.defaults.auth = config.credentials;
    }

    /**
     * Retrieve all the users available in the target WSO2IS by performing a request against:
     * GET https://{host}/{scim2-endpoint}/Users
     *
     * @method getUsers
     * @returns {Array|null} The fetched users' data if returned by the API, null otherwise.
     */
    getUsers() {
        return makeRequest(this.client, REQUEST_METHODS.GET, '/Users');
    }

    /**
     * Retrieve detailed information about a specific user available in the target WSO2IS
     * by performing a request against:
     * GET https://{host}/{scim2-endpoint}/Users/{ID}
     *
     * @method getUser
     * @param {String} id - The target user's ID.
     * @returns {Object|null} The fetched user data if returned by the API, null otherwise.
     */
    getUser(id) {
        return makeRequest(this.client, REQUEST_METHODS.GET, `/Users/${id}`);
    }

    /**
     * Add a new user into the target WSO2IS by performing a request against:
     * POST https://{host}/{scim2-endpoint}/Users
     *
     * @method addUser
     * @param {Object} data - The user's data to import into WSO2IS.
     * @returns {Object|null} The imported user's data if returned by the API, null otherwise.
     */
    addUser(data) {
        return makeRequest(this.client, REQUEST_METHODS.POST, '/Users', data);
    }

    /**
     * Add multiple new users into the target WSO2IS by leveraging the method `addUser`
     * for each one of them.
     *
     * @method addUsers
     * @param {Array} users - The users data to import into WSO2IS.
     * @returns {Array} The added users' data if returned by the API.
     */
    async addUsers(users) {
        return Promise.all(users.map(user => this.addUser(user)));
    }

    /**
     * Retrieve all the roles available in the target WSO2IS by performing a request against:
     * GET https://{host}/{scim2-endpoint}/Groups
     *
     * @method getRoles
     * @returns {Array|null} The fetched roles' data if returned by the API, null otherwise.
     */
    getRoles() {
        return makeRequest(this.client, REQUEST_METHODS.GET, '/Groups');
    }

    /**
     * Retrieve detailed information about a specific role available in the target WSO2IS
     * by performing a request against:
     * GET https://{host}/{scim2-endpoint}/Groups/{ID}
     *
     * @method getRole
     * @param {String} id - The target roles's ID.
     * @returns {Object|null} The fetched role data if returned by the API, null otherwise.
     */
    getRole(id) {
        return makeRequest(this.client, REQUEST_METHODS.GET, `/Groups/${id}`);
    }

    /**
     * Add a new role into the target WSO2IS by performing a request against:
     * POST https://{host}/{scim2-endpoint}/Groups
     *
     * @method addRole
     * @param {Object} data - The roles's data to import into WSO2IS.
     * @returns {Object|null} The imported role's data if returned by the API, null otherwise.
     */
    addRole(data) {
        return makeRequest(this.client, REQUEST_METHODS.POST, '/Groups', data);
    }

    /**
     * Add multiple new roles into the target WSO2IS by leveraging the method `addRole`
     * for each one of them.
     *
     * @method addRoles
     * @param {Array} data - The roles data to import into WSO2IS.
     * @returns {Array} The added roles' data if returned by the API.
     */
    async addRoles(data) {
        return Promise.all(data.map(role => this.addRole(role)));
    }

    /**
     * Populates the user's ID in the specified roles object
     * in case the user is assigned as a role's member and an ID wasn't declared,
     * which means that the user didn't exist.
     *
     * @method attachUserIdsToRoles
     * @param {Array} users The users among their IDs.
     * @param {Array} roles The roles in their initial form,
     * which could contain users without an ID specified.
     * @returns {Array} The roles with any added user IDs.
     */
    static attachUserIdsToRoles(users, roles) {
        const rolesWithUserIds = JSON.parse(JSON.stringify(roles));

        rolesWithUserIds.forEach((role) => {
            role.members.forEach((member) => {
                if (member.value == null) {
                    let foundUser = null;
                    if (users[0] != null) {
                        foundUser = users.find(user => user.userName === member.display);
                    }

                    if (foundUser) {
                        // eslint-disable-next-line no-param-reassign
                        member.value = foundUser.id;
                    }
                }
            });
        });

        return rolesWithUserIds;
    }
}

module.exports = Client;
