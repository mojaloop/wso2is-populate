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
    // neither be created nor deleted.
    await deleteApplication(conf.application);
    // Note that we have to call registerOAuthApplication before calling updateApplication.
    // Otherwise we will not be able to specify the consumer key and secret.
    console.log('STEP 1');
    await registerOAuthApplication(conf.application);
    console.log('STEP 2');
    await createApplication(conf.application);
    console.log('STEP 3');
    const { id } = await getApplication({ name: conf.application.name });

    console.log('STEP 4');
    await updateOAuthApplication({ id, ...conf.application });

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

    console.log('STEP 6');
    await createOAuth2Users({
        users,
        oauth2ApplicationName: conf.application.name,
        host: conf.host,
        ...conf.credentials,
    });

    console.log('STEP 7');
    const portaladmin = users.find(({ username }) => username === 'portaladmin');
    const wso2Token = await getToken({
        host: conf.host,
        username: portaladmin.username,
        password: portaladmin.password,
        ...conf.application,
    });
    console.log(wso2Token);

    console.log('STEP 8');

}

module.exports = { populate };

if (require.main === module) {
    populate(config, defaultUsers.load());
}
