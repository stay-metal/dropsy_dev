import express from "express";
import cors from "cors";
import { google } from "googleapis";
import db from "./db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";
import { pipeline } from "stream/promises"; // For handling streams with async/await
import jwt from "jsonwebtoken";
import archiver from "archiver";

dotenv.config();

const app = express();
app.use(
  cors({
    exposedHeaders: ["Authorization"],
  })
);
app.use(express.json());

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Environment variables
const PORT = process.env.PORT || 5000;
const CLIENT_ID = process.env.CLIENT_ID || "your_client_id_here";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "your_client_secret_here";
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:5000/oauth2callback";
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID || "your_folder_id_here";

// Add the login route
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  // Validate username and password
  if (username === process.env.AUTH_USERNAME && password === process.env.AUTH_PASSWORD) {
    // Create a token
    const token = jwt.sign({ username }, process.env.JWT_SECRET, {
      expiresIn: "1h", // Token expires in 1 hour
    });

    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Set refresh token
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// Initialize database
await db.read();
db.data ||= { selectedFiles: [], analysisResults: {} };
await db.write();

// Create Google Drive API instance
const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

// Route to initiate OAuth2 flow
app.get("/auth", (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/drive"];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // Will return a refresh token
    scope: scopes,
    prompt: "consent", // Force consent to ensure a refresh token is returned
  });
  res.redirect(url);
});

// OAuth2 callback route
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Save the refresh token securely for future use
    const refreshToken = tokens.refresh_token;
    console.log("Refresh Token:", refreshToken);

    // Save the refresh token to your environment variables or secure storage
    // For example, update your .env file or use a secure database

    res.send("Authentication successful! You can now close this window.");
  } catch (error) {
    console.error("Error retrieving access token", error);
    res.status(500).send("Authentication failed");
  }
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401); // No token provided

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token

    req.user = user; // Add user info to request object
    next();
  });
}

// Route to get files
app.get("/api/files", authenticateToken, async (req, res) => {
  try {
    const files = await listFilesRecursive(FOLDER_ID);
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving files");
  }
});

async function listFilesInFolder(folderId) {
  const files = [];

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)",
  });

  for (const file of res.data.files) {
    if (file.mimeType !== "application/vnd.google-apps.folder") {
      files.push({
        ...file,
        path: file.name, // Since we're not including subfolders, the path is just the file name
      });
    }
  }

  return files;
}

// Function to list files recursively
async function listFilesRecursive(folderId, currentPath = "") {
  let files = [];

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, createdTime, modifiedTime)",
  });

  for (const file of res.data.files) {
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;

    if (file.mimeType === "application/vnd.google-apps.folder") {
      files.push({
        ...file,
        path: filePath,
        children: await listFilesRecursive(file.id, filePath),
      });
    } else {
      files.push({
        ...file,
        path: filePath,
      });
    }
  }

  return files;
}

// Маршрут для анализа файла
app.get("/api/analyze/:fileId", authenticateToken, async (req, res) => {
  const fileId = req.params.fileId;

  try {
    // Определяем путь для временного файла
    const destPath = path.join(tempDir, `${fileId}.mp3`);

    // Скачиваем файл с Google Drive
    const response = await drive.files.get({ fileId: fileId, alt: "media" }, { responseType: "stream" });

    // Сохраняем файл во временной директории
    const dest = fs.createWriteStream(destPath);
    await pipeline(response.data, dest);

    // Запускаем Python-скрипт
    const pythonProcess = spawn("python3", ["analyze_audio.py", destPath]);

    let dataString = "";

    pythonProcess.stdout.on("data", (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`Python stderr: ${data.toString()}`);
    });

    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python process:", err);
      res.status(500).send("Error starting analysis process");
    });

    pythonProcess.on("close", async (code) => {
      console.log(`Python process exited with code ${code}`);

      // Удаляем временный файл
      fs.unlink(destPath, (err) => {
        if (err) console.error(`Error deleting temp file: ${err}`);
      });

      if (code !== 0) {
        res.status(500).send("Error analyzing file");
        return;
      }

      try {
        const analysisResult = JSON.parse(dataString);

        // Сохраняем результат анализа в базу данных
        await db.read();
        db.data ||= { selectedFiles: [], analysisResults: {} };

        // Получаем путь к файлу
        const filePath = await getFilePath(fileId);

        // Сохраняем результат анализа, используя id файла в качестве ключа
        db.data.analysisResults[fileId] = analysisResult;
        await db.write();

        res.json(analysisResult);
      } catch (error) {
        console.error("Error parsing analysis result:", error);
        res.status(500).send("Error parsing analysis result");
      }
    });
  } catch (error) {
    console.error("Error in /api/analyze/:fileId:", error);
    res.status(500).send("Error analyzing file");
  }
});

