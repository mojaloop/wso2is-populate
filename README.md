# WSO2 Identity Server Populate
A standalone script that can be used as a wrapper around an WSO2 Identity Server 
in order to import users and roles into it.

It interacts with:

- WSO2 Identity Server.

Information about WSO2IS REST API can be found here:

* https://docs.wso2.com/display/IS570/apidocs/SCIM2-endpoints/
* https://docs.wso2.com/display/IS570/Using+the+SCIM+2.0+REST+APIs

### Installation
```
cd src
npm install
```

### Configuration
Edit `config/client.js` with the appropriate values. 

The configuration parameters are described below:

* The WSO2IS listening host (string) - `http.host`;
* The WSO2IS listening port (number) - `http.port`;
* The WSO2IS SCIM 2.0 REST API endpoint (string) (optional) - `http.endpoint`;
* The timeout in milliseconds before a request to WSO2IS is rejected (number) - `http.timeout`;
* The authentication used to communicate with WSO2IS (string) - `authentication.type`;
* The credentials used for the authentication agains WSO2IS (object) - `authentication.credentials`;

```
    {
        http: {
            host: <string>,
            port: <number>,
            endpoint: <string>,
            timeout: <number>
        },
        authentication: {
            type: <string>,
            credentials: <object>
        }
    }
```

### Imports
Populate the following files with the desired entries that should be imported into the server: 

* `imports/users.json` - It should contain all the desired users to be imported.
* `imports/roles.json` - It should contain all the desired roles to be imported, optionally among with their corresponding members.
There are two cases for the members:

  1.  a role's member that already exists and is not imported now - then the object must contain the property 
  `"value": "<user ID>"` that should be populated by the user prior the run of the script.
  2. a role's member that is imported now via the `imports/users.json` definition. 
  In this case the ID will be populated by the script, so the property `"value"` should not be populated by the user.

**Note**: If an entry to be imported from the above files already exists inside the WSO2IS it will be ignored.

### Running
```
cd src
npm run start
``` 

### Testing
#### Unit tests
```
cd src
npm run test
```
#### Manual tests
In order to test locally the functionalities of the script against a demo WSO2IS, build a docker container by 
following the instructions that can be found here https://github.com/wso2/docker-is/tree/master/dockerfiles/ubuntu/is
