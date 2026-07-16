# ollama-web-local

Example website access ollama local  
http://localhost:11434/ (Ollama is running) ollama local   
https://ollama.chaucc.top/ -> access ollama local  



<img width="1036" height="696" alt="image" src="https://github.com/user-attachments/assets/9597d271-e17b-4db6-b122-18b11de855fd" />


Feature
- chat
- support image
- support save history in browser
- auto load list model
- limit history add to chat when send
- support fast chat
- support prompt
- support multi chat by tab



# Setup for access ollama local

## For win 10 install ollama app
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
