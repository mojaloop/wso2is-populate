const assert = require('assert').strict;
const got = require('got');
const parser = require('fast-xml-parser');

const contextLog = require('./contextLog');

// Note: although it is sometimes possible, it is not in general possible to use the header
//   Accept: application/json
// when making calls to WSO2 IS IdentityApplicationManagementService. It has the habit of crashing
// the handler and returning an HTML error page. (Yes, really, boy it's a great piece of software).

const getToken = async ({
    clientKey: client_id,
    clientSecret: client_secret,
    host = 'https://localhost:9443',
    username,
    password,
}) => {
    const opts = {
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

    return got(opts);
};

const createApplication = async ({
    name,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    const createApplicationRequest = {
        auth: {
            username,
            password,
        },
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:createApplication',
            'Content-Type': 'application/soap+xml;charset=UTF-8',
        },
        url: `${host}/services/IdentityApplicationManagementService`,
        data: `
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
        auth: {
            username,
            password,
        },
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:getApplication',
            'Content-Type': 'application/soap+xml;charset=UTF-8',
        },
        url: `${host}/services/IdentityApplicationManagementService.IdentityApplicationManagementServiceHttpsSoap12Endpoint`,
        data: `
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
            data: getApplicationResponse.data,
        },
    });
    // TODO: we should either just use regex, or use a SOAP lib here. In this case, we end up using
    // an xml parser only to use regex anyway, because SOAP fills our tags with crap. Yo dawg, I
    // heard you like metadata, so I put some metadata in your metadata so you can suffer while you
    // suffer.
    const responseData = parser.parse(getApplicationResponse.data);
    contextLog('Response data', responseData);
    const responseContent = responseData['soapenv:Envelope']['soapenv:Body']['ns:getApplicationResponse']['ns:return'];
    const [,id] = Object.entries(responseContent).find(([k,]) => /^[a-z0-9]{6}:applicationID$/.test(k));
    return { id };
};

