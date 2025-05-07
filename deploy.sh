#!/bin/bash

echo "=== Clonando o repositório do GitHub ==="
if [ -d "temp_repo" ]; then
  rm -rf temp_repo
fi
git clone https://github.com/jeanjonathas/whatsdecrypt.git temp_repo

echo "=== Construindo a imagem Docker ==="
cd temp_repo
docker build -t whatsdecrypt:latest .
cd ..

echo "=== Implantando no Docker Swarm ==="
docker stack deploy -c docker-compose.yml whatsdecrypt

echo "=== Limpando arquivos temporários ==="
rm -rf temp_repo

echo "=== Verificando status do serviço ==="
sleep 5
docker service ls | grep whatsdecrypt
