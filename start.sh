#!/bin/bash

APP_NAME="mandrill-bot"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

case "${1:-start}" in
  start)
    echo "Starting $APP_NAME..."
    pm2 start "$APP_DIR/ecosystem.config.cjs"
    pm2 save
    ;;
  stop)
    echo "Stopping $APP_NAME..."
    pm2 stop "$APP_NAME"
    ;;
  restart)
    echo "Restarting $APP_NAME..."
    pm2 restart "$APP_NAME"
    ;;
  logs)
    pm2 logs "$APP_NAME"
    ;;
  status)
    pm2 status "$APP_NAME"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|status}"
    exit 1
    ;;
esac