const updateApplication = async ({
    id,
    // We shouldn't _require_ this, according to the WSO2 docs. But the request fails without the
    // application name. We could make a "get application" request in this function but we expect
    // the caller will have the name in their namespace anyway, and exposing it in the function
    // parameters means it is possible to change the application name if so desired.
    name,
    // Similarly, we don't need to update the client key and secret, but the caller is likely to
    // have them on-hand anyway.
    clientKey,
    clientSecret,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    // From the "For OAuth" example here:
    // https://docs.wso2.com/display/IS570/Using+the+Service+Provider+API#UsingtheServiceProviderAPI-updateApplication
    const updateApplicationRequest = {
        auth: {
            username,
            password,
        },
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:updateApplication',
            // Note: this is not application/soap+xml. Apparently WSO2 uses different SOAP
            // implementations for different endpoints.
            'Content-Type': 'text+xml;charset=UTF-8',
            // 'Content-Type': 'application/soap+xml;charset=UTF-8;action="urn:updateApplication"',
        },
        url: `${host}/services/IdentityApplicationManagementService.IdentityApplicationManagementServiceHttpsSoap12Endpoint`,

        data: `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://model.common.application.identity.carbon.wso2.org/xsd">
   <soapenv:Header/>
   <soapenv:Body>
      <xsd:updateApplication>
         <!--Optional:-->
         <xsd:serviceProvider>
            <!--Optional:-->
            <xsd1:applicationID>${id}</xsd1:applicationID>
            <!--NOT Optional:-->
            <xsd1:applicationName>${name}</xsd1:applicationName>
            <!--Optional:-->
            <xsd1:inboundAuthenticationConfig>
               <xsd1:inboundAuthenticationRequestConfigs>
                  <xsd1:friendlyName/>
                  <xsd1:inboundAuthKey>${clientKey}</xsd1:inboundAuthKey>
                  <xsd1:inboundAuthType>oauth2</xsd1:inboundAuthType>
                  <xsd1:inboundConfigType>standardAPP</xsd1:inboundConfigType>
                  <xsd1:inboundConfiguration/>
                  <xsd1:properties>
                     <xsd1:advanced>false</xsd1:advanced>
                     <xsd1:confidential>false</xsd1:confidential>
                     <xsd1:defaultValue/>
                     <xsd1:description/>
                     <xsd1:displayName/>
                     <xsd1:displayOrder>0</xsd1:displayOrder>
                     <xsd1:name>oauthConsumerSecret</xsd1:name>
                     <xsd1:required>false</xsd1:required>
                     <xsd1:type/>
                     <xsd1:value>${clientSecret}</xsd1:value>
                  </xsd1:properties>
               </xsd1:inboundAuthenticationRequestConfigs>
            </xsd1:inboundAuthenticationConfig>
            <xsd1:claimConfig>
               <!--Optional:-->
               <xsd1:alwaysSendMappedLocalSubjectId>false</xsd1:alwaysSendMappedLocalSubjectId>
               <!--Optional:-->
               <xsd1:localClaimDialect>true</xsd1:localClaimDialect>
            </xsd1:claimConfig>
            <!--Optional:-->
            <xsd1:description>oauth application</xsd1:description>
            <!--Optional:-->
            <xsd1:localAndOutBoundAuthenticationConfig>
               <!--Optional:-->
               <xsd1:subjectClaimUri>http://wso2.org/claims/role</xsd1:subjectClaimUri>
            </xsd1:localAndOutBoundAuthenticationConfig>
         </xsd:serviceProvider>
      </xsd:updateApplication>
   </soapenv:Body>
</soapenv:Envelope>`,

        // WORKS
//         data: `
// <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://model.common.application.identity.carbon.wso2.org/xsd">
//    <soapenv:Header/>
//    <soapenv:Body>
//       <xsd:updateApplication>
//          <!--Optional:-->
//          <xsd:serviceProvider>
//             <!--Optional:-->
//             <xsd1:applicationID>${id}</xsd1:applicationID>
//             <!--Optional:-->
//             <xsd1:applicationName>portaloauthprovider</xsd1:applicationName>
//             <!--Optional:-->
//             <xsd1:claimConfig>
//                <!--Optional:-->
//                <xsd1:alwaysSendMappedLocalSubjectId>false</xsd1:alwaysSendMappedLocalSubjectId>
//                <!--Optional:-->
//                <xsd1:localClaimDialect>true</xsd1:localClaimDialect>
//             </xsd1:claimConfig>
//             <!--Optional:-->
//             <xsd1:description>oauth application</xsd1:description>
//             <!--Optional:-->
//             <xsd1:inboundAuthenticationConfig>
//                <!--Zero or more repetitions:-->
//                <xsd1:inboundAuthenticationRequestConfigs>
//                   <!--Optional:-->
//                   <xsd1:inboundAuthKey>CLIENT_ID</xsd1:inboundAuthKey>
//                   <!--Optional:-->
//                   <xsd1:inboundAuthType>oauth2</xsd1:inboundAuthType>
//                   <!--Zero or more repetitions:-->
//                   <xsd1:properties>
//                      <!--Optional:-->
//                      <xsd1:advanced>false</xsd1:advanced>
//                      <!--Optional:-->
//                      <xsd1:confidential>false</xsd1:confidential>
//                      <!--Optional:-->
//                      <xsd1:defaultValue></xsd1:defaultValue>
//                      <!--Optional:-->
//                      <xsd1:description></xsd1:description>
//                      <!--Optional:-->
//                      <xsd1:displayName></xsd1:displayName>
//                      <!--Optional:-->
//                      <xsd1:name>oauthConsumerSecret</xsd1:name>
//                      <!--Optional:-->
//                      <xsd1:required>false</xsd1:required>
//                      <!--Optional:-->
//                      <xsd1:type></xsd1:type>
//                      <!--Optional:-->
//                      <xsd1:value>CLIENT_SECRET</xsd1:value>
//                   </xsd1:properties>
//                </xsd1:inboundAuthenticationRequestConfigs>
//             </xsd1:inboundAuthenticationConfig>
//             <!--Optional:-->
//             <xsd1:inboundProvisioningConfig>
//                <!--Optional:-->
//                <xsd1:provisioningEnabled>false</xsd1:provisioningEnabled>
//                <!--Optional:-->
//                <xsd1:provisioningUserStore>PRIMARY</xsd1:provisioningUserStore>
//             </xsd1:inboundProvisioningConfig>
//             <!--Optional:-->
//             <xsd1:localAndOutBoundAuthenticationConfig>
//                <!--Optional:-->
//                <xsd1:alwaysSendBackAuthenticatedListOfIdPs>false</xsd1:alwaysSendBackAuthenticatedListOfIdPs>
//                <!--Optional:-->
//                <xsd1:authenticationStepForAttributes></xsd1:authenticationStepForAttributes>
//                <!--Optional:-->
//                <xsd1:authenticationStepForSubject></xsd1:authenticationStepForSubject>
//                <xsd1:authenticationType>default</xsd1:authenticationType>
//                <!--Optional:-->
//                <xsd1:subjectClaimUri>http://wso2.org/claims/fullname</xsd1:subjectClaimUri>
//             </xsd1:localAndOutBoundAuthenticationConfig>
//             <!--Optional:-->
//             <xsd1:outboundProvisioningConfig>
//                <!--Zero or more repetitions:-->
//                <xsd1:provisionByRoleList></xsd1:provisionByRoleList>
//             </xsd1:outboundProvisioningConfig>
//             <!--Optional:-->
//             <xsd1:permissionAndRoleConfig></xsd1:permissionAndRoleConfig>
//             <!--Optional:-->
//             <xsd1:saasApp>false</xsd1:saasApp>
//          </xsd:serviceProvider>
//       </xsd:updateApplication>
//    </soapenv:Body>
// </soapenv:Envelope>`,

//         data: `
// <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://model.common.application.identity.carbon.wso2.org/xsd" xmlns:xsd2="http://script.model.common.application.identity.carbon.wso2.org/xsd">
//    <soap:Header/>
//    <soap:Body>
//       <xsd:updateApplication>
//          <xsd:serviceProvider>
//             <xsd1:applicationID>${id}</xsd1:applicationID>
//             <xsd1:claimConfig>
//                <xsd1:alwaysSendMappedLocalSubjectId>false</xsd1:alwaysSendMappedLocalSubjectId>
//                <!--Optional:-->
//                <xsd1:localClaimDialect>true</xsd1:localClaimDialect>
//                <!--Optional:-->
//                <xsd1:roleClaimURI>role</xsd1:roleClaimURI>
//                <!--Optional:-->
//                <xsd1:userClaimURI>user</xsd1:userClaimURI>
//                <xsd1:subjectClaimUri>http://wso2.org/claims/username</xsd1:subjectClaimUri>
//             </xsd1:claimConfig>
//          </xsd:serviceProvider>
//       </xsd:updateApplication>
//    </soap:Body>
// </soap:Envelope>`

        // data: `
        //    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        //    xmlns:xsd="http://org.apache.axis2/xsd"
        //    xmlns:xsd1="http://model.common.application.identity.carbon.wso2.org/xsd">
        //        <soap:Header/>
        //        <soap:Body>
        //           <xsd:updateApplication>
        //              <!--Optional:-->
        //              <xsd:serviceProvider>
        //                 <!--Optional:-->
        //                 <xsd1:applicationID>${id}</xsd1:applicationID>
        //                 <!--Optional:-->
        //                 <xsd1:claimConfig>
        //                    <!--Optional:-->
        //                    <xsd1:alwaysSendMappedLocalSubjectId>false</xsd1:alwaysSendMappedLocalSubjectId>
        //                    <!--Optional:-->
        //                    <xsd1:localClaimDialect>true</xsd1:localClaimDialect>
        //                 </xsd1:claimConfig>
        //                 <!--Optional:-->
        //                 <xsd1:inboundProvisioningConfig>
        //                    <!--Optional:-->
        //                    <xsd1:provisioningEnabled>false</xsd1:provisioningEnabled>
        //                    <!--Optional:-->
        //                    <xsd1:provisioningUserStore>PRIMARY</xsd1:provisioningUserStore>
        //                 </xsd1:inboundProvisioningConfig>
        //              </xsd:serviceProvider>
        //           </xsd:updateApplication>
        //        </soap:Body>
        //     </soapenv:Envelope>`,

    };
    try {
        const updateApplicationResponse = await got(updateApplicationRequest);
        contextLog('Updated application', {
            request: updateApplicationRequest,
            response: {
                status: updateApplicationResponse.status,
                data: updateApplicationResponse.data,
            },
        });
    } catch (err) {
        if (err?.response?.data?.Fault?.faultstring !== 'UserAlreadyExisting:Username already exists in the system. Please pick another username.') {
            throw err;
        }
        const { status, data } = err.response;
        contextLog('WARNING: user already existed, no checks are performed for correct configuration. Handled the following error response:', {
            status,
            data,
        });
    }
};

