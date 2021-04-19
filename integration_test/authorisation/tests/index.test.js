const axios = require('axios');
const https = require('https');

describe('wso2is', () => {
    const config = {
        baseURL: process.env.WSO2IS_HOST || 'https://wso2is:9443',
        method: 'post',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    };
    // Skipping this test because there appears to be an error with Axios. Setting
    // rejectUnauthorized: false here still gets us a "self-signed certificate" error. Setting
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED causes us to get a DEPTH_ZERO_SELF_SIGNED_CERT
    // error. If you're reading this, try to not skip this test and see if it works.
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

// TODO: parametrise usernames, passwords (take them from imports/users.json?)
describe('portal backend', () => {
    const config = {
        baseURL: process.env.PORTAL_BACKEND_HOST || 'http://portal-backend',
        url: '/login',
        method: 'post',
    };

    it('allows login with portaladmin user', async () => {
        await axios({
            ...config,
            data: {
                username: 'portaladmin',
                password: 'mcvV2KYw9eKPqNagjGy6',
            }
        })
    });

    it('allows login with portaluser user', async () => {
        await axios({
            ...config,
            data: {
                username: 'portaluser',
                password: 'mcvV2KYw9eKPqNagjGy5',
            }
        })
    });
})
