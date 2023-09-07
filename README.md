# Flower Evolver #

![Deployment](https://github.com/cristianglezm/FlowerEvolver-frontend/workflows/Deploy%20to%20gh-pages/badge.svg?branch=master)

Visit the website [here](https://cristianglezm.github.io/FlowerEvolver-frontend/)

Frontend for Flower Evolver (a tool of [EcoSystem](https://github.com/cristianglezm/EcoSystem)),
the Backend is found [here](https://github.com/cristianglezm/FlowerEvolver-backend)

# Docker #

The frontend image must be built as it is a SPA and it needs to be configured.

You can build the image running the following command after cloning the repo, change the environment variables as needed.

* docker build -t cristianglezm/fe:frontend-alpine-dev -f dockerfile.alpine \
    --build-arg "REWRITE_ENV=TRUE" --build-arg "BASE_URL='/'" --build-arg BACKEND="http://localhost"
* docker run -dp 80:80 -v logs:/var/log/nginx cristianglezm/fe:frontend-alpine-dev -e "API=localhost:5000"

more info [here](README-Docker.md)

# Building #

Change BACKEND inside the ".env" file to point to the backend.
Change VITE_APP_BASE_URL if needed (it needs to end with /)

```bash
BACKEND=http://localhost:5000
VITE_APP_BASE_URL='/'
VITE_APP_IMAGES_URL=$BACKEND/generated/
VITE_APP_API_URL=$BACKEND/api/
VITE_APP_DOWNLOAD_URL=$BACKEND/download/
```

then run 

```
npm install
npm run dev
```
