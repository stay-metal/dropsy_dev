# Use the official Node.js image as the base
FROM node:18-slim

# Install system dependencies, including Python 3.11, ffmpeg, and wget
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-distutils \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for installing Node.js dependencies
COPY package.json package-lock.json ./

# Install Node.js dependencies
RUN npm install

# Copy the requirements.txt file and install Python dependencies
COPY requirements.txt ./
RUN pip3 install --break-system-packages -r requirements.txt

# Copy the rest of the project files
COPY . .

# Create directories for models and panns_data
RUN mkdir -p /app/models
RUN mkdir -p /root/panns_data

# Download the model file using wget
RUN wget -O /app/models/Cnn14_mAP=0.431.pth https://huggingface.co/thelou1s/panns-inference/resolve/main/Cnn14_mAP%3D0.431.pth

# Copy the class labels file to both locations
COPY models/class_labels_indices.csv /app/models/
COPY models/class_labels_indices.csv /root/panns_data/

# Set environment variables for model paths and class labels
ENV MODEL_PATH=/app/models/Cnn14_mAP=0.431.pth
ENV CLASS_LABELS_PATH=/app/models/class_labels_indices.csv

# Expose the necessary port
EXPOSE 5000

# Start the Node.js server
CMD ["npm", "start"]