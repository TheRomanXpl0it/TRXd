package consts

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"trxd/utils/log"
)

var AntiPanic = true

type Config struct {
	Key         string
	Name        string
	Value       any
	Type        string
	Category    string
	Description string
	Secret      bool
}

var DefaultConfigsList = []Config{
	{
		Key:         "allow-register",
		Name:        "Allow Register",
		Value:       false,
		Type:        "bool",
		Category:    "",
		Description: "whether to allow user registration",
		Secret:      false,
	},
	{
		Key:         "user-mode",
		Name:        "Single User Mode",
		Value:       false,
		Type:        "bool",
		Category:    "",
		Description: "if enabled there will be no teams, but only users, like a single player mode",
		Secret:      false,
	},
	{
		Key:         "scoreboard-top",
		Name:        "Scoreboard Top Teams",
		Value:       10,
		Type:        "int",
		Category:    "",
		Description: "the number of the top teams to show on the scoreboard graph",
		Secret:      false,
	},
	{
		Key:         "chall-min-points",
		Name:        "Challenge Min Points",
		Value:       50,
		Type:        "int",
		Category:    "",
		Description: "the minimum points a challenge can award",
		Secret:      false,
	},
	{
		Key:         "chall-points-decay",
		Name:        "Challenge Points Decay",
		Value:       15,
		Type:        "int",
		Category:    "",
		Description: "the rate at which challenge points decay",
		Secret:      false,
	},
	{
		Key:         "start-time",
		Name:        "Start Time",
		Value:       "",
		Type:        "date",
		Category:    "",
		Description: "the start time for the competition following the RFC3339 format",
		Secret:      false,
	},
	{
		Key:         "end-time",
		Name:        "End Time",
		Value:       "",
		Type:        "date",
		Category:    "",
		Description: "the end time for the competition following the RFC3339 format",
		Secret:      false,
	},
	{
		Key:         "discord-webhook",
		Name:        "Discord Webhook",
		Value:       "",
		Type:        "remote",
		Category:    "",
		Description: "the Discord webhook url for first blood notifications",
		Secret:      false,
	},

	//! ######################### INSTANCES ######################### !\\

	{
		Key:         "domain",
		Name:        "Domain",
		Value:       "",
		Type:        "remote",
		Category:    "instances",
		Description: "the domain used for the instances (e.g. domain.com)",
		Secret:      false,
	},
	{
		Key:         "min-port",
		Name:        "Min Port",
		Value:       10000,
		Type:        "port",
		Category:    "instances",
		Description: "the minimum port number for instance allocation",
		Secret:      false,
	},
	{
		Key:         "max-port",
		Name:        "Max Port",
		Value:       20000,
		Type:        "port",
		Category:    "instances",
		Description: "the maximum port number for instance allocation",
		Secret:      false,
	},
	{
		Key:         "hash-len",
		Name:        "Hash Domain Length",
		Value:       12,
		Type:        "int",
		Category:    "instances",
		Description: "the length of the random hash used into the instance domain (e.g. abcdef123456.domain.com)",
		Secret:      false,
	},
	{
		Key:         "reclaim-instance-interval",
		Name:        "Reclaim Instance Interval",
		Value:       5 * 60, // 5 minutes
		Type:        "duration",
		Category:    "instances",
		Description: "the interval for reclaiming instances in seconds",
		Secret:      false,
	},
	{
		Key:         "instance-lifetime",
		Name:        "Instance Lifetime",
		Value:       30 * 60, // 30 minutes
		Type:        "duration",
		Category:    "instances",
		Description: "the instances lifetime duration in seconds",
		Secret:      false,
	},
	{
		Key:         "instance-max-cpu",
		Name:        "Instance Max CPU",
		Value:       1.0,
		Type:        "float",
		Category:    "instances",
		Description: "the maximum CPU allocation for each instance",
		Secret:      false,
	},
	{
		Key:         "instance-max-memory",
		Name:        "Instance Max Memory",
		Value:       512,
		Type:        "int",
		Category:    "instances",
		Description: "the maximum memory allocation for each instance in MB",
		Secret:      false,
	},
	{
		Key:         "registry-server",
		Name:        "Registry Server",
		Value:       "",
		Type:        "remote",
		Category:    "instances",
		Description: "the registry server used for pulling images",
		Secret:      false,
	},
	{
		Key:         "registry-username",
		Name:        "Registry Username",
		Value:       "",
		Type:        "string",
		Category:    "instances",
		Description: "the username for the registry server",
		Secret:      false,
	},
	{
		Key:         "registry-password",
		Name:        "Registry Password",
		Value:       "",
		Type:        "string",
		Category:    "instances",
		Description: "the password for the registry server",
		Secret:      true,
	},

	//! ######################### EMAIL ######################### !\\

	{
		Key:         "email-verification",
		Name:        "Email Verification",
		Value:       false,
		Type:        "bool",
		Category:    "email",
		Description: "enables all the email related features",
		Secret:      false,
	},
	{
		Key:         "jwt-secret",
		Name:        "Email JWT Secret",
		Value:       "",
		Type:        "string",
		Category:    "email",
		Description: "the secret key used for signing JWT tokens for email verification",
		Secret:      true,
	},
	{
		Key:         "email-server",
		Name:        "Email Server",
		Value:       "",
		Type:        "remote",
		Category:    "email",
		Description: "the SMTP server address for sending verification emails (e.g. smtp.example.com)",
		Secret:      false,
	},
	{
		Key:         "email-port",
		Name:        "Email Server Port",
		Value:       587,
		Type:        "port",
		Category:    "email",
		Description: "the port number for the SMTP server (e.g. 587)",
		Secret:      false,
	},
	{
		Key:         "email-addr",
		Name:        "Email Address",
		Value:       "",
		Type:        "email",
		Category:    "email",
		Description: "the email address for sending verification emails (e.g. no-reply@example.com)",
		Secret:      false,
	},
	{
		Key:         "email-password",
		Name:        "Email Password",
		Value:       "",
		Type:        "string",
		Category:    "email",
		Description: "the password for the email account used for sending verification emails",
		Secret:      true,
	},
	{
		Key:         "email-expiration",
		Name:        "Email Token Expiration",
		Value:       30 * 60, // 30 minutes
		Type:        "duration",
		Category:    "email",
		Description: "the expiration time for the email verification tokens in seconds",
		Secret:      false,
	},
	{
		Key:         "email-subject",
		Name:        "Email Subject",
		Value:       "TRXD - Verify Your Email Address",
		Type:        "string",
		Category:    "email",
		Description: "the subject line for the email verification emails",
		Secret:      false,
	},
	{
		Key:         "email-body-template",
		Name:        "Email Body Template",
		Value:       "Hello,\n\nPlease confirm your email address by clicking the link below:\nhttp://{{DOMAIN}}/verify?token={{TOKEN}}\n\nIf you did not request this, you can ignore this email.\n\nThank you!",
		Type:        "text",
		Category:    "email",
		Description: "the template for the email verification emails, Note: {{DOMAIN}} and {{TOKEN}} will be replaced with the actual domain and token values",
		Secret:      false,
	},
}

