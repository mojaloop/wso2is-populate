variable "wso2_host" {
  description = "WSO2 Identity Server host URI"
  type        = string
  default     = "https://localhost:9443"

  validation {
    condition     = can(regex("^https?://", var.wso2_host))
    error_message = "The host URI protocol must be included, and must be HTTP or HTTPS."
  }
}

variable "admin_user" {
  description = "Username to use when configuring WSO2. User must have full admin permissions."
  type        = string
  default     = "admin"
}

variable "admin_password" {
  description = "Password to use when configuring WSO2"
  type        = string
  default     = "admin"
}

variable "wso2_oauth2_application_name" {
  description = "The name to give the WSO2 'application' that provides OAuth2 authentication server functionality"
  type        = string
  default     = "portaloauth"
}

variable "auth_server_clientkey" {
  description = "The key that will identify the OAuth2 'application'"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9_]{15,30}$", var.auth_server_clientkey))
    error_message = "The key must match the pattern /^[a-zA-Z0-9_]{15,30}$/."
  }
}

variable "auth_server_clientsecret" {
  description = "The secret used to authenticate the 'application'"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9_]{15,30}$", var.auth_server_clientsecret))
    error_message = "The secret must match the pattern /^[a-zA-Z0-9_]{15,30}$/."
  }
}

variable "portal_users" {
  description = "User details of portal users"
  type        = list(object({ username = string, password = string, roles = list(string) }))
  default = [
    {
      "username" : "portaladmin",
      "password" : "Pa2yjP9VlQgaKnz03Y6llR67vtVlE9",
      "roles" : [
        "ndc_update"
      ]
    },
    {
      "username" : "portaluser",
      "password" : "ezWx_huS3C8dFhV4cmlNXqNLOLUXad",
      "roles" : [
      ]
    }
  ]

  validation {
    condition     = can([for u in var.portal_users : regex("^[\\S]{5,30}$", u.password)])
    error_message = "All user passwords must match the pattern /^[\\S]{5,30}$/."
  }
}
