# resource "docker_container" "wso2ispopulate" {
#   name            = "wso2ispopulate"
#   image           = docker_image.wso2ispopulate.latest
#   restart         = "on-failure"
#   max_retry_count = 10
#   attach          = true
#   logs            = true
#   must_run        = true
#   env = [
#     "WSO2_HOST=${var.wso2_host}",
#     "AUTHENTICATION_CREDENTIALS_USERNAME=${var.admin_user}",
#     "AUTHENTICATION_CREDENTIALS_PASSWORD=${var.admin_password}",
#     "APPLICATION_NAME=${var.wso2_oauth2_application_name}",
#     "AUTH_SERVER_CLIENTKEY=${var.auth_server_clientkey}",
#     "AUTH_SERVER_CLIENTSECRET=${var.auth_server_clientsecret}",
#   ]
#   upload {
#     content = jsonencode(var.portal_users)
#     file    = "/src/imports/users.json"
#   }
# }
#
# resource "docker_image" "wso2ispopulate" {
#   name = "ghcr.io/modusintegration/wso2is-populate:2.0.2"
# }

resource "null_resource" "create_artifacts_return_credentials" {
  provisioner "local-exec" {

    command = <<EOT
echo '${jsonencode(var.portal_users)}' > src/imports/users.json
npm ci
WSO2_HOST="${var.wso2_host}" \
    AUTHENTICATION_CREDENTIALS_USERNAME="${var.admin_user}" \
    AUTHENTICATION_CREDENTIALS_PASSWORD="${var.admin_password}" \
    APPLICATION_NAME="${var.wso2_oauth2_application_name}" \
    AUTH_SERVER_CLIENTKEY="${var.auth_server_clientkey}" \
    AUTH_SERVER_CLIENTSECRET="${var.auth_server_clientsecret}" \
    npm run start
EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = "echo RESOURCE DESTRUCTION NOT IMPLEMENTED. SKIPPING"
  }

  triggers = {
    random = uuid()
  }
}
