package proxy

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	fiberws "github.com/gofiber/websocket/v2"
	gws "github.com/gorilla/websocket"
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/khiemnd777/noah_api/shared/utils"
)

func proxyWebSocket(down *fiberws.Conn) {
	targetStr, _ := down.Locals("__proxy_target").(string)
	path, _ := down.Locals("__proxy_path").(string)
	rawQuery, _ := down.Locals("__proxy_query").(string)
	auth, _ := down.Locals("__proxy_auth").(string)

	logger.Info("ws.gateway.accept",
		"target", targetStr,
		"path", path,
		"raw_query_present", rawQuery != "",
		"down_remote_addr", down.RemoteAddr().String(),
		"down_local_addr", down.LocalAddr().String(),
	)

	if targetStr == "" {
		logger.Warn("ws.gateway.reject_missing_target",
			"down_remote_addr", down.RemoteAddr().String(),
		)
		_ = down.Close()
		return
	}

	targetURL, err := url.Parse(targetStr)
	if err != nil {
		logger.Error(fmt.Sprintf("❌ WS proxy parse target error: %v", err))
		_ = down.Close()
		return
	}

	upstreamURL := buildUpstreamWSURL(targetURL, path, rawQuery)

	// headers gửi sang upstream
	h := http.Header{}
	if auth != "" {
		h.Set("Authorization", auth)
	}
	h.Set("X-Internal-Token", utils.GetInternalToken())

	dialer := gws.Dialer{
		Proxy:            http.ProxyFromEnvironment,
		HandshakeTimeout: 10 * time.Second,
	}

	up, _, err := dialer.Dial(upstreamURL, h)
	if err != nil {
		logger.Error(fmt.Sprintf("❌ WS proxy dial upstream error: %v", err))
		_ = down.Close()
		return
	}
	logger.Info("ws.gateway.upstream_connected",
		"upstream_url", upstreamURL,
		"down_remote_addr", down.RemoteAddr().String(),
		"up_remote_addr", up.RemoteAddr().String(),
		"up_local_addr", up.LocalAddr().String(),
	)
	defer up.Close()
	defer down.Close()

	// 2 chiều: down -> up, up -> down
	errCh := make(chan error, 2)

	go pumpDownToUp(down, up, errCh)
	go pumpUpToDown(up, down, errCh)

	// chờ 1 phía lỗi/close thì kết thúc
	err = <-errCh
	logger.Warn("ws.gateway.proxy_terminated",
		"upstream_url", upstreamURL,
		"down_remote_addr", down.RemoteAddr().String(),
		"error", err,
	)
}

func buildUpstreamWSURL(target *url.URL, path, rawQuery string) string {
	// map scheme
	scheme := "ws"
	if strings.EqualFold(target.Scheme, "https") {
		scheme = "wss"
	} else if strings.EqualFold(target.Scheme, "wss") || strings.EqualFold(target.Scheme, "ws") {
		scheme = target.Scheme
	}

	joinedPath := singleJoiningSlash(target.Path, path)

	u := &url.URL{
		Scheme:   scheme,
		Host:     target.Host,
		Path:     joinedPath,
		RawQuery: rawQuery,
	}
	return u.String()
}

func pumpDownToUp(down *fiberws.Conn, up *gws.Conn, errCh chan<- error) {
	for {
		mt, msg, err := down.ReadMessage()
		if err != nil {
			logger.Warn("ws.gateway.down_read_failed",
				"down_remote_addr", down.RemoteAddr().String(),
				"upstream_remote_addr", up.RemoteAddr().String(),
				"error", err,
			)
			errCh <- err
			return
		}
		logger.Debug("ws.gateway.down_to_up",
			"message_type", mt,
			"payload_size", len(msg),
			"payload_text", string(msg),
			"down_remote_addr", down.RemoteAddr().String(),
		)
		// fiberws mt map trực tiếp với gorilla
		if err := up.WriteMessage(mt, msg); err != nil {
			logger.Warn("ws.gateway.up_write_failed",
				"message_type", mt,
				"payload_size", len(msg),
				"down_remote_addr", down.RemoteAddr().String(),
				"upstream_remote_addr", up.RemoteAddr().String(),
				"error", err,
			)
			errCh <- err
			return
		}
	}
}

func pumpUpToDown(up *gws.Conn, down *fiberws.Conn, errCh chan<- error) {
	for {
		mt, msg, err := up.ReadMessage()
		if err != nil {
			logger.Warn("ws.gateway.up_read_failed",
				"down_remote_addr", down.RemoteAddr().String(),
				"upstream_remote_addr", up.RemoteAddr().String(),
				"error", err,
			)
			errCh <- err
			return
		}
		logger.Debug("ws.gateway.up_to_down",
			"message_type", mt,
			"payload_size", len(msg),
			"payload_text", string(msg),
			"down_remote_addr", down.RemoteAddr().String(),
		)
		if err := down.WriteMessage(mt, msg); err != nil {
			logger.Warn("ws.gateway.down_write_failed",
				"message_type", mt,
				"payload_size", len(msg),
				"down_remote_addr", down.RemoteAddr().String(),
				"upstream_remote_addr", up.RemoteAddr().String(),
				"error", err,
			)
			errCh <- err
			return
		}
	}
}
