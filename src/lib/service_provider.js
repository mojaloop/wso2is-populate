const assert = require('assert').strict;
const axios = require('axios');
const https = require('https');
const util = require('util');

const requestBuilders = {
    // https://docs.wso2.com/display/IS570/Using+the+Service+Provider+API#UsingtheServiceProviderAPI-createApplication
    createApplication: ({ applicationName }) => ({
        headers: {
            SOAPAction: 'urn:createApplication',
        },
        data:
            `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://model.common.application.identity.carbon.wso2.org/xsd">
               <soapenv:Header/>
               <soapenv:Body>
                  <xsd:createApplication>
                     <!--Optional:-->
                     <xsd:serviceProvider>
                        <!--Optional:-->
                        <xsd1:applicationName>${applicationName}</xsd1:applicationName>
                     </xsd:serviceProvider>
                  </xsd:createApplication>
               </soapenv:Body>
            </soapenv:Envelope>`,
    }),

    // https://docs.wso2.com/display/IS570/Using+the+Service+Provider+API#UsingtheServiceProviderAPI-getApplication
    getApplication: ({ applicationName }) => ({
        headers: {
            SOAPAction: 'urn:getApplication',
        },
        data:
            `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://org.apache.axis2/xsd">
               <soapenv:Header/>
               <soapenv:Body>
                  <xsd:getApplication>
                     <!--Optional:-->
                     <xsd:applicationName>${applicationName}</xsd:applicationName>
                  </xsd:getApplication>
               </soapenv:Body>
            </soapenv:Envelope>`,
            // `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://org.apache.axis2/xsd">
            //    <soapenv:Header/>
            //    <soapenv:Body>
            //       <xsd:getApplication>
            //          <!--Optional:-->
            //          <xsd:applicationName>${applicationName}</xsd:applicationName>
            //       </xsd:getApplication>
            //    </soapenv:Body>
            // </soapenv:Envelope>`,
    }),

    // https://docs.wso2.com/display/IS570/Using+the+Service+Provider+API#UsingtheServiceProviderAPI-updateApplication
    updateApplication: ({
        applicationId,
        applicationName,
        clientKey,
        clientSecret,
    }) => ({
        headers: {
            SOAPAction: 'urn:updateApplication',
        },
        data:
            `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://model.common.application.identity.carbon.wso2.org/xsd">
               <soapenv:Header/>
               <soapenv:Body>
                  <xsd:updateApplication>
                     <!--Optional:-->
                     <xsd:serviceProvider>
                        <!--Optional:-->
                        <xsd1:applicationID>${applicationId}</xsd1:applicationID>
                        <!--Optional:-->
                        <xsd1:applicationName>${applicationName}</xsd1:applicationName>
                        <!--Optional:-->
                        <xsd1:inboundAuthenticationConfig>
                           <!--Zero or more repetitions:-->
                           <xsd1:inboundAuthenticationRequestConfigs>
                              <!--Optional:-->
                              <xsd1:inboundAuthKey>${applicationName}</xsd1:inboundAuthKey>
                              <!--Optional:-->
                              <xsd1:inboundAuthType>openid</xsd1:inboundAuthType>
                           </xsd1:inboundAuthenticationRequestConfigs>
                           <xsd1:inboundAuthenticationRequestConfigs>
                              <!--Optional:-->
                              <xsd1:inboundAuthKey>${clientKey}</xsd1:inboundAuthKey>
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
                                 <xsd1:value>${clientSecret}</xsd1:value>
                              </xsd1:properties>
                           </xsd1:inboundAuthenticationRequestConfigs>
                        </xsd1:inboundAuthenticationConfig>
                     </xsd:serviceProvider>
                  </xsd:updateApplication>
               </soapenv:Body>
            </soapenv:Envelope>`,
    }),
};

const contextLog = (msg, data) => console.log(
    `[${(new Date()).toISOString()}] ${msg}`,
    util.inspect(data, { depth: Infinity }),
);