var DefaultConfigs map[string]Config = map[string]Config{}
var ConfigsSortOrder = map[string]int{}

func init() {
	for _, conf := range DefaultConfigsList {
		DefaultConfigs[conf.Key] = conf
		ConfigsSortOrder[conf.Key] = len(ConfigsSortOrder)
	}
}

func UpdateDefaultConfigValue(key string, newValue any) error {
	conf, ok := DefaultConfigs[key]
	if !ok {
		return fmt.Errorf("config with key %s not found", key)
	}

	idx, ok := ConfigsSortOrder[key]
	if !ok {
		return fmt.Errorf("config with key %s not found in sort order", key)
	}

	conf.Value = newValue

	DefaultConfigs[key] = conf
	DefaultConfigsList[idx] = conf

	return nil
}

func LoadEnvConfigs() {
	if os.Getenv("DISABLE_ANTI_PANIC") != "" {
		AntiPanic = false
		log.Warn("Anti Panic disabled")
	}

	for name, conf := range DefaultConfigs {
		value := conf.Value

		envName := strings.ReplaceAll(name, "-", "_")
		envName = strings.ToUpper(envName)

		newValue := os.Getenv(envName)
		if newValue == "" {
			continue
		}

		switch value.(type) {
		case bool:
			if newValue == "1" || strings.ToLower(newValue) == "true" {
				value = true
			}
		case int:
			intValue, err := strconv.Atoi(newValue)
			if err != nil {
				log.Warn("Invalid int value for env", "env", envName, "value", newValue)
				continue
			}
			value = intValue
		case float64:
			floatValue, err := strconv.ParseFloat(newValue, 64)
			if err != nil {
				log.Warn("Invalid float value for env", "env", envName, "value", newValue)
				continue
			}
			value = floatValue
		case string:
			value = newValue
		default:
			log.Fatal("Unsupported config type for env", "env", envName, "type", conf.Type)
			continue
		}

		err := UpdateDefaultConfigValue(name, value)
		if err != nil {
			log.Fatal("Failed to update default config value", "key", name, "value", value, "err", err)
		}
	}
}
