#!/bin/bash

echo "checkout to gh-pages"
git stash
git checkout gh-pages
echo "write the backend: (https://example.com)"
read BACKEND
echo "write the BASE_URL: ('/')"
read BASE_URL
# backup .env
mv .env .env_bak

# build .env
echo "VUE_APP_IMAGES_URL=$BACKEND/generated/" > .env
echo "VUE_APP_API_URL=$BACKEND/api/" >> .env
echo "VUE_APP_DOWNLOAD_URL=$BACKEND/download/" >> .env
echo "VUE_APP_BASE_URL=$BASE_URL" >> .env

echo "This is the configuration: "
cat .env
echo "want to continue?(y/n)"
read cont
if [ $cont -eq "y" ]
	then
	echo "Building..."
	npm run build
	git add dist/
	git commit
	git subtree push --prefix dist origin gh-pages
else
	echo "Aborting..."
fi
# restore backup
rm .env
mv .env_bak .env
echo "checkout master"
git checkout master
git stash pop
