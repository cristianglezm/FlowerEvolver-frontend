# Flower Evolver #

![Deployment](https://github.com/cristianglezm/FlowerEvolver-frontend/workflows/Deploy%20to%20gh-pages/badge.svg?branch=master)

Visit the website [here](https://cristianglezm.github.io/FlowerEvolver-frontend/)

Frontend for Flower Evolver (a tool of [EcoSystem](https://github.com/cristianglezm/EcoSystem)),
the Backend is found [here](https://github.com/cristianglezm/FlowerEvolver-backend)

# Docker #

 WIP

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
npm run build
```
