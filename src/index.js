const Client = require('./lib/Client');
const config = require('./config/client');
const defaultUsers = require('./lib/users');
const {
    createOAuth2Application,
    createOAuth2Users,
    getApplication,
    updateApplication,
    deleteApplication,
    getToken,
    getUserInfo,
    getOAuthApplication,
    updateOAuthApplication,
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
    console.log('STEP 0');
    const {
        host,
        credentials: { username, password },
        application: { name, clientKey, clientSecret }
    } = conf;
    // TODO: this doesn't seem to very reliably delete the application- although it's unclear
    // whether that's actually more to do with WSO2 leaving vestiges of the application lying
    // around. We _might_ need to wait some time after ostensibly deleting the application and
    // receiving the response from WSO2IS.
    // Later evidence: it seems that after a while agitating, WSO2 no longer fully deletes an
    // application. It could be a caching issue. Or it could be anything else at all, really.
    // Anything. Don't constrain your search, the cause could be anything, or anywhere. Best to
    // just not use WSO2 at all. Either that, or it's time for the montage where the protagonist
    // becomes stronger to overcome the adversary. Unfortunately, this story will not have a happy
    // ending.
    // TODO:
    // Later note: it *might* be that we need to "deregisterOAuthApplication" or something. I.e.,
    // `deleteApplication` is not quite enough. Specifically, when `registerOAuthApplication` has
    // been called, but `createApplication` has not, this creates a state where the application can
    // neither be created nor deleted. The solution to this problem might have to be
    // 1. try to delete
    // 2. try to register
    // 3. if registration fails, try to createApplication
    // 4. if createApplication fails, fatal
    // 5. if createApplication succeeds, proceeed?
    // Does this mean we should ignore any "application already exists" errors from register,
    // because they'll only come up if the application has not been truly created, only
    // "registered"? And/or perhaps we could test whether the application exists before trying to
    // delete it?
    await deleteApplication({
        host, name, username, password,
    });
    // Note that we have to call registerOAuthApplication before calling updateApplication.
    // Otherwise we will not be able to specify the consumer key and secret.
    console.log('STEP 1');
    await registerOAuthApplication({
        host, name, username, password, clientKey, clientSecret,
    });
    console.log('STEP 2');
    await createApplication({
        host, name, username, password,
    });
    console.log('STEP 3');
    const { id } = await getApplication({
        host, name, username, password,
    });

    console.log('STEP 4');
    await updateOAuthApplication({
        host, id, name, clientKey, clientSecret, username, password,
    });

    console.log('STEP 5');
    const roles = [...(new Set(users.flatMap(user => user.roles)))]
        .map(role => ({ displayName: role }));
    contextLog('Creating roles:', roles.map(r => r.displayName));
    await instance.addRoles(roles);

    // await createOAuth2Application({
    //     ...conf.application,
    //     host: conf.host,
    //     ...conf.credentials,
    // });


    // await updateApplication({
    //     id,
    //     host: conf.host,
    //     ...conf.application,
    //     ...conf.credentials,
    // });

    // TODO: it's possible that using the SCIM API will put "groups" on the user, instead of roles.
    // Then we won't need to modify the portal.
    console.log('STEP 6');
    // TODO: delete users before creating them
    await createOAuth2Users({
        users,
        // TODO: why do we need to give the application role? What happens if we don't?
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
