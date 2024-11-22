// frontend/src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import theme from "./theme";
import { Provider, useDispatch } from "react-redux";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import store from "./store.ts";
import { logout, setLogoutTimer } from "./actions/authActions";
import { isTokenExpired } from "./utils/tokenUtils";

// Component to handle initial setup
function Root() {
  const dispatch = useDispatch();
  const token = localStorage.getItem("token");
  const expiration = localStorage.getItem("token_expiration");

  React.useEffect(() => {
    if (token && expiration) {
      if (isTokenExpired(token)) {
        dispatch(logout());
      } else {
        const remainingTime = expiration - Date.now();
        dispatch(setLogoutTimer(remainingTime));
      }
    }
  }, [dispatch, token, expiration]);

  return <App />;
}

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);

root.render(
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Root />
    </ThemeProvider>
  </Provider>
);
