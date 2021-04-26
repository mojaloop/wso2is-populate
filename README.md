Despair all ye who enter here: this code delicately threads a needle between the fickle threads of
The Beast from before time. The nameless darkness that lives deep below the consciousness of all
living beings. The shiver that runs down your spine in the moment your eyes adjust to new light.
The _WSO2 Identity Server 5.7.0_. Herein lies a sanity-destroying labyrinth of delicate
workarounds, confusing implementation details, incomplete or incorrect documentation around every
corner. And worse: SOAP. Go back, now! But if you choose to venture forth, remember this: You.
Were. Warned.

# WSO2 Identity Server Populate
A standalone script that can be used to initialise an WSO2 Identity Server with
* an OAuth2 authentication server 
* preconfigured users
* preconfigured user roles

Information about WSO2IS REST API can be found here:

* https://docs.wso2.com/display/IS570/apidocs/SCIM2-endpoints/
* https://docs.wso2.com/display/IS570/Using+the+SCIM+2.0+REST+APIs

Information about the SOAP API used can be found here:

* https://docs.wso2.com/display/IS570/Using+the+Service+Provider+API

### Installation
```
cd src
npm ci
```

### Configuration
1.  Set values in your environment as described below:

    | Environment var name                | Description                                                                                          | Default                                             |
    | ----------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
    | WSO2_HOST                           | The URL and port number for the WSO2 Identity Server instance                                        | `https://localhost:9443`                            |
    | AUTHENTICATION_CREDENTIALS_USERNAME | The username of the WSO2 admin user                                                                  | `admin`                                             |
    | AUTHENTICATION_CREDENTIALS_USERNAME | The password of the WSO2 admin user                                                                  | `admin`                                             |
    | APPLICATION_NAME                    | The desired name of the WSO2 "application" (also known as a "service provider") that will be created | `portaloauth`                                       |
    | AUTH_SERVER_CLIENTKEY               | The key that will be used to identify the aforementioned application                                 | A random string that matches `/^[A-Za-z0-0_]{30}$/` |
    | AUTH_SERVER_CLIENTSECRET            | The secret string that will be used to identify the aforementioned application                       | A random string that matches `/^[A-Za-z0-0_]{30}$/` |

    Note that using a user that does not have full admin permissions has not been tested and is not
    advised. It may fail in unexpected ways.

2.  Populate the `imports/users.json` file with the desired entries. Defaults exist in the existing
    file.

### Running

Start a properly configured (by the volume-mounted config file) WSO2 instance:
```sh
docker run \
    -p 9443:9443 \
    --name=wso2 \
    --network=portal-net \
    --rm \
    --volume=$PWD/integration_test/manifests/wso2is/identity.xml:/home/wso2carbon/wso2is-km-5.7.0/repository/conf/identity/identity.xml \
    wso2/wso2is-km:5.7.0
```

Install dependencies and run the application:
```sh
npm run start
```

### Testing
#### Unit tests
```sh
npm run test
```

#### Integration tests
1.  Get yourself a Kubernetes cluster. This is left as an exercise for the reader. However, some
    recommended solutions:
    1.  k3d on your local machine
    2.  DigitalOcean, easy to set up an account + billing, then for a single-node cluster in region
        _London 1_:
        ```sh
        doctl kubernetes cluster create pah \
            --region lon1 \
            --count 1 \
            --size 's-2vcpu-4gb' \
            --wait
        ```
        See regions with `doctl compute region list`.
    3.  Minikube. The author cannot speak to this solution.
    4.  Don't bother, instead push your changes to a branch and check out the result of the
        ![integration test run](https://github.com/modusintegration/wso2is-populate/actions)

2.  If your cluster is well-supported by Skaffold (such as `k3d`, perhaps Minikube?), your image
    will be built and pushed direct to the cluster nodes when you run:
    ```sh
    skaffold run
    ```
    If it is not, you will need to
    1. Get access to a docker registry you can push to and pull from
    2. Add your credentials to `./integration_test/local/.dockerconfigjson` according to these
       instructions: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/.
       Be _very_ careful not to share these. There is a `.gitignore` file to reduce the likelihood
       you will do this.
    3. Run Skaffold with
        ```sh
        skaffold run -d your-registry-uri.tld
        ```
       For GHCR, for example:
        ```sh
        skaffold run -d ghcr.io/your-github-username
        ```

##### Force run
This will force changes to jobs, statefulsets, etc.
```sh
skaffold run -d your-registry.io --force
```

##### Running with a different version of the portal
1.  Clone the finance portal repo
    ```sh
    git clone https://github.com/mojaloop/finance-portal-backend-service
    ```
2.  Modify the `build` section of `skaffold.yaml` to add this section. Change
    `build.artifacts[0].context` (current value of
    `/your/local/path/to/local/clone/of/finance-portal-backend-service`) to be the path to your
    local clone of the portal backend:
    ```yaml
    build:
      artifacts:
      - image: mojaloop/finance-portal-backend-service
        context: /your/local/path/to/local/clone/of/finance-portal-backend-service
        docker:
          dockerfile: Dockerfile
      - image: ghcr.io/modusintegration/wso2is-populate
        docker:
          dockerfile: Dockerfile
    ```
3.  Make local changes to your local clone of the portal backend, then `skaffold run` (or `skaffold
    run -d your-registry-uri.tld`) to see your changes in your cluster.
