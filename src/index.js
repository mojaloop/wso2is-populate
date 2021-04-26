const Client = require('./lib/Client');
const config = require('./config/client');
const defaultUsers = require('./lib/users');
const {
    createOAuth2Users,
    getApplication,
    updateApplication,
    deleteApplication,
    createApplication,
    registerOAuthApplication,
} = require('./lib/api');
const contextLog = require('./lib/contextLog');

async function populate(conf, users) {
    contextLog('Beginning WSO2 IS populate. Config:', conf);
    contextLog('Users:', users);

    const instance = new Client(conf);

    // We delete the application first. This is because, after extensive testing, it was discovered
    // that it's possible to update an application once, but subsequent updates will clear the
    // consumer secret.
    const {
        host,
        credentials: { username, password },
        application: { name, clientKey, clientSecret },
    } = conf;
    await instance.deleteUsers(users);
    // TODO: this doesn't seem to very reliably delete the application- although it's unclear
    // whether that's actually more to do with WSO2 leaving vestiges of the application lying
    // around. We _might_ need to wait some time after ostensibly deleting the application and
    // receiving the response from WSO2IS.
    //
    // Later evidence: it seems that after a while agitating, WSO2 no longer fully deletes an
    // application. It could be a caching issue. Or it could be anything else at all, really.
    // Anything. Don't constrain your search, the cause could be anything, or anywhere. Best to
    // just not use WSO2 at all. Either that, or it's time for the montage where the protagonist
    // becomes stronger to overcome the adversary. Unfortunately, this story will not have a happy
    // ending.
    //
    // Later note: it *might* be that we need to "deregisterOAuthApplication" or something. I.e.,
    // `deleteApplication` is not quite enough. Specifically, when `registerOAuthApplication` has
    // been called, but `createApplication` has not, this creates a state where the application can
    // neither be created (_registered_?) nor deleted. The solution to this problem might have to
    // be
    //   1. try to delete
    //   2. try to register
    //   3. if registration fails, try to createApplication
    //   4. if createApplication fails, fatal
    //   5. if createApplication succeeds, proceeed?
    // Does this mean we should ignore any "application already exists" errors from register,
    // because they'll only come up if the application has not been truly created, only
    // "registered"? And/or perhaps we could test whether the application exists before trying to
    // delete it?
    //
    // Note for the future reader: I ran out of time to implement the above steps, sorry. In my
    // experience it's not a frequent occurence that register succeeds and create fails. Hopefully
    // that will be borne out by wider usage of this module.
    await deleteApplication({
        host, name, username, password,
    });
    // Note that we have to call registerOAuthApplication before calling updateApplication.
    // Otherwise we will not be able to specify the consumer key and secret. Why? Well, you're
    // thinking about it wrong. WSO2 isn't _about_ logic. It's about building character. It's about
    // uniting against a common enemy. It's bigger than logic.

    await registerOAuthApplication({
        host, name, username, password, clientKey, clientSecret,
    });

    await createApplication({
        host, name, username, password,
    });

    const { id } = await getApplication({
        host, name, username, password,
    });

    await updateApplication({
        host, id, name, clientKey, clientSecret, username, password,
    });

    const roles = [...(new Set(users.flatMap(user => user.roles)))]
        .map(role => ({ displayName: role }));
    contextLog('Creating roles:', roles.map(r => r.displayName));
    await instance.addRoles(roles);

    await createOAuth2Users({
        users,
        oauth2ApplicationName: name,
        host: conf.host,
        username,
        password,
    });

    // console.log('STEP 7');
    // const portaladmin = users.find(({ username }) => username === 'portaladmin');
    // const wso2Token = await getToken({
    //     host,
    //     username: portaladmin.username,
    //     password: portaladmin.password,
    //     clientKey,
    //     clientSecret,
    // });
    // console.log(wso2Token);
    //
    // console.log('STEP 8');
    // const result = await getUserInfo({ token: wso2Token.access_token });
    // console.log(result);
}

module.exports = { populate };

if (require.main === module) {
    populate(config, defaultUsers.load());
}
