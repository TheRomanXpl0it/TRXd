package email

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strconv"
	"time"
	"trxd/db"

	gomail "github.com/wneessen/go-mail"
)

type Client struct {
	*gomail.Client
	fromAddr *mail.Address
}

func InitEmailClientFromConfigs(ctx context.Context) (*Client, error) {
	server, err := db.GetConfig(ctx, "email-server")
	if err != nil {
		return nil, fmt.Errorf("failed to get email-server config: %w", err)
	}

	portStr, err := db.GetConfig(ctx, "email-port")
	if err != nil {
		return nil, fmt.Errorf("failed to get email-port config: %w", err)
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, fmt.Errorf("invalid email-port config: %w", err)
	}

	addr, err := db.GetConfig(ctx, "email-addr")
	if err != nil {
		return nil, fmt.Errorf("failed to get email-addr config: %w", err)
	}

	passwd, err := db.GetConfig(ctx, "email-password")
	if err != nil {
		return nil, fmt.Errorf("failed to get email-password config: %w", err)
	}

	if server == "" || port == 0 || addr == "" {
		return nil, errors.New("email configuration is incomplete")
	}

	client, err := InitEmailClient(server, port, addr, passwd)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize email client: %w", err)
	}

	return client, nil
}

func InitEmailClient(server string, port int, addr string, passwd string) (*Client, error) {
	var err error

	c := &Client{}

	c.fromAddr, err = mail.ParseAddress(addr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse address: %w", err)
	}

	c.Client, err = gomail.NewClient(
		server,
		gomail.WithPort(port),
		gomail.WithSMTPAuth(gomail.SMTPAuthPlain),
		gomail.WithUsername(addr),
		gomail.WithPassword(passwd),
		gomail.WithTimeout(10*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create new Client: %w", err)
	}

	return c, nil
}

// The client has an internal mutex to make this thread-safe.
func (c *Client) SendEmail(ctx context.Context, to string, subject string, body string) error {
	toAddr, err := mail.ParseAddress(to)
	if err != nil {
		return fmt.Errorf("failed to parse address: %w", err)
	}

	message := gomail.NewMsg()
	message.FromMailAddress(c.fromAddr)
	message.ToMailAddress(toAddr)
	message.Subject(subject)
	message.SetBodyString(gomail.TypeTextPlain, body)

	err = c.DialAndSendWithContext(ctx, message)
	if err != nil {
		return fmt.Errorf("failed to send mail: %w", err)
	}

	return nil
}