/**
 * Create a WSO2 application, otherwise known as a service provider.
 *
 * The created application will be configured to use OAuth2 inbound authentication as per the steps
 * here: https://github.com/modusintegration/finance-portal-settlements/tree/8d489300b0f31031059f538c5b486fc90b57ccf7#run-services.
 * Note that this function should make that documentation redundant, therefore it will likely be
 * removed.
 *
 * @func createOAuth2Application
 */
const createOAuth2Application = async ({
    name: client_name,
    clientKey: ext_param_client_id,
    clientSecret: ext_param_client_secret,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    assert(client_name, 'name parameter is required');
    assert(ext_param_client_secret, 'clientSecret parameter is required');
    assert.match(ext_param_client_id, /^[a-zA-Z0-9_]{15,30}$/, 'clientKey invalid');

    contextLog('Creating WSO2 application with configuration:', {
        client_name,
        ext_param_client_id,
        ext_param_client_secret,
        host,
        username,
        password,
    });

    try {
        // https://docs.wso2.com/display/IS570/apidocs/OAuth2-dynamic-client-registration/#!/operations#OAuth2DCR#registerApplication
        const { status, data } = await got({
            method: 'post',
            url: `${host}/api/identity/oauth2/dcr/v1.1/register`,
            auth: {
                username,
                password,
            },
            data: {
                ext_param_client_id,
                ext_param_client_secret,
                client_name,
                grant_types: ['password'],
            },
        });
        contextLog('Created application', { status, data });
    } catch (err) {
        if (err?.response?.data?.error_description !== 'Application with the name mfpserviceprovider already exist in the system') {
            throw err;
        }
        const { status, data } = err.response;
        contextLog('WARNING: Application already existed, no checks are performed for correct configuration. Handled the following error response:', {
            status,
            data,
        });
    }
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
            auth: {
                username,
                password,
            },
            method: 'post',
            headers: {
                Accept: 'application/json',
                SOAPAction: 'urn:addUser',
                'Content-Type': 'text/xml',
            },
            url: `${host}/services/RemoteUserStoreManagerService`,
            data:
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
            const createUserResponse = await got(createUserRequest);
            contextLog('Created user', {
                request: createUserRequest,
                response: {
                    status: createUserResponse.status,
                    data: createUserResponse.data,
                },
            });
        } catch (err) {
            if (err?.response?.data?.Fault?.faultstring !== 'UserAlreadyExisting:Username already exists in the system. Please pick another username.') {
                throw err;
            }
            const { status, data } = err.response;
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
        auth: {
            username,
            password,
        },
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:registerOAuthApplication',
            'Content-Type': 'application/soap+xml;charset=UTF-8',
        },
        url: `${host}/services/OAuthAdminService`,
        data: `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://org.apache.axis2/xsd" xmlns:xsd1="http://dto.oauth.identity.carbon.wso2.org/xsd">
               <soap:Header/>
               <soap:Body>
                  <xsd:registerOAuthApplicationData>
                     <!--Optional:-->
                     <xsd:application>
                        <!--Optional:-->
                        <xsd1:OAuthVersion>2.0</xsd1:OAuthVersion>
                        <!--Optional:-->
                        <xsd1:applicationName>${name}</xsd1:applicationName>
                        <!--Optional:-->
                        <xsd1:callbackUrl>${host}/${name}/oauth2client</xsd1:callbackUrl>
                        <!--Optional:-->
                        <xsd1:grantTypes>password</xsd1:grantTypes>
                        <xsd1:oauthConsumerKey>${clientKey}</xsd1:oauthConsumerKey>
                        <xsd1:oauthConsumerSecret>${clientSecret}</xsd1:oauthConsumerSecret>
                     </xsd:application>
                  </xsd:registerOAuthApplicationData>
               </soap:Body>
            </soap:Envelope>`
    };
    const { status, data } = await got(registerApplicationRequest);
    contextLog('Registered OAuth application', {
        request: registerApplicationRequest,
        response: {
            status,
            data,
        },
    });
};

