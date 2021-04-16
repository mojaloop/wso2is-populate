const axios = require('axios');

const config = {
    baseURL: process.env.PORTAL_BACKEND_HOST || 'http://portal-backend',
    url: '/login',
    method: 'post',
};

// TODO: 
describe('portal backend authorisation', () => {
    it('allows login with portaladmin user', async () => {
        await axios({
            ...config,
            data: {
                username: 'portaladmin',
                password: 'mcvV2KYw9eKPqNagjGy6',
            }
        })
    })

    it('allows login with portaluser user', async () => {
        await axios({
            ...config,
            data: {
                username: 'portaluser',
                password: 'mcvV2KYw9eKPqNagjGy5',
            }
        })
    })
})
