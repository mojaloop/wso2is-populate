# TODO: necessary?
# https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs
# provider "docker" {
#   host = "tcp://127.0.0.1:2376/"
# }

# Start a container
resource "docker_image" "wso2ispopulate" {
  name  = "wso2ispopulate"
  image = docker_image.wso2ispopulate.latest
  restart = "on-failure"
  max_retry_count = 10
  # TODO: how do these interact? What happens when the container finishes?
  # rm = true
  # must_run = false
  attach = true
  logs = true
  env [
    "WSO2_HOST=${vars.wso2_host}"
    "AUTHENTICATION_CREDENTIALS_USERNAME=${vars.admin_user}"
    "AUTHENTICATION_CREDENTIALS_PASSWORD=${vars.admin_password}"
    "APPLICATION_NAME=${vars.wso2_oauth2_application_name}"
    "AUTH_SERVER_CLIENTKEY=${vars.auth_server_clientkey}"
    "AUTH_SERVER_CLIENTSECRET=${vars.auth_server_clientsecret}"
  ]
  upload {
    content = jsonencode(var.portal_users)
    file = "/src/imports/users.json"
  }
}

# Find the latest Ubuntu precise image.
resource "docker_image" "wso2ispopulate" {
  name = "ghcr.io/modusintegration/wso2is-populate"
}