const getOAuthApplication = async ({
    name,
    host = 'https://localhost:9443',
    username = 'admin',
    password = 'admin',
}) => {
    const getApplicationRequest = {
        auth: {
            username,
            password,
        },
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:getOAuthApplicationDataByAppName',
            'Content-Type': 'application/soap+xml;charset=UTF-8',
        },
        url: `${host}/services/OAuthAdminService`,
        data: `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://org.apache.axis2/xsd">
              <soap:Header/>
              <soap:Body>
                 <xsd:getOAuthApplicationDataByAppName>
                    <!--Optional:-->
                    <xsd:appName>${name}</xsd:appName>
                 </xsd:getOAuthApplicationDataByAppName>
              </soap:Body>
            </soap:Envelope>`
    };
    const { status, data } = await got(getApplicationRequest);
    contextLog('Registered OAuth application', {
        request: getApplicationRequest,
        response: {
            status,
            data,
        },
    });
    // const RE_DATE = /(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})/;
    // const reId = /(?<id>\<)
    //
    // const matchObj = RE_DATE.exec('1999-12-31');
    // const year = matchObj.groups.year; // 1999
    // const month = matchObj.groups.month; // 12
    // const day = matchObj.groups.day; // 31
    //
    // console.log(year,month,day);
    // const id = 
};

