#!/bin/bash

BACKEND=$1
BASE_URL=$2
# backup .env
echo "making backup of .env"
mv .env .env_bak
# build .env
echo "Building .env file"
echo "VITE_APP_IMAGES_URL=$BACKEND/generated/" > .env
echo "VITE_APP_API_URL=$BACKEND/api/" >> .env
echo "VITE_APP_DOWNLOAD_URL=$BACKEND/download/" >> .env
echo "VITE_APP_BASE_URL=$BASE_URL" >> .env
git checkout --orphan gh-pages
echo "building..."
npm run build --base=/FlowerEvolver-frontend/
echo "restoring backup"
# restore backup
rm .env
mv .env_bak .env
git --work-tree dist add --all
git --work-tree dist commit -m "gh-pages"
echo "pushing to gh-pages..."
git push origin HEAD:gh-pages --force
rm -R dist
git checkout -f master
git branch -D gh-pages
echo "Deployment done"
