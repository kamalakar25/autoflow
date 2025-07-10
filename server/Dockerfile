# Use the official Playwright image with all dependencies
FROM mcr.microsoft.com/playwright:v1.45.0-jammy

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm install

# Install required browsers
RUN npx playwright install --with-deps

# Expose the port your app runs on
EXPOSE 5000

# Start your server
CMD ["node", "server.js"]
