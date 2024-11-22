import React from "react";
import FolderView from "./components/FolderView";
import { useSelector } from "react-redux";
import { Container, Typography } from "@mui/material";
import Login from "./components/Login";

function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <Container sx={{ minHeight: "100vh" }}>
      <Typography variant="h4" sx={{ my: 2, color: "text.primary" }}>
        Dropsy Drive Explorer
      </Typography>
      {isAuthenticated ? <FolderView /> : <Login />}
    </Container>
  );
}

export default App;
