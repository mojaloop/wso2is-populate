const axios = require('axios');

describe('wso2is', () => {
    // curl -k -X POST 'https://localhost:9443/oauth2/token' \
    //     --header 'Content-Type: application/x-www-form-urlencoded' \
    //     --data-urlencode "client_id=$AUTH_SERVER_CLIENTKEY" \
    //     --data-urlencode "client_secret=$AUTH_SERVER_CLIENTSECRET" \
    //     --data-urlencode 'grant_type=password' \
    //     --data-urlencode 'scope=portaloauthprovider' \
    //     --data-urlencode 'username=portaladmin' \
    //     --data-urlencode 'password=mcvV2KYw9eKPqNagjGy6'
    const config = {
        baseURL: process.env.WSO2IS_HOST || 'https://wso2is:9443',
        method: 'post',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    };
    it('issues an oauth token', async () => {
        const result = await axios({
            ...config,
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
