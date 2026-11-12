# Flower Evolver

[![cd](https://github.com/cristianglezm/FlowerEvolver-frontend/actions/workflows/deploy-gh-pages.yml/badge.svg)](https://github.com/cristianglezm/FlowerEvolver-frontend/actions/workflows/deploy-gh-pages.yml)

Visit the website [here](https://cristianglezm.github.io/FlowerEvolver-frontend/)

Frontend for Flower Evolver (a tool of [EcoSystem](https://github.com/cristianglezm/EcoSystem)),
the Backend is found [here](https://github.com/cristianglezm/FlowerEvolver-backend)

## Docker

The whole stack (frontend, backend, describe, MySQL, Redis, Kafka and optionally Prometheus and Grafana) runs with
one compose file:

```bash
.devops/init.sh                # makes docker/.env and the secrets
cd docker
docker compose up -d --build   # https://localhost, with a self-signed certificate
```

The frontend image is built for the address it will be served from, because the api urls are compiled into the
bundle. More info, a server with a real domain and monitoring: [docker/README.md](docker/README.md)

## Running

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

```bash
npm install
npm run dev
```

## License

Copyright 2020-2025 Cristian Gonzalez <cristian.glez.m@gmail.com>

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

### Flower Evolver

Copyright 2015-2025 Cristian Gonzalez Cristian.glez.m@gmail.com

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

### Monaspace font

Copyright (c) 2023, GitHub https://github.com/githubnext/monaspace
with Reserved Font Name "Monaspace", including subfamilies: "Argon", "Neon", "Xenon", "Radon", and "Krypton"
