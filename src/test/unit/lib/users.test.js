const { load } = require('../../../lib/users');
const defaultUsers = require('../../../imports/users');

describe('users', () => {
    it('correctly validates default users', () => {
        expect(() => load(defaultUsers)).not.toThrow();
    });

    // we don't bother testing every aspect of the schema and make the stupid assumption that it's
    // trivial to define a passable schema (and the further assumption that if it isn't we'd
    // probably fail at it anyway)
    it('rejects invalid users', () => {
        const users = 'blah';
        expect(() => load(users)).toThrow(/^Could not validate users. Errors: /);
    });

    it('does not allow duplicate user names', () => {
        expect(() => load([
            ...defaultUsers,
            ...defaultUsers.map(u => ({ ...u, password: 'yolo!' })),
        ])).toThrow(/^Duplicate user username not allowed/);
    });
});
