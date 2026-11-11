#!/bin/sh
# Keeps /etc/nginx/ssl/current/{fullchain,privkey}.pem pointing at a certificate nginx can load:
#   - the one certbot made for $DOMAIN (/etc/letsencrypt/live/$DOMAIN), when it exists
#   - a self-signed one otherwise: it lets nginx start before certbot has run, and it is all a local test
#     (DOMAIN=localhost) needs. It is not in the certbot folder, certbot refuses a live/ folder it did not make.
# Then it checks every CERT_CHECK_SECONDS (300) in the background and reloads nginx when the certificate changed,
# which is how nginx picks up the first certbot certificate and its renewals.
set -eu

DOMAIN="${DOMAIN:-localhost}"
SSL_DIR=/etc/nginx/ssl
SELF="$SSL_DIR/selfsigned"
CURRENT="$SSL_DIR/current"
LIVE="/etc/letsencrypt/live/$DOMAIN"
STATE="$SSL_DIR/.state"

mkdir -p "$SELF" "$CURRENT"

if [ ! -s "$SELF/fullchain.pem" ] || [ ! -s "$SELF/privkey.pem" ]; then
    echo "40-certificates.sh: making a self-signed certificate for $DOMAIN"
    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
        -subj "/CN=$DOMAIN" \
        -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1" \
        -keyout "$SELF/privkey.pem" -out "$SELF/fullchain.pem" 2>/dev/null
fi

# prints "changed" when nginx has to (re)load
refresh() {
    if [ -s "$LIVE/fullchain.pem" ] && [ -s "$LIVE/privkey.pem" ]; then
        src="$LIVE"
    else
        src="$SELF"
    fi
    ln -sfn "$src/fullchain.pem" "$CURRENT/fullchain.pem"
    ln -sfn "$src/privkey.pem" "$CURRENT/privkey.pem"
    now="$src $(readlink -f "$src/fullchain.pem")"
    if [ "$now" != "$(cat "$STATE" 2>/dev/null || true)" ]; then
        printf '%s' "$now" > "$STATE"
        echo changed
    fi
}

refresh > /dev/null
echo "40-certificates.sh: using $(cat "$STATE")"

if [ "${1:-}" != "--once" ]; then
    (
        while :; do
            sleep "${CERT_CHECK_SECONDS:-300}"
            if [ "$(refresh)" = "changed" ]; then
                echo "40-certificates.sh: certificate changed ($(cat "$STATE")), reloading nginx"
                nginx -s reload || true
            fi
        done
    ) &
fi
