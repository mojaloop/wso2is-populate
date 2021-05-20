resource "null_resource" "mutate_wso2is_configuration" {
  provisioner "local-exec" {

    command = <<EOT
cd ${path.module}/../
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
