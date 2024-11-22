import React, { useState } from "react";
import axios from "axios";
import { Button, Card, CardContent, Typography, CircularProgress, Box } from "@mui/material";
import { useDispatch } from "react-redux";
import { setAnalysisResults } from "../actions/fileActions";
import api from "../api";

function FileAnalyzer({ file, analysisResultProp }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const analyzeFile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/analyze/${file.id}`);

      const { bpm, detected_instruments } = response.data;

      const instruments = detected_instruments.map((item) => ({
        name: item.instrument,
        probability: (item.probability * 100).toFixed(2),
      }));

      const result = { bpm: bpm.toFixed(2), instruments };

      // Update Redux store
      dispatch(setAnalysisResults({ [file.id]: result }));
    } catch (error) {
      console.error("Error analyzing file:", error);
      // Dispatch error result to Redux store
      dispatch(setAnalysisResults({ [file.id]: { error: "Error analyzing file" } }));
    }
    setLoading(false);
  };

  const analysisResult = analysisResultProp;

  return (
    <div>
      {!loading && !analysisResult && (
        <Button variant="contained" color="secondary" onClick={analyzeFile} disabled={loading}>
          Analyze
        </Button>
      )}
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        {loading && <CircularProgress sx={{ mt: 0, width: 10, height: 10 }} />}
      </Box>
      {analysisResult && !loading && (
        <div>
          {analysisResult.error ? (
            <Typography color="error">{analysisResult.error}</Typography>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                alignItems: "center",
                justifyContent: "center",
                mt: 0,
              }}
            >
              <Card sx={{ minWidth: "100%", borderRadius: 2, backgroundColor: "#37133E", padding: 1.5, mt: 0, maxWidth: "70%" }}>
                <Typography variant="body1" sx={{ fontSize: "14px", color: "text.primary" }}>
                  BPM: {analysisResult.bpm}
                </Typography>
              </Card>

              {analysisResult.instruments &&
                analysisResult.instruments.map((instrument, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Card sx={{ minWidth: "100%", borderRadius: 2, backgroundColor: "#07334E", p: 1.5, maxWidth: "70%" }}>
                      <Typography variant="body1" sx={{ fontSize: "14px", color: "text.primary" }}>
                        {instrument.name} ({instrument.probability}%)
                      </Typography>
                    </Card>
                  </Box>
                ))}
            </Box>
          )}
        </div>
      )}
    </div>
  );
}

export default FileAnalyzer;