const updateOAuthApplication = async ({
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
        auth: {
            username,
            password,
        },
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
        data: `
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
                           <xsd1:alwaysSendMappedLocalSubjectId>false</xsd1:alwaysSendMappedLocalSubjectId>
                        </xsd1:claimConfig>
                        <xsd1:description>oauth application</xsd1:description>
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
    const { status, data } = await got(updateApplicationRequest);
    contextLog('Updated OAuth application', {
        request: updateApplicationRequest,
        response: {
            status,
            data,
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
        auth: {
            username,
            password,
        },
        method: 'post',
        headers: {
            Accept: '*/*',
            SOAPAction: 'urn:deleteApplication',
            'Content-Type': 'text/xml',
            // 'Content-Type': 'application/soap+xml;charset=UTF-8',
        },
        url: `${host}/services/IdentityApplicationManagementService`,
        data: `
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
        const { status, data } = await got(deleteApplicationRequest);
        contextLog('Deleted application', {
            request: deleteApplicationRequest,
            response: {
                status,
                data,
            },
        });
    } catch (err) {
        // What WSO2 actually means by 'User not authorized' is that the application doesn't exist.
        // We'll re-throw if this was not the error.
        // It's possible that WSO2 might return this error if it's called with a non-admin user
        // with insufficient privileges. This possibility was entirely out of scope of this module.
        // If this is a problem you, the reader, have, the author's recommendation for
        // circumventing this potential issue is to use software that isn't WSO2.
        if (!/\>User not authorized\</.test(err?.response?.data)) { // /whatever/.test(undefined) returns false
            throw err;
        }
        const { status, data } = err.response;
        contextLog('Application did not exist', {
            request: deleteApplicationRequest,
            response: {
                status,
                data,
            },
        });
    }
};

module.exports = {
    createOAuth2Application,
    createOAuth2Users,
    createApplication,
    updateOAuthApplication,
    updateApplication,
    getApplication,
    getToken,
    registerOAuthApplication,
    getOAuthApplication,
    deleteApplication,
};
