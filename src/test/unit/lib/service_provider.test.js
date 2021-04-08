const https = require('https');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { createApplication } = require('../../../lib/service_provider');
const { populate } = require('../../../index');
const config = require('../../../config/client');
config.application.clientKey = 'mock client key';
config.application.clientSecret = 'mock client secret';

jest.mock('../../../lib/Client');
jest.mock('axios', () => ({
    create: jest.fn(),
}));
const mockApplicationId = '777';

describe('createApplication', () => {
    beforeEach(() => {
        axios.create.mockClear();
        axios.create.mockImplementation(() => jest.fn(() => ({ status: 200, data: `<ax1234:applicationID>${mockApplicationId}</ax1234:applicationID>` })));
    });

    it('is called with correct config', async () => {
        // This test tests the interface between the application being run, and the
        // createApplication function. Because createApplication asserts missing arguments, an
        // error will be thrown here if the function is not called with the correct arguments.
        await populate(config);
    });

    it('constructs an axios instance with the correct parameters', async () => {
        await populate(config);
        expect(axios.create.mock.calls.length).toEqual(1);
        const { username, password } = config.authentication.credentials;
        const { host, port } = config.http;
        expect(axios.create.mock.calls[0][0]).toEqual({
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                Accept: 'application/xml',
            },
            auth: {
                username,
                password,
            },
            baseURL: `${host}:${port}/services/IdentityApplicationManagementService`,
            httpsAgent: expect.any(https.Agent),
            method: 'post',
        });
    });

    it('issues the correct application creation request', async () => {
        await populate(config);
        expect(axios.create.mock.calls.length).toEqual(1);
        const instance = axios.create.mock.results[0].value;
        expect(instance.mock.calls.length).toEqual(3);
        instance.mock.calls[0][0].data = await parseStringPromise(instance.mock.calls[0][0].data);
        expect(instance.mock.calls[0]).toEqual([{
            data: await parseStringPromise(
                `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://model.common.application.identity.carbon.wso2.org/xsd">
                   <soapenv:Header/>
                   <soapenv:Body>
                      <xsd:createApplication>
                         <!--Optional:-->
                         <xsd:serviceProvider>
                            <!--Optional:-->
                            <xsd1:applicationName>mfpserviceprovider</xsd1:applicationName>
                         </xsd:serviceProvider>
                      </xsd:createApplication>
                   </soapenv:Body>
                </soapenv:Envelope>`,
            ),
            headers: {
                SOAPAction: 'urn:createApplication',
            },
        }]);
    });

    it('issues the correct application get request', async () => {
        await populate(config);
        expect(axios.create.mock.calls.length).toEqual(1);
        const instance = axios.create.mock.results[0].value;
        expect(instance.mock.calls.length).toEqual(3);
        instance.mock.calls[1][0].data = await parseStringPromise(instance.mock.calls[1][0].data);
        expect(instance.mock.calls[1]).toEqual([{
            data: await parseStringPromise(
                `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://org.apache.axis2/xsd">
                   <soapenv:Header/>
                   <soapenv:Body>
                      <xsd:getApplication>
                         <!--Optional:-->
                         <xsd:applicationName>mfpserviceprovider</xsd:applicationName>
                      </xsd:getApplication>
                   </soapenv:Body>
                </soapenv:Envelope>`,
            ),
            headers: {
                SOAPAction: 'urn:getApplication',
            },
        }]);
    });

    it('issues the correct application update request', async () => {
        await populate(config);
        expect(axios.create.mock.calls.length).toEqual(1);
        const instance = axios.create.mock.results[0].value;
        expect(instance.mock.calls.length).toEqual(3);
        instance.mock.calls[2][0].data = await parseStringPromise(instance.mock.calls[2][0].data);
        expect(instance.mock.calls[2]).toEqual([{
            data: await parseStringPromise(
                `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://model.common.application.identity.carbon.wso2.org/xsd">
                   <soapenv:Header/>
                   <soapenv:Body>
                      <xsd:updateApplication>
                         <!--Optional:-->
                         <xsd:serviceProvider>
                            <!--Optional:-->
                            <xsd1:applicationID>${mockApplicationId}</xsd1:applicationID>
                            <!--Optional:-->
                            <xsd1:applicationName>mfpserviceprovider</xsd1:applicationName>
                            <!--Optional:-->
                            <xsd1:inboundAuthenticationConfig>
                               <!--Zero or more repetitions:-->
                               <xsd1:inboundAuthenticationRequestConfigs>
                                  <!--Optional:-->
                                  <xsd1:inboundAuthKey>mfpserviceprovider</xsd1:inboundAuthKey>
                                  <!--Optional:-->
                                  <xsd1:inboundAuthType>openid</xsd1:inboundAuthType>
                               </xsd1:inboundAuthenticationRequestConfigs>
                               <xsd1:inboundAuthenticationRequestConfigs>
                                  <!--Optional:-->
                                  <xsd1:inboundAuthKey>${config.application.clientKey}</xsd1:inboundAuthKey>
                                  <!--Optional:-->
                                  <xsd1:inboundAuthType>oauth2</xsd1:inboundAuthType>
                                  <!--Zero or more repetitions:-->
                                  <xsd1:properties>
                                     <!--Optional:-->
                                     <xsd1:advanced>false</xsd1:advanced>
                                     <!--Optional:-->
                                     <xsd1:confidential>false</xsd1:confidential>
                                     <!--Optional:-->
                                     <xsd1:defaultValue></xsd1:defaultValue>
                                     <!--Optional:-->
                                     <xsd1:description></xsd1:description>
                                     <!--Optional:-->
                                     <xsd1:displayName></xsd1:displayName>
                                     <!--Optional:-->
                                     <xsd1:name>oauthConsumerSecret</xsd1:name>
                                     <!--Optional:-->
                                     <xsd1:required>false</xsd1:required>
                                     <!--Optional:-->
                                     <xsd1:type></xsd1:type>
                                     <!--Optional:-->
                                     <xsd1:value>${config.application.clientSecret}</xsd1:value>
                                  </xsd1:properties>
                               </xsd1:inboundAuthenticationRequestConfigs>
                            </xsd1:inboundAuthenticationConfig>
                         </xsd:serviceProvider>
                      </xsd:updateApplication>
                   </soapenv:Body>
                </soapenv:Envelope>`,
            ),
            headers: {
                SOAPAction: 'urn:updateApplication',
            },
        }]);
    });

    it('correctly handles an application create when the application already exists', async () => {
        // try {
        axios.create.mockImplementation(() => () => {
            throw new Error({
                response: {
                    data: 'Already an application available with the same name',
                },
            });
        });
        await expect(Promise.reject(new Error('octopus'))).rejects.toThrow('octopus');
        await populate(config).rejects.toThrow(expect.anything());
        // } catch (err) {
        //
        // }
    });

    // it('throws when there is a failure to match the application id', async () => {
    //
    // });
});
