     # Use the official Node.js image for building the app
     FROM node:18 as build

     # Set working directory
     WORKDIR /app

     # Copy package.json and package-lock.json
     COPY package.json ./

     # Install dependencies
     RUN npm install

     # Copy the rest of the frontend code
     COPY . .

     # Build the React app
     RUN npm run build

     # Use Nginx to serve the build
     FROM nginx:alpine

     # Copy the build output to Nginx's html directory
     COPY --from=build /app/build /usr/share/nginx/html

     # Expose port 80
     EXPOSE 80

     # Start Nginx
     CMD ["nginx", "-g", "daemon off;"]