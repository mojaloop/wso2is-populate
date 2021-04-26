const assert = require('assert').strict;
const got = require('got');

const contextLog = require('./contextLog');

// Note: although it is sometimes possible, it is not in general possible to use the header
//   Accept: application/json
// when making calls to WSO2 IS IdentityApplicationManagementService. It has the habit of crashing
// the handler and returning an HTML error page. (Yes, really, boy it's a great piece of software).
// Or it'll tell you
//   Transport level information does not match with SOAP Message namespace URI
// Which really means:
//   I can't *tell* you that I only some of my methods return json, but only some of my methods
//   return json. Why? WHY?!
//     <?xml version='1.337' encoding='UTF-8'?>
//     <soapenv:Envelope xmlns:soapenv="https://foaas.com/because/wso2">
//         <soapenv:Body>
//             <soapenv:Fault>
//                 <faultcode>
//                     soapenv:Server
//                 </faultcode>
//                 <faultstring>
//                     That's why
//                 </faultstring>
//             </soapenv:Fault>
//         </soapenv:Body>
//     </soapenv:Envelope>
//
// In fact, it'll have a handler crash and return an HTML 500 if you look at it funny. It *is*
// weak, but don't feel bad. Be a software darwinist and stop using it. Only the strong survive.
//
// Upstream docs:
// https://docs.wso2.com/display/IS570/Using+the+Service+Provider+API

const validateToken = async ({
    token,
    host = 'https://localhost:9443',
}) => {
    const opts = {
        method: 'POST',
        body: `token=${token}`,
        https: {
            rejectUnauthorized: false,
        },
        responseType: 'json',
        url: `${host}/oauth2/introspect`,
    };
    contextLog('Trying to validate token', opts);

    try {
        return await got(opts).then(resp => resp.body);
    } catch (err) {
        if (err.response) {
            throw new Error(`Error response from server ${err.response.statusCode} ${JSON.stringify(err.response.body, null, 2)}`);
        }
        throw err;
    }
};

const getUserInfo = async ({
    token,
    host = 'https://localhost:9443',
}) => {
    const opts = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        https: {
            rejectUnauthorized: false,
        },
        responseType: 'json',
        url: `${host}/oauth2/userinfo`,
    };
    contextLog('Trying to get user info', opts);

    try {
        return await got(opts).then(resp => resp.body);
    } catch (err) {
        if (err.response) {
            throw new Error(`Error response from server ${err.response.statusCode} ${JSON.stringify(err.response.body, null, 2)}`);
        }
        throw err;
    }
};

const getToken = async ({
    clientKey: client_id,
    clientSecret: client_secret,
    host = 'https://localhost:9443',
    username,
    password,
}) => {
    const opts = {
        https: {
            rejectUnauthorized: false,
        },
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        responseType: 'json',
        searchParams: {
            client_id,
            client_secret,
            grant_type: 'password',
            scope: 'openid',
            username,
            password,
        },
        url: `${host}/oauth2/token`,
    };
    contextLog('Trying to get a token', opts);

    return await got(opts).then(resp => resp.body);
};

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
    name,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    assert.ok(name, 'name parameter is required');

    const createApplicationRequest = {
        https: {
            rejectUnauthorized: false,
        },
        username,
        password,
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:createApplication',
            'Content-Type': 'application/soap+xml;charset=UTF-8',
        },
        url: `${host}/services/IdentityApplicationManagementService`,
        body: `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://model.common.application.identity.carbon.wso2.org/xsd">
               <soap:Header/>
               <soap:Body>
                  <xsd:createApplication>
                  <xsd:serviceProvider>
                        <xsd1:applicationName>${name}</xsd1:applicationName>
                     </xsd:serviceProvider>
                  </xsd:createApplication>
               </soap:Body>
            </soap:Envelope>`,
    };
    const { status, data } = await got(createApplicationRequest);
    contextLog('Created application', {
        request: createApplicationRequest,
        response: {
            status,
            data,
        },
    });
};