/**
 * Create a WSO2 application, otherwise known as a service provider.
 *
 * The created application will be configured to use OAuth2 inbound authentication as per the steps
 * here: https://github.com/modusintegration/finance-portal-settlements/tree/8d489300b0f31031059f538c5b486fc90b57ccf7#run-services.
 * Note that this function should make that documentation redundant, therefore it will likely be
 * removed.
 *
 * @func createApplication
 */
const createApplication = async ({
    applicationName,
    clientKey,
    clientSecret,
    hostname = 'https://localhost',
    port = 9443,
    username = 'admin',
    password = 'admin',
}) => {
    contextLog('Creating WSO2 application with configuration:', {
        applicationName,
        clientKey,
        clientSecret,
        hostname,
        port,
        username,
        password,
    });

    const a = axios.create({
        headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            // WSO2 _really_ doesn't like axios' default 'application/json' accept header.
            // Specifically, it seems like the handler crashes, and it returns a 500. Although,
            // it does behave differently with different applications. Whatever.
            Accept: 'application/xml',
        },
        auth: {
            username,
            password,
        },
        baseURL: `${hostname}:${port}/services/IdentityApplicationManagementService`,
        httpsAgent: new https.Agent({
            rejectUnauthorized: false,
        }),
        method: 'post',
    });



    // Create the application

    const createApplicationRequest = requestBuilders.createApplication({ applicationName });
    try {
        const { status, data } = await a(createApplicationRequest);
        contextLog('Created application', {
            request: createApplicationRequest,
            response: {
                status,
                data,
            },
        });
    } catch (err) {
        // We don't care if the application already exists, we'll just reconfigure it. If it's some
        // other error, we deserved to die anyway.
        if (!err?.response?.data.includes('Already an application available with the same name')) {
            throw err;
        }
        const { status, data } = err.response;
        contextLog('Error response from server: application already existed. Will overwrite configuration.', {
            request: createApplicationRequest,
            response: {
                status,
                data,
            },
        });
    }



    // Get the application- we only need to do this because we need the application ID
    //
    // According to the WSO2 documentation:
    //
    //   Creating an application via Identity Application Management Service is a two-step process.
    //       1. Create a service provider for the given application name and the description using
    //          the createApplication operation. It returns a 200 OK response.
    //
    //          Note: The service provider's application ID is required to use the updateApplication
    //          operation. You can retrieve the auto-generated application ID value by calling the
    //          getApplication service method with the application name.
    //
    //       2. Update the service provider with other configurations using the updateApplication
    //          operation. The service provider's application ID is required for this request.

    const getApplicationRequest = requestBuilders.getApplication({ applicationName });
    const getResponse = await a(getApplicationRequest);

    const applicationId = (() => {
        const r = /<[^:/]*:applicationID>([0-9]+)<\/[^:]*:applicationID>/g;

        const matches = [...getResponse.data.matchAll(r)];
        // Expect to find only one XML tag matching something like
        // <ax1234:applicationID>777</ax1234:applicationID>
        assert.equal(matches.length, 1, 'Expected only a single match for applicationID');
        // Expect to match only one group
        assert.equal(matches[0].length, 2, 'Expected only a single group match for applicationID');
        return matches[0][1];
    })();

    contextLog('Got application', {
        request: getApplicationRequest,
        response: {
            status: getResponse.status,
            data: getResponse.data,
        },
        applicationId,
    });



    // Update the existing application to have the config we want

    const updateApplicationRequest = requestBuilders.updateApplication({
        applicationId,
        applicationName,
        clientKey,
        clientSecret,
    });
    const updateResponse = await a(updateApplicationRequest);
    contextLog('Updated application', {
        request: updateApplicationRequest,
        response: {
            status: updateResponse.status,
            data: updateResponse.data,
        },
    });
};

module.exports = {
    createApplication,
};
