# Use an official Node.js 18 runtime as a parent image
FROM node:14-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port on which your application runs (if needed)
# Replace <your_port> with the port your application listens to
EXPOSE 3003

# Define the command to run your application
CMD [ "node", "bot.js" ]
