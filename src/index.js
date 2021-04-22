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
    contextLog('wso2 token', await getToken({
        host: conf.host,
        username: portaladmin.username,
        password: portaladmin.password,
        ...conf.application,
    }));
}

module.exports = { populate };

if (require.main === module) {
    populate(config, defaultUsers.load());
}