const getApplication = async ({
    name,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    const getApplicationRequest = {
        https: {
            rejectUnauthorized: false,
        },
        username,
        password,
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:getApplication',
            'Content-Type': 'application/soap+xml;charset=UTF-8',
        },
        url: `${host}/services/IdentityApplicationManagementService.IdentityApplicationManagementServiceHttpsSoap12Endpoint`,
        body: `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://org.apache.axis2/xsd">
               <soap:Header/>
               <soap:Body>
                  <xsd:getApplication>
                     <!--Optional:-->
                     <xsd:applicationName>${name}</xsd:applicationName>
                  </xsd:getApplication>
               </soap:Body>
            </soap:Envelope>`,
    };
    const getApplicationResponse = await got(getApplicationRequest);
    contextLog('Got application', {
        request: getApplicationRequest,
        response: {
            status: getApplicationResponse.status,
            body: getApplicationResponse.body,
        },
    });
    // We should either just use regex, or use a SOAP lib here. At one point in the development of
    // this code, an xml parser was used, only to use regex anyway, because SOAP fills our tags
    // with crap. The official motto of SOAP is, after all:
    //
    // > yo dawg, I heard you like metadata, so I put some metadata in your metadata so you can
    // > suffer while you suffer.
    const { id } = /applicationID\>(?<id>[0-9]+)\<\//.exec(getApplicationResponse.body).groups;
    return { id };
};

/**
 * Create WSO2 users that will consume an OAuth2 application/service provider, typically created
 * with createOAuth2ServiceProvider above.
 *
 * The created users will be configured to use OAuth2 inbound authentication as per the steps here:
 * https://github.com/modusintegration/finance-portal-settlements/tree/8d489300b0f31031059f538c5b486fc90b57ccf7#run-services.
 * Note that this function should make that documentation redundant, therefore it will likely be
 * removed.
 *
 * @func createOAuth2Users
 */
const createOAuth2Users = async ({
    users,
    oauth2ApplicationName,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    assert(Array.isArray(users), 'users is a required parameter, and must be an array');
    assert.ok(oauth2ApplicationName, 'oauth2ApplicationName is a required parameter');

    contextLog('Creating WSO2 users with configuration:', {
        users,
        host,
        username,
        password,
    });

    return Promise.all(users.map(async user => {
        // dedupe roles
        const roleList = [...(new Set([`Application/${oauth2ApplicationName}`, ...user.roles]))]
            .map(role => `<ser:roleList>${role}</ser:roleList>`)
            .join('');

        const createUserRequest = {
            https: {
                rejectUnauthorized: false,
            },
            responseType: 'json',
            username,
            password,
            method: 'post',
            headers: {
                Accept: 'application/json',
                SOAPAction: 'urn:addUser',
                'Content-Type': 'text/xml',
            },
            url: `${host}/services/RemoteUserStoreManagerService`,
            body:
                `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.ws.um.carbon.wso2.org" xmlns:xsd="http://common.mgt.user.carbon.wso2.org/xsd">
                    <soapenv:Header/>
                    <soapenv:Body>
                        <ser:addUser>
                            <ser:userName>${user.username}</ser:userName>
                            <ser:credential>${user.password}</ser:credential>
                            ${roleList}
                            <ser:profileName>default</ser:profileName>
                            <ser:requirePasswordChange>false</ser:requirePasswordChange>
                        </ser:addUser>
                    </soapenv:Body>
                </soapenv:Envelope>`,
        };
        try {
            const response = await got(createUserRequest);
            contextLog('Created user', {
                request: createUserRequest,
                response: {
                    statusCode: response.statusCode,
                    body: response.body,
                },
            });
        } catch (err) {
            if (err?.response?.body?.Fault?.faultstring !== 'UserAlreadyExisting:Username already exists in the system. Please pick another username.') {
                throw err;
            }
            const { status, data } = err.response;
            // TODO: delete all users before recreating them
            contextLog('WARNING: user already existed, no checks are performed for correct configuration. Handled the following error response:', {
                status,
                data,
            });
        }
    }))
};

// https://github.com/wso2/docs-is/blob/1a3e53ddb68fb7ee37eee5bac9c27b14b367c059/en/docs/learn/configuring-a-sp-and-idp-using-service-calls.md
const registerOAuthApplication = async ({
    name,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
    clientKey,
    clientSecret,
}) => {
    const registerApplicationRequest = {
        https: {
            rejectUnauthorized: false,
        },
        username,
        password,
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:registerOAuthApplication',
            'Content-Type': 'application/soap+xml;charset=UTF-8',
        },
        url: `${host}/services/OAuthAdminService`,
        body: `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://dto.oauth.identity.carbon.wso2.org/xsd">
               <soap:Header/>
               <soap:Body>
                  <xsd:registerOAuthApplicationData>
                     <!--Optional:-->
                     <xsd:application>
                        <!--Optional:-->
                        <xsd1:OAuthVersion>OAuth-2.0</xsd1:OAuthVersion>
                        <!--Optional:-->
                        <xsd1:applicationName>${name}</xsd1:applicationName>
                        <!--Optional:-->
                        <xsd1:callbackUrl>${host}/${name}/oauth2client</xsd1:callbackUrl>
                        <!--Optional:-->
                        <xsd1:grantTypes>password</xsd1:grantTypes>
                        <xsd1:oauthConsumerKey>${clientKey}</xsd1:oauthConsumerKey>
                        <xsd1:oauthConsumerSecret>${clientSecret}</xsd1:oauthConsumerSecret>
                        <xsd1:tokenType>JWT</xsd1:tokenType>
                     </xsd:application>
                  </xsd:registerOAuthApplicationData>
               </soap:Body>
            </soap:Envelope>`
    };
    const response = await got(registerApplicationRequest);
    contextLog('Registered OAuth application', {
        request: registerApplicationRequest,
        response: {
            statusCode: response.statusCode,
            body: response.body,
        },
    });
};

