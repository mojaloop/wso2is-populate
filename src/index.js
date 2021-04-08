const Client = require('./lib/Client');
const config = require('./config/client');
const roles = require('./imports/roles');
const users = require('./imports/users');
const { createApplication } = require('./lib/service_provider');

async function populate(conf) {
    console.log('Beginning WSO2 IS populate. Config:', conf);

    createApplication({
        ...conf.application,
        ...conf.http,
        ...conf.authentication.credentials,
    });

    const instance = new Client(conf);
    console.log('Adding users');
    const addedUsers = await instance.addUsers(users);
    console.log('Attaching user ids to roles');
    const rolesWithUserIds = Client.attachUserIdsToRoles(addedUsers, roles);
    console.log('Adding roles');
    await instance.addRoles(rolesWithUserIds);
}

module.exports = { populate };

if (require.main === module) {
    populate(config);
}
