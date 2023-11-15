# Flower Evolver  # 

This is a docker repository for [FlowerEvolver-frontend](https://github.com/cristianglezm/FlowerEvolver-frontend) 
and [FlowerEvolver-backend](https://github.com/cristianglezm/FlowerEvolver-backend) in dev mode, 
for production you will need to change the .env file and configure ssl.

## Docker compose ##

The frontend image must be built as it is a SPA and it needs to be configured.
if you are on windows you might need to run dos2unix rewrite_env.sh

You will need to change these environment variables:

### Mysql

Change the mysql passwords

        MYSQL_ROOT_PASSWORD: passwd
        MYSQL_DATABASE: flowerevolver
        MYSQL_USER: fe
        MYSQL_PASSWORD: fe

### Backend

Change the passwd and origins domain name for frontend

        REWRITE_ENV: "true" # overwrite the .env file
        DB: flowerevolver # database name
        PASSWD: fe # password for mysql
        USER: fe # username for mysql
        ORIGINS: 'http://localhost/' # domain name for frontend

### Frontend

Change the arg and environment variables: backend and NGINX_HOST to domain name.

        BACKEND: "http://localhost" # frontend will send requests to domain name to proxy to backend
        NGINX_HOST: localhost # domain name
        NGINX_RESOLVER: 127.0.0.11 # dns for docker

the [compose file](https://github.com/cristianglezm/FlowerEvolver-frontend/blob/master/docker-compose.yml) 

## Frontend ##

The frontend image must be built as it is a SPA and it needs to be configured.

You can build the image running the following command after cloning the repo, change the environment variables as needed.

```bash
docker build -t cristianglezm/fe:frontend-alpine-dev -f dockerfile.alpine \
    --build-arg "REWRITE_ENV=TRUE" --build-arg "BASE_URL='/'" --build-arg BACKEND="http://localhost" .
docker run -dp 80:80 -v logs:/var/log/nginx cristianglezm/fe:frontend-alpine-dev -e "API=localhost:5000"
```

## Backend ##

I recommend using the compose file from [frontend](https://github.com/cristianglezm/FlowerEvolver-frontend.git)
read the README-docker.md in [frontend](https://github.com/cristianglezm/FlowerEvolver-frontend.git) repo for how to.

The Alpine version needs to download some repositories(private for now) to build the executables,
the Ubuntu version has them inside the bin folder with the Windows executables.

If you want to use the alpine version you will need to pull the image from this 
[repo](https://hub.docker.com/repository/docker/cristianglezm/fe) and change the env variables as needed.

Before running the script to build the image, change the .env variables if you need to.

* build image (alpine or ubuntu)
    * sh build_docker.sh "alpine"
    * sh build_docker.sh "ubuntu"
* pull image (alpine(300MB) or ubuntu(800MB))
    * docker pull cristianglezm/fe:backend-alpine-dev
    * docker pull cristianglezm/fe:backend-ubuntu-dev
* docker run -dp 5000:5000 -v generated:/app/generated -v migrations:/app/migrations \ 
    -v db:/app/db cristianglezm/fe:backend-alpine-dev --env-file .env --hostname backend
* browse to http://localhost:5000/api/flowers to get a list of flowers.
    (use webtools to send request, a rest client or the frontend website.)

## License

View license information for the software contained in this image in the following links:

* [EvoAI](https://github.com/cristianglezm/EvoAI)
* [EcoSystem](https://github.com/cristianglezm/EcoSystem)

As with all Docker images, these likely also contain other software which may be under other licenses (such as Bash, etc from the base distribution, 
along with any direct or indirect dependencies of the primary software being contained).

As for any pre-built image usage, it is the image user's responsibility to ensure that any use of this image 
complies with any relevant licenses for all software contained within.
