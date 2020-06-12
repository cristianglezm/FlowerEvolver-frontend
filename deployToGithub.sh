#!/bin/bash
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
if [ "$cont" == "y" ]
	then
	echo "Building..."
	npm run build
	git stash
	git checkout --orphan gh-pages
	git stash pop
	git add dist/
	git commit
	git subtree push --prefix dist origin gh-pages
	git checkout master
else
	echo "Aborting..."
fi
# restore backup
rm .env
mv .env_bak .env
