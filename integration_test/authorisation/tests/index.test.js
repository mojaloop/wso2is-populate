const got = require('got');
const users = require('../../../src/imports/users');

describe('wso2is', () => {
    // TODO: attempt to recreate user, make sure duplicate username cannot exist
    // TODO: attempt to recreate application, make sure duplicate username cannot exist
    // TODO: if creds aren't available in the shell (process) environment, try to find the kube
    //       config, and get creds from the cluster?
    // TODO: attempt to run whole wso2is-populate sequence twice and make sure it doesn't fail.
    //       This probably needs to occur outside this file. Although perhaps it would make sense
    //       to use the k8s API? Perhaps with/from a real programming language?
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
        responseType: 'json',
    });

    const extractCreds = ({ username, password }) => ({ username, password });

    const extractTokenCookie = resp => resp
        .headers['set-cookie'][0]
        .split(';')
        .filter(s => /^mojaloop-portal-token=[a-z0-9-_=]+\.[a-z0-9-_=]+\.?[a-z0-9-_.+/=]*$/i.test(s))[0];

    const login = async ({ username, password }) => instance({
            url: 'login',
            json: {
                username,
                password,
            }})
            .then(resp => ({ cookie: extractTokenCookie(resp) }));

    // TODO: Decode the returned cookie and assert that it matches a certain pattern. At least so
    // we know what's inside it. Or don't- does it matter? Text-match it for the various
    // credentials we know about- the client id/secret, the user's creds?
    test.each(users.map(extractCreds))('allows login with %p', login);

    const usersWithNdcUpdateRole = users
        .filter(u => u.roles.includes('ndc_update'))
        .map(extractCreds);
    test.each(usersWithNdcUpdateRole)('%p can modify NDC', async user => {
        const { cookie } = await login(user);
        // TODO: unfortunately, the backend returns 500, which could've been caused by anything.
        // This isn't really good enough, what we really need is to test that the response is in
        // {200,202,204}. The problem at the time of writing is that this would require spinning up
        // mysql + central settlement, then creating some participants. The next problem is that
        // requires the schema to be in place. Which probably requires an instance of central
        // ledger admin to create the db schema. Which starts to become a rabbit-hole. But has to
        // be done sooner or later..
        await expect(instance({
            url: 'netdebitcap/5',
            headers: {
                cookie,
            },
        })).rejects.not.toThrow('Response code 401 (Unauthorized)');
    });

    const usersWithoutNdcUpdateRole = users
        .filter(u => !u.roles.includes('ndc_update'))
        .map(extractCreds);
    test.each(usersWithoutNdcUpdateRole)('%p cannot modify NDC', async user => {
        expect.assertions(2);
        const { cookie } = await login(user);
        try {
            await instance({
                url: 'netdebitcap/5',
                headers: {
                    cookie,
                },
            })
        } catch (err) {
            expect(err.message).toEqual('Response code 401 (Unauthorized)');
            expect(err.response.body).toEqual({ message: 'Forbidden' });
        }
    });
});
