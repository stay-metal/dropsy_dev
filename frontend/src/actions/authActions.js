import axios from "axios";
import jwt_decode from "jwt-decode";
import { LOGIN_SUCCESS, LOGIN_FAIL, LOGOUT } from "./actionTypes";
import { getTokenExpirationDate } from "../utils/tokenUtils";

// Initialize logout timer
let logoutTimer;

// Action to handle user login
export const login = (username, password) => async (dispatch) => {
  try {
    const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/login`, {
      username,
      password,
    });

    const token = response.data.token;

    // Decode token to get expiration time
    const decoded = jwt_decode(token);
    const expirationDate = decoded.exp * 1000; // Convert to milliseconds

    // Save token and expiration to localStorage
    localStorage.setItem("token", token);
    localStorage.setItem("token_expiration", expirationDate);

    dispatch({
      type: LOGIN_SUCCESS,
      payload: token,
    });

    // Set timer to logout
    dispatch(setLogoutTimer(expirationDate - Date.now()));
  } catch (error) {
    dispatch({
      type: LOGIN_FAIL,
      payload: error.message,
    });
  }
};

// Action to handle user logout
export const logout = () => (dispatch) => {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiration");
  dispatch({ type: LOGOUT });
  if (logoutTimer) {
    clearTimeout(logoutTimer);
  }
};

// Action to set a logout timer
export const setLogoutTimer = (milliseconds) => (dispatch) => {
  if (logoutTimer) {
    clearTimeout(logoutTimer);
  }
  logoutTimer = setTimeout(() => {
    dispatch(logout());
  }, milliseconds);
};