// Маршрут для получения всех результатов анализа
app.get("/api/analysis-results", async (req, res) => {
  try {
    await db.read();
    db.data ||= { selectedFiles: [], analysisResults: {} };
    res.json(db.data.analysisResults);
  } catch (error) {
    console.error("Error fetching all analysis results:", error);
    res.status(500).send("Error fetching analysis results");
  }
});

// Ensure getFilePath function is defined (if not already)
async function getFilePath(fileId) {
  const paths = [];
  let currentFileId = fileId;

  while (true) {
    const file = await drive.files.get({
      fileId: currentFileId,
      fields: "id, name, parents",
    });

    paths.unshift(file.data.name);

    if (!file.data.parents || file.data.parents.length === 0 || file.data.parents[0] === FOLDER_ID) {
      break;
    }

    currentFileId = file.data.parents[0];
  }

  return paths.join("/");
}

// Add the missing route to get analysis results
app.get("/api/analysis-result/:fileId", authenticateToken, async (req, res) => {
  const fileId = req.params.fileId;

  try {
    // Retrieve the analysis result directly using fileId
    await db.read();
    db.data ||= { selectedFiles: [], analysisResults: {} };

    const analysisResult = db.data.analysisResults[fileId];

    if (analysisResult) {
      res.json({ result: analysisResult });
    } else {
      res.status(404).json({ message: "Analysis result not found" });
    }
  } catch (error) {
    console.error("Error in /api/analysis-result/:fileId:", error);
    res.status(500).send("Error retrieving analysis result");
  }
});
// In the download route
app.get("/api/download/:fileId", async (req, res) => {
  const fileId = req.params.fileId;

  try {
    const file = await drive.files.get({
      fileId: fileId,
      fields: "name, mimeType",
    });

    const fileName = file.data.name;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const response = await drive.files.get({ fileId: fileId, alt: "media" }, { responseType: "stream" });

    response.data
      .on("end", () => {
        console.log("Download complete");
      })
      .on("error", (err) => {
        console.error("Error downloading file");
        res.status(500).send("Error downloading file");
      })
      .pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error downloading file");
  }
});

// Маршрут для добавления выбранного файла
app.post("/api/selected-files", authenticateToken, async (req, res) => {
  const { name, path } = req.body;
  await db.read();

  // Проверяем, есть ли файл уже в выбранных
  const isSelected = db.data.selectedFiles.some((file) => file.name === name && file.path === path);

  if (!isSelected) {
    db.data.selectedFiles.push({ name, path });
    await db.write();
  }
  res.sendStatus(200);
});

// Маршрут для получения списка выбранных файлов (если требуется)
app.get("/api/selected-files", authenticateToken, async (req, res) => {
  await db.read();
  const { folderPath } = req.query;
  const selectedFiles = db.data.selectedFiles;

  if (folderPath) {
    const filesInFolder = selectedFiles.filter((file) => file.path.startsWith(folderPath));
    res.json(filesInFolder);
  } else {
    res.json(selectedFiles);
  }
});

// Маршрут для удаления выбранного файла
app.delete("/api/selected-files", authenticateToken, async (req, res) => {
  const { name, path } = req.body;
  await db.read();

  db.data.selectedFiles = db.data.selectedFiles.filter((file) => !(file.name === name && file.path === path));
  await db.write();
  res.sendStatus(200);
});

// Route to download all files in a folder
app.get("/api/download-folder/:folderId", authenticateToken, async (req, res) => {
  console.log("Downloading folder:", req.params.folderId);
  const folderId = req.params.folderId;

  try {
    // Create a ZIP archive
    const archive = archiver("zip", { zlib: { level: 9 } });

    // Set the response headers
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="folder_${folderId}.zip"`);

    // Pipe the archive data to the response
    archive.pipe(res);

    // Get all files in the folder (non-recursively)
    const files = await listFilesInFolder(folderId);

    // Add each file to the archive
    for (const file of files) {
      const response = await drive.files.get({ fileId: file.id, alt: "media" }, { responseType: "stream" });
      archive.append(response.data, { name: file.name }); // Use file.name since no subfolders
    }

    // Finalize the archive
    archive.finalize();
  } catch (error) {
    console.error("Error in /api/download-folder/:folderId:", error);
    res.status(500).send("Error downloading folder");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
