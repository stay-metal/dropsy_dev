// Login.js
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { login } from "../actions/authActions";
import { TextField, Button, Typography, Box } from "@mui/material";

function Login() {
  const dispatch = useDispatch();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await dispatch(login(username, password));
      setError("");
    } catch (err) {
      setError("Invalid credentials");
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleLogin}
      sx={{
        position: "relative",
        left: "0px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        maxWidth: 300,
        // margin: "auto",
        // height: "50dvh",
        justifyContent: "center",
        mt: 5,
      }}
    >
      {/* <Typography variant="h5" align="center">
        Login
      </Typography> */}
      {error && (
        <Typography color="error" align="center">
          {error}
        </Typography>
      )}
      <TextField label="Username" variant="outlined" value={username} onChange={(e) => setUsername(e.target.value)} required />
      <TextField
        label="Password"
        variant="outlined"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" variant="contained" color="primary">
        Login
      </Button>
    </Box>
  );
}

export default Login;