const updateApplication = async ({
    id,
    // We shouldn't _require_ this, according to the WSO2 docs. But the request fails without the
    // application name. We could make a "get application" request in this function but we expect
    // the caller will have the name in their namespace anyway, and exposing it in the function
    // parameters means it is possible to change the application name if so desired.
    name,
    // Similarly, we don't need to update the client key and secret, but if we don't supply them,
    // they will be cleared, and the caller is likely to have them on-hand anyway.
    clientKey,
    clientSecret,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    const updateApplicationRequest = {
        https: {
            rejectUnauthorized: false,
        },
        username,
        password,
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:updateApplication',
            'Content-Type': 'application/soap+xml;charset=UTF-8',
        },
        // headers: {
        //     Accept: '*/*',
        //     SOAPAction: 'urn:updateApplication',
        //     // Note: this is not application/soap+xml. Apparently WSO2 uses different SOAP
        //     // implementations for different endpoints.
        //     'Content-Type': 'text+xml;charset=UTF-8',
        //     // 'Content-Type': 'application/soap+xml;charset=UTF-8;action="urn:updateApplication"',
        // },
        url: `${host}/services/IdentityApplicationManagementService`,
        body: `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://model.common.application.identity.carbon.wso2.org/xsd">
               <soap:Header/>
               <soap:Body>
                  <xsd:updateApplication>
                     <!--Optional:-->
                     <xsd:serviceProvider>
                        <!--Optional:-->
                        <xsd1:applicationID>${id}</xsd1:applicationID>
                        <xsd1:applicationName>${name}</xsd1:applicationName>
                        <xsd1:claimConfig>
                           <!--Optional:-->
                           <xsd1:alwaysSendMappedLocalSubjectId>false</xsd1:alwaysSendMappedLocalSubjectId>
                           <!--Zero or more repetitions:-->
                           <xsd1:claimMappings>
                              <!--Optional:-->
                              <xsd1:localClaim>
                                 <!--Optional:-->
                                 <xsd1:claimUri>http://wso2.org/claims/role</xsd1:claimUri>
                              </xsd1:localClaim>
                              <!--Optional:-->
                              <xsd1:mandatory>true</xsd1:mandatory>
                              <!--Optional:-->
                              <xsd1:remoteClaim>
                                 <!--Optional:-->
                                 <xsd1:claimUri>role</xsd1:claimUri>
                              </xsd1:remoteClaim>
                              <!--Optional:-->
                              <xsd1:requested>true</xsd1:requested>
                           </xsd1:claimMappings>
                           <!--Optional:-->
                           <xsd1:localClaimDialect>false</xsd1:localClaimDialect>
                           <!--Optional:-->
                           <xsd1:roleClaimURI>role</xsd1:roleClaimURI>
                           <!--Optional:-->
                           <xsd1:userClaimURI>user</xsd1:userClaimURI>
                        </xsd1:claimConfig>
                        <xsd1:description>portal oauth application</xsd1:description>
                        <xsd1:inboundAuthenticationConfig>
                           <xsd1:inboundAuthenticationRequestConfigs>
                              <xsd1:inboundAuthKey>${clientKey}</xsd1:inboundAuthKey>
                              <xsd1:inboundAuthType>oauth2</xsd1:inboundAuthType>
                              <xsd1:properties>
                                 <xsd1:confidential>false</xsd1:confidential>
                                 <xsd1:defaultValue xsd:nil="true"/>
                                 <xsd1:description xsd:nil="true"/>
                                 <xsd1:displayName xsd:nil="true"/>
                                 <xsd1:name>oauthConsumerSecret</xsd1:name>
                                 <xsd1:required>false</xsd1:required>
                                 <xsd1:type xsd:nil="true"/>
                                 <xsd1:value>${clientSecret}</xsd1:value>
                              </xsd1:properties>
                           </xsd1:inboundAuthenticationRequestConfigs>
                        </xsd1:inboundAuthenticationConfig>
                        <xsd1:inboundProvisioningConfig>
                           <xsd1:provisioningEnabled>false</xsd1:provisioningEnabled>
                           <xsd1:provisioningUserStore>PRIMARY</xsd1:provisioningUserStore>
                        </xsd1:inboundProvisioningConfig>
                         <xsd1:localAndOutBoundAuthenticationConfig> <xsd1:alwaysSendBackAuthenticatedListOfIdPs>false</xsd1:alwaysSendBackAuthenticatedListOfIdPs>
                           <xsd1:authenticationStepForAttributes xsd:nil="true"/>
                           <xsd1:authenticationStepForSubject xsd:nil="true"/>
                           <xsd1:authenticationType>default</xsd1:authenticationType>
                           <xsd1:subjectClaimUri xsd:nil="true">http://wso2.org/claims/role</xsd1:subjectClaimUri>
                           <xsd1:subjectClaimUri xsd:nil="true">http://wso2.org/claims/group</xsd1:subjectClaimUri>
                        </xsd1:localAndOutBoundAuthenticationConfig>
                        <xsd1:outboundProvisioningConfig>
                           <xsd1:provisionByRoleList xsd:nil="true"/>
                        </xsd1:outboundProvisioningConfig>
                        <xsd1:permissionAndRoleConfig/>
                        <xsd1:saasApp>false</xsd1:saasApp>
                     </xsd:serviceProvider>
                  </xsd:updateApplication>
               </soap:Body>
            </soap:Envelope>`
    };
    const response = await got(updateApplicationRequest);
    contextLog('Updated OAuth application', {
        request: updateApplicationRequest,
        response: {
            statusCode: response.statusCode,
            body: response.body,
        },
    });
};

