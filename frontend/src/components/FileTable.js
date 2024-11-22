import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  Button,
  Typography,
  Slider,
  CircularProgress,
  IconButton,
  Box,
} from "@mui/material";
import Download from "@mui/icons-material/Download";
import FileAnalyzer from "./FileAnalyzer";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedFiles } from "../actions/fileActions";
import axios from "axios";
import FileSaver from "file-saver";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";

function FileTable({ file }) {
  const dispatch = useDispatch();
  const selectedFiles = useSelector((state) => state.files.selectedFiles);
  const analysisResults = useSelector((state) => state.files.analysisResults);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playWhenLoaded, setPlayWhenLoaded] = useState(false);

  const isSelected = selectedFiles.has(file.path);

  // Refs to manage seeking without re-renders
  const isSeeking = useRef(false);
  const seekTime = useRef(0);

  const loadAudio = async () => {
    if (!audioUrl) {
      setLoadingAudio(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/download/${file.id}`, {
          responseType: "blob",
        });
        const blobUrl = URL.createObjectURL(response.data);
        setAudioUrl(blobUrl);
      } catch (error) {
        console.error("Error loading audio:", error);
      }
      setLoadingAudio(false);
    }
  };

  const playAudio = async (e) => {
    e.stopPropagation();
    if (!audioUrl) {
      setPlayWhenLoaded(true);
      await loadAudio();
    } else {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    }
  };

  // Handle audio events
  useEffect(() => {
    if (audioRef.current) {
      const audioElement = audioRef.current;

      const handleLoadedMetadata = () => {
        setDuration(audioElement.duration);
      };

      const handleTimeUpdate = () => {
        if (!isSeeking.current) {
          setCurrentTime(audioElement.currentTime);
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
      };

      audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);
      audioElement.addEventListener("timeupdate", handleTimeUpdate);
      audioElement.addEventListener("ended", handleEnded);

      return () => {
        audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audioElement.removeEventListener("timeupdate", handleTimeUpdate);
        audioElement.removeEventListener("ended", handleEnded);
      };
    }
  }, [audioUrl]);

  const handleSliderChange = (e, newValue) => {
    isSeeking.current = true;
    seekTime.current = newValue;
    setCurrentTime(newValue); // Update the slider position
  };

  const handleSliderChangeCommitted = (e, newValue) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newValue;
    }
    isSeeking.current = false;
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };
  const toggleSelect = async () => {
    const newSelectedFiles = new Set(selectedFiles);
    if (isSelected) {
      newSelectedFiles.delete(file.path);
    } else {
      newSelectedFiles.add(file.path);
    }
    dispatch(setSelectedFiles(newSelectedFiles));

    const { name, path } = file;

    try {
      if (!isSelected) {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/selected-files`, { name, path });
      } else {
        await axios.delete(`${process.env.REACT_APP_API_URL}/api/selected-files`, { data: { name, path } });
      }
    } catch (error) {
      console.error("Error updating selected file:", error);
    }
  };

  const downloadFile = async (e) => {
    e.stopPropagation();
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/download/${file.id}`, {
        responseType: "blob",
      });
      const contentDisposition = response.headers["content-disposition"];
      let fileName = file.name;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (fileNameMatch.length === 2) {
          fileName = fileNameMatch[1];
        }
      }

      FileSaver.saveAs(response.data, fileName);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const cellStyle = {
    width: "20%",
    textAlign: "center",
    wordBreak: "break-word",
    backgroundColor: isSelected ? "#031908" : "background.paper",
  };
  const analysisResult = useMemo(() => analysisResults[file.id] || null, [analysisResults, file.id]);

  return (
    <Table>
      <TableBody>
        <TableRow
          // onClick={toggleSelect}
          style={{
            // backgroundColor: isSelected ? "#031908" : "inherit",
            backgroundColor: "inherit",
            cursor: "pointer",
          }}
        >
          <TableCell sx={{ ...cellStyle, width: "25%" }}>
            {" "}
            <Box sx={{ display: "flex", alignItems: "center", gap: "17px" }}>
              <IconButton aria-label="download" size="small" onClick={downloadFile}>
                <Download fontSize="small" />
              </IconButton>
              {file.name}
            </Box>
          </TableCell>
          <TableCell sx={{ ...cellStyle, width: "15%" }}>{new Date(file.createdTime).toLocaleString()}</TableCell>
          <TableCell sx={{ ...cellStyle, width: "15%" }}>{new Date(file.modifiedTime).toLocaleString()}</TableCell>
          <TableCell sx={cellStyle}>
            <FileAnalyzer file={file} analysisResultProp={analysisResult} />
          </TableCell>
          <TableCell sx={cellStyle}>
            {(file.name.endsWith(".mp3") || file.name.endsWith(".wav")) && (
              <>
                {loadingAudio && <CircularProgress size={27} />}
                {!loadingAudio && (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={playAudio}
                    // style={{ marginLeft: "10px" }}
                    startIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                  >
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                )}
                <div style={{ marginTop: "10px" }}>
                  <Typography variant="body2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </Typography>
                  <Slider
                    value={currentTime}
                    max={duration}
                    onChange={handleSliderChange}
                    onChangeCommitted={handleSliderChangeCommitted}
                    disabled={!audioUrl}
                  />
                </div>
                {/* Hidden audio element */}
                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="auto"
                    style={{ display: "none" }}
                    onCanPlay={() => {
                      if (playWhenLoaded) {
                        audioRef.current.play();
                        setIsPlaying(true);
                        setPlayWhenLoaded(false);
                      }
                    }}
                  />
                )}{" "}
              </>
            )}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export default FileTable;
