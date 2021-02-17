const Client = require('./lib/Client');
const config = require('./config/client');
const roles = require('./imports/roles');
const users = require('./imports/users');

const instance = new Client(config);

async function importData() {
    const addedUsers = await instance.addUsers(users);
    const rolesWithUserIds = Client.attachUserIdsToRoles(addedUsers, roles);
    await instance.addRoles(rolesWithUserIds);
}

importData();
