#!/bin/sh
# The API urls are compiled into the bundle by vite, so a container image has to be built for the address it will
# be served from. With REWRITE_ENV=true this writes .env from BACKEND and BASE_URL, otherwise the .env of the repo
# is used as it is.

echo "running rewrite_env.sh"
case "$REWRITE_ENV" in
    true|TRUE|True|1)
        if [ -z "$BACKEND" ]
        then
            # the bundle would call "undefined/api/" and nothing at build time would notice
            echo "rewrite_env.sh: ERROR: BACKEND is empty, set it to the public address (https://example.org)" >&2
            exit 1
        fi
        # the paths below start with a slash
        BACKEND="${BACKEND%/}"
        echo "Building .env file"
        {
            echo "BACKEND=$BACKEND"
            echo "VITE_APP_IMAGES_URL=$BACKEND/generated/"
            echo "VITE_APP_API_URL=$BACKEND/api/"
            echo "VITE_APP_DOWNLOAD_URL=$BACKEND/download/"
            echo "VITE_APP_BASE_URL='${BASE_URL:-/}'"
        } > .env
        ;;
esac
echo "Using these values from .env to build frontend:"
cat .env
