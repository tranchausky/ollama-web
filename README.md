# ollama-web

Example website access ollama local  

<img width="838" height="534" alt="image" src="https://github.com/user-attachments/assets/6560dced-37e4-47f7-8820-eafa42e6383f" />

Feature
- chat
- support image
- support save history in browser
- auto load list model
- limit history add to chat when send
- support fast chat
- support prompt
- support multi chat by tab



Setup for access ollama local

## Public win install ollama app
cmd run
```
setx OLLAMA_HOST "0.0.0.0:11434"
setx OLLAMA_ORIGINS "*"
```

After Restart ollama


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
