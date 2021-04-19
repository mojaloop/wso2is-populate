const assert = require('assert').strict;
const axios = require('axios');
const https = require('https');
const users = require('../../../src/imports/users');

describe('wso2is', () => {
    const config = {
        baseURL: process.env.WSO2IS_HOST || 'https://wso2is:9443',
        method: 'post',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    };
    // Skipping this test because there appears to be an error with Axios. Using an https agent as
    // above and setting `rejectUnauthorized: false` here still gets us a "self-signed certificate"
    // error. Setting process.env.NODE_TLS_REJECT_UNAUTHORIZED causes us to get a
    // DEPTH_ZERO_SELF_SIGNED_CERT error. If you're reading this, try to not skip this test and see
    // if it works.
    // Important note: if we change axios to use an instance, as in commit
    // b66abac72c8ca1c974164e67c16db4edea1d89a5, we get this problem in the actual wso2is-populate
    // application also. However, if we use axios.defaults here it doesn't seem to work. Note that
    // portal backend doesn't seem to have our same problem (but does not use axios, IIRC).
    it.skip('issues an oauth token', async () => {
        const result = await axios({
            ...config,
            url: '/oauth2/token',
            params: {
                client_id: process.env.AUTH_SERVER_CLIENTKEY,
                client_secret: process.env.AUTH_SERVER_CLIENTSECRET,
                grant_type: 'password',
                scope: 'portaloauthprovider',
                username: 'portaladmin',
                password: 'mcvV2KYw9eKPqNagjGy6',
            }
        });
        const uuidv4regex = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
        expect(result).toEqual({
            access_token: expect.stringMatching(uuidv4regex),
            refresh_token: expect.stringMatching(uuidv4regex),
            scope: "default",
            token_type: "Bearer",
            expires_in: expect.any(Number),
        })
    });
})

describe('portal backend', () => {
    const config = {
        baseURL: process.env.PORTAL_BACKEND_HOST || 'http://portal-backend',
        method: 'post',
    };

    const extractCreds = ({ username, password }) => ({ username, password });

    const login = ({ username, password }) =>
        axios({
            ...config,
            // TODO: remove
            withCredentials: true,
            // TODO: remove
            maxRedirects: 0,
            url: '/login',
            data: {
                username,
                password,
            }})
            .then(resp => console.log(resp.headers) || resp)
            .then(resp => ({ token: resp.headers['set-cookie'] }));

    test.concurrent.each(users.map(extractCreds))('allows login with %p', login);

    // it('allows users with ndc_update role to modify NDC', async () => {
    //     const relevantUsers = users.filter(u => u.roles.includes('ndc_update'));
    //     // Make sure we're actually testing something
    //     assert(relevantUsers.length > 0);
    //     await Promise.all(relevantUsers.map(({ name: username, password }) => axios({
    //         ...config,
    //         // anything that's not a 401 is a pass
    //         validateStatus: status => status !== 401,
    //         url: '/netdebitcap/5',
    //         data: {
    //             username,
    //             password,
    //         },
    //     })));
    // });

    const usersWithoutNdcUpdate = users
        .filter(u => !u.roles.includes('ndc_update'))
        .map(extractCreds);
    test.concurrent.each(usersWithoutNdcUpdate)('%p cannot modify NDC', async user => {
        const { Cookie } = await login(u);
        return axios({
            ...config,
            // only a 401 is a pass
            validateStatus: status => status === 401,
            url: '/netdebitcap/5',
            headers: {
                Cookie,
            },
        })
    });
});
