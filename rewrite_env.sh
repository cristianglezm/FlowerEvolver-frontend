#!/bin/sh

echo "running rewrite_env.sh"
if [ "$REWRITE_ENV" == "true" ]
then
    echo "Building .env file"
    echo "BACKEND=$BACKEND" > .env
    echo "VITE_APP_IMAGES_URL=$BACKEND/generated/" >> .env
    echo "VITE_APP_API_URL=$BACKEND/api/" >> .env
    echo "VITE_APP_DOWNLOAD_URL=$BACKEND/download/" >> .env
    echo "VITE_APP_BASE_URL=$BASE_URL" >> .env
fi
echo "Using these values from .env to build frontend:"
cat .env