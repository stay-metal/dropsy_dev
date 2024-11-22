import axios from "axios";
import api from "../api";
import {
  FETCH_FILES_REQUEST,
  FETCH_FILES_SUCCESS,
  FETCH_FILES_FAILURE,
  SET_SELECTED_EXTENSIONS,
  TOGGLE_SHOW_ALL_FILES,
  SET_SELECTED_FILES,
  SET_ANALYSIS_RESULTS,
  SET_EXPANDED_ACCORDION_ID,
} from "./actionTypes";

export const fetchFiles = () => async (dispatch) => {
  dispatch({ type: FETCH_FILES_REQUEST });
  try {
    const response = await api.get("/api/files");
    dispatch({ type: FETCH_FILES_SUCCESS, payload: response.data });
  } catch (error) {
    dispatch({ type: FETCH_FILES_FAILURE, payload: error.message });
  }
};

export const setSelectedExtensions = (extensions) => ({
  type: SET_SELECTED_EXTENSIONS,
  payload: extensions,
});

export const toggleShowAllFiles = () => ({
  type: TOGGLE_SHOW_ALL_FILES,
});

export const setSelectedFiles = (selectedFiles) => ({
  type: SET_SELECTED_FILES,
  payload: selectedFiles,
});

export const setAnalysisResults = (analysisResults) => ({
  type: SET_ANALYSIS_RESULTS,
  payload: analysisResults,
});

export const fetchSelectedFiles = (folderPath) => async (dispatch, getState) => {
  try {
    const response = await api.get("/api/selected-files", {
      params: { folderPath },
    });
    const prevSelectedFiles = getState().files.selectedFiles;
    const newSelectedFiles = new Set(prevSelectedFiles);
    response.data.forEach((file) => {
      newSelectedFiles.add(file.path);
    });
    dispatch(setSelectedFiles(newSelectedFiles));
  } catch (error) {
    console.error("Error fetching selected files:", error);
    // Handle error as needed
  }
};

export const fetchAnalysisResults = (filesInFolder) => async (dispatch, getState) => {
  try {
    const analysisPromises = filesInFolder
      .filter((file) => file.mimeType !== "application/vnd.google-apps.folder")
      .map((file) =>
        axios
          .get(`${process.env.REACT_APP_API_URL}/api/analysis-result/${file.id}`)
          .then((res) => ({ id: file.id, result: res.data.result }))
          .catch(() => null)
      );

    const results = await Promise.all(analysisPromises);
    const prevAnalysisResults = getState().files.analysisResults;
    const newAnalysisResults = { ...prevAnalysisResults };
    results.forEach((res) => {
      if (res) {
        newAnalysisResults[res.id] = res.result;
      }
    });
    dispatch(setAnalysisResults(newAnalysisResults));
  } catch (error) {
    console.error("Error fetching analysis results:", error);
    // Handle error as needed
  }
};

// src/actions/fileActions.js

export const fetchAllAnalysisResults = () => async (dispatch) => {
  try {
    const response = await api.get("/api/analysis-results");
    dispatch(setAnalysisResults(response.data));
  } catch (error) {
    console.error("Error fetching all analysis results:", error);
    // Handle error as needed
  }
};

export const analyzeAllFiles = (files, setProgress) => async (dispatch, getState) => {
  const { analysisResults } = getState().files;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Skip if already analyzed
    if (analysisResults[file.id]) {
      setProgress(i + 1);
      continue;
    }

    try {
      const response = await api.get(`/api/analyze/${file.id}`);

      const { bpm, detected_instruments } = response.data;

      const instruments = detected_instruments.map((item) => ({
        name: item.instrument,
        probability: (item.probability * 100).toFixed(2),
      }));

      const result = { bpm: bpm.toFixed(2), instruments };

      // Dispatch action to update the analysis result for this file
      dispatch(setAnalysisResults({ [file.id]: result }));
      console.log("Analysis result for file: ", file.id, result);
    } catch (error) {
      console.error(`Error analyzing file ${file.name}:`, error);
      // Optionally handle error cases here
      dispatch(setAnalysisResults({ [file.id]: { error: "Error analyzing file" } }));
    }

    // Update progress
    setProgress(i + 1);
  }
};
