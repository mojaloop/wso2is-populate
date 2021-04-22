const got = require('got');
const users = require('../../../src/imports/users');

describe('wso2is', () => {
    // TODO: attempt to recreate user, make sure duplicate username cannot exist
    // TODO: attempt to recreate application, make sure duplicate username cannot exist
    const instance = got.extend({
        prefixUrl: process.env.WSO2IS_HOST || 'https://wso2is:9443/',
        https: { rejectUnauthorized: false },
    });
    it('issues an oauth token', async () => {
        const result = await instance({
            url: 'oauth2/token',
            method: 'post',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            searchParams: {
                client_id: process.env.AUTH_SERVER_CLIENTKEY,
                client_secret: process.env.AUTH_SERVER_CLIENTSECRET,
                grant_type: 'password',
                scope: 'portaloauthprovider',
                username: 'portaladmin',
                password: 'mcvV2KYw9eKPqNagjGy6',
            },
        }).json();
        const uuidv4regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const jwtRegex = /^[a-z0-9-_=]+\.[a-z0-9-_=]+\.?[a-z0-9-_.+/=]*$/i;
        expect(result).toEqual({
            access_token: expect.stringMatching(jwtRegex),
            refresh_token: expect.stringMatching(uuidv4regex),
            scope: "default",
            token_type: "Bearer",
            expires_in: expect.any(Number),
        });
    });
})

describe('portal backend', () => {
    const instance = got.extend({
        prefixUrl: process.env.PORTAL_BACKEND_HOST || 'http://portal-backend/',
        method: 'post',
    });

    const extractCreds = ({ username, password }) => ({ username, password });

    const extractTokenCookie = resp => resp
        .headers['set-cookie'][0]
        .split(';')
        .filter(s => /^mojaloop-portal-token=[a-z0-9-_=]+\.[a-z0-9-_=]+\.?[a-z0-9-_.+/=]*$/i.test(s))[0];
    const login = ({ username, password }) =>
        instance({
            url: 'login',
            json: {
                username,
                password,
            }})
            .then(resp => ({ cookie: extractTokenCookie(resp) }));

    // TODO: Decode the returned cookie and assert that it matches a certain pattern. At least so
    // we know what's inside it. Or don't- does it matter? Text-match it for the various
    // credentials we know about- the client id/secret, the user's creds?
    test.concurrent.each(users.map(extractCreds))('allows login with %p', login);

    const usersWithNdcUpdateRole = users
        .filter(u => u.roles.includes('ndc_update'))
        .map(extractCreds);
    test.concurrent.each(usersWithNdcUpdateRole)('%p can modify NDC', async user => {
        const { cookie } = await login(user);
        console.log({ cookie });
        await expect(instance({
            url: 'netdebitcap/5',
            headers: {
                cookie,
            },
        }));
    });

    const usersWithoutNdcUpdateRole = users
        .filter(u => !u.roles.includes('ndc_update'))
        .map(extractCreds);
    test.concurrent.each(usersWithoutNdcUpdateRole)('%p cannot modify NDC', async user => {
        const { cookie } = await login(user);
        console.log({ cookie });
        await expect(instance({
            url: 'netdebitcap/5',
            headers: {
                cookie,
            },
        })).rejects.not.toThrow('Response code 401 (Unauthorized)');
    });
});
