# ollama-web


## Public win install ollama app
cmd run
```
setx OLLAMA_HOST "0.0.0.0:11434"
setx OLLAMA_ORIGINS "*"
```

Restart lại ollama


## For docker

File docker-compose.yml  
add
```
    environment:
      OLLAMA_HOST: "0.0.0.0:11434"
      OLLAMA_ORIGINS: "*"
```
Example file docker-compose.yml  
```
services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    environment:
      OLLAMA_HOST: "0.0.0.0:11434"
      OLLAMA_ORIGINS: "*"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  ollama_data:
```
after
```
docker compose up -d --force-recreate ollama
```
Test
```
docker exec ollama printenv OLLAMA_ORIGINS
docker exec ollama printenv OLLAMA_HOST
```
