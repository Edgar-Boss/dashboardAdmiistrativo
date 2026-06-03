#!/bin/sh
set -eu

# Default to a compose-friendly upstream if not provided.
: "${API_UPSTREAM:=http://host.docker.internal:8080}"

envsubst '${API_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'

