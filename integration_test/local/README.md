#### Setup

1. Get Skaffold. Use your package manager, or get it from here: https://skaffold.dev/docs/install/

2. In a terminal, set the root directory of your local repo checkout.
   ```sh
   REPO_ROOT=$PWD
   ```

3. Create a personal access token with `package:write` scope on GH:
   https://github.com/settings/tokens/new. If `repo` scope is selected and you cannot deselect it,
   you can (and should) remove the `repo` scope after you create the token. This is a bug Github is
   aware of. Save the credentials in your terminal for usage later in these instructions:
   ```sh
   GH_USER= # put your GH username here
   TOKEN= # put your token here
   ```

4. Log in to GH container registry. This will allow you to access GHCR system-wide and is required
   to push built packages to GHCR.
   ```sh
   docker \
     login \
     -u $GH_USER \
     -p $TOKEN \
     ghcr.io/$GH_USER
   ```

5. Log in to GH container registry again. Supplying the config directory will cause docker to
   create its config file in this directory. We'll use this in the next step. If you prefer you can
   copy the relevant section from your `~/.docker/config.json` but this method is slightly easier:
   ```sh
   docker \
     --config=$REPO_ROOT/kubernetes \
     login \
     -u $GH_USER \
     -p $TOKEN \
     ghcr.io/$GH_USER
   ```

6. Rename `config.json` as created in the previous step. This is used as the credential file for
   pulling our development image:
   ```sh
   mv $REPO_ROOT/kubernetes/config.json $REPO_ROOT/kubernetes/.dockerconfigjson
   ```

7. Deploy
   ```sh
   skaffold run -d gchr.io/$GH_USER
   ```