const deleteApplication = async ({
    name,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    const deleteApplicationRequest = {
        https: {
            rejectUnauthorized: false,
        },
        username,
        password,
        retry: 0,
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:deleteApplication',
            'Content-Type': 'text/xml',
        },
        url: `${host}/services/IdentityApplicationManagementService`,
        body: `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://org.apache.axis2/xsd">
   <soapenv:Header/>
   <soapenv:Body>
      <xsd:deleteApplication>
         <!--Optional:-->
         <xsd:applicationName>${name}</xsd:applicationName>
      </xsd:deleteApplication>
   </soapenv:Body>
</soapenv:Envelope>`
    };
    try {
        const response = await got(deleteApplicationRequest);
        contextLog('Deleted application', {
            request: deleteApplicationRequest,
            response: {
                statusCode: response.statusCode,
                body: response.body,
            },
        });
    } catch (err) {
        // What WSO2 actually means by 'User not authorized' is that the application doesn't exist.
        // We'll re-throw if this was not the error.
        // It's possible that WSO2 might return this error if it's called with a non-admin user
        // with insufficient privileges. This possibility was entirely out of scope of this module.
        // If this is a problem you, the reader, have, the author's recommendation for
        // circumventing this potential issue is to use any software that isn't WSO2. It's said
        // that below 1000 users, and above 999 users a telephone for authentication is more
        // cost-effective than WSO2.
        if (!/\>User not authorized\</.test(err?.response?.body)) { // NB: /whatever/.test(undefined) returns false
            throw err;
        }
        const { statusCode, body } = err.response;
        contextLog('Application did not exist. This error is printed here, but ignored by the application.', {
            request: deleteApplicationRequest,
            response: {
                statusCode,
                body,
            },
        });
    }
};

module.exports = {
    createOAuth2Users,
    createApplication,
    updateApplication,
    getApplication,
    registerOAuthApplication,
    deleteApplication,
    // These are conveniences for development. There are no tests for them.
    untested: {
        getUserInfo,
        getToken,
        validateToken,
    }
};
