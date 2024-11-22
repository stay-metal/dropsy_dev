// src/components/FolderView.js
import React, { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import LogoutIcon from "@mui/icons-material/Logout";
import DownloadIcon from "@mui/icons-material/Download";
import { IconButton } from "@mui/material";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Checkbox,
  FormGroup,
  FormControlLabel,
  CircularProgress,
  Button,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileTable from "./FileTable";
import { useSelector, useDispatch } from "react-redux";
import { analyzeAllFiles } from "../actions/fileActions";
import { logout } from "../actions/authActions";
import FileSaver from "file-saver";
import api from "../api";

import {
  fetchFiles,
  setSelectedExtensions,
  toggleShowAllFiles,
  setSelectedFiles,
  setAnalysisResults,
  fetchSelectedFiles,
  fetchAnalysisResults,
  fetchAllAnalysisResults,
} from "../actions/fileActions";

function FolderView() {
  const theme = useTheme();
  const dispatch = useDispatch();

  // Get state from Redux store
  const {
    files,
    loading,
    error,
    extensions,
    selectedExtensions,
    showAllFiles,
    selectedFiles,
    analysisResults,
    expandedAccordionId,
  } = useSelector((state) => state.files);

  useEffect(() => {
    dispatch(fetchFiles());
    dispatch(fetchAllAnalysisResults());
  }, [dispatch]);

  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const getAllFiles = (filesArray) => {
    let allFiles = [];

    const traverseFiles = (files) => {
      files.forEach((file) => {
        if (file.mimeType === "application/vnd.google-apps.folder") {
          if (file.children && file.children.length > 0) {
            traverseFiles(file.children);
          }
        } else {
          allFiles.push(file);
        }
      });
    };

    traverseFiles(filesArray);
    return allFiles;
  };
  const allFiles = getAllFiles(files);

  const audioFiles = allFiles.filter((file) => file.name.endsWith(".mp3") || file.name.endsWith(".wav"));

  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    setProgress(0);
    await dispatch(analyzeAllFiles(audioFiles, setProgress));
    setAnalyzing(false);
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleExtensionChange = (event) => {
    const value = event.target.name;
    let updatedSelectedExtensions;
    if (selectedExtensions.includes(value)) {
      updatedSelectedExtensions = selectedExtensions.filter((ext) => ext !== value);
    } else {
      updatedSelectedExtensions = [...selectedExtensions, value];
    }
    dispatch(setSelectedExtensions(updatedSelectedExtensions));
  };

  const handleShowAllFilesChange = () => {
    dispatch(toggleShowAllFiles());
  };

  const handleAccordionChange = (panelId, folderPath, filesInFolder) => (event, isExpanded) => {
    dispatch({
      type: "SET_EXPANDED_ACCORDION_ID",
      payload: isExpanded ? panelId : null,
    });
    if (isExpanded) {
      dispatch(fetchSelectedFiles(folderPath));
      dispatch(fetchAnalysisResults(filesInFolder));
    }
  };
  // const audioFiles = files.filter(
  //   (file) => file.mimeType !== "application/vnd.google-apps.folder" && (file.name.endsWith(".mp3") || file.name.endsWith(".wav"))
  // );

  const downloadAllFilesInFolder = async (folderId, folderName) => {
    try {
      const response = await api.get(`/api/download-folder/${folderId}`, {
        responseType: "blob",
      });
      const contentDisposition = response.headers["content-disposition"];
      let fileName = `${folderName}.zip`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1];
        }
      }

      FileSaver.saveAs(response.data, fileName);
    } catch (error) {
      console.error("Error downloading folder:", error);
    }
  };

  const renderFiles = (files, depth = 0) => {
    return files.map((file) => {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        let backgroundColor;

        if (depth === 0) {
          backgroundColor = theme.palette.background.paper;
        } else if (depth % 2 === 1) {
          backgroundColor = "#391111";
        } else {
          backgroundColor = "#200A0A";
        }

        const isTopLevel = depth === 0;
        const isExpanded = isTopLevel ? expandedAccordionId === file.id : undefined;

        // Collect files in this folder (including subfolders)
        const filesInFolder = file.children || [];

        return (
          <Accordion
            key={file.id}
            sx={{ backgroundColor }}
            expanded={isTopLevel ? isExpanded : undefined}
            onChange={isTopLevel ? handleAccordionChange(file.id, file.path, filesInFolder) : undefined}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {" "}
                {depth > 0 && (
                  <IconButton
                    // color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadAllFilesInFolder(file.id, file.name);
                    }}
                    size="small"
                    style={{ marginLeft: "auto", marginRight: "7px" }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                )}
                {file.name}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ display: "block" }}>{renderFiles(filesInFolder, depth + 1)}</AccordionDetails>
          </Accordion>
        );
      } else {
        const fileExtension = file.name.split(".").pop().toLowerCase();
        if (showAllFiles || selectedExtensions.includes(fileExtension)) {
          const isSelected = selectedFiles.has(file.path);
          const analysisResult = analysisResults[file.id] || null;

          return <FileTable key={file.id} file={file} isSelectedProp={isSelected} analysisResult={analysisResult} />;
        } else {
          return null;
        }
      }
    });
  };

  return (
    <div>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: "10px" }}>
        <FormGroup row>
          <FormControlLabel
            control={<Checkbox checked={showAllFiles} onChange={handleShowAllFilesChange} name="showAllFiles" />}
            label="Показывать все файлы"
          />
          {!showAllFiles &&
            extensions.map((ext) => (
              <FormControlLabel
                key={ext}
                control={<Checkbox checked={selectedExtensions.includes(ext)} onChange={handleExtensionChange} name={ext} />}
                label={ext}
              />
            ))}
        </FormGroup>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" color="primary" onClick={handleAnalyzeAll} disabled={analyzing}>
            {analyzing ? `Analyzing... (${progress}/${audioFiles.length})` : "Analyze All"}
          </Button>
          <IconButton
            color="secondary"
            onClick={handleLogout}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Box>
      {loading ? (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <CircularProgress />
          <Typography style={{ marginTop: "10px" }}>Загрузка файлов...</Typography>
        </div>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        renderFiles(files)
      )}
    </div>
  );
}

export default FolderView;
