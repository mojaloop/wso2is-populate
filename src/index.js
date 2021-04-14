const Client = require('./lib/Client');
const config = require('./config/client');
const defaultUsers = require('./lib/users');
const { createOAuth2Application, createOAuth2Users } = require('./lib/api');
const contextLog = require('./lib/contextLog');

async function populate(conf, users) {
    contextLog('Beginning WSO2 IS populate. Config:', conf);
    contextLog('Users:', users);

    const instance = new Client(conf);

    const roles = [...(new Set(users.flatMap(user => user.roles)))]
        .map(role => ({ displayName: role }));
    contextLog('Creating roles:', roles.map(r => r.displayName));
    await instance.addRoles(roles);

    await createOAuth2Application({
        ...conf.application,
        host: conf.host,
        ...conf.credentials,
    });

    await createOAuth2Users({
        users,
        oauth2ApplicationName: conf.application.name,
        host: conf.host,
        ...conf.credentials,
    });
}

module.exports = { populate };

if (require.main === module) {
    populate(config, defaultUsers.load());
}
