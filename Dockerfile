FROM node:20-alpine

WORKDIR /usr/src/app

# Installation des dépendances
COPY package*.json ./
RUN npm install

# Copie du code source
COPY . .

EXPOSE 3000

# Commande de démarrage (assurez-vous d'avoir un script "dev" dans package.json)
CMD ["npm", "run", "dev"]