// db.js
import path from "path";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { fileURLToPath } from "url";

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Specify the path to the database file
const file = path.join(__dirname, "db.json");
const adapter = new JSONFile(file);

// Initialize default data
const defaultData = { selectedFiles: [], analysisResults: {} };
const db = new Low(adapter, defaultData);

export default db;
