const assert = require('assert').strict;
const axios = require('axios');

const contextLog = require('./contextLog');

/**
 * Create a WSO2 application, otherwise known as a service provider.
 *
 * The created application will be configured to use OAuth2 inbound authentication as per the steps
 * here: https://github.com/modusintegration/finance-portal-settlements/tree/8d489300b0f31031059f538c5b486fc90b57ccf7#run-services.
 * Note that this function should make that documentation redundant, therefore it will likely be
 * removed.
 *
 * @func createOAuth2Application
 */
const createOAuth2Application = async ({
    name: client_name,
    clientKey: ext_param_client_id,
    clientSecret: ext_param_client_secret,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    assert(client_name, 'name parameter is required');
    assert(ext_param_client_secret, 'clientSecret parameter is required');
    const reStr = '^[a-zA-Z0-9_]{15,30}$';
    const re = new RegExp(reStr);
    assert(re.test(ext_param_client_id), `client key must pass regex test for ${reStr}`);

    contextLog('Creating WSO2 application with configuration:', {
        client_name,
        ext_param_client_id,
        ext_param_client_secret,
        host,
        username,
        password,
    });

    try {
        // https://docs.wso2.com/display/IS570/apidocs/OAuth2-dynamic-client-registration/#!/operations#OAuth2DCR#registerApplication
        const { status, data } = await axios({
            method: 'post',
            url: `${host}/api/identity/oauth2/dcr/v1.1/register`,
            auth: {
                username,
                password,
            },
            data: {
                ext_param_client_id,
                ext_param_client_secret,
                client_name,
                grant_types: ['password'],
            },
        });
        contextLog('Created application', { status, data });
    } catch (err) {
        if (err?.response?.data?.error_description !== 'Application with the name mfpserviceprovider already exist in the system') {
            throw err;
        }
        const { status, data } = err.response;
        contextLog('WARNING: Application already existed, no checks are performed for correct configuration. Handled the following error response:', {
            status,
            data,
        });
    }
};

const createOAuth2Users = async ({
    users,
    oauth2ApplicationName,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    contextLog('Creating WSO2 users with configuration:', {
        users,
        host,
        username,
        password,
    });

    return Promise.all(users.map(async user => {
        const roleList = [`Application/${oauth2ApplicationName}`, ...user.roles]
            .map(role => `<ser:roleList>${role}</ser:roleList>`)
            .join('');

        const createUserRequest = {
            auth: {
                username,
                password,
            },
            method: 'post',
            headers: {
                SOAPAction: 'urn:addUser',
                'Content-Type': 'text/xml',
            },
            url: `${host}/services/RemoteUserStoreManagerService`,
            data:
            `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.ws.um.carbon.wso2.org" xmlns:xsd="http://common.mgt.user.carbon.wso2.org/xsd">
                <soapenv:Header/>
                <soapenv:Body>
                    <ser:addUser>
                        <ser:userName>${user.name}</ser:userName>
                        <ser:credential>${user.password}</ser:credential>
                        ${roleList}
                        <ser:profileName>default</ser:profileName>
                        <ser:requirePasswordChange>false</ser:requirePasswordChange>
                    </ser:addUser>
                </soapenv:Body>
            </soapenv:Envelope>`,
        };
        try {
            const createUserResponse = await axios(createUserRequest);
            contextLog('Created user', {
                request: createUserRequest,
                response: {
                    status: createUserResponse.status,
                    data: createUserResponse.data,
                },
            });
        } catch (err) {
            if (err?.response?.data?.Fault?.faultstring !== 'UserAlreadyExisting:Username already exists in the system. Please pick another username.') {
                throw err;
            }
            const { status, data } = err.response;
            contextLog('WARNING: user already existed, no checks are performed for correct configuration. Handled the following error response:', {
                status,
                data,
            });
        }

    }))
};

module.exports = {
    createOAuth2Application,
    createOAuth2Users,
};
